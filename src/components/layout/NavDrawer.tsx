import { useState } from 'react';
import { motion } from 'motion/react';
import { CITIES, CITY_ORDER } from '../../data/cities';
import { BADGES, useProgress } from '../../state/progress';
import { ALL_COSMETICS, SLOT_META, type CosmeticId, type SlotMeta } from '../../data/cosmetics';
import { PetGlyph, PlayerCharacter } from '../player/PlayerCharacter';
import { sfx } from '../../audio/sound';
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
        <button className="drawer__close" onClick={onClose} aria-label="Close panel">
          ✕
        </button>

        {panel === 'progress' ? (
          <>
            <h2>My Progress</h2>
            <p className="drawer__sub">
              {totalComplete} of {totalLevels} destinations explored across Curio-City.
            </p>
            {CITY_ORDER.map((cityId) => {
              const city = CITIES[cityId];
              const { done, total } = cityProgress(cityId);
              return (
                <section className="drawer__city" key={cityId} data-city={cityId}>
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
                </section>
              );
            })}
          </>
        ) : panel === 'achievements' ? (
          <>
            <h2>Achievements</h2>
            <p className="drawer__sub">Badges you collect by finishing adventures.</p>
            <div className="badge-grid">
              {Object.values(BADGES).map((badge) => {
                const earned = badges.includes(badge.id);
                return (
                  <div className={`badge-card ${earned ? 'is-earned' : ''}`} key={badge.id}>
                    <div className="badge-card__icon">{badge.icon}</div>
                    <strong>{badge.name}</strong>
                    <span>{earned ? badge.description : 'Not earned yet'}</span>
                  </div>
                );
              })}
            </div>
          </>
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
                  <span>
                    {isEquipped
                      ? 'Equipped'
                      : owned
                        ? 'Tap to equip'
                        : confirming
                          ? `Buy for 🪙 ${item.coinCost}?`
                          : affordable
                            ? `🪙 ${item.coinCost}`
                            : `🪙 ${item.coinCost} · ${short} to go`}
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
          🪙 {coins} coins
        </span>
      </div>

      <h3 className="wardrobe__heading">Make it yours · free</h3>
      {SLOT_META.filter((slot) => slot.free).map(renderSlot)}

      <h3 className="wardrobe__heading">Shop · spend your coins</h3>
      {SLOT_META.filter((slot) => !slot.free).map(renderSlot)}
    </>
  );
}
