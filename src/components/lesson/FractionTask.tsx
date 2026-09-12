import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sfx } from '../../audio/sound';
import { DwellTarget } from '../../tracker/DwellTarget';
import { FractionCanvas, type Skin } from './FractionCanvas';
import { Confetti } from './Confetti';
import { DialogueBox } from './DialogueBox';
import {
  areEqualParts,
  buildRegions,
  isCutOnTarget,
  targetFractions,
  type Cut,
  type CutAxis,
  type Region,
  type ShapeKind,
} from './fractionGeometry';

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
  retryLine = 'Remember, each part should be the same size. Try that cut again!',
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
  const retryTimers = useRef<number[]>([]);

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
    setNudge(true);
    setLine(retryLine);
    sfx.play('retry');
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

    if (next.length < requiredCuts) {
      setLine(`Nice cut! ${next.length === requiredCuts - 1 ? 'One more to go.' : 'Keep going.'}`);
      return;
    }

    if (areEqualParts(buildRegions(kind, next))) {
      if (requiredShaded > 0) {
        setPhase('shade');
        setLine(shadeLine ?? 'Perfect! Now colour in the parts we need.');
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
            ? `That's ${next.length}. We only need ${requiredShaded} - tap one again to remove it.`
            : `${next.length} of ${requiredShaded} coloured. Keep going!`,
        );
      }
      return next;
    });
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
          <span className="dialogue__hint">
            {phase === 'cut'
              ? 'Point where you want to cut, then hold still (or click).'
              : 'Point at a part, then hold still (or click) to colour it.'}
          </span>
        )}
      </DialogueBox>
    </div>
  );
}
