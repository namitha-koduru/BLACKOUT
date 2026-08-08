// components/RestorationBar.jsx
import React from 'react';

const RestorationBar = ({ progress }) => {
  return (
    <div className="w-full flex flex-col gap-1.5 select-none">
      <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
        <span>Facility Restoration Progress</span>
        <span className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{progress}%</span>
      </div>
      <div className="w-full bg-[#07080f] border border-cyan-500/10 h-3 rounded-full overflow-hidden p-0.5">
        <div
          className="bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default RestorationBar;
