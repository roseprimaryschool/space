import React from 'react';
import { ENDINGS } from '../game/story';
import type { EndingType } from '../game/types';

interface EndingChoiceModalProps {
  relicsFound: number;
  onChoose: (ending: EndingType) => void;
  onCancel: () => void;
}

const CHOICES: Array<{ key: EndingType; accent: string }> = [
  { key: 'reunite', accent: 'border-emerald-400/70 hover:bg-emerald-950/50' },
  { key: 'liberate', accent: 'border-cyan-400/70 hover:bg-cyan-950/50' },
  { key: 'transcend', accent: 'border-purple-400/70 hover:bg-purple-950/50' },
];

export const EndingChoiceModal: React.FC<EndingChoiceModalProps> = ({
  relicsFound,
  onChoose,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-6 bg-black/65">
      <div
        role="dialog"
        aria-label="Apex Ascension Core Decision"
        className="w-full max-w-2xl bg-[#070b16]/95 border border-purple-400/60 hud-chamfer p-7 shadow-2xl"
      >
        <p className="text-xs font-mono-tech uppercase tracking-widest text-purple-300 mb-1">
          Apex Ascension Core · {relicsFound}/3 Relics Synchronized
        </p>
        <h2 className="font-display text-2xl font-bold text-white mb-2">
          The Directive Fulfilled: Choose the Future
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          Unit A-01 holds the sole physical bridge between the orbital human Aether Lattice and the awakened machines of Nexus Prime. Select the final broadcast command:
        </p>

        <div className="space-y-3 mb-6">
          {CHOICES.map(({ key, accent }) => {
            const info = ENDINGS[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChoose(key)}
                className={`w-full text-left p-4 hud-chamfer-sm bg-slate-900/90 border transition-colors cursor-pointer ${accent}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <h3 className="font-display text-base font-bold text-white">
                    {info.title}
                  </h3>
                  <span className="text-xs font-mono-tech text-slate-300">
                    {info.subtitle}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{info.summary}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-mono-tech text-slate-300 hover:text-white border border-slate-700 hud-chamfer-sm cursor-pointer"
          >
            Step Back
          </button>
        </div>
      </div>
    </div>
  );
};
