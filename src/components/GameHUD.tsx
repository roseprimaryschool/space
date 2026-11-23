import React, { useEffect, useRef, useState } from 'react';
import { Eye, Package, Pause, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot, HudWeaponSlot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  weapons: HudWeaponSlot[];
  modalOpen: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onToggleInventory: () => void;
  onToggleCamera: () => void;
  onSelectWeapon: (weaponId: string) => void;
  onCycleWeapon: () => void;
}

const COMPASS_MARKS: Array<{ deg: number; label: string; major: boolean }> = [
  { deg: 0, label: 'N', major: true },
  { deg: 45, label: 'NE', major: false },
  { deg: 90, label: 'E', major: true },
  { deg: 135, label: 'SE', major: false },
  { deg: 180, label: 'S', major: true },
  { deg: 225, label: 'SW', major: false },
  { deg: 270, label: 'W', major: true },
  { deg: 315, label: 'NW', major: false },
];

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  weapons,
  modalOpen,
  muted,
  onToggleMute,
  onTogglePause,
  onToggleInventory,
  onToggleCamera,
  onSelectWeapon,
  onCycleWeapon,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / Math.max(1, hud.maxStamina)) * 100));
  const enPct = Math.max(0, Math.min(100, (hud.energy / Math.max(1, hud.maxEnergy)) * 100));
  const dashPct = Math.round(hud.dashReady * 100);

  // Trailing ghost bar states for crisp damage/sprint drain feedback
  const [hpGhost, setHpGhost] = useState(hpPct);
  const [stamGhost, setStamGhost] = useState(stamPct);
  const prevHpRef = useRef(hpPct);
  const prevStamRef = useRef(stamPct);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (hpPct < prevHpRef.current) {
      t = setTimeout(() => setHpGhost(hpPct), 220);
    } else {
      setHpGhost(hpPct);
    }
    prevHpRef.current = hpPct;
    return () => {
      if (t) clearTimeout(t);
    };
  }, [hpPct]);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (stamPct < prevStamRef.current) {
      t = setTimeout(() => setStamGhost(stamPct), 120);
    } else {
      setStamGhost(stamPct);
    }
    prevStamRef.current = stamPct;
    return () => {
      if (t) clearTimeout(t);
    };
  }, [stamPct]);

  const hpBarColor =
    hpPct <= 25
      ? 'from-rose-500 to-red-400'
      : hpPct <= 55
        ? 'from-amber-400 to-yellow-300'
        : 'from-emerald-400 via-teal-400 to-cyan-400';

  const stamBarColor = hud.sprinting
    ? 'from-amber-300 via-cyan-300 to-sky-400'
    : stamPct <= 25
      ? 'from-amber-500 to-amber-300'
      : 'from-cyan-400 to-sky-300';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none">
      {/* Low Integrity Peripheral Vignette */}
      {hpPct < 30 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, transparent 58%, rgba(225, 29, 72, 0.34) 100%)',
          }}
        />
      )}

      {/* TOP BAR: Center Compass & District Directive + Top-Right Utility Actions */}
      <div className="fixed top-3 inset-x-4 md:top-4 md:inset-x-6 flex items-start justify-between gap-4">
        <div className="hidden lg:block w-44 shrink-0" aria-hidden="true" />

        {/* Top-Center Directional Compass + District Strip */}
        <div className="mx-auto w-full max-w-xl bg-[#070b16]/90 border border-cyan-500/35 hud-chamfer px-4 pt-2 pb-2.5 shadow-lg">
          {/* Compass Tape */}
          <div className="relative h-5 overflow-hidden border-b border-slate-800/90 mb-1.5">
            {/* Center Pointer */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 z-10 flex flex-col items-center">
              <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-cyan-300" />
            </div>

            {COMPASS_MARKS.map((mark) => {
              const delta = ((mark.deg - hud.headingDeg + 540) % 360) - 180;
              if (Math.abs(delta) > 78) return null;
              const leftPct = 50 + (delta / 78) * 46;
              return (
                <div
                  key={mark.label}
                  className="absolute top-1 -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPct}%` }}
                >
                  <span
                    className={`font-mono-tech leading-none tabular-nums ${
                      mark.major
                        ? mark.label === 'N'
                          ? 'text-[11px] font-bold text-cyan-300'
                          : 'text-[11px] font-semibold text-slate-200'
                        : 'text-[10px] text-slate-500'
                    }`}
                  >
                    {mark.label}
                  </span>
                </div>
              );
            })}

            {hud.waypoints.map((wp) => {
              const delta = ((wp.bearingDeg - hud.headingDeg + 540) % 360) - 180;
              if (Math.abs(delta) > 78) return null;
              const leftPct = 50 + (delta / 78) * 46;
              return (
                <div
                  key={`pip_${wp.id}`}
                  aria-hidden="true"
                  className="absolute bottom-0.5 -translate-x-1/2"
                  style={{ left: `${leftPct}%` }}
                >
                  <div
                    className="w-2 h-2 rotate-45 border border-slate-950"
                    style={{ backgroundColor: wp.color }}
                  />
                </div>
              );
            })}

            <span className="absolute right-0 top-0.5 font-mono-tech text-[10px] text-cyan-400/90 tabular-nums">
              {String(hud.headingDeg).padStart(3, '0')}°
            </span>
          </div>

          {/* District & Objective Strip */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display font-bold text-cyan-300 uppercase tracking-wide shrink-0">
                {hud.districtName}
              </span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-200 truncate">{hud.directive}</span>
            </div>
            <span className="font-mono-tech text-[11px] font-semibold text-purple-300 tabular-nums shrink-0">
              {hud.score} PTS
            </span>
          </div>
        </div>

        {/* Top-Right Chamfered Utility Cluster */}
        <div className="flex items-center gap-2 pointer-events-auto shrink-0">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Toggle Camera View (V)"
            title="Toggle View [V]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleCamera();
            }}
            className="w-10 h-10 hud-chamfer-sm bg-[#070b16]/90 hover:bg-[#111933] border border-cyan-500/35 hover:border-cyan-400 flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Loadout and Lore (Tab)"
            title="Loadout & Lore [Tab]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleInventory();
            }}
            className="w-10 h-10 hud-chamfer-sm bg-[#070b16]/90 hover:bg-[#111933] border border-cyan-500/35 hover:border-cyan-400 flex items-center justify-center text-cyan-300 cursor-pointer transition-colors"
          >
            <Package className="w-4 h-4" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
            title="Mute [M]"
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-10 h-10 hud-chamfer-sm bg-[#070b16]/90 hover:bg-[#111933] border border-cyan-500/35 hover:border-cyan-400 flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game (P)"
            title="Pause [P]"
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            className="w-10 h-10 hud-chamfer-sm bg-[#070b16]/90 hover:bg-[#111933] border border-cyan-500/35 hover:border-cyan-400 flex items-center justify-center text-slate-200 cursor-pointer transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Projected Objective Waypoint Markers */}
      {!modalOpen && hud.waypoints.map((wp) => (
        <div
          key={wp.id}
          data-testid={`waypoint-${wp.id}`}
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-0.5"
          style={{
            left: `${wp.xPct.toFixed(1)}%`,
            top: `${wp.yPct.toFixed(1)}%`,
            opacity: wp.inView ? 0.96 : 0.72,
          }}
        >
          <div className="flex items-center gap-1 bg-[#070b16]/85 border px-2 py-0.5 hud-chamfer-sm shadow-md" style={{ borderColor: wp.color }}>
            {!wp.inView && wp.xPct <= 10 && (
              <span className="font-mono-tech text-[10px]" style={{ color: wp.color }}>◀</span>
            )}
            <span
              className="w-2 h-2 rotate-45 shrink-0"
              style={{ backgroundColor: wp.color }}
            />
            <span className="font-display text-[11px] font-bold text-white whitespace-nowrap">
              {wp.label}
            </span>
            <span className="font-mono-tech text-[10px] tabular-nums" style={{ color: wp.color }}>
              {wp.distanceM}m
            </span>
            {!wp.inView && wp.xPct >= 90 && (
              <span className="font-mono-tech text-[10px]" style={{ color: wp.color }}>▶</span>
            )}
          </div>
          {wp.inView && (
            <span className="font-mono-tech text-[9px] text-slate-300 bg-[#070b16]/75 px-1.5 rounded-sm">
              {wp.sublabel}
            </span>
          )}
        </div>
      ))}

      {/* 3D Projected Enemy Shield & Hull Integrity Bars */}
      {!modalOpen && hud.enemyMarkers.map((em) => {
        const emHpPct = Math.max(0, Math.min(100, (em.hp / Math.max(1, em.maxHp)) * 100));
        const emShieldPct = em.maxShieldHp > 0
          ? Math.max(0, Math.min(100, (em.shieldHp / em.maxShieldHp) * 100))
          : 0;
        const shieldBroken = em.maxShieldHp > 0 && em.shieldHp <= 0;
        return (
          <div
            key={em.id}
            data-testid={`enemy-bar-${em.id}`}
            className="fixed -translate-x-1/2 -translate-y-full pointer-events-none flex flex-col items-center gap-0.5 min-w-[108px]"
            style={{
              left: `${em.xPct.toFixed(1)}%`,
              top: `${em.yPct.toFixed(1)}%`,
            }}
          >
            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-[#070b16]/88 border border-slate-700/80 hud-chamfer-sm shadow">
              <span className="font-display text-[10px] font-bold text-slate-100 whitespace-nowrap">
                {em.label}
              </span>
              {em.stunned && (
                <span className="font-mono-tech text-[9px] font-bold text-amber-300">
                  STUNNED
                </span>
              )}
              {!em.stunned && shieldBroken && (
                <span className="font-mono-tech text-[9px] font-bold text-emerald-300">
                  SHIELD BROKEN
                </span>
              )}
            </div>
            <div className="w-26 bg-[#070b16]/90 border border-slate-700/90 p-0.5 flex flex-col gap-0.5 shadow-md">
              {em.maxShieldHp > 0 && (
                <div className="h-1.5 w-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-[width] duration-100"
                    style={{ width: `${emShieldPct}%` }}
                  />
                </div>
              )}
              <div className="h-1.5 w-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-[width] duration-100"
                  style={{ width: `${emHpPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Toast Notification (Positioned cleanly below top compass visor) */}
      {hud.toast && (
        <div className="fixed top-22 left-1/2 -translate-x-1/2 bg-[#0a0f20]/95 border border-purple-400/70 hud-chamfer-sm px-5 py-2 text-xs md:text-sm font-medium text-purple-100 hud-text-shadow shadow-xl">
          {hud.toast}
        </div>
      )}

      {/* Exact Center Reticle */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <circle cx="14" cy="14" r="1.8" fill={hud.weaponCssColor || '#38bdf8'} />
          <path d="M14 2 L14 8" stroke="rgba(226,232,240,0.75)" strokeWidth="1.4" />
          <path d="M14 20 L14 26" stroke="rgba(226,232,240,0.75)" strokeWidth="1.4" />
          <path d="M2 14 L8 14" stroke="rgba(226,232,240,0.75)" strokeWidth="1.4" />
          <path d="M20 14 L26 14" stroke="rgba(226,232,240,0.75)" strokeWidth="1.4" />
          <path d="M8 6 L6 6 L6 8" stroke="rgba(56,189,248,0.55)" strokeWidth="1.2" />
          <path d="M20 6 L22 6 L22 8" stroke="rgba(56,189,248,0.55)" strokeWidth="1.2" />
          <path d="M8 22 L6 22 L6 20" stroke="rgba(56,189,248,0.55)" strokeWidth="1.2" />
          <path d="M20 22 L22 22 L22 20" stroke="rgba(56,189,248,0.55)" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Bottom-Center Context Interaction Prompt */}
      {hud.prompt && (
        <div className="fixed bottom-28 md:bottom-12 left-1/2 -translate-x-1/2 bg-[#070b16]/95 border border-cyan-400/75 hud-chamfer px-6 py-2.5 text-center shadow-2xl">
          <p className="font-display font-bold text-sm text-cyan-300 tracking-wide">
            {hud.prompt.label}
          </p>
          <p className="text-xs text-slate-300">{hud.prompt.sublabel}</p>
        </div>
      )}

      {/* BOTTOM-LEFT: Redesigned Chamfered Integrity, Stamina & Weapon Core Bars */}
      <div
        data-testid="vitals-hud"
        className="fixed bottom-4 left-4 md:bottom-6 md:left-6 w-76 md:w-88 bg-[#070b16]/90 border border-cyan-500/35 hud-chamfer px-4 py-3.5 shadow-2xl"
      >
        {/* Top micro-header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" stroke="#22d3ee" strokeWidth="1.4" fill="rgba(34,211,238,0.12)" />
              <rect x="6" y="6.5" width="4" height="3" fill="#38bdf8" />
            </svg>
            <span className="font-display font-bold text-xs tracking-wider text-white uppercase">
              Unit A-01 Vitals
            </span>
          </div>
          <span className="font-mono-tech text-[10px] text-cyan-300 uppercase">
            {hud.sprinting ? 'THRUST SPRINT' : dashPct >= 100 ? 'DASH READY' : `DASH ${dashPct}%`}
          </span>
        </div>

        {/* 1. CHASSIS INTEGRITY (Health) */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono-tech mb-1">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M5 1H7V5H11V7H7V11H5V7H1V5H5V1Z" fill="#34d399" />
              </svg>
              INTEGRITY
            </span>
            <span data-testid="hp-value" className="text-white tabular-nums font-semibold">
              {hud.hp} <span className="text-slate-400">/ {hud.maxHp}</span>
            </span>
          </div>
          <div className="relative h-3.5 bg-slate-900/95 border border-slate-700/80 hud-bar-skew overflow-hidden">
            {/* Trailing damage ghost bar */}
            <div
              className="absolute inset-y-0 left-0 bg-rose-400/75 transition-[width] duration-700"
              style={{ width: `${hpGhost}%` }}
            />
            {/* Active health fill */}
            <div
              className={`relative h-full bg-gradient-to-r ${hpBarColor} transition-[width] duration-150`}
              style={{ width: `${hpPct}%` }}
            />
            {/* Crisp segmented tick dividers */}
            <div aria-hidden="true" className="absolute inset-0 hud-bar-ticks pointer-events-none" />
          </div>
        </div>

        {/* 2. KINETIC STAMINA (Sprint / Thruster Dash / Boost) */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono-tech mb-1">
            <span className="flex items-center gap-1.5 text-cyan-200 font-semibold">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M7 1L2 7H6L5 11L10 5H6L7 1Z" fill="#22d3ee" />
              </svg>
              STAMINA
            </span>
            <span data-testid="stamina-value" className="text-cyan-100 tabular-nums">
              {hud.stamina} <span className="text-slate-400">/ {hud.maxStamina}</span>
            </span>
          </div>
          <div className="relative h-2.5 bg-slate-900/95 border border-slate-700/80 hud-bar-skew overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-amber-300/65 transition-[width] duration-500"
              style={{ width: `${stamGhost}%` }}
            />
            <div
              className={`relative h-full bg-gradient-to-r ${stamBarColor} transition-[width] duration-100`}
              style={{ width: `${stamPct}%` }}
            />
            <div aria-hidden="true" className="absolute inset-0 hud-bar-ticks pointer-events-none" />
          </div>
        </div>

        {/* 3. WEAPON ENERGY CORE */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono-tech mb-1">
            <span className="flex items-center gap-1.5 text-purple-200 font-semibold">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <circle cx="6" cy="6" r="4" stroke="#c084fc" strokeWidth="1.5" />
                <circle cx="6" cy="6" r="1.5" fill="#e879f9" />
              </svg>
              WEAPON CORE
            </span>
            <span data-testid="energy-value" className="text-purple-100 tabular-nums">
              {hud.energy} <span className="text-slate-400">/ {hud.maxEnergy}</span>
            </span>
          </div>
          <div className="relative h-2 bg-slate-900/95 border border-slate-700/80 hud-bar-skew overflow-hidden">
            <div
              className="relative h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-[width] duration-100"
              style={{ width: `${enPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT: Tactical Weapon Switcher & Discovery Telemetry */}
      <div
        data-testid="weapon-arsenal-hud"
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 bg-[#070b16]/90 border border-purple-500/35 hud-chamfer px-4 py-3 shadow-2xl hidden sm:block min-w-[260px] max-w-[330px]"
      >
        <div className="flex items-center justify-between gap-3 mb-1">
          <span
            className="font-display font-bold text-sm truncate"
            style={{ color: hud.weaponCssColor || '#38bdf8' }}
          >
            {hud.weaponName}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {weapons.length > 1 && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCycleWeapon();
                }}
                className="pointer-events-auto px-1.5 py-0.5 text-[10px] font-mono-tech bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 hud-chamfer-sm cursor-pointer"
                title="Cycle Weapon [Q]"
              >
                [Q] Swap
              </button>
            )}
            <span className="font-mono-tech text-[10px] text-slate-400 uppercase">
              {hud.cameraMode === 'third' ? '3RD VIEW' : '1ST VIEW'}
            </span>
          </div>
        </div>

        {/* Active Weapon Range & Special Ability */}
        <div
          data-testid="active-weapon-ability"
          className="text-[10px] font-mono-tech text-slate-300 mb-2 truncate"
        >
          <span className="text-cyan-300 font-semibold">{hud.weaponRange}m</span>
          <span aria-hidden="true" className="text-slate-600 mx-1">·</span>
          <span className="text-purple-200">{hud.weaponAbility}</span>
        </div>

        {/* Collected Weapon Hotbar Slots */}
        <div className="flex flex-wrap gap-1.5 mb-2 pointer-events-auto">
          {weapons.map((w, idx) => (
            <button
              key={w.id}
              type="button"
              tabIndex={-1}
              data-testid={`weapon-slot-${idx + 1}`}
              onClick={(e) => {
                e.currentTarget.blur();
                onSelectWeapon(w.id);
              }}
              className={`px-2 py-1 hud-chamfer-sm border text-[10px] font-mono-tech flex items-center gap-1.5 cursor-pointer transition-colors ${
                w.equipped
                  ? 'bg-slate-800/95 text-white font-semibold'
                  : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-600'
              }`}
              style={w.equipped ? { borderColor: w.cssColor } : undefined}
              title={`${w.name} (${w.damage}x${w.projectileCount} DMG · ${w.abilityDesc})`}
            >
              <span className="text-slate-400">[{idx + 1}]</span>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: w.cssColor }} />
              <span className="max-w-[92px] truncate">{w.name.replace('Mk-I ', '').replace('Emitter', '').trim()}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] font-mono-tech text-slate-300 tabular-nums pt-1.5 border-t border-slate-800/90">
          <span>Relics {hud.relicsFound}/{hud.totalRelics}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Caches {hud.chestsOpened}/{hud.totalChests}</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-purple-300">{hud.shards} Shards</span>
        </div>
      </div>
    </div>
  );
};
