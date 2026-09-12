import { useEffect, useState } from 'react';
import { sfx } from '../../audio/sound';
import { useProgress } from '../../state/progress';
import './layout.css';

export type NavPanel = 'progress' | 'achievements' | null;

interface TopNavProps {
  onHome: () => void;
  openPanel: NavPanel;
  onOpenPanel: (panel: NavPanel) => void;
  compact?: boolean;
}

export function TopNav({ onHome, openPanel, onOpenPanel, compact = false }: TopNavProps) {
  const { totalComplete, totalLevels } = useProgress();
  const [muted, setMuted] = useState(sfx.isMuted());

  useEffect(() => sfx.subscribe(setMuted), []);

  const toggleMute = () => {
    sfx.setMuted(!muted);
    if (muted) sfx.play('tap');
  };

  return (
    <header className={`topnav ${compact ? 'topnav--compact' : ''}`}>
      <button className="topnav__logo" onClick={onHome}>
        <span className="topnav__mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" width="22" height="22">
            <circle cx="16" cy="16" r="14" fill="var(--sun-500)" />
            <path d="M16 2 A14 14 0 0 1 16 30 Z" fill="var(--violet-600)" />
            <circle cx="16" cy="16" r="4" fill="#fff" />
          </svg>
        </span>
        LEARNVERSE
      </button>

      <nav className="topnav__links" aria-label="Main">
        <button className="topnav__link" onClick={onHome}>
          World
        </button>
        <button
          className={`topnav__link ${openPanel === 'progress' ? 'is-active' : ''}`}
          onClick={() => onOpenPanel(openPanel === 'progress' ? null : 'progress')}
        >
          My Progress
        </button>
        <button
          className={`topnav__link ${openPanel === 'achievements' ? 'is-active' : ''}`}
          onClick={() => onOpenPanel(openPanel === 'achievements' ? null : 'achievements')}
        >
          Achievements
        </button>
      </nav>

      <div className="topnav__right">
        <span className="pill topnav__score" title="Levels completed">
          ⭐ {totalComplete} / {totalLevels}
        </span>
        <button
          className="topnav__icon"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
          title={muted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>
  );
}
