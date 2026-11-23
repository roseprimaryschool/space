import React from 'react';
import { getOpenPorts, type CircuitPuzzle, type CircuitTile } from '../game/puzzles';

interface HackingModalProps {
  puzzle: CircuitPuzzle;
  onRotateTile: (row: number, col: number) => void;
  onClose: () => void;
}

const TileSvg: React.FC<{ tile: CircuitTile }> = ({ tile }) => {
  const ports = getOpenPorts(tile.shape, tile.rotation);
  const stroke = tile.powered ? '#22d3ee' : '#64748b';
  const nodeFill = tile.powered ? '#a855f7' : '#334155';

  // Port endpoints: 0=N(50,0), 1=E(100,50), 2=S(50,100), 3=W(0,50)
  const coords: Record<number, [number, number]> = {
    0: [50, 0],
    1: [100, 50],
    2: [50, 100],
    3: [0, 50],
  };

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {ports.map((dir) => {
        const [tx, ty] = coords[dir];
        return (
          <line
            key={dir}
            x1="50"
            y1="50"
            x2={tx}
            y2={ty}
            stroke={stroke}
            strokeWidth="12"
            strokeLinecap="round"
          />
        );
      })}
      <circle
        cx="50"
        cy="50"
        r={tile.shape === 'source' || tile.shape === 'sink' ? 22 : 13}
        fill={nodeFill}
        stroke={stroke}
        strokeWidth="4"
      />
    </svg>
  );
};

export const HackingModal: React.FC<HackingModalProps> = ({
  puzzle,
  onRotateTile,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-black/60">
      <div
        role="dialog"
        aria-label={`Hacking Terminal: ${puzzle.title}`}
        className="w-full max-w-lg bg-[#070b16]/95 border border-purple-500/55 hud-chamfer p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div>
            <p className="text-xs font-mono-tech uppercase tracking-wider text-purple-300 mb-1">
              Quantum Conduit Override
            </p>
            <h2 className="font-display text-xl font-bold text-white">
              {puzzle.title}
            </h2>
            <p className="text-sm text-slate-300 mt-0.5">{puzzle.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono-tech text-slate-300 hover:text-white px-3 py-1 hud-chamfer-sm bg-slate-900 border border-slate-700 hover:border-purple-400 cursor-pointer shrink-0"
          >
            Abort
          </button>
        </div>

        <p className="text-xs font-mono-tech text-slate-400 mb-4 tabular-nums">
          Click nodes to rotate 90° and route energy from Top-Left Source to Bottom-Right Core · Moves: {puzzle.moves}
        </p>

        <div
          className="grid gap-2 mx-auto max-w-xs mb-5"
          style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }}
        >
          {puzzle.tiles.map((row, rIdx) =>
            row.map((tile, cIdx) => {
              const isEndpoint = tile.shape === 'source' || tile.shape === 'sink';
              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  type="button"
                  disabled={tile.locked || puzzle.solved}
                  aria-label={`Circuit node row ${rIdx + 1} column ${cIdx + 1}${tile.locked ? ' locked' : ''}`}
                  onClick={() => onRotateTile(rIdx, cIdx)}
                  className={`aspect-square hud-chamfer-sm border p-1.5 transition-colors ${
                    tile.powered
                      ? 'bg-slate-900 border-cyan-400/85'
                      : 'bg-slate-900/75 border-slate-700'
                  } ${
                    tile.locked
                      ? 'opacity-90 cursor-default'
                      : 'hover:border-purple-400 cursor-pointer'
                  }`}
                >
                  <TileSvg tile={tile} />
                  {isEndpoint && (
                    <span className="sr-only">
                      {tile.shape === 'source' ? 'Source' : 'Core'}
                    </span>
                  )}
                </button>
              );
            }),
          )}
        </div>

        <div className="flex items-center justify-between text-xs font-mono-tech pt-2 border-t border-slate-800">
          <span className={puzzle.solved ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
            {puzzle.solved ? 'CONDUIT ALIGNED · ACCESS GRANTED' : 'SIGNAL INCOMPLETE'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 hud-chamfer-sm bg-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-400/50 text-cyan-200 cursor-pointer transition-colors"
          >
            {puzzle.solved ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
