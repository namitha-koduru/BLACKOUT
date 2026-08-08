// components/SabotagePanel.jsx
import React, { useState, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import toast from 'react-hot-toast';

const ABILITIES = [
  { type: 'generator', label: 'Generator failure', desc: 'Reduce generator health by 25%' },
  { type: 'communications', label: 'Comms hijack', desc: 'Disable chat channels for 20s' },
  { type: 'security', label: 'Security degrade', desc: 'Degrade diagnostic logs for 25s' },
  { type: 'door_lockdown', label: 'Door lockdown', desc: 'Lock a hallway segment for 15s' },
  { type: 'power_blackout', label: 'Power blackout', desc: 'Dramatically reduce map visibility for 15s' },
  { type: 'system_corruption', label: 'Integrity corrupt', desc: 'Display false system health for 20s' },
];

const CORRIDORS = [
  { id: 'HALLWAY_HUB_SECURITY', label: 'Hub ↔ Security' },
  { id: 'HALLWAY_HUB_LAB', label: 'Hub ↔ Lab' },
  { id: 'HALLWAY_HUB_GENERATOR', label: 'Hub ↔ Generator' },
  { id: 'HALLWAY_HUB_COMMS', label: 'Hub ↔ Comms' },
  { id: 'HALLWAY_COMMS_MEDICAL', label: 'Comms ↔ Medical' },
  { id: 'HALLWAY_LAB_STORAGE', label: 'Lab ↔ Storage' },
  { id: 'HALLWAY_SECURITY_CONTROL', label: 'Security ↔ Control' },
  { id: 'HALLWAY_GENERATOR_EXIT', label: 'Generator ↔ Exit' },
];

const SYSTEMS = [
  { id: 'generator', label: 'Generator Console' },
  { id: 'communications', label: 'Communications Console' },
  { id: 'security', label: 'Security Console' },
  { id: 'medical', label: 'Medical Console' },
  { id: 'control', label: 'Control Room Console' },
];

const SabotagePanel = () => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const sendSabotageRequest = useRoomStore((state) => state.sendSabotageRequest);

  const [activeMenu, setActiveMenu] = useState(null); // 'door_lockdown' | 'system_corruption' | null
  const [cooldowns, setCooldowns] = useState({});

  // Cooldown clocks update tick
  useEffect(() => {
    const updateClocks = () => {
      const now = Date.now();
      const nextCooldowns = {};

      ABILITIES.forEach((ab) => {
        const cdEnd = room?.game?.sabotages?.cooldowns?.[playerId]?.[ab.type];
        if (cdEnd) {
          const remaining = Math.max(0, Math.ceil((cdEnd - now) / 1000));
          nextCooldowns[ab.type] = remaining;
        } else {
          nextCooldowns[ab.type] = 0;
        }
      });

      setCooldowns(nextCooldowns);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 250);
    return () => clearInterval(interval);
  }, [room?.game?.sabotages?.cooldowns, playerId]);

  const handleSabotageTrigger = async (type, targetId = null) => {
    setActiveMenu(null);
    try {
      const res = await sendSabotageRequest(room.roomCode, playerId, type, targetId);
      if (res.success) {
        toast.success('Sabotage deployed successfully!', { icon: '😈' });
      } else {
        toast.error(res.message || 'Sabotage failed.');
      }
    } catch (err) {
      toast.error('Unable to send sabotage command.');
    }
  };

  return (
    <div className="w-full bg-[#0d070b]/90 border border-red-500/25 rounded-2xl p-4 flex flex-col gap-3 shadow-lg select-none backdrop-blur-md">
      <div className="border-b border-red-500/20 pb-2 flex justify-between items-center">
        <div>
          <h4 className="text-xs font-black text-red-500 uppercase tracking-widest font-mono flex items-center gap-1.5 animate-pulse">
            🚨 SABOTAGE INTERFACE
          </h4>
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide">
            Access Authorized: Saboteur Team Only
          </span>
        </div>
        {activeMenu && (
          <button
            onClick={() => setActiveMenu(null)}
            className="text-[9px] font-bold text-slate-400 hover:text-slate-200 uppercase"
          >
            ← Back
          </button>
        )}
      </div>

      {/* RENDER ACTIVE MENUS */}
      {!activeMenu ? (
        <div className="flex flex-col gap-2.5">
          {ABILITIES.map((ab) => {
            const cd = cooldowns[ab.type] || 0;
            const isReady = cd === 0;

            return (
              <div
                key={ab.type}
                className="flex items-center justify-between p-2.5 rounded-xl border border-red-950/20 bg-red-950/5 hover:bg-red-950/10 transition-colors"
              >
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-100 uppercase font-mono tracking-wide">
                    {ab.label}
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight mt-0.5">{ab.desc}</div>
                </div>

                {isReady ? (
                  <button
                    onClick={() => {
                      if (ab.type === 'door_lockdown' || ab.type === 'system_corruption') {
                        setActiveMenu(ab.type);
                      } else {
                        handleSabotageTrigger(ab.type, ab.type);
                      }
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-md hover:scale-105 transition-all"
                  >
                    DEPLOY
                  </button>
                ) : (
                  <span className="text-xs font-mono font-black text-red-500/60 bg-red-950/40 border border-red-500/20 px-2.5 py-0.5 rounded-lg select-none">
                    {cd}s
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ) : activeMenu === 'door_lockdown' ? (
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest text-left">
            Select Doorway Segment to Lock:
          </span>
          <div className="grid grid-cols-1 gap-1.5 overflow-y-auto max-h-[220px] pr-1">
            {CORRIDORS.map((door) => {
              const isAlreadyLocked = room?.game?.sabotages?.lockedDoors?.[door.id];
              return (
                <button
                  key={door.id}
                  disabled={isAlreadyLocked}
                  onClick={() => handleSabotageTrigger('door_lockdown', door.id)}
                  className={`w-full py-2 rounded-lg border text-left px-3 text-xs font-mono transition-all flex justify-between items-center ${
                    isAlreadyLocked
                      ? 'border-red-950 text-red-500/30 cursor-not-allowed bg-red-950/5'
                      : 'border-red-500/20 bg-red-500/5 text-slate-200 hover:border-red-500/40'
                  }`}
                >
                  <span>{door.label}</span>
                  <span className="text-[10px] font-bold">
                    {isAlreadyLocked ? 'LOCKED' : 'LOCK'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest text-left">
            Select Target Console to Corrupt:
          </span>
          <div className="flex flex-col gap-1.5">
            {SYSTEMS.map((sys) => {
              const isAlreadyCorrupt = room?.game?.sabotages?.corruptedSystems?.[sys.id];
              return (
                <button
                  key={sys.id}
                  disabled={isAlreadyCorrupt}
                  onClick={() => handleSabotageTrigger('system_corruption', sys.id)}
                  className={`w-full py-2 rounded-lg border text-left px-3 text-xs font-mono transition-all flex justify-between items-center ${
                    isAlreadyCorrupt
                      ? 'border-red-950 text-red-500/30 cursor-not-allowed bg-red-950/5'
                      : 'border-red-500/20 bg-red-500/5 text-slate-200 hover:border-red-500/40'
                  }`}
                >
                  <span>{sys.label}</span>
                  <span className="text-[10px] font-bold">
                    {isAlreadyCorrupt ? 'CORRUPT' : 'CORRUPT'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SabotagePanel;
