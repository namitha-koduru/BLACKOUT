// game3d/InteractionPrompt.jsx
import React from 'react';

const InteractionPrompt = ({ label, actionName }) => {
  if (!label) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-slate-950/85 border border-cyan-500/35 rounded-xl px-5 py-3 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-bounce font-mono">
      <div className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-wider">
        Console Proximity Detected
      </div>
      <div className="text-white text-xs font-black flex items-center gap-2">
        <span className="bg-cyan-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[10px] border border-cyan-400 shadow-sm animate-pulse">
          E
        </span>
        <span className="uppercase text-slate-200">
          {actionName} {label}
        </span>
      </div>
    </div>
  );
};

export default InteractionPrompt;
