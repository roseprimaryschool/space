import React from 'react';
import { ENDINGS } from '../game/story';
import type { GamePhase, HudSnapshot } from '../game/types';

interface StatusModalProps {
  phase: Extract<GamePhase, 'paused' | 'gameover'>;
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onDownloadSingleFile: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  phase,
  hud,
  onResume,
  onRestart,
  onReturnTitle,
  onDownloadSingleFile,
}) => {
  const isVictory = phase === 'gameover' && hud.outcome === 'victory';
  const endingInfo = hud.endingChosen ? ENDINGS[hud.endingChosen] : null;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-black/65">
      <div
        role="dialog"
        aria-label={phase === 'paused' ? 'Game Paused' : isVictory ? 'Ascension Complete' : 'Unit Offline'}
        className="w-full max-w-md bg-[#070b16]/95 border border-cyan-500/45 hud-chamfer p-7 shadow-2xl"
      >
        <p className="text-xs font-mono-tech uppercase tracking-widest text-cyan-300 mb-1">
          {phase === 'paused'
            ? 'Simulation Suspended'
            : isVictory
              ? endingInfo?.subtitle ?? 'Directive Complete'
              : 'Chassis Integrity Depleted'}
        </p>
        <h2 className="font-display text-2xl font-bold text-white mb-2">
          {phase === 'paused'
            ? 'Nexus Prime Paused'
            : isVictory
              ? endingInfo?.title ?? 'Nexus Prime Restored'
              : 'Unit A-01 Offline'}
        </h2>

        {isVictory && endingInfo && (
          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            {endingInfo.summary}
          </p>
        )}
        {!isVictory && phase === 'gameover' && (
          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            Rogue security defenses overwhelmed Unit A-01 in {hud.districtName}. Reboot your chassis to continue the search.
          </p>
        )}

        {/* 3 Mastery / Progress Metric Tiles */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-900 border border-slate-800 hud-chamfer-sm p-3 text-center">
            <p className="text-[11px] font-mono-tech text-slate-400">SCORE</p>
            <p className="font-display text-lg font-bold text-white tabular-nums">{hud.score}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 hud-chamfer-sm p-3 text-center">
            <p className="text-[11px] font-mono-tech text-slate-400">RELICS</p>
            <p className="font-display text-lg font-bold text-purple-300 tabular-nums">
              {hud.relicsFound}/{hud.totalRelics}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 hud-chamfer-sm p-3 text-center">
            <p className="text-[11px] font-mono-tech text-slate-400">TIME</p>
            <p className="font-display text-lg font-bold text-cyan-300 tabular-nums">
              {formatTime(hud.elapsedSeconds)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {phase === 'paused' ? (
            <button
              type="button"
              onClick={onResume}
              className="w-full py-2.5 hud-chamfer-sm bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              Resume Exploration
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="w-full py-2.5 hud-chamfer-sm bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-sm cursor-pointer"
            >
              Play Again
            </button>
          )}

          {phase === 'paused' && (
            <button
              type="button"
              onClick={onRestart}
              className="w-full py-2.5 hud-chamfer-sm bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium cursor-pointer"
            >
              Restart Mission
            </button>
          )}

          <button
            type="button"
            onClick={onDownloadSingleFile}
            className="w-full py-2.5 hud-chamfer-sm bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-200 text-xs font-mono-tech cursor-pointer"
          >
            Download 1-File Standalone HTML
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="w-full py-2 hud-chamfer-sm text-slate-400 hover:text-white text-xs font-mono-tech cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};
