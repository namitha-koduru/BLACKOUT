// game3d/InteractionPrompt.jsx
import React from 'react';

const InteractionPrompt = ({ label, actionName }) => {
  if (!label) return null;

  return (
    <div className="flex flex-col w-56 bg-[#172235]/95 border-2 border-[#22d3ee]/60 rounded-xl px-4 py-3 shadow-lg shadow-cyan-950/40 animate-bounce font-mono text-left select-none">
      {/* HEADER ROW WITH ICON */}
      <div className="flex items-center gap-1.5 text-[9px] text-[#22d3ee] font-black uppercase tracking-widest border-b border-[#22d3ee]/15 pb-1 mb-2">
        <span>⚡</span>
        <span>{label}</span>
      </div>
      
      {/* KEYBOARD ACTION BUTTON DISPLAY */}
      <div className="flex items-center justify-center gap-3 mt-1 py-1">
        <span className="bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] text-white font-extrabold px-2.5 py-1 rounded-md text-[11px] border border-[#22d3ee]/40 shadow shadow-cyan-400/20 animate-pulse select-none">
          E
        </span>
        <span className="text-[10px] text-[#f8fafc] font-black uppercase tracking-widest">
          {actionName}
        </span>
      </div>
    </div>
  );
};

export default InteractionPrompt;
