// components/EliminatedOverlay.jsx
import React from 'react';

const EliminatedOverlay = ({ role }) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/40 rounded-xl px-4 py-2 z-40 shadow-2xl flex items-center gap-3 select-none animate-pulse">
      <span className="text-xl">💀</span>
      <div className="text-left">
        <h4 className="text-xs font-mono font-black text-red-500 uppercase tracking-wider leading-none">
          YOU HAVE BEEN ELIMINATED
        </h4>
        <span className="text-[9px] font-mono text-slate-400 mt-1 block">
          Role was: <span className="text-red-400 font-bold uppercase">{role}</span> • Spectator Mode Active
        </span>
      </div>
    </div>
  );
};

export default EliminatedOverlay;
