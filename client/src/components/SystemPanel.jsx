// components/SystemPanel.jsx
import React from 'react';

const SystemPanel = ({ system, isNear, onRepairClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'ONLINE':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
      case 'DAMAGED':
        return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
      case 'CRITICAL':
        return 'text-orange-500 border-orange-500/20 bg-orange-500/5';
      case 'OFFLINE':
        return 'text-red-500 border-red-500/20 bg-red-500/5';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800/10';
    }
  };

  return (
    <div className="border border-cyan-500/10 bg-[#0a0b12]/60 backdrop-blur-md rounded-xl p-4 flex flex-col gap-3 text-left shadow-lg select-none">
      <div className="flex justify-between items-center">
        <h4 className="font-black text-slate-200 text-sm tracking-wide uppercase">
          ⚙️ {system.name}
        </h4>
        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${getStatusColor(
            system.status
          )}`}
        >
          {system.status}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-slate-400 uppercase font-mono tracking-wider">
          <span>System Integrity</span>
          <span>{system.health}%</span>
        </div>
        <div className="w-full bg-[#05060a] border border-cyan-500/5 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              system.health >= 70
                ? 'bg-emerald-500'
                : system.health >= 40
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${system.health}%` }}
          />
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className="text-[9px] text-slate-500 font-mono tracking-wide uppercase">
          ROOM: {system.room}
        </span>
        {system.health < 100 && isNear && (
          <button
            onClick={onRepairClick}
            className="px-3 py-1 bg-cyan-500 text-black hover:bg-cyan-400 transition-all font-black text-xs uppercase tracking-wider rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.4)] active:scale-95 animate-pulse"
          >
            REPAIR [E]
          </button>
        )}
      </div>
    </div>
  );
};

export default SystemPanel;
