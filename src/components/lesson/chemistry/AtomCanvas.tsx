import { motion } from 'motion/react';
import { electronPositions, nucleusOffsets } from './atomGeometry';

interface AtomCanvasProps {
  protons: number;
  neutrons: number;
  electrons: number;
}

const CENTER = 50;
const ELECTRON_RADIUS = 40;

/**
 * A plain, purely visual atom diagram - protons and neutrons packed into a
 * nucleus, electrons spaced evenly around a ring - driven entirely by
 * whatever counts AtomTask currently has. No interaction lives here, same
 * split as FractionCanvas/FractionTask: this draws, the task decides.
 */
export function AtomCanvas({ protons, neutrons, electrons }: AtomCanvasProps) {
  const nucleusPositions = nucleusOffsets(protons + neutrons);
  const protonPositions = nucleusPositions.slice(0, protons);
  const neutronPositions = nucleusPositions.slice(protons);
  const electronDots = electronPositions(Math.max(electrons, 1), ELECTRON_RADIUS);

  return (
    <svg viewBox="0 0 100 100" className="atom-canvas__svg" aria-hidden="true">
      {/* electron orbit, always visible so there's somewhere to see electrons go */}
      <circle cx={CENTER} cy={CENTER} r={ELECTRON_RADIUS} fill="none" stroke="#c9bdfa" strokeWidth="1" strokeDasharray="2 3" />

      {electrons > 0 &&
        electronDots.slice(0, electrons).map((pos, i) => (
          <motion.circle
            key={i}
            cx={CENTER + pos.x}
            cy={CENTER + pos.y}
            r="3.2"
            fill="#5ad8f5"
            stroke="#12a5d6"
            strokeWidth="0.8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          />
        ))}

      {neutronPositions.map((pos, i) => (
        <motion.circle
          key={`n${i}`}
          cx={CENTER + pos.x}
          cy={CENTER + pos.y}
          r="4.6"
          fill="#b9b9cc"
          stroke="#8f8fa8"
          strokeWidth="0.8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        />
      ))}

      {protonPositions.map((pos, i) => (
        <motion.circle
          key={`p${i}`}
          cx={CENTER + pos.x}
          cy={CENTER + pos.y}
          r="4.6"
          fill="#ff6f9c"
          stroke="#e0507e"
          strokeWidth="0.8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        />
      ))}
    </svg>
  );
}
