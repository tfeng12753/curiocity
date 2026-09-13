import { useRef, useState } from 'react';
import { CITIES, CITY_ORDER, type CityId } from '../data/cities';
import { useProgress } from '../state/progress';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { curio } from '../ai/curio';
import { sfx } from '../audio/sound';
import { DwellTarget } from './DwellTarget';
import type { NavPanel } from '../components/layout/TopNav';
import './tracker.css';

type SimpleView =
  | { name: 'world' }
  | { name: 'city'; cityId: CityId }
  | { name: 'entrance' | 'lesson'; cityId: CityId; levelId: string };

interface Destination {
  label: string;
  /** Lowercase phrases that count as saying this - checked against the
   *  whole transcript with a plain substring match, not a strict equal, so
   *  "take me to math city please" still matches "math city". */
  match: string[];
  run: () => void;
}

const PANEL_DESTINATIONS: { panel: NonNullable<NavPanel>; label: string; match: string[] }[] = [
  { panel: 'progress', label: 'My Progress', match: ['my progress', 'progress'] },
  { panel: 'achievements', label: 'Achievements', match: ['achievements', 'badges'] },
  { panel: 'customize', label: 'Customize', match: ['customize', 'customise', 'my character', 'my avatar'] },
  { panel: 'settings', label: 'Settings', match: ['settings'] },
];

interface VoiceNavProps {
  view: SimpleView;
  onGoWorld: () => void;
  onGoCity: (cityId: CityId) => void;
  onOpenLevel: (cityId: CityId, levelId: string) => void;
  onOpenPanel: (panel: NavPanel) => void;
}

/**
 * "Take me to Math City", "I want to try the harder one" - a spoken way to
 * move around, for the same reason the mic replaced a keyboard in Ask
 * Curio: a hands-only, camera-driven session has no reliable way to type,
 * and pointing-and-dwelling to navigate works but is slow next to just
 * saying where you want to go.
 *
 * Never invents a destination: a plain local match against the current
 * screen's real options runs first (fast, free, no ambiguity), and only a
 * fuzzier phrase ("the harder one") falls through to the AI, which is asked
 * to pick a *number* off a menu built from the same real options - never a
 * free-form place name - so the result is always validated against
 * something that actually exists before anything happens.
 */
export function VoiceNav({ view, onGoWorld, onGoCity, onOpenLevel, onOpenPanel }: VoiceNavProps) {
  const { isLevelUnlocked } = useProgress();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const destinations: Destination[] = [];

  if (view.name !== 'world') {
    destinations.push({
      label: 'World Map',
      match: ['world map', 'go home', 'the map', 'go back to the world'],
      run: onGoWorld,
    });
  }

  if (view.name === 'world') {
    for (const cityId of CITY_ORDER) {
      const city = CITIES[cityId];
      destinations.push({ label: city.name, match: [city.name.toLowerCase()], run: () => onGoCity(cityId) });
    }
  }

  if (view.name === 'city') {
    const cityId = view.cityId;
    for (const level of CITIES[cityId].levels) {
      if (level.status === 'soon' || !isLevelUnlocked(cityId, level.id)) continue;
      destinations.push({
        label: level.name,
        match: [level.name.toLowerCase()],
        run: () => onOpenLevel(cityId, level.id),
      });
    }
  }

  for (const entry of PANEL_DESTINATIONS) {
    destinations.push({ label: entry.label, match: entry.match, run: () => onOpenPanel(entry.panel) });
  }

  const showFeedback = (text: string, holdMs = 2600) => {
    setFeedback(text);
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
    feedbackTimeout.current = setTimeout(() => setFeedback(null), holdMs);
  };

  const go = (destination: Destination) => {
    sfx.play('travel');
    showFeedback(`Going to ${destination.label}...`);
    destination.run();
  };

  const handleFinal = async (transcript: string) => {
    if (!transcript) {
      showFeedback("Didn't catch that - try again?");
      return;
    }

    const lower = transcript.toLowerCase();
    const local = destinations.find((destination) => destination.match.some((phrase) => lower.includes(phrase)));
    if (local) {
      go(local);
      return;
    }

    setResolving(true);
    showFeedback('Let me see...', 8000);
    const menu = destinations.map((destination, i) => `${i + 1}. ${destination.label}`).join('\n');
    const reply = await curio.navigate(transcript, menu);
    setResolving(false);

    const choice = reply ? Number.parseInt(reply.trim(), 10) : NaN;
    const target =
      Number.isInteger(choice) && choice >= 1 && choice <= destinations.length ? destinations[choice - 1] : null;

    if (target) go(target);
    else showFeedback('Not sure where that is - try naming a place, like "Math City".');
  };

  const { supported, starting, listening, start, stop } = useSpeechToText({ onFinalResult: handleFinal });

  // Lessons and the entrance screen already have one obvious next step (or
  // their own camera-mode chrome) - voice navigation is for the two screens
  // that are actually about choosing where to go next.
  if (!supported || (view.name !== 'world' && view.name !== 'city')) return null;

  const toggle = () => {
    if (listening) {
      stop();
      return;
    }
    setFeedback(null);
    sfx.play('tap');
    start();
  };

  return (
    <div className="voice-nav">
      {feedback && <div className="voice-nav__bubble">{feedback}</div>}
      <DwellTarget onActivate={toggle} dwellMs={650}>
        <button
          type="button"
          className={`voice-nav__button ${listening ? 'is-listening' : ''}`}
          onClick={toggle}
          aria-label={listening ? 'Stop voice command' : 'Give a voice command'}
          title="Say where you want to go"
        >
          {starting || resolving ? '…' : listening ? '🔴' : '🎤'}
        </button>
      </DwellTarget>
    </div>
  );
}
