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
  const retryTimer = useRef<number | undefined>(undefined);

  const cutsToGo = Math.max(0, requiredCuts - cuts.length);
  const regions = useMemo(() => buildRegions(kind, cuts), [kind, cuts]);

  // When a shape needs one cut each way, lock the next cut to the axis that is
  // still missing - a child aiming roughly at the middle then always succeeds.
  const effectiveAllow = useMemo(() => {
    if (!allow || allow.length < 2) return allow;
    const hasV = cuts.some((cut) => cut.axis === 'v');
    const hasH = cuts.some((cut) => cut.axis === 'h');
    if (hasV && !hasH) return ['h' as CutAxis];
    if (hasH && !hasV) return ['v' as CutAxis];
    return allow;
  }, [allow, cuts]);

  useEffect(() => () => window.clearTimeout(retryTimer.current), []);

  const finish = () => {
    setPhase('done');
    setLine(successLine);
    sfx.play('success');
  };

  const handleCut = (cut: Cut) => {
    const next = [...cuts, cut];
    setCuts(next);
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

    // Wrong split: no red error, no answer given away - just take the cut back.
    setNudge(true);
    setLine(retryLine);
    sfx.play('retry');
    retryTimer.current = window.setTimeout(() => {
      setCuts(next.slice(0, -1));
      setNudge(false);
      setLine(askLine);
    }, 1300);
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
