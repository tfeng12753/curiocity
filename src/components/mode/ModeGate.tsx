import { useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../layout/Logo';
import { sfx } from '../../audio/sound';
import { useAuth } from '../../state/auth';
import type { Role } from '../../state/role';
import './mode.css';

type GateRole = Exclude<Role, 'choose'>;

export function ModeGate({ onLocalChoose }: { onLocalChoose: (role: GateRole) => void }) {
  const { serverUp, googleReady, authError, startGoogleRedirect } = useAuth();
  const [role, setRole] = useState<GateRole | null>(null);
  const [classCode, setClassCode] = useState('');

  const pick = (next: GateRole) => {
    sfx.play('tap');
    setRole(next);
  };

  const goGoogle = () => {
    if (!role) return;
    sfx.play('tap');
    startGoogleRedirect({
      role,
      classCode: role === 'student' ? classCode : undefined,
    });
  };

  return (
    <motion.div
      className="mode-gate"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mode-gate__brand">
        <Logo orientation="stacked" size={56} />
        <p>{role ? `Continue with Google as a ${role}` : 'Who is using Curio-City?'}</p>
        {serverUp === false && (
          <p className="mode-gate__warn">
            Account server is off. Run <code>npm run dev:server</code> to sign in, or play on this
            device only.
          </p>
        )}
        {authError && <p className="mode-gate__error">{authError}</p>}
        {serverUp && !googleReady && (
          <p className="mode-gate__warn">
            Google is not configured yet. Copy <code>.env.example</code> to <code>.env</code> and
            paste a Web client ID.
          </p>
        )}
      </div>

      {!role ? (
        <div className="mode-gate__cards">
          <button type="button" className="mode-gate__card" onClick={() => pick('student')}>
            <span className="mode-gate__icon" aria-hidden="true">
              ✋
            </span>
            <strong>I&apos;m a student</strong>
            <span>Sign in with Google and your class code, then play with the camera.</span>
          </button>
          <button type="button" className="mode-gate__card mode-gate__card--teacher" onClick={() => pick('teacher')}>
            <span className="mode-gate__icon" aria-hidden="true">
              📋
            </span>
            <strong>I&apos;m a teacher</strong>
            <span>Sign in with Google, share a class code, and review student progress.</span>
          </button>
        </div>
      ) : (
        <div className="mode-gate__form mode-gate__auth">
          {role === 'student' && (
            <>
              <label htmlFor="account-code">Class code</label>
              <input
                id="account-code"
                value={classCode}
                onChange={(event) => setClassCode(event.target.value.toUpperCase())}
                placeholder="From your teacher (first time)"
                autoComplete="off"
              />
            </>
          )}

          {authError && <p className="mode-gate__error">{authError}</p>}

          <button type="button" className="btn" onClick={goGoogle} disabled={!googleReady}>
            Continue with Google
          </button>

          <button type="button" className="mode-gate__back" onClick={() => setRole(null)}>
            ← Back
          </button>
          <button
            type="button"
            className="mode-gate__back"
            onClick={() => {
              sfx.play('tap');
              onLocalChoose(role);
            }}
          >
            Play on this device only
          </button>
        </div>
      )}
    </motion.div>
  );
}
