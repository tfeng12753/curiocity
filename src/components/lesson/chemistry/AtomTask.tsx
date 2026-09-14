import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sfx } from '../../../audio/sound';
import { DwellTarget } from '../../../tracker/DwellTarget';
import { Confetti } from '../Confetti';
import { DialogueBox } from '../DialogueBox';
import { AtomCanvas } from './AtomCanvas';
import type { ElementTarget } from './atomGeometry';

interface AtomTaskProps {
  target: ElementTarget;
  askLine: string;
  onSolved: () => void;
}

type Particle = 'proton' | 'neutron' | 'electron';

const PARTICLE_META: Record<Particle, { label: string; short: string; color: string }> = {
  proton: { label: 'Proton', short: 'p+', color: '#ff6f9c' },
  neutron: { label: 'Neutron', short: 'n', color: '#b9b9cc' },
  electron: { label: 'Electron', short: 'e-', color: '#5ad8f5' },
};

/**
 * Tap a particle to add one to the atom - protons and neutrons go to the
 * nucleus, electrons go to the ring - until all three counts match the
 * target element. The same "point, commit, watch it build up" shape as
 * cutting a shape or setting a ramp height, just adding pieces instead of a
 * line or a value.
 */
export function AtomTask({ target, askLine, onSolved }: AtomTaskProps) {
  const [protons, setProtons] = useState(0);
  const [neutrons, setNeutrons] = useState(0);
  const [electrons, setElectrons] = useState(0);
  const [solved, setSolved] = useState(false);
  const [line, setLine] = useState(askLine);

  const counts: Record<Particle, number> = { proton: protons, neutron: neutrons, electron: electrons };
  const targets: Record<Particle, number> = {
    proton: target.protons,
    neutron: target.neutrons,
    electron: target.electrons,
  };

  const add = (particle: Particle) => {
    if (solved) return;
    if (counts[particle] >= targets[particle]) {
      sfx.play('retry');
      setLine(
        targets[particle] === 0
          ? `${target.name} doesn't need any ${PARTICLE_META[particle].label.toLowerCase()}s at all!`
          : `That's enough ${PARTICLE_META[particle].label.toLowerCase()}s for ${target.name} - try another particle.`,
      );
      return;
    }

    sfx.play('tap');
    const setters: Record<Particle, (n: number) => void> = {
      proton: () => setProtons((n) => n + 1),
      neutron: () => setNeutrons((n) => n + 1),
      electron: () => setElectrons((n) => n + 1),
    };
    setters[particle](0);

    const nextCounts = { ...counts, [particle]: counts[particle] + 1 };
    const complete =
      nextCounts.proton === targets.proton &&
      nextCounts.neutron === targets.neutron &&
      nextCounts.electron === targets.electron;

    if (complete) {
      setSolved(true);
      setLine(`That's ${target.name}! ${target.funFact}`);
      sfx.play('success');
    } else {
      setLine(`Keep going - ${target.name} needs a bit more.`);
    }
  };

  return (
    <div className="task">
      <div className="task__stage">
        <div className="task__objective">
          <span className="task__objective-chip">BUILD {target.name.toUpperCase()}</span>
          <span className="task__counter">
            p+ {protons}/{target.protons} · n {neutrons}/{target.neutrons} · e- {electrons}/{target.electrons}
          </span>
        </div>

        <div className="task__canvas-wrap atom-canvas">
          <AtomCanvas protons={protons} neutrons={neutrons} electrons={electrons} />

          <AnimatePresence>
            {solved && (
              <motion.div
                className="task__success"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <Confetti />
                <span className="task__success-label">✓ {target.name.toUpperCase()} COMPLETE</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!solved && (
          <div className="atom-tray">
            {(Object.keys(PARTICLE_META) as Particle[]).map((particle) => {
              const meta = PARTICLE_META[particle];
              const full = counts[particle] >= targets[particle];
              return (
                <DwellTarget key={particle} onActivate={() => add(particle)} dwellMs={500}>
                  <button
                    type="button"
                    className={`atom-tray__particle ${full ? 'is-full' : ''}`}
                    onClick={() => add(particle)}
                  >
                    <span className="atom-tray__dot" style={{ background: meta.color }}>
                      {meta.short}
                    </span>
                    <strong>{meta.label}</strong>
                    <span>
                      {counts[particle]} / {targets[particle]}
                    </span>
                  </button>
                </DwellTarget>
              );
            })}
          </div>
        )}
      </div>

      <DialogueBox text={line} mood={solved ? 'cheer' : 'idle'}>
        {solved && (
          <DwellTarget onActivate={onSolved} dwellMs={800}>
            <button className="btn btn--mint" onClick={onSolved}>
              Next →
            </button>
          </DwellTarget>
        )}
      </DialogueBox>
    </div>
  );
}
