import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sfx } from '../../audio/sound';
import { DwellTarget } from '../../tracker/DwellTarget';
import { FractionCanvas, type Skin } from './FractionCanvas';
import { Confetti } from './Confetti';
import { Icon } from '../icons/Icon';
import { DialogueBox } from './DialogueBox';
import { curio } from '../../ai/curio';
import { cutPraise, pickLine, retryLineFor } from './dialogue';
import {
  areEqualParts,
  buildRegions,
  isCutOnTarget,
  isDuplicateCut,
  targetFractions,
  type Cut,
  type CutAxis,
  type Region,
  type ShapeKind,
} from './fractionGeometry';

/** Misses on the *current* cut before Curio offers to place one for them.
 *  A hint nudges toward the answer; this is the next rung up when nudging
 *  alone isn't landing - real, safe scaffolding rather than more words. */
const SCAFFOLD_AFTER_MISSES = 4;

export interface FractionTaskProps {
  kind: ShapeKind;
  skin?: Skin;
  allow?: CutAxis[];
  requiredCuts: number;
  requiredShaded?: number;
  preCuts?: Cut[];
  objective: string;
  askLine: string;
  cutInstruction: string;
  shadeLine?: string;
  shadeInstruction?: string;
  successLine: string;
  successLabel: string;
  fractionLabel?: string;
  retryLine?: string;
  explodeOnSuccess?: boolean;
  nextLabel?: string;
  size?: number;
  onSolved: () => void;
}

type Phase = 'cut' | 'shade' | 'done';

