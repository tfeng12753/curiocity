import { useEffect, useState } from 'react';
import { sfx } from '../../audio/sound';
import { useProgress } from '../../state/progress';
import { Logo } from './Logo';
import './layout.css';

export type NavPanel = 'progress' | 'achievements' | 'customize' | null;

interface TopNavProps {
  onHome: () => void;
  openPanel: NavPanel;
  onOpenPanel: (panel: NavPanel) => void;
  compact?: boolean;
}

export function TopNav({ onHome, openPanel, onOpenPanel, compact = false }: TopNavProps) {
  const { totalComplete, totalLevels, coins } = useProgress();
  const [muted, setMuted] = useState(sfx.isMuted());

  useEffect(() => sfx.subscribe(setMuted), []);

  const toggleMute = () => {
    sfx.setMuted(!muted);
    if (muted) sfx.play('tap');
  };

  return (
    <header className={`topnav ${compact ? 'topnav--compact' : ''}`}>
      <button className="topnav__logo" onClick={onHome}>
        <Logo orientation="horizontal" size={26} />
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
        <button
          className={`topnav__link ${openPanel === 'customize' ? 'is-active' : ''}`}
          onClick={() => onOpenPanel(openPanel === 'customize' ? null : 'customize')}
        >
          Customize
        </button>
      </nav>

      <div className="topnav__right">
        <span className="pill topnav__score" title="Coins earned">
          🪙 {coins}
        </span>
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
