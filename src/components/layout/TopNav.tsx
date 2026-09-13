import { useEffect, useState } from 'react';
import { sfx } from '../../audio/sound';
import { useProgress } from '../../state/progress';
import { Logo } from './Logo';
import { Icon } from '../icons/Icon';
import { DwellTarget } from '../../tracker/DwellTarget';
import './layout.css';

export type NavPanel = 'progress' | 'achievements' | 'customize' | 'settings' | null;

interface TopNavProps {
  onHome: () => void;
  openPanel: NavPanel;
  onOpenPanel: (panel: NavPanel) => void;
  compact?: boolean;
  onLeave?: () => void;
}

export function TopNav({ onHome, openPanel, onOpenPanel, compact = false, onLeave }: TopNavProps) {
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
        <DwellTarget onActivate={onHome}>
          <button className="topnav__link" onClick={onHome}>
            World
          </button>
        </DwellTarget>
        <DwellTarget onActivate={() => onOpenPanel(openPanel === 'progress' ? null : 'progress')}>
          <button
            className={`topnav__link ${openPanel === 'progress' ? 'is-active' : ''}`}
            onClick={() => onOpenPanel(openPanel === 'progress' ? null : 'progress')}
          >
            My Progress
          </button>
        </DwellTarget>
        <DwellTarget onActivate={() => onOpenPanel(openPanel === 'achievements' ? null : 'achievements')}>
          <button
            className={`topnav__link ${openPanel === 'achievements' ? 'is-active' : ''}`}
            onClick={() => onOpenPanel(openPanel === 'achievements' ? null : 'achievements')}
          >
            Achievements
          </button>
        </DwellTarget>
        <DwellTarget onActivate={() => onOpenPanel(openPanel === 'customize' ? null : 'customize')}>
          <button
            className={`topnav__link ${openPanel === 'customize' ? 'is-active' : ''}`}
            onClick={() => onOpenPanel(openPanel === 'customize' ? null : 'customize')}
          >
            Customize
          </button>
        </DwellTarget>
      </nav>

      <div className="topnav__right">
        <span className="pill topnav__score" title="Coins earned">
          <Icon name="coin" size={18} />
          {coins}
        </span>
        <span className="pill topnav__score" title="Levels completed">
          <Icon name="star" size={18} />
          {totalComplete} / {totalLevels}
        </span>
        {onLeave && (
          <DwellTarget onActivate={onLeave}>
            <button className="topnav__leave" type="button" onClick={onLeave}>
              Sign out
            </button>
          </DwellTarget>
        )}
        <DwellTarget onActivate={() => onOpenPanel(openPanel === 'settings' ? null : 'settings')}>
          <button
            className={`topnav__icon ${openPanel === 'settings' ? 'is-active' : ''}`}
            onClick={() => onOpenPanel(openPanel === 'settings' ? null : 'settings')}
            aria-label="Settings"
            title="Settings"
          >
            ⚙️
          </button>
        </DwellTarget>
        <DwellTarget onActivate={toggleMute}>
          <button
            className="topnav__icon"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            <Icon name={muted ? 'sound-off' : 'sound-on'} size={20} />
          </button>
        </DwellTarget>
      </div>
    </header>
  );
}
