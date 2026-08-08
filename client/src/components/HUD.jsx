// components/HUD.jsx
import React from 'react';
import RestorationBar from './RestorationBar.jsx';
import { useRoomStore } from '../store/roomStore.js';

const ROLE_SPECIALIZATIONS = {
  Engineer: { badge: '⚡ RAPID REPAIR', desc: 'System repairs are 1.5x more effective.' },
  Operator: { badge: '📡 COMMS SPECIALIST', desc: 'Repairing Comms is 1.5x more effective.' },
  Medic: { badge: '🛡️ MEDIC PROTECTION', desc: 'Target protection details (Disabled)' },
  Tracker: { badge: '📍 MOVEMENT TRACKING', desc: 'Footprint database details (Disabled)' },
  Investigator: { badge: '🔍 EVIDENCE ANALYSIS', desc: 'Scan database clue feeds (Disabled)' },
  Crew: { badge: '👥 CREW SAFETY OPERATIONS', desc: 'Standard system repair rate (1.0x)' },
  Saboteur: { badge: '😈 SABOTAGE INJECTOR', desc: 'Trigger system breakdowns (Disabled)' },
  Hacker: { badge: '💾 DATA MANIPULATOR', desc: 'Corrupt evidence timeline (Disabled)' },
  Mimic: { badge: '🎭 IDENTITY DISGUISE', desc: 'Conceal tracker scans (Disabled)' },
};

const HUD = ({ currentRoom, myRoleInfo, onInvestigateClick }) => {
  const room = useRoomStore((state) => state.room);

  // Calculate restoration progress from critical systems health
  const systems = room?.game?.systems || {};
  const totalHealth = Object.values(systems).reduce((sum, s) => sum + s.health, 0);
  const progress = Object.keys(systems).length > 0 ? Math.round(totalHealth / 5) : 100;

  const roleName = myRoleInfo?.role || 'Crew';
  const roleTheme = ROLE_SPECIALIZATIONS[roleName] || ROLE_SPECIALIZATIONS.Crew;

  return (
    <div className="w-full bg-[#0a0b12]/80 border border-cyan-500/10 rounded-xl p-4 flex flex-col gap-4 backdrop-blur-md select-none">
      {/* RESTORATION BAR */}
      <RestorationBar progress={progress} />

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-3">
        {/* Current location & Specialization */}
        <div className="flex flex-col gap-1 text-left">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Current Location</span>
          <span className="text-sm font-black text-cyan-400 tracking-wider">
            📍 {currentRoom || 'UNKNOWN AREA'}
          </span>
          <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
            <span className="text-cyan-400 font-bold border border-cyan-500/25 px-1 py-0.2 rounded bg-cyan-950/20">
              {roleTheme.badge}
            </span>
            <span>{roleTheme.desc}</span>
          </span>
        </div>

        {/* Action placeholders */}
        <div className="flex items-center gap-3">
          {/* Ability Button (Disabled) */}
          <button
            disabled
            className="px-4 py-2 bg-cyan-500/5 border border-cyan-500/20 text-cyan-500/40 rounded-lg text-xs font-bold uppercase tracking-wider cursor-not-allowed select-none flex items-center gap-1.5 transition-all"
            title="Ability not active in this phase"
          >
            ⚡ ABILITY
          </button>

          {/* Investigation Button */}
          <button
            onClick={onInvestigateClick}
            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-bold uppercase tracking-wider select-none flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
            title="Open investigation dashboard"
          >
            🔍 INVESTIGATE
          </button>

          {/* Emergency Meeting Button (Disabled) */}
          <button
            disabled
            className="px-4 py-2 bg-red-500/5 border border-red-500/20 text-red-500/45 rounded-lg text-xs font-bold uppercase tracking-wider cursor-not-allowed select-none flex items-center gap-1.5 transition-all"
            title="Emergency meeting siren disabled"
          >
            🚨 CALL MEETING
          </button>
        </div>
      </div>
    </div>
  );
};

export default HUD;
