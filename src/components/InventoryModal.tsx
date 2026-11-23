import React, { useState } from 'react';
import type { ComputedPlayerStats, LootCategory, LootItem } from '../game/types';
import type { LoreEntry } from '../game/types';

interface InventoryModalProps {
  inventory: LootItem[];
  equippedIds: {
    weapon: string;
    core: string;
    armor: string;
    hacking: string | null;
    cosmetic: string;
  };
  stats: ComputedPlayerStats;
  unlockedLore: LoreEntry[];
  onEquip: (item: LootItem) => void;
  onClose: () => void;
}

const RARITY_COLOR: Record<string, string> = {
  Common: 'text-cyan-300',
  Rare: 'text-emerald-300',
  Epic: 'text-purple-300',
  Legendary: 'text-amber-300',
};

const CATEGORY_LABEL: Record<LootCategory, string> = {
  weapon: 'Weapon',
  core: 'Energy Core',
  armor: 'Armor',
  hacking: 'Hacking Tool',
  cosmetic: 'Chassis Finish',
  relic: 'Relic',
};

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  equippedIds,
  stats,
  unlockedLore,
  onEquip,
  onClose,
}) => {
  const [tab, setTab] = useState<'loadout' | 'lore'>('loadout');

  const isEquipped = (item: LootItem): boolean => {
    if (item.category === 'weapon') return equippedIds.weapon === item.id;
    if (item.category === 'core') return equippedIds.core === item.id;
    if (item.category === 'armor') return equippedIds.armor === item.id;
    if (item.category === 'hacking') return equippedIds.hacking === item.id;
    if (item.category === 'cosmetic') return equippedIds.cosmetic === item.id;
    return item.category === 'relic';
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 md:p-8 bg-black/60">
      <div
        role="dialog"
        aria-label="Unit A-01 Loadout and Lore Codex"
        className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-[#070b16]/95 border border-cyan-500/45 hud-chamfer shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-xl font-bold text-white">
              Unit A-01 Systems
            </h2>
            <div className="flex items-center gap-1 p-1 bg-slate-900 hud-chamfer-sm">
              <button
                type="button"
                onClick={() => setTab('loadout')}
                className={`px-3 py-1.5 text-xs font-medium hud-chamfer-sm cursor-pointer transition-colors ${
                  tab === 'loadout' ? 'bg-cyan-400 text-slate-950 font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Loadout & Modules ({inventory.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('lore')}
                className={`px-3 py-1.5 text-xs font-medium hud-chamfer-sm cursor-pointer transition-colors ${
                  tab === 'lore' ? 'bg-purple-500 text-white font-semibold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Lore Codex ({unlockedLore.length})
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono-tech text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:border-cyan-400 hud-chamfer-sm cursor-pointer"
          >
            Resume [Esc]
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'loadout' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Live Computed Chassis Stats */}
              <div className="bg-slate-900/85 border border-cyan-500/25 hud-chamfer-sm p-4 space-y-3 h-fit">
                <h3 className="font-display text-sm font-semibold text-cyan-300 uppercase tracking-wider">
                  Chassis Telemetry
                </h3>
                <div className="space-y-2 text-xs font-mono-tech tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Integrity</span>
                    <span className="text-white">{stats.maxHp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Stamina</span>
                    <span className="text-cyan-200">{stats.maxStamina} ({stats.staminaRegen}/s)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Armor Rating</span>
                    <span className="text-white">{stats.armor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weapon Core</span>
                    <span className="text-white">{stats.maxEnergy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weapon Damage</span>
                    <span className="text-white">{stats.weaponDamage} x{stats.projectileCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Weapon Range</span>
                    <span className="text-cyan-200">{stats.range} m</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400 shrink-0">Active Perk</span>
                    <span className="text-purple-200 text-right truncate">{stats.abilityName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Move Speed</span>
                    <span className="text-white">{stats.moveSpeed.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Air Double Jump</span>
                    <span className={stats.hasDoubleJump ? 'text-emerald-400' : 'text-slate-500'}>
                      {stats.hasDoubleJump ? 'ACTIVE' : 'LOCKED'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hack Bypass Bonus</span>
                    <span className="text-purple-300">+{stats.hackBonus} Nodes</span>
                  </div>
                </div>
              </div>

              {/* Right: Discovered Modules & Gear */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {inventory.map((item) => {
                  const eq = isEquipped(item);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 hud-chamfer-sm border flex flex-col justify-between gap-3 ${
                        eq
                          ? 'bg-slate-900 border-cyan-400/75'
                          : 'bg-slate-900/55 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs font-mono-tech mb-1">
                          <span className={RARITY_COLOR[item.rarity] ?? 'text-slate-300'}>
                            {item.rarity} · {CATEGORY_LABEL[item.category]}
                          </span>
                          {item.cosmetic && (
                            <span
                              className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0"
                              style={{ backgroundColor: item.cosmetic.cssSwatch }}
                            />
                          )}
                        </div>
                        <h4 className="font-display font-semibold text-sm text-white mb-1">
                          {item.name}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.description}
                        </p>
                        {item.category === 'weapon' && item.stats.abilityName && (
                          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono-tech flex flex-col gap-0.5">
                            <span className="text-cyan-300">
                              {item.stats.damage ?? 22}x{item.stats.projectileCount ?? 1} DMG · {item.stats.range ?? 46}m
                            </span>
                            <span className="text-purple-200">{item.stats.abilityDesc ?? item.stats.abilityName}</span>
                          </div>
                        )}
                      </div>

                      {item.category !== 'relic' ? (
                        <button
                          type="button"
                          disabled={eq}
                          onClick={() => onEquip(item)}
                          className={`w-full py-1.5 hud-chamfer-sm text-xs font-medium transition-colors ${
                            eq
                              ? 'bg-cyan-500/20 text-cyan-300 cursor-default'
                              : 'bg-slate-800 hover:bg-cyan-400 hover:text-slate-950 text-slate-200 cursor-pointer'
                          }`}
                        >
                          {eq ? 'Equipped' : 'Equip Module'}
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono-tech text-amber-300">
                          Passive Relic Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {unlockedLore.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Explore terminals, speak with surviving units, and unlock caches to recover Nexus Prime history.
                </p>
              ) : (
                unlockedLore.map((entry) => (
                  <article
                    key={entry.id}
                    className="p-4 hud-chamfer-sm bg-slate-900/75 border border-slate-800"
                  >
                    <div className="flex items-center gap-2 text-xs font-mono-tech text-purple-300 mb-1">
                      <span>{entry.district}</span>
                      <span aria-hidden="true">·</span>
                      <span>{entry.timestamp}</span>
                    </div>
                    <h3 className="font-display text-base font-semibold text-white mb-1.5">
                      {entry.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{entry.body}</p>
                  </article>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
