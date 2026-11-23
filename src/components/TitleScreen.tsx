import React from 'react';

interface TitleScreenProps {
  bestScore: number;
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ bestScore, onStart }) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-12">
      {/* Top-Left Calm Framing Zone Overlooking the Neon Alley Flyover */}
      <div className="max-w-lg pointer-events-auto mt-2 md:mt-6 bg-[#070b16]/80 border border-cyan-500/35 hud-chamfer p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-4 mb-4">
          <svg
            width="54"
            height="54"
            viewBox="0 0 54 54"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <polygon
              points="27,3 49,15 49,39 27,51 5,39 5,15"
              stroke="#a855f7"
              strokeWidth="2"
              fill="rgba(10, 15, 32, 0.92)"
            />
            <polygon
              points="27,11 41,19 41,35 27,43 13,35 13,19"
              stroke="#22d3ee"
              strokeWidth="1.5"
              fill="rgba(34, 211, 238, 0.12)"
            />
            <rect x="20" y="24.5" width="14" height="5" rx="1.5" fill="#38bdf8" />
          </svg>
          <div>
            <p className="text-[11px] font-mono-tech uppercase tracking-[0.22em] text-cyan-300 mb-0.5">
              Year 3026 · Directive: Find Humanity
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-white hud-text-shadow">
              Nexus Prime
            </h1>
          </div>
        </div>

        <p className="text-slate-200 text-sm md:text-base leading-relaxed mb-6 hud-text-shadow">
          A millennium after humanity vanished, Unit A-01 awakens outside a living vertical megacity. Navigate narrow neon corridors, outmaneuver rogue defense bots, loot hidden caches, and uncover the fate of Project Exodus.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="hud-chamfer-sm px-7 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm md:text-base tracking-wide transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0"
          >
            Awaken Unit A-01
          </button>
          {bestScore > 0 && (
            <span className="text-xs md:text-sm font-mono-tech text-purple-200 hud-text-shadow tabular-nums">
              Best Score · {bestScore}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Clean Single-Line Control Hint */}
      <div className="w-full flex justify-center">
        <p className="text-[11px] md:text-xs font-mono-tech text-slate-200 bg-[#070b16]/88 border border-cyan-500/30 hud-chamfer-sm px-5 py-2.5 hud-text-shadow text-center">
          WASD Move · Shift Sprint / Dash · Space Jump · Click Fire · 1-5 / Q Swap Weapon · E Talk / Loot · F Hack · Tab Loadout
        </p>
      </div>
    </div>
  );
};
