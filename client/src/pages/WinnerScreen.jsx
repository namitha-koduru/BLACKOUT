// pages/WinnerScreen.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import { playSound } from '../utils/sound.js';
import toast from 'react-hot-toast';

const WinnerScreen = () => {
  const navigate = useNavigate();
  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);

  const room = useRoomStore((state) => state.room);
  const timer = useRoomStore((state) => state.timer); // 5s transition countdown
  const playAgain = useRoomStore((state) => state.playAgain);
  const returnToLobby = useRoomStore((state) => state.returnToLobby);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);

  const [activeTab, setActiveTab] = useState('rankings');

  // Redirect if profile is missing
  useEffect(() => {
    if (!name) {
      navigate('/');
    }
  }, [name, navigate]);

  // Play triumph victory sound
  useEffect(() => {
    playSound('winner');
  }, []);

  if (!room || !room.game) return null;

  const isHost = room.hostId === playerId;
  const winner = room.game.winner || 'crew';
  const finalResults = room.game.finalResults;

  const handlePlayAgain = async () => {
    try {
      const res = await playAgain(room.roomCode);
      if (res.success) {
        toast.success('Lobby reset! Get ready to play.');
      } else {
        toast.error(res.message || 'Lobby reset failed.');
      }
    } catch (err) {
      toast.error('Trigger fault resetting room.');
    }
  };

  const handleReturnToLobby = async () => {
    try {
      const res = await returnToLobby(room.roomCode);
      if (res.success) {
        toast.success('Returned to lobby.');
      } else {
        toast.error(res.message || 'Lobby return failed.');
      }
    } catch (err) {
      toast.error('Trigger fault returning to lobby.');
    }
  };

  const handleLeave = () => {
    leaveRoom(room.roomCode, playerId);
    navigate('/');
  };

  // 1. TRANSITIONING VIEW (5-second count down)
  if (!finalResults) {
    return (
      <div className="fixed inset-0 bg-[#06070d] flex flex-col items-center justify-center p-6 text-white text-center select-none font-mono">
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#ef4444_1px,transparent_1px),linear-gradient(to_bottom,#ef4444_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 2.0 }}
          className="text-6xl mb-6"
        >
          🚨
        </motion.div>

        <h2 className="text-2xl font-black text-red-500 tracking-widest uppercase mb-2">
          CRITICAL INTEGRITY BREACH: GAME OVER
        </h2>
        <p className="text-xs text-slate-400 max-w-md mb-8 uppercase tracking-wide leading-relaxed">
          Retrieving server diagnostics... Decrypting classified logs...
        </p>

        <div className="text-4xl font-black text-amber-500 animate-pulse">
          {timer > 0 ? `${timer}s` : 'DECRYPTING...'}
        </div>
      </div>
    );
  }

  // 2. FINAL RESULT DASHBOARD
  const isCrewWinner = winner === 'crew';

  return (
    <div className="min-h-screen bg-[#030407] text-white flex flex-col p-4 md:p-8 select-none overflow-y-auto">
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] bg-[size:30px_30px]" />

      <main className="w-full max-w-4xl mx-auto flex flex-col gap-6 z-10 my-auto">
        {/* WINNER TITLE */}
        <section className={`border rounded-2xl p-6 text-center shadow-xl relative overflow-hidden ${
          isCrewWinner 
            ? 'bg-emerald-950/20 border-emerald-500/30 shadow-emerald-500/5' 
            : 'bg-red-950/20 border-red-500/30 shadow-red-500/5'
        }`}>
          {/* Decorative glows */}
          <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${
            isCrewWinner ? 'from-emerald-500 to-teal-400' : 'from-red-600 to-amber-500'
          }`} />

          <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-widest font-mono mb-2 ${
            isCrewWinner ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)]'
          }`}>
            {isCrewWinner ? '🏆 CREW SURVIVED' : '☠️ FACILITY COMPROMISED'}
          </h1>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            {isCrewWinner 
              ? 'THE THREAT HAS BEEN PURGED. ALL CRITICAL SYSTEMS RESTORED.' 
              : 'THE SYSTEM HAS COLLAPSED. THE SABOTEURS SECURED CONTROL.'
            }
          </p>
        </section>

        {/* TABS SELECTOR */}
        <nav className="flex flex-wrap border-b border-white/5 gap-1">
          {[
            { id: 'rankings', label: '🏆 Rankings' },
            { id: 'roster', label: '👥 Roster' },
            { id: 'statistics', label: '📊 Statistics' },
            { id: 'timeline', label: '⏳ Timeline' },
            { id: 'evidence', label: '🔍 Evidence Reveal' },
            { id: 'voting', label: '🗳️ Voting History' },
            { id: 'sabotages', label: '🔥 Sabotages' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider font-mono rounded-t-lg transition-all border-t border-x ${
                activeTab === tab.id
                  ? 'bg-slate-900 border-white/10 text-cyan-400'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* TAB CONTENTS */}
        <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 min-h-[350px] flex flex-col justify-between backdrop-blur-sm">
          <div className="text-left font-mono">
            {/* T1: RANKINGS */}
            {activeTab === 'rankings' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black text-cyan-400 border-b border-white/5 pb-2 mb-2 uppercase tracking-widest">
                  PLAYER PERFORMANCE LEADERBOARD
                </h3>
                <div className="flex flex-col gap-2">
                  {finalResults.rankings.map((rank, idx) => (
                    <div
                      key={rank.playerId}
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-black text-slate-500 w-5">#{idx + 1}</span>
                        <span className="text-xl">{rank.avatar}</span>
                        <div>
                          <span className="font-black text-slate-200 block">{rank.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase">
                            {rank.role} ({rank.team})
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-amber-500">{rank.score} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* T2: ROSTER */}
            {activeTab === 'roster' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black text-cyan-400 border-b border-white/5 pb-2 mb-2 uppercase tracking-widest">
                  DECRYPTED LOBBY ROSTER
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {finalResults.roles.map((r) => (
                    <div
                      key={r.playerId}
                      className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3 text-xs"
                    >
                      <span className="text-2xl">{r.avatar}</span>
                      <div>
                        <span className="font-black text-slate-200 block">{r.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          Role: <span className="text-cyan-400">{r.role}</span> • Team:{' '}
                          <span className={r.team === 'crew' ? 'text-emerald-400' : 'text-red-400'}>
                            {r.team}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* T3: STATISTICS */}
            {activeTab === 'statistics' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black text-cyan-400 border-b border-white/5 pb-2 mb-2 uppercase tracking-widest">
                  INDIVIDUAL DIAGNOSTICS STATS
                </h3>

                <div className="flex flex-col gap-4">
                  {finalResults.roles.map((r) => {
                    const stats = finalResults.statistics[r.playerId] || {};
                    const isCrew = r.team === 'crew';

                    return (
                      <div key={r.playerId} className="p-4 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-2.5">
                          <span className="font-black text-slate-200 text-xs flex items-center gap-1.5">
                            <span className="text-base">{r.avatar}</span>
                            <span>{r.name} ({r.role})</span>
                          </span>
                          <span className={`text-[9px] uppercase border px-1.5 py-0.2 rounded font-bold ${
                            stats.survival ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-red-500/30 text-red-400 bg-red-500/5'
                          }`}>
                            {stats.survival ? 'SURVIVED' : 'ELIMINATED'}
                          </span>
                        </div>

                        {isCrew ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400">
                            <div>Repairs Submitted: <span className="font-bold text-slate-200">{stats.repairsCompleted || 0}</span></div>
                            <div>Systems Restored: <span className="font-bold text-slate-200">{stats.systemsRepaired || 0}</span></div>
                            <div>Evidence Found: <span className="font-bold text-slate-200">{stats.evidenceDiscovered || 0}</span></div>
                            <div>Meetings Called: <span className="font-bold text-slate-200">{stats.meetingsCalled || 0}</span></div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400">
                            <div>Successful Sabotage: <span className="font-bold text-slate-200">{stats.successfulSabotage || 0}</span></div>
                            <div>Comms Disabled: <span className="font-bold text-slate-200">{stats.commsDisabled || 0}</span></div>
                            <div>Corridors Locked: <span className="font-bold text-slate-200">{stats.doorsLocked || 0}</span></div>
                            <div>Corrupt Records: <span className="font-bold text-slate-200">{stats.evidenceCorrupted || 0}</span></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* T4: TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black text-cyan-400 border-b border-white/5 pb-2 mb-2 uppercase tracking-widest">
                  DECRYPTED EVENT TIMELINE
                </h3>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-2">
                  {finalResults.timeline.map((entry, idx) => (
                    <div key={idx} className="text-xs text-slate-300 border-b border-white/5 pb-1 flex items-start gap-3">
                      <span className="text-slate-500 font-bold min-w-[70px]">
                        [{new Date(entry.timestamp).toLocaleTimeString()}]
                      </span>
                      <span>{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* T5: EVIDENCE */}
            {activeTab === 'evidence' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black text-cyan-400 border-b border-white/5 pb-2 mb-2 uppercase tracking-widest">
                  EVIDENCE REGISTRY TRUTH ANALYSIS
                </h3>

                <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-2">
                  {finalResults.evidence.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3 border rounded-xl flex flex-col gap-1.5 text-xs ${
                        ev.corrupted
                          ? 'border-red-500/20 bg-red-950/5'
                          : 'border-white/5 bg-white/5'
                      }`}
                    >
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="font-bold text-cyan-400">{ev.type.replace('_', ' ')} ({ev.location})</span>
                        <span className="text-slate-500">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        {ev.corrupted ? (
                          <>
                            <div className="text-[10px] text-red-400 font-bold flex items-center gap-1.5 mb-1">
                              <span>⚠️ CORRUPTED BY HACKER: {ev.corruptedByName}</span>
                            </div>
                            <div className="text-slate-400 line-through">Displayed to Crew: "{ev.visibleDescription}"</div>
                            <div className="text-emerald-400 font-bold">Original Truth: "{ev.actualDescription}"</div>
                          </>
                        ) : (
                          <div className="text-slate-200">"{ev.actualDescription}"</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* T6: VOTING HISTORY */}
            {activeTab === 'voting' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black text-cyan-400 border-b border-white/5 pb-2 mb-2 uppercase tracking-widest">
                  MEETING RESOLUTIONS HISTORY
                </h3>

                <div className="flex flex-col gap-4">
                  {finalResults.votingHistory.length > 0 ? (
                    finalResults.votingHistory.map((v, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl">
                        <h4 className="text-xs font-bold text-cyan-400 mb-2 border-b border-white/5 pb-1">
                          MEETING ROUND {v.round}
                        </h4>
                        
                        <div className="flex flex-col gap-1 mb-2">
                          {Object.keys(v.votes).map((voterId) => {
                            const voterName = room.players.find(p => p.id === voterId)?.name || 'Player';
                            const targetId = v.votes[voterId];
                            const targetName = targetId === 'skip'
                              ? 'SKIP'
                              : room.players.find(p => p.id === targetId)?.name || 'Player';

                            return (
                              <div key={voterId} className="text-[11px] text-slate-400">
                                <span className="font-bold text-slate-300">{voterName}</span> voted for:{' '}
                                <span className={targetId === 'skip' ? 'text-slate-400 font-bold' : 'text-red-400 font-bold'}>
                                  {targetName}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <div className="text-[10px] text-slate-300 font-bold border-t border-white/5 pt-1.5 mt-1 text-center">
                          Result: {v.eliminatedPlayerId ? (
                            <span>
                              {room.players.find(p => p.id === v.eliminatedPlayerId)?.name} was eliminated. Role:{' '}
                              <span className="text-red-400 font-bold uppercase">{v.roleReveal}</span>
                            </span>
                          ) : (
                            <span>NO ONE ELIMINATED</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No emergency meetings called.</span>
                  )}
                </div>
              </div>
            )}

            {/* T7: SABOTAGES */}
            {activeTab === 'sabotages' && (
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-black text-cyan-400 border-b border-white/5 pb-2 mb-2 uppercase tracking-widest">
                  DECRYPTED SABOTAGE HISTORY
                </h3>

                <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-2">
                  {finalResults.sabotageHistory.length > 0 ? (
                    finalResults.sabotageHistory.map((sab, idx) => (
                      <div key={idx} className="text-xs text-slate-300 border-b border-white/5 pb-1 flex items-start gap-3">
                        <span className="text-slate-500 font-bold min-w-[70px]">
                          [{new Date(sab.timestamp).toLocaleTimeString()}]
                        </span>
                        <span>
                          Ability: <span className="text-red-400 font-bold uppercase">{sab.type.replace('_', ' ')}</span> activated by:{' '}
                          <span className="text-cyan-400 font-bold">{sab.playerName}</span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No sabotages triggered during this match.</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex flex-wrap items-center justify-end gap-3 mt-6 border-t border-white/5 pt-4">
            <button
              onClick={handleLeave}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold font-mono tracking-wide uppercase transition-colors"
            >
              🚪 LEAVE ROOM
            </button>

            {isHost && (
              <>
                <button
                  onClick={handleReturnToLobby}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-cyan-400 rounded-lg text-xs font-bold font-mono tracking-wide uppercase transition-colors"
                >
                  🔙 RETURN TO LOBBY
                </button>
                <button
                  onClick={handlePlayAgain}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 border border-cyan-500 text-white rounded-lg text-xs font-bold font-mono tracking-wide uppercase transition-colors shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                >
                  🔄 PLAY AGAIN
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default WinnerScreen;
