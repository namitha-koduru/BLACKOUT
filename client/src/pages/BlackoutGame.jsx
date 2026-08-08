// pages/BlackoutGame.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import RoleReveal from '../components/RoleReveal.jsx';
import GameStartCountdown from '../components/GameStartCountdown.jsx';
import FacilityMap from '../components/FacilityMap.jsx';
import HUD from '../components/HUD.jsx';

const ROLE_THEME_FALLBACKS = {
  Engineer: { color: 'text-cyan-400', icon: '⚙️' },
  Investigator: { color: 'text-blue-400', icon: '🔍' },
  Medic: { color: 'text-emerald-400', icon: '🩺' },
  Operator: { color: 'text-indigo-400', icon: '📡' },
  Tracker: { color: 'text-teal-400', icon: '📍' },
  Crew: { color: 'text-slate-300', icon: '👥' },
  Saboteur: { color: 'text-red-400', icon: '😈' },
  Hacker: { color: 'text-fuchsia-400', icon: '💾' },
  Mimic: { color: 'text-amber-400', icon: '🎭' },
};

const BlackoutGame = () => {
  const playerId = useUserStore((state) => state.playerId);
  const room = useRoomStore((state) => state.room);
  const timer = useRoomStore((state) => state.timer);
  const myRoleInfo = useRoomStore((state) => state.myRoleInfo);
  const playAgain = useRoomStore((state) => state.playAgain);

  const [currentLocalRoom, setCurrentLocalRoom] = useState('CENTRAL HUB');

  if (!room || !room.game) return null;

  const currentPhase = room.game.phase || 'countdown';
  const isHost = room.hostId === playerId;

  // Safe fallback UI parameters
  const myRoleName = myRoleInfo?.role || 'Crew';
  const myTeamName = myRoleInfo?.team || 'crew';
  const fallbackMeta = ROLE_THEME_FALLBACKS[myRoleName] || ROLE_THEME_FALLBACKS.Crew;
  const isSaboteurTeam = myTeamName.toLowerCase() === 'saboteur';
  const headerGlow = isSaboteurTeam ? 'border-red-500/20' : 'border-cyan-500/10';

  const handleReturnToLobby = () => {
    playAgain(room.roomCode, playerId);
  };

  return (
    <div className="min-h-screen bg-[#06070d] text-white flex flex-col font-sans relative overflow-hidden">
      {/* SCANLINES OVERLAY */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-50 opacity-40"></div>

      {/* TOP STATUS BAR */}
      <header className={`border-b ${headerGlow} bg-[#0a0b12]/85 backdrop-blur-md px-6 py-4 flex items-center justify-between z-10 transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full animate-pulse ${isSaboteurTeam ? 'bg-red-500' : 'bg-cyan-400'}`}></div>
          <h1 className={`text-xl font-black tracking-widest ${isSaboteurTeam ? 'text-red-500' : 'text-cyan-400'}`}>
            BLACKOUT
          </h1>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${isSaboteurTeam ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400'}`}>
            SYSTEM STATUS: DEGRADED
          </span>
        </div>

        {/* Phase and Timer HUD */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest">Current Phase</div>
            <div className="text-sm font-bold text-amber-400 uppercase tracking-wider">
              {currentPhase.replace('_', ' ')}
            </div>
          </div>

          <div className="h-8 w-px bg-white/10"></div>

          <div className="flex items-center gap-3">
            <div className="text-slate-400 text-lg">⏳</div>
            <div className="text-2xl font-mono font-black text-cyan-400 tracking-wider">
              {String(timer).padStart(2, '0')}s
            </div>
          </div>
        </div>
      </header>

      {/* MAIN SCREEN AREA */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 relative z-10 overflow-hidden">
        
        {/* LEFT COLUMN: OBJECTIVES & CONTROLS */}
        <section className="w-full lg:w-1/4 flex flex-col gap-4">
          {/* USER PROFILE INFO */}
          <div className="border border-cyan-500/10 bg-[#0a0b12]/70 rounded-xl p-4 flex items-center gap-3">
            <div className="text-3xl">{room.players.find((p) => p.id === playerId)?.avatar || '👤'}</div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-1.5">
                {room.players.find((p) => p.id === playerId)?.name}
                {isHost && <span className="text-[10px] text-amber-400 border border-amber-400/30 px-1 py-0.2 rounded bg-amber-400/5">HOST</span>}
              </div>
              <div className={`text-xs font-semibold ${fallbackMeta.color}`}>
                Role: {myRoleName}
              </div>
            </div>
          </div>

          {/* OBJECTIVES PANEL */}
          <div className="border border-cyan-500/10 bg-[#0a0b12]/50 backdrop-blur-sm rounded-xl p-5 flex-1 flex flex-col">
            <h3 className="text-xs uppercase tracking-widest text-cyan-400 font-bold border-b border-cyan-500/10 pb-2 mb-3">
              SYSTEM DIAGNOSTIC
            </h3>
            
            {/* System list */}
            <div className="flex flex-col gap-3 flex-1 justify-center">
              {Object.keys(room.game.systems).map((sysKey) => {
                const sys = room.game.systems[sysKey];
                return (
                  <div key={sysKey} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{sys.name}</span>
                      <span className="text-cyan-400">{sys.health}%</span>
                    </div>
                    <div className="w-full bg-cyan-950/40 border border-cyan-500/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                        style={{ width: `${sys.health}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sub-text info */}
            <div className="border-t border-cyan-500/10 pt-3 mt-3 text-xs text-slate-400 flex flex-col gap-1">
              <div>• Sabotage risk is imminent.</div>
              <div>• Use W/A/S/D to move when exploration begins.</div>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: ACTIVE STAGE */}
        <section className="flex-1 border border-cyan-500/10 bg-[#090a10]/60 backdrop-blur-md rounded-xl p-6 flex flex-col justify-center items-center relative min-h-[400px]">
          
          <AnimatePresence mode="wait">
            {/* ROLE ASSIGNMENT PHASE VIEW */}
            {currentPhase === 'role_assignment' && (
              <RoleReveal key="role_assignment" timer={timer} roleInfo={myRoleInfo} />
            )}

            {/* COUNTDOWN PHASE VIEW */}
            {currentPhase === 'countdown' && (
              <GameStartCountdown key="countdown" timer={timer} />
            )}

            {/* STUB/EXPLORATION PHASE OVERVIEW */}
            {currentPhase === 'exploration' && (
              <motion.div
                key="exploration"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col gap-4 justify-between"
              >
                <div className="flex-grow min-h-[400px]">
                  <FacilityMap onRoomChange={setCurrentLocalRoom} />
                </div>
                <HUD currentRoom={currentLocalRoom} myRoleInfo={myRoleInfo} />
                
                {isHost && (
                  <div className="text-right">
                    <button
                      onClick={handleReturnToLobby}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold tracking-wider transition-all border border-red-500/20 active:scale-95 shadow-[0_0_10px_rgba(220,38,38,0.15)]"
                    >
                      RETURN TO LOBBY
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </section>

        {/* RIGHT COLUMN: ACTIVE PLAYERS / SECURITY ROSTER */}
        <section className="w-full lg:w-1/4 border border-cyan-500/10 bg-[#0a0b12]/50 rounded-xl p-5 flex flex-col">
          <h3 className="text-xs uppercase tracking-widest text-cyan-400 font-bold border-b border-cyan-500/10 pb-2 mb-3">
            FACILITY LOG
          </h3>

          <div className="flex flex-col gap-2 overflow-y-auto flex-1 max-h-[350px]">
            {room.players.map((p) => {
              const isMe = p.id === playerId;
              const isDisconnected = !p.connected;
              
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                    isMe
                      ? 'border-cyan-500/20 bg-cyan-500/5'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{p.avatar}</span>
                    <span className={`font-semibold ${isMe ? 'text-slate-100' : 'text-slate-300'}`}>
                      {p.name}
                      {isMe && <span className="text-[10px] text-cyan-400 ml-1.5">(You)</span>}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Badge */}
                    {isDisconnected ? (
                      <span className="text-[10px] text-red-500 border border-red-500/30 px-1.5 py-0.2 rounded bg-red-500/5 uppercase tracking-wide">
                        DISCONN
                      </span>
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    )}

                    {/* Room Display */}
                    <span className="text-xs font-mono text-slate-500 bg-black/40 px-2 py-0.5 rounded border border-white/5 uppercase">
                      {isMe ? myRoleName : p.role}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-cyan-500/10 pt-3 mt-3">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
              Room Code: <span className="text-amber-500 font-black tracking-widest">{room.roomCode}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default BlackoutGame;
