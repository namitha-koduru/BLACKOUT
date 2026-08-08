// components/HUD.jsx
import React from 'react';

const HUD = ({ currentRoom, myRoleInfo }) => {
  const abilityName = myRoleInfo?.ability 
    ? myRoleInfo.ability.replace('_', ' ').toUpperCase() 
    : 'ABILITY';

  return (
    <div className="w-full bg-[#0a0b12]/80 border border-cyan-500/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
      {/* Current Room location */}
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Current Location</span>
        <span className="text-sm font-black text-cyan-400 tracking-wider">
          📍 {currentRoom || 'UNKNOWN AREA'}
        </span>
      </div>

      {/* Action placeholders */}
      <div className="flex items-center gap-3">
        {/* Ability Button (Disabled) */}
        <button
          disabled
          className="px-4 py-2 bg-cyan-500/5 border border-cyan-500/20 text-cyan-500/50 rounded-lg text-xs font-bold uppercase tracking-wider cursor-not-allowed select-none flex items-center gap-1.5"
          title="Ability not active in this phase"
        >
          ⚡ {abilityName}
        </button>

        {/* Investigation Button (Disabled) */}
        <button
          disabled
          className="px-4 py-2 bg-blue-500/5 border border-blue-500/20 text-blue-500/50 rounded-lg text-xs font-bold uppercase tracking-wider cursor-not-allowed select-none flex items-center gap-1.5"
          title="Investigation database not active"
        >
          📂 INVESTIGATE
        </button>

        {/* Emergency Meeting Button (Disabled) */}
        <button
          disabled
          className="px-4 py-2 bg-red-500/5 border border-red-500/20 text-red-500/50 rounded-lg text-xs font-bold uppercase tracking-wider cursor-not-allowed select-none flex items-center gap-1.5"
          title="Emergency meeting siren disabled"
        >
          🚨 CALL MEETING
        </button>
      </div>
    </div>
  );
};

export default HUD;
