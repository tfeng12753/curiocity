/*
  The two switches that decide whether this visit spends money.

  ElevenLabs and IFM are a fixed monthly allowance shared by every child using
  the site, so somebody - a teacher on a class set of laptops, a parent, or you
  on a demo - needs to be able to turn the paid parts off without a deploy.
  Both default to on, because the product is at its best with them.

  Deliberately a plain module rather than React state: voice.ts and ai/curio.ts
  are not components and must be able to read this synchronously, the same way
  they already read sound.ts's mute flag.
*/

/** How Curio's narration is produced. */
export type VoiceMode =
  /** ElevenLabs through the proxy, with the browser as a fallback. Costs credits. */
  | 'real'
  /** The browser's own speech synthesis only. Free, offline, robotic. */
  | 'browser'
  /** Silence. Her lines are still typed out on screen. */
  | 'off';

interface Settings {
  voiceMode: VoiceMode;
  /** Hints, "Ask me anything" and the personalised recap. */
  aiEnabled: boolean;
}

const STORAGE_KEY = 'curio.settings.v1';

function read(): Settings {
  const fallback: Settings = { voiceMode: 'real', aiEnabled: true };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      voiceMode:
        parsed.voiceMode === 'browser' || parsed.voiceMode === 'off' || parsed.voiceMode === 'real'
          ? parsed.voiceMode
          : fallback.voiceMode,
      aiEnabled: typeof parsed.aiEnabled === 'boolean' ? parsed.aiEnabled : fallback.aiEnabled,
    };
  } catch {
    return fallback;
  }
}

let current = read();
const listeners = new Set<(settings: Settings) => void>();

function commit(next: Settings) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* private browsing - the setting still holds for this visit */
  }
  listeners.forEach((listener) => listener(current));
}

export const settings = {
  get: () => current,
  voiceMode: () => current.voiceMode,
  aiEnabled: () => current.aiEnabled,

  setVoiceMode(mode: VoiceMode) {
    if (mode !== current.voiceMode) commit({ ...current, voiceMode: mode });
  },

  setAiEnabled(enabled: boolean) {
    if (enabled !== current.aiEnabled) commit({ ...current, aiEnabled: enabled });
  },

  subscribe(listener: (settings: Settings) => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export type { Settings };
