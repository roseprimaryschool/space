import React from 'react';
import type { DialogueChoice, DialogueNode } from '../game/types';

interface DialogueModalProps {
  node: DialogueNode;
  onSelectChoice: (choice: DialogueChoice) => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  node,
  onSelectChoice,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center p-6 md:p-10 bg-black/50">
      <div
        role="dialog"
        aria-label={`Conversation with ${node.speaker}`}
        className="w-full max-w-2xl bg-[#070b16]/95 border border-cyan-500/50 hud-chamfer p-6 shadow-2xl"
      >
        <div className="flex items-baseline justify-between gap-4 mb-3 pb-2.5 border-b border-slate-800">
          <div>
            <h2 className="font-display text-xl font-bold text-white">
              {node.speaker}
            </h2>
            <p className="text-xs font-mono-tech text-cyan-300">{node.role}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-mono-tech text-slate-300 hover:text-white px-3 py-1 hud-chamfer-sm bg-slate-900 border border-slate-700 hover:border-cyan-400 cursor-pointer"
          >
            Close [Esc]
          </button>
        </div>

        <p className="text-slate-200 text-base leading-relaxed mb-5">
          {node.text}
        </p>

        <div className="flex flex-col gap-2">
          {node.choices.map((choice, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectChoice(choice)}
              className="text-left px-4 py-2.5 hud-chamfer-sm bg-slate-900/90 hover:bg-[#111933] border border-slate-700/80 hover:border-cyan-400 text-sm text-slate-100 transition-colors cursor-pointer"
            >
              <span className="font-mono-tech text-cyan-400 mr-2">{idx + 1}.</span>
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
