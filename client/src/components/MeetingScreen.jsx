// components/MeetingScreen.jsx
import React, { useState } from 'react';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import EvidenceCard from './EvidenceCard.jsx';
import toast from 'react-hot-toast';

const MeetingScreen = () => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const timer = useRoomStore((state) => state.timer);
  const castVote = useRoomStore((state) => state.castVote);
  const sendMeetingChat = useRoomStore((state) => state.sendMeetingChat);

  const [chatInput, setChatInput] = useState('');

  if (!room || !room.game || !room.game.meeting) return null;

  const mt = room.game.meeting;
  const myPlayer = room.game.players[playerId];
  const isMeAlive = myPlayer?.isAlive === true;

  const callerName = room.players.find((p) => p.id === mt.calledBy)?.name || 'Player';

  const handleVoteSubmit = async (targetId) => {
    try {
      const res = await castVote(room.roomCode, playerId, targetId);
      if (res.success) {
        toast.success('Vote submitted.', { icon: '🗳️' });
      } else {
        toast.error(res.message || 'Voting rejected.');
      }
    } catch (err) {
      toast.error('System error casting vote.');
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      sendMeetingChat(room.roomCode, playerId, chatInput.trim());
      setChatInput('');
    } catch (err) {
      toast.error('Unable to send discussion message.');
    }
  };

  return (
    <div className="fixed inset-0 bg-[#06070db5] backdrop-blur-lg z-50 flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-5xl h-[90vh] bg-[#07080d] border border-red-500/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
        {/* SIREN TOP GLOW */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

        {/* HEADER BAR */}
        <header className="border-b border-white/5 bg-red-950/10 px-6 py-4 flex items-center justify-between">
          <div className="text-left">
            <h2 className="text-base font-black text-red-500 uppercase tracking-widest font-mono flex items-center gap-2 animate-pulse">
              <span>🚨</span>
              <span>EMERGENCY SIREN INITIATED</span>
            </h2>
            <span className="text-[10px] font-mono text-slate-400">
              Called by: <span className="text-red-400 font-bold">{callerName}</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">Phase</span>
              <div className="text-xs font-mono font-black text-amber-500 tracking-wider">
                {mt.phase}
              </div>
            </div>

            <div className="h-6 w-px bg-white/10" />

            <div className="flex items-center gap-2 font-mono">
              <span className="text-lg">⏳</span>
              <span className="text-xl font-black text-red-500">{timer}s</span>
            </div>
          </div>
        </header>

        {/* CONTENT PANELS */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT COLUMN: ACTIVE ROSTER & VOTES TRIGGER */}
          <section className="w-full md:w-2/5 border-r border-white/5 p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              <h3 className="text-xs font-mono font-black tracking-widest text-slate-400 uppercase border-b border-white/5 pb-2 mb-3 text-left">
                SURVIVING CREW ROSTER
              </h3>

              <div className="flex flex-col gap-2">
                {room.players.map((p) => {
                  const gp = room.game.players[p.id];
                  const hasVoted = mt.votes[p.id] === true;
                  const isAlive = gp?.isAlive === true;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                        !isAlive
                          ? 'border-red-950/20 bg-red-950/5 opacity-40'
                          : 'border-white/5 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{p.avatar}</span>
                        <span className="font-semibold text-slate-200">
                          {p.name}
                          {p.id === playerId && <span className="text-[9px] text-cyan-400 ml-1">(You)</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono">
                        {hasVoted && (
                          <span className="text-[9px] text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded bg-emerald-500/5">
                            ✓ VOTED
                          </span>
                        )}
                        {!isAlive && (
                          <span className="text-[9px] text-red-500 border border-red-500/30 px-1.5 py-0.2 rounded bg-red-500/5 uppercase font-bold">
                            ELIMINATED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECRET VOTING ACTIONS */}
            {mt.phase === 'VOTING' && isMeAlive && (
              <div className="border-t border-white/5 pt-4 mt-4 flex flex-col gap-2">
                <h4 className="text-[10px] font-black font-mono text-amber-500 uppercase tracking-widest text-left">
                  Cast Your Vote:
                </h4>

                {mt.votes[playerId] ? (
                  <div className="text-center py-4 text-xs font-mono text-emerald-400">
                    Your secret vote has been locked in.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {room.players
                      .filter((p) => p.id !== playerId && room.game.players[p.id]?.isAlive)
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleVoteSubmit(p.id)}
                          className="w-full py-2 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 hover:border-red-500/40 rounded-lg text-xs font-mono text-red-400 tracking-wider transition-all active:scale-[0.98]"
                        >
                          VOTE FOR {p.name.toUpperCase()}
                        </button>
                      ))}

                    <button
                      onClick={() => handleVoteSubmit('skip')}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 tracking-wider transition-all active:scale-[0.98]"
                    >
                      SKIP ELIMINATION
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* RIGHT COLUMN: DISCUSSION CHAT / RESULTS */}
          <section className="flex-grow p-5 flex flex-col overflow-hidden">
            {mt.phase === 'DISCUSSION' && (
              <div className="flex-1 flex flex-col overflow-hidden gap-4">
                {/* TIMELINE & DISCOVERED LOGS */}
                <div className="flex-1 overflow-y-auto border border-white/5 rounded-xl p-3 bg-black/40 text-left">
                  <h4 className="text-[10px] font-black font-mono text-cyan-400 uppercase tracking-widest border-b border-white/5 pb-1 mb-2">
                    DISCOVERED EVIDENCE REGISTER
                  </h4>
                  {room.game.discoveredEvidence && room.game.discoveredEvidence.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {room.game.discoveredEvidence.map((ev) => (
                        <div key={ev.id} className="text-xs text-slate-300 border-b border-white/5 pb-1 font-mono">
                          <span className="text-slate-500">[{new Date(ev.timestamp).toLocaleTimeString()}]</span>{' '}
                          <span className="text-cyan-500">[{ev.type.replace('_', ' ')}]</span> {ev.description}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      No terminal logs discovered during exploration.
                    </span>
                  )}
                </div>

                {/* DISCUSSION CHAT SCREEN */}
                <div className="h-64 flex flex-col border border-white/5 rounded-xl overflow-hidden bg-black/30">
                  <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-1.5 max-h-48">
                    {mt.chat.map((msg, idx) => {
                      const isMe = msg.senderId === playerId;
                      return (
                        <div key={idx} className="text-left text-[11px] leading-relaxed">
                          <span className={`font-black mr-1 font-mono ${isMe ? 'text-red-400' : 'text-slate-400'}`}>
                            {msg.senderName}:
                          </span>
                          <span className="text-slate-200">{msg.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleChatSubmit} className="flex border-t border-white/5 bg-slate-950/40 p-2 mt-auto">
                    <input
                      type="text"
                      value={chatInput}
                      disabled={!isMeAlive}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={isMeAlive ? "Express findings to crew channel..." : "Muted: Eliminated player"}
                      className="flex-grow rounded bg-black/60 border border-white/10 px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/40 disabled:border-red-950/30 disabled:placeholder-red-950/20"
                    />
                    <button
                      type="submit"
                      disabled={!isMeAlive}
                      className="ml-2 px-3 py-1 bg-red-700 hover:bg-red-800 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded text-xs font-mono font-black"
                    >
                      SEND
                    </button>
                  </form>
                </div>
              </div>
            )}

            {mt.phase === 'VOTING' && (
              <div className="flex-grow flex flex-col items-center justify-center text-center gap-4">
                <div className="text-4xl animate-pulse">🗳️</div>
                <h3 className="text-lg font-black text-amber-500 uppercase tracking-wider font-mono">
                  SECRET VOTING ACTIVE
                </h3>
                <p className="text-xs text-slate-400 max-w-sm font-mono leading-relaxed">
                  Analyze details, consult terminal reports, and select a candidate. Skip majorities or ties resolve with no eliminations.
                </p>
                <div className="w-10 h-10 border-4 border-red-500/10 border-t-red-500 rounded-full animate-spin" />
              </div>
            )}

            {mt.phase === 'RESULT' && mt.result && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto text-left">
                <h3 className="text-sm font-mono font-black tracking-widest text-slate-400 uppercase border-b border-white/5 pb-2">
                  VOTING RESULTS TALLIES
                </h3>

                {/* GRAPHIC BARS TALLY */}
                <div className="flex flex-col gap-3">
                  {Object.keys(mt.result.tallies).map((candidate) => {
                    const count = mt.result.tallies[candidate];
                    const isSkip = candidate === 'skip';
                    const cName = isSkip
                      ? 'SKIP ELIMINATION'
                      : room.players.find((p) => p.id === candidate)?.name || 'Player';

                    return (
                      <div key={candidate} className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="text-slate-300 font-bold">{cName}</span>
                          <span className="text-amber-500 font-black">{count}</span>
                        </div>
                        <div className="w-full bg-slate-900 border border-white/5 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isSkip ? 'bg-slate-500' : 'bg-red-500'
                            }`}
                            style={{
                              width: `${(count / mt.eligibleVoters.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ELIMINATION REVEAL */}
                <div className="border-t border-white/5 pt-4 mt-2 text-center flex flex-col items-center gap-2">
                  {mt.result.eliminatedPlayerId ? (
                    <>
                      <h4 className="text-lg font-black tracking-widest text-red-500 uppercase font-mono animate-bounce">
                        {room.players.find((p) => p.id === mt.result.eliminatedPlayerId)?.name.toUpperCase()} WAS ELIMINATED
                      </h4>
                      <span className="text-xs font-mono text-slate-300">
                        Public Role Reveal:
                      </span>
                      <span className="text-2xl font-black font-mono text-red-500 uppercase tracking-widest border border-red-500/30 rounded px-4 py-1.5 bg-red-950/20 animate-pulse">
                        {mt.result.roleReveal}
                      </span>
                    </>
                  ) : (
                    <h4 className="text-lg font-black tracking-widest text-slate-400 uppercase font-mono">
                      NO ONE ELIMINATED (SKIP OR TIE WINNER)
                    </h4>
                  )}
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default MeetingScreen;
