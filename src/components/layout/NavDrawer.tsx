import { useState } from 'react';
import { motion } from 'motion/react';
import { CITIES, CITY_ORDER } from '../../data/cities';
import { BADGES, useProgress } from '../../state/progress';
import { ALL_COSMETICS, SLOT_META, type CosmeticId, type SlotMeta } from '../../data/cosmetics';
import { PetGlyph, PlayerCharacter } from '../player/PlayerCharacter';
import { CITY_ILLUSTRATIONS } from '../world/CityIllustrations';
import { Islet } from '../world/IslandBase';
import { Icon } from '../icons/Icon';
import { sfx } from '../../audio/sound';
import { settings, type VoiceMode } from '../../state/settings';
import { useSettings } from '../../hooks/useSettings';
import { CameraSettings } from '../../tracker/CameraSettings';
import { DwellTarget } from '../../tracker/DwellTarget';
import type { NavPanel } from './TopNav';
import './layout.css';

export function NavDrawer({ panel, onClose }: { panel: NavPanel; onClose: () => void }) {
  const { isLevelComplete, cityProgress, badges, totalComplete, totalLevels } = useProgress();
  if (!panel) return null;

  return (
    <>
      <motion.div
        className="drawer-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        <DwellTarget onActivate={onClose}>
          <button className="drawer__close" onClick={onClose} aria-label="Close panel">
            ✕
          </button>
        </DwellTarget>

        {panel === 'progress' ? (
          <>
            <h2>My Progress</h2>
            <p className="drawer__sub">
              {totalComplete} of {totalLevels} destinations explored across Curio-City.
            </p>
            {CITY_ORDER.map((cityId, index) => {
              const city = CITIES[cityId];
              const { done, total } = cityProgress(cityId);
              const Illustration = CITY_ILLUSTRATIONS[cityId];
              return (
                <motion.section
                  className="drawer__city drawer__city--island"
                  key={cityId}
                  data-city={cityId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="drawer__city-island">
                    <Illustration animated={false} />
                  </div>
                  <div className="drawer__city-body">
                    <div className="drawer__city-head">
                      <strong>{city.name}</strong>
                      <span className="pill">
                        {done} / {total}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${(done / total) * 100}%` }} />
                    </div>
                    <ul className="drawer__levels">
                      {city.levels.map((level) => {
                        const done_ = isLevelComplete(cityId, level.id);
                        return (
                          <li key={level.id} className={done_ ? 'is-done' : ''}>
                            <span className="drawer__tick">{done_ ? '✓' : level.index}</span>
                            {level.name}
                            {level.status === 'soon' && !done_ && (
                              <span style={{ marginLeft: 'auto', fontSize: '0.72rem', opacity: 0.7 }}>
                                Coming soon
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.section>
              );
            })}
          </>
        ) : panel === 'achievements' ? (
          <>
            <h2>Achievements</h2>
            <p className="drawer__sub">Badges you collect by finishing adventures.</p>
            <div className="badge-grid">
              {Object.values(BADGES).map((badge, index) => {
                const earned = badges.includes(badge.id);
                return (
                  <motion.div
                    className={`badge-card badge-card--island ${earned ? 'is-earned' : ''}`}
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="badge-card__island">
                      <Islet id={badge.id} size={72} muted={!earned} />
                      <span className="badge-card__icon">
                        <Icon name={badge.icon} size={32} />
                      </span>
                    </div>
                    <strong>{badge.name}</strong>
                    <span>{earned ? badge.description : 'Not earned yet'}</span>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : panel === 'settings' ? (
          <SettingsPanel />
        ) : (
          <Wardrobe />
        )}
      </motion.aside>
    </>
  );
}

/**
 * The wardrobe is deliberately split in two: everything that describes the
 * student (skin, eyes, hair) is free and always available, and the coin shop
 * only sells things you put *on* - shirts and pets at the expensive end.
 */
function Wardrobe() {
  const { coins, unlockedCosmetics, equippedCosmetics, unlockCosmetic, equipCosmetic } = useProgress();
  // Expensive items get a confirm tap rather than buying on the first click -
  // a mis-tap should never cost a student 180 coins.
  const [pendingBuy, setPendingBuy] = useState<CosmeticId | null>(null);

  const equip = (id: CosmeticId) => {
    setPendingBuy(null);
    equipCosmetic(id);
    sfx.play('tap');
  };

  const buy = (id: CosmeticId) => {
    if (pendingBuy !== id) {
      setPendingBuy(id);
      sfx.play('hover');
      return;
    }
    setPendingBuy(null);
    unlockCosmetic(id);
    equipCosmetic(id);
    sfx.play('success');
  };

  const renderSlot = (slot: SlotMeta) => {
    const items = ALL_COSMETICS.filter((item) => item.slot === slot.id);

    return (
      <section className="drawer__city" key={slot.id}>
        <div className="drawer__city-head">
          <strong>{slot.label}</strong>
          <span className="pill pill--ghost">{slot.free ? 'Always free' : slot.hint}</span>
        </div>

        {slot.kind === 'colour' ? (
          <div className="swatch-grid">
            {items.map((item) => {
              const isEquipped = equippedCosmetics[slot.id] === item.id;
              return (
                <button
                  key={item.id}
                  className={`swatch ${isEquipped ? 'is-equipped' : ''}`}
                  onClick={() => equip(item.id)}
                  aria-pressed={isEquipped}
                  title={item.name}
                >
                  <i style={{ background: item.swatch }}>{isEquipped ? '✓' : ''}</i>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="cosmetic-grid">
            {items.map((item) => {
              const owned = unlockedCosmetics.includes(item.id);
              const isEquipped = equippedCosmetics[slot.id] === item.id;
              const affordable = coins >= item.coinCost;
              const confirming = pendingBuy === item.id;
              const short = item.coinCost - coins;

              return (
                <button
                  key={item.id}
                  className={`cosmetic-card ${isEquipped ? 'is-equipped' : ''} ${
                    confirming ? 'is-confirming' : ''
                  } ${!owned && !affordable ? 'is-locked' : ''}`}
                  onClick={() => (owned ? equip(item.id) : affordable ? buy(item.id) : undefined)}
                  disabled={!owned && !affordable}
                  title={item.blurb ?? item.name}
                >
                  <span className="cosmetic-card__art">
                    {slot.id === 'pet' ? (
                      item.id === 'pet-none' ? (
                        <span className="cosmetic-card__empty">no pet</span>
                      ) : (
                        <PetGlyph id={item.id} size={48} animated={false} />
                      )
                    ) : (
                      <PlayerCharacter
                        size={50}
                        animated={false}
                        equipped={{ ...equippedCosmetics, [slot.id]: item.id }}
                      />
                    )}
                  </span>
                  <strong>{item.name}</strong>
                  <span className="cosmetic-card__price">
                    {isEquipped || owned ? (
                      isEquipped ? (
                        'Equipped'
                      ) : (
                        'Tap to equip'
                      )
                    ) : (
                      <>
                        {confirming && 'Buy for'}
                        <Icon name="coin" size={14} />
                        {item.coinCost}
                        {confirming && '?'}
                        {!confirming && !affordable && ` · ${short} to go`}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <>
      <h2>Customize</h2>
      <p className="drawer__sub">
        Skin, eyes and hair are always free. Shirts, hats, accessories and pets cost coins you earn
        from lessons.
      </p>

      <div className="customize__preview">
        <PlayerCharacter size={132} equipped={equippedCosmetics} />
        <span className="pill" title="Coins available">
          <Icon name="coin" size={18} />
          {coins} coins
        </span>
      </div>

      <h3 className="wardrobe__heading">Make it yours · free</h3>
      {SLOT_META.filter((slot) => slot.free).map(renderSlot)}

      <h3 className="wardrobe__heading">Shop · spend your coins</h3>
      {SLOT_META.filter((slot) => !slot.free).map(renderSlot)}
    </>
  );
}

const VOICE_MODES: { id: VoiceMode; label: string; blurb: string }[] = [
  {
    id: 'real',
    label: "Curio's own voice",
    blurb: 'Her real voice, warm and a bit squeaky. Uses online credits - each line is only ever paid for once, then kept on this device.',
  },
  {
    id: 'browser',
    label: 'Your device’s voice',
    blurb: 'Reads her lines with the voice built into this computer. Free and works offline, but it sounds like a robot.',
  },
  {
    id: 'off',
    label: 'No talking',
    blurb: 'Curio stays quiet. Everything she says is still written out on screen.',
  },
];

/**
 * The paid parts of Curio, in the hands of whoever owns the device. A teacher
 * on a class set, or anyone demoing on a shared allowance, can turn them off
 * here rather than needing a redeploy.
 */
function SettingsPanel() {
  const { voiceMode, aiEnabled } = useSettings();

  return (
    <>
      <h2>Settings</h2>
      <p className="drawer__sub">
        Check the camera is seeing you, and decide how much of Curio is switched on.
        She can talk out loud and answer questions of her own; both use an online
        service, so you can turn them down here and everything still works.
      </p>

      <section className="drawer__city">
        <CameraSettings />
      </section>

      <section className="drawer__city">
        <div className="drawer__city-head">
          <strong>Curio’s voice</strong>
        </div>
        <div className="setting-list">
          {VOICE_MODES.map((option) => {
            const activate = () => {
              settings.setVoiceMode(option.id);
              sfx.play('tap');
            };
            return (
              <DwellTarget key={option.id} onActivate={activate}>
                <button
                  className={`setting-option ${voiceMode === option.id ? 'is-on' : ''}`}
                  onClick={activate}
                  aria-pressed={voiceMode === option.id}
                >
                  <span className="setting-option__mark" aria-hidden="true">
                    {voiceMode === option.id ? '●' : ''}
                  </span>
                  <span>
                    <strong>{option.label}</strong>
                    <span>{option.blurb}</span>
                  </span>
                </button>
              </DwellTarget>
            );
          })}
        </div>
      </section>

      <section className="drawer__city">
        <div className="drawer__city-head">
          <strong>Curio’s answers</strong>
        </div>
        <div className="setting-list">
          <DwellTarget
            onActivate={() => {
              settings.setAiEnabled(!aiEnabled);
              sfx.play('tap');
            }}
          >
            <button
              className={`setting-option ${aiEnabled ? 'is-on' : ''}`}
              onClick={() => {
                settings.setAiEnabled(!aiEnabled);
                sfx.play('tap');
              }}
              aria-pressed={aiEnabled}
            >
              <span className="setting-option__mark" aria-hidden="true">
                {aiEnabled ? '✓' : ''}
              </span>
              <span>
                <strong>Let Curio think for herself</strong>
                <span>
                  Her hints, the “Ask me anything” box, and the little summary at the end of a
                  lesson. Switched off, she uses her written lines instead and the question box
                  is hidden.
                </span>
              </span>
            </button>
          </DwellTarget>
        </div>
      </section>

      <p className="drawer__sub" style={{ marginTop: 18, fontSize: '0.82rem' }}>
        These are saved on this device only, and they never affect progress, coins or
        anything you have unlocked.
      </p>
    </>
  );
}
