import { useEffect, useRef, useState } from 'react';
import './Avatar.css';

export type AvatarMood = 'idle' | 'happy' | 'think' | 'cheer';

const ARM_ANGLE: Record<AvatarMood, number> = { idle: 8, think: 8, happy: 22, cheer: 34 };
const TALK_THRESHOLD = 0.05;

/**
 * Poly, the Fraction Workshop guide. Small, friendly, and never in the way of
 * the learning object - moods are driven by what the student just did, and
 * her mouth also flaps along with any narration currently playing.
 */
export function Avatar({
  mood = 'idle',
  size = 120,
  talking = false,
  amplitude = 0,
}: {
  mood?: AvatarMood;
  size?: number;
  /** Whether narration is currently playing for this line. */
  talking?: boolean;
  /** Live 0-1 loudness of the narration, for lip-sync. */
  amplitude?: number;
}) {
  const [blinking, setBlinking] = useState(false);
  const blinkTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;
    const scheduleBlink = () => {
      const openTimeout = setTimeout(() => {
        setBlinking(true);
        const closeTimeout = setTimeout(() => {
          setBlinking(false);
          if (!cancelled) scheduleBlink();
        }, 120);
        blinkTimeouts.current.push(closeTimeout);
      }, 2500 + Math.random() * 2500);
      blinkTimeouts.current.push(openTimeout);
    };
    scheduleBlink();

    return () => {
      cancelled = true;
      blinkTimeouts.current.forEach(clearTimeout);
      blinkTimeouts.current = [];
    };
  }, []);

  const armAngle = ARM_ANGLE[mood];
  const mouthOpenness = talking ? amplitude : 0;
  const isTalkingMouth = mouthOpenness > TALK_THRESHOLD;

  return (
    <svg
      viewBox="0 0 120 130"
      width={size}
      height={(size * 130) / 120}
      className={`avatar avatar--${mood}`}
      role="img"
      aria-label="Poly, your fraction guide"
    >
      <ellipse cx="60" cy="121" rx="30" ry="6" fill="#2b1d63" opacity="0.18" />

      {/* arms */}
      <rect
        className="avatar__arm"
        x="10"
        y="72"
        width="20"
        height="10"
        rx="5"
        fill="#5ecff0"
        style={{ transform: `rotate(${-armAngle}deg)`, transformOrigin: '20px 78px' }}
      />
      <rect
        className="avatar__arm"
        x="90"
        y="72"
        width="20"
        height="10"
        rx="5"
        fill="#5ecff0"
        style={{ transform: `rotate(${armAngle}deg)`, transformOrigin: '100px 78px' }}
      />

      {/* body */}
      <g className="avatar__body">
        <rect x="26" y="52" width="68" height="62" rx="26" fill="#7a5cf0" />
        <rect x="34" y="74" width="52" height="34" rx="16" fill="#9b82ff" opacity="0.75" />

        {/* badge */}
        <circle cx="60" cy="92" r="12" fill="#ffd678" />
        <path d="M60 80 A12 12 0 0 1 60 104 Z" fill="#ff9d5c" />
      </g>

      {/* head */}
      <g className="avatar__head">
        <rect x="22" y="14" width="76" height="52" rx="24" fill="#8b6bff" />
        <rect x="30" y="22" width="60" height="34" rx="17" fill="#fdfbff" />

        {/* eyes */}
        <g className="avatar__eyes">
          {mood === 'happy' || mood === 'cheer' ? (
            <>
              <path d="M40 40 q6 -8 12 0" stroke="#2b1d63" strokeWidth="3.4" fill="none" strokeLinecap="round" />
              <path d="M68 40 q6 -8 12 0" stroke="#2b1d63" strokeWidth="3.4" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="46" cy="39" r="5.4" fill="#2b1d63" />
              <circle cx="74" cy="39" r="5.4" fill="#2b1d63" />
              <circle cx="48" cy="37" r="1.8" fill="#fff" />
              <circle cx="76" cy="37" r="1.8" fill="#fff" />
            </>
          )}
          {/* eyelids - overlay closed regardless of mood, so blinking always reads clearly */}
          {blinking && (
            <>
              <rect x="39" y="35" width="14" height="9" rx="4.5" fill="#fdfbff" />
              <rect x="67" y="35" width="14" height="9" rx="4.5" fill="#fdfbff" />
              <path d="M40 39.5 h12" stroke="#2b1d63" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M68 39.5 h12" stroke="#2b1d63" strokeWidth="2.4" strokeLinecap="round" />
            </>
          )}
        </g>

        {/* mouth */}
        {isTalkingMouth ? (
          <ellipse
            className="avatar__mouth-talk"
            cx="60"
            cy="50"
            rx="7"
            ry={3 + mouthOpenness * 9}
            fill="#2b1d63"
          />
        ) : mood === 'think' ? (
          <circle cx="60" cy="50" r="4" fill="#2b1d63" opacity="0.8" />
        ) : (
          <path
            d={mood === 'cheer' ? 'M50 48 q10 14 20 0 q-10 6 -20 0' : 'M52 49 q8 8 16 0'}
            fill={mood === 'cheer' ? '#2b1d63' : 'none'}
            stroke="#2b1d63"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {/* cheeks */}
        <circle cx="37" cy="47" r="4.5" fill="#ff9dc0" opacity="0.65" />
        <circle cx="83" cy="47" r="4.5" fill="#ff9dc0" opacity="0.65" />

        {/* pi cap */}
        <path d="M24 18 q36 -20 72 0 z" fill="#ffc24a" />
        <rect x="52" y="0" width="16" height="12" rx="5" fill="#ffd678" />
        <text x="60" y="14" textAnchor="middle" fontSize="13" fontWeight="800" fill="#8a5a00" fontFamily="'Baloo 2', sans-serif">
          π
        </text>
      </g>
    </svg>
  );
}
