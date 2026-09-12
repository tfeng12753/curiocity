import { useEffect, useRef, useState } from 'react';
import './curio.css';

export type CurioMood = 'idle' | 'wave' | 'happy' | 'think' | 'cheer';

const TALK_THRESHOLD = 0.05;

const OUTLINE = '#7a5cf0';
const BODY = '#9b82ff';
const FACE = '#fdfbff';
const FLIPPER = '#6fdcf5';
const BELLY = '#ffd678';

/**
 * Curio - the student's learning buddy, and the face of Curio-City.
 *
 * One merged silhouette (head, body and feet in a single stroked path) with
 * the flippers tucked behind it, so she reads as one clean character rather
 * than a stack of outlined shapes. Everything that moves is CSS: she breathes,
 * tilts, waves and twinkles on her own, and only blinking and lip-sync are
 * driven from React - blinking because it has to feel random, lip-sync
 * because it follows the narration's real amplitude.
 */
export function Curio({
  mood = 'idle',
  size = 120,
  talking = false,
  amplitude = 0,
}: {
  mood?: CurioMood;
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
        }, 130);
        blinkTimeouts.current.push(closeTimeout);
      }, 2400 + Math.random() * 2600);
      blinkTimeouts.current.push(openTimeout);
    };
    scheduleBlink();

    return () => {
      cancelled = true;
      blinkTimeouts.current.forEach(clearTimeout);
      blinkTimeouts.current = [];
    };
  }, []);

  const mouthOpenness = talking ? amplitude : 0;
  const isTalkingMouth = mouthOpenness > TALK_THRESHOLD;
  const smiling = mood === 'happy' || mood === 'cheer';

  return (
    <svg
      viewBox="0 0 128 146"
      width={size}
      height={(size * 146) / 128}
      className={`curio curio--${mood}`}
      role="img"
      aria-label="Curio, your learning buddy"
    >
      <ellipse cx="64" cy="139" rx="34" ry="6" fill="#2b1d63" opacity="0.14" />

      <g className="curio__float">
        {/* flippers sit behind the silhouette so no seam shows where they meet */}
        <g className="curio__arm curio__arm--left">
          <ellipse cx="27" cy="89" rx="16.5" ry="9.5" fill={FLIPPER} stroke={OUTLINE} strokeWidth="3.6" transform="rotate(-17 27 89)" />
        </g>
        <g className="curio__arm curio__arm--right">
          <ellipse cx="101" cy="89" rx="16.5" ry="9.5" fill={FLIPPER} stroke={OUTLINE} strokeWidth="3.6" transform="rotate(17 101 89)" />
        </g>

        <g className="curio__body">
          {/* one continuous head-to-feet silhouette */}
          <path
            d="M60 10
               C69 9.4 74 11.8 77.5 15
               C89.5 19.5 99 31 99 45
               C99 57 94 67 85 73
               C91 78 94 88 94 99
               C94 116 85 131 71 131
               C67.5 131 65.2 129.2 64 126.4
               C62.8 129.2 60.5 131 57 131
               C43 131 34 116 34 99
               C34 88 37 78 43 73
               C34 67 29 57 29 45
               C29 25 42 10 60 10 Z"
            fill={BODY}
            stroke={OUTLINE}
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* belly badge */}
          <circle cx="64" cy="101" r="15.5" fill={BELLY} />
        </g>

        <g className="curio__head">
          {/* face panel */}
          <rect x="37" y="26" width="54" height="48" rx="22" fill={FACE} stroke={OUTLINE} strokeWidth="3.6" />

          <g className="curio__eyes">
            {blinking || smiling ? (
              <>
                <path d="M44 50 q6 -7 12 0" fill="none" stroke={OUTLINE} strokeWidth="3.4" strokeLinecap="round" />
                <path d="M72 50 q6 -7 12 0" fill="none" stroke={OUTLINE} strokeWidth="3.4" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="50" cy="48" r="8.4" fill={FACE} stroke={OUTLINE} strokeWidth="3.2" />
                <circle cx="78" cy="48" r="8.4" fill={FACE} stroke={OUTLINE} strokeWidth="3.2" />
                {/* crescent pupils: a filled disc with a lighter disc bitten out of it */}
                <circle cx="51.4" cy="48.4" r="6.2" fill={OUTLINE} />
                <circle cx="79.4" cy="48.4" r="6.2" fill={OUTLINE} />
                <circle cx="48.8" cy="46" r="5.4" fill={FACE} />
                <circle cx="76.8" cy="46" r="5.4" fill={FACE} />
              </>
            )}
          </g>

          {/* mouth */}
          {isTalkingMouth ? (
            <ellipse
              className="curio__mouth-talk"
              cx="64"
              cy="62"
              rx="5.2"
              ry={2 + mouthOpenness * 6}
              fill={OUTLINE}
            />
          ) : mood === 'think' ? (
            <circle cx="64" cy="62" r="2.8" fill={OUTLINE} />
          ) : mood === 'cheer' ? (
            <path d="M57 59 q7 11 14 0 q-7 4 -14 0 Z" fill={OUTLINE} />
          ) : (
            <path d="M59.4 59.4 q4.6 6.4 9.2 0 q-4.6 2.6 -9.2 0 Z" fill={OUTLINE} />
          )}
        </g>

        {/* her spark - always twinkling, a little faster when she is excited */}
        <path
          className="curio__sparkle"
          d="M100 2 C101.6 8.8 104 11.2 110.8 12.8 C104 14.4 101.6 16.8 100 23.6 C98.4 16.8 96 14.4 89.2 12.8 C96 11.2 98.4 8.8 100 2 Z"
          fill={BELLY}
        />
      </g>
    </svg>
  );
}