export function FractionTask({
  kind,
  skin = 'plain',
  allow,
  requiredCuts,
  requiredShaded = 0,
  preCuts = [],
  objective,
  askLine,
  cutInstruction,
  shadeLine,
  shadeInstruction,
  successLine,
  successLabel,
  fractionLabel,
  // No default any more: with one, every task spoke the identical sentence on
  // every miss. Left unset, retries come from the rotating pool in dialogue.ts.
  retryLine,
  explodeOnSuccess = false,
  nextLabel = 'Next',
  size = 330,
  onSolved,
}: FractionTaskProps) {
  const [cuts, setCuts] = useState<Cut[]>(preCuts);
  const [shaded, setShaded] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>(requiredCuts > 0 ? 'cut' : 'shade');
  const [nudge, setNudge] = useState(false);
  const [line, setLine] = useState(askLine);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);
  const retryTimers = useRef<number[]>([]);
  /**
   * A contextual line fetched ahead of time. It is only ever spoken if it has
   * already arrived by the time the next miss happens - the alternative is
   * making a stuck child wait on a network round-trip before Curio reacts,
   * which is the worst possible moment to add a pause.
   */
  const prefetchedLine = useRef<string | null>(null);
  const prefetching = useRef(false);
  /** AI-generated hints/nudges already spoken for this task, so escalating
   *  ones don't repeat themselves. */
  const priorHints = useRef<string[]>([]);

  const cutsToGo = Math.max(0, requiredCuts - cuts.length);
  const regions = useMemo(() => buildRegions(kind, cuts), [kind, cuts]);
  const targets = useMemo(() => targetFractions(allow, requiredCuts), [allow, requiredCuts]);

  // Once a shape has both axes allowed, the first cut decides how the rest
  // must go. Exactly two cuts is a "grid" - one cut per axis, so the next one
  // locks to whichever axis is still missing. Anything else is equally spaced
  // strips along a single axis, so the next one locks to match the first.
  const effectiveAllow = useMemo(() => {
    if (!allow || allow.length < 2) return allow;
    const usedAxis = cuts.find((cut) => cut.axis === 'v' || cut.axis === 'h')?.axis;
    if (!usedAxis) return allow;
    if (requiredCuts === 2) return [usedAxis === 'v' ? 'h' : 'v'] as CutAxis[];
    return [usedAxis] as CutAxis[];
  }, [allow, cuts, requiredCuts]);

  useEffect(() => () => retryTimers.current.forEach(window.clearTimeout), []);

  /**
   * Fetches a contextual line in the background for the *next* miss. Only worth
   * it once a student has actually got stuck - before that the local pool is
   * more varied than a model prompted with "they missed once" would be, and
   * free. Failures are silent by design; the pool is always there.
   */
  const warmContextualLine = async (misses: number) => {
    if (misses < 2 || prefetching.current || prefetchedLine.current) return;
    prefetching.current = true;
    try {
      const currentInstruction =
        phase === 'shade' ? (shadeInstruction ?? `Colour ${requiredShaded} equal parts.`) : cutInstruction;
      const line = await curio.hint(objective, currentInstruction, misses, priorHints.current);
      if (line) prefetchedLine.current = line;
    } finally {
      prefetching.current = false;
    }
  };

  const finish = () => {
    setPhase('done');
    setLine(successLine);
    sfx.play('success');
  };

  // No red error, no answer given away - the cut is shown, the shape wobbles,
  // and it's quietly taken back so the child can try that one again. This now
  // runs on every cut, not just the last, so an early miss can never leave
  // the shape unfinishable by the time the required count is reached.
  const rejectCut = (cut: Cut) => {
    const misses = mistakeCount + 1;
    setNudge(true);
    // A ready-made contextual line wins; otherwise a rotating local phrase,
    // escalating in warmth the longer this has been going on. Either way the
    // same sentence is never heard twice in a row.
    const ready = prefetchedLine.current;
    prefetchedLine.current = null;
    setLine(ready ?? (retryLine ?? retryLineFor(misses)));
    if (ready) priorHints.current = [...priorHints.current, ready].slice(-3);
    setMistakeCount(misses);
    sfx.play('retry');
    // Start warming the next one now, so it is waiting if they miss again.
    void warmContextualLine(misses);
    retryTimers.current.push(
      window.setTimeout(() => {
        setCuts((current) => current.filter((entry) => entry !== cut));
        setNudge(false);
        setLine(askLine);
      }, 1300),
    );
  };

  const handleCut = (cut: Cut) => {
    const next = [...cuts, cut];
    setCuts(next);

    if (!isCutOnTarget(allow, requiredCuts, cut)) {
      rejectCut(cut);
      return;
    }

    sfx.play('cut');
    setMistakeCount(0);

    if (next.length < requiredCuts) {
      setLine(cutPraise(requiredCuts - next.length));
      return;
    }

    if (areEqualParts(buildRegions(kind, next))) {
      if (requiredShaded > 0) {
        setPhase('shade');
        setLine(shadeLine ?? pickLine('toShade'));
        sfx.play('success');
      } else {
        finish();
      }
      return;
    }

    // Safety net - every cut was on-target but the split still isn't equal.
    rejectCut(cut);
  };

  const handleToggleRegion = (region: Region) => {
    setShaded((current) => {
      const next = current.includes(region.id)
        ? current.filter((id) => id !== region.id)
        : [...current, region.id];

      if (next.length === requiredShaded) {
        sfx.play('shade');
        window.setTimeout(finish, 220);
      } else {
        sfx.play('shade');
        setLine(
          next.length > requiredShaded
            ? `That's ${next.length} - we only need ${requiredShaded}. ${pickLine('shadeTooMany')}`
            : `${next.length} of ${requiredShaded} coloured. ${pickLine('shadeProgress')}`,
        );
      }
      return next;
    });
  };

  const requestHint = async () => {
    const currentInstruction =
      phase === 'shade' ? (shadeInstruction ?? `Colour ${requiredShaded} equal parts.`) : cutInstruction;
    setHintLoading(true);
    const hint = await curio.hint(objective, currentInstruction, mistakeCount, priorHints.current);
    setHintLoading(false);
    if (hint) {
      setLine(hint);
      priorHints.current = [...priorHints.current, hint].slice(-3);
    }
  };

  // Radial cuts (the pizza) don't have a target list the way v/h cuts do -
  // each one is an angle picked at commit time, not a position from a fixed
  // set - so there's nothing here to place on the student's behalf. Scoped
  // to straight-line tasks (thirds, sixths, the harder chocolate-bar splits)
  // where "the next cut" is always one of a small, known set of positions.
  const canScaffold = phase === 'cut' && cutsToGo > 0 && !(allow ?? []).includes('radial');

  const applyScaffold = () => {
    const axis = (effectiveAllow?.[0] ?? 'v') as CutAxis;
    const candidate = targets
      .map((t): Cut => ({ axis, t }))
      .find((entry) => !isDuplicateCut(cuts, entry));
    if (!candidate) return;

    sfx.play('tap');
    const wasLastCut = cuts.length + 1 >= requiredCuts;
    handleCut(candidate);
    // Only override the line if that wasn't the finishing cut - otherwise
    // this would stomp the success/move-to-shading line handleCut just set.
    if (!wasLastCut) setLine("There - I placed one. Can you finish the rest?");
  };

  const shadedCount = shaded.length;
  const instruction =
    phase === 'cut'
      ? cutInstruction
      : phase === 'shade'
        ? (shadeInstruction ?? `Colour ${requiredShaded} of the ${regions.length} equal parts.`)
        : successLabel;

  return (
    <div className="task">
      <div className="task__stage">
        <div className="task__objective">
          <span className="task__objective-chip">{objective}</span>
          {phase === 'cut' && requiredCuts > 0 && (
            <span className="task__counter">
              {cutsToGo === 0 ? 'Checking...' : `${cutsToGo} cut${cutsToGo > 1 ? 's' : ''} to go`}
            </span>
          )}
          {phase === 'shade' && (
            <span className="task__counter">
              {shadedCount} / {requiredShaded} coloured
            </span>
          )}
        </div>

        <div className="task__canvas-wrap">
          <FractionCanvas
            kind={kind}
            skin={skin}
            mode={phase === 'done' ? 'view' : phase}
            cuts={cuts}
            shaded={shaded}
            allow={effectiveAllow}
            maxCuts={requiredCuts}
            targets={targets}
            exploded={phase === 'done' && explodeOnSuccess}
            nudge={nudge}
            size={size}
            onCut={handleCut}
            onToggleRegion={handleToggleRegion}
          />

          <AnimatePresence>
            {phase === 'done' && (
              <motion.div
                className="task__success"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <Confetti />
                <span className="task__success-label">✓ {successLabel}</span>
                {fractionLabel && <span className="task__fraction">{fractionLabel}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DialogueBox
        text={line}
        mood={phase === 'done' ? 'cheer' : nudge ? 'think' : 'idle'}
        instruction={instruction}
      >
        {phase === 'done' ? (
          <DwellTarget onActivate={onSolved} dwellMs={800}>
            <button className="btn btn--mint" onClick={onSolved}>
              {nextLabel} →
            </button>
          </DwellTarget>
        ) : (
          <>
            <span className="dialogue__hint">
              {phase === 'cut'
                ? 'Swipe your finger straight across the shape to slice it (or drag with the mouse).'
                : 'Hold your finger still over a part to colour it (or click).'}
            </span>
            {mistakeCount >= 2 && (
              <DwellTarget onActivate={requestHint} disabled={hintLoading}>
                <button className="btn btn--ghost btn--sm" onClick={requestHint} disabled={hintLoading}>
                  {hintLoading ? (
                    'Thinking...'
                  ) : (
                    <>
                      <Icon name="bulb" size={18} />
                      Get a hint from Curio
                    </>
                  )}
                </button>
              </DwellTarget>
            )}
            {canScaffold && mistakeCount >= SCAFFOLD_AFTER_MISSES && (
              <DwellTarget onActivate={applyScaffold}>
                <button className="btn btn--ghost btn--sm" onClick={applyScaffold}>
                  <Icon name="bulb" size={18} />
                  Help me with this one
                </button>
              </DwellTarget>
            )}
          </>
        )}
      </DialogueBox>
    </div>
  );
}
