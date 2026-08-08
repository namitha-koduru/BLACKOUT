// pages/Lobby.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import { useSocket } from '../hooks/useSocket.js';
import SettingsModal from '../components/SettingsModal.jsx';
import BlackoutGame from './BlackoutGame.jsx';
import WinnerScreen from './WinnerScreen.jsx';
import toast from 'react-hot-toast';

const Lobby = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { isConnected } = useSocket();

  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);
  const avatar = useUserStore((state) => state.avatar);

  const room = useRoomStore((state) => state.room);
  const loading = useRoomStore((state) => state.loading);
  const error = useRoomStore((state) => state.error);
  const kicked = useRoomStore((state) => state.kicked);

  const joinRoom = useRoomStore((state) => state.joinRoom);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const toggleReady = useRoomStore((state) => state.toggleReady);
  const updateSettings = useRoomStore((state) => state.updateSettings);
  const transferHost = useRoomStore((state) => state.transferHost);
  const kickPlayer = useRoomStore((state) => state.kickPlayer);
  const deleteRoom = useRoomStore((state) => state.deleteRoom);
  const sendChatMessage = useRoomStore((state) => state.sendChatMessage);
  const startGame = useRoomStore((state) => state.startGame);

  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const chatEndRef = useRef(null);

  // Redirect to Home if user setup is missing
  useEffect(() => {
    if (!name) {
      navigate('/');
    }
  }, [name, navigate]);

  // If room is closed or player is kicked, the store's room becomes null. Redirect to home.
  useEffect(() => {
    // Wait for initial connection or reconnect attempts before navigating away
    if (!room && name && !sessionStorage.getItem('blackout_active_room_code')) {
      navigate('/');
    }
  }, [room, navigate, name]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat]);

  // Connect player if not already in the room state
  useEffect(() => {
    if (isConnected && name && !room && !loading && !error && !kicked) {
      if (roomCode) {
        joinRoom(roomCode.toUpperCase(), playerId, name, avatar);
      }
    }
  }, [isConnected, name, room, roomCode, joinRoom, playerId, avatar, loading, error, kicked]);

  if (loading && !room) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs uppercase tracking-widest text-cyan-400">
        <span className="animate-pulse">Accessing facility mainframe...</span>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center font-mono">
        <div className="text-3xl text-red-500">⚠️</div>
        <h2 className="text-sm font-bold text-red-400 uppercase tracking-widest">ACCESS DENIED</h2>
        <p className="text-xs text-slate-500 max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/10"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  if (!room) return null;

  // Handle re-routing depending on gameState
  if (room.gameState !== 'waiting' && room.gameState !== 'game_over') {
    return <BlackoutGame />;
  }

  if (room.gameState === 'game_over') {
    return <WinnerScreen />;
  }

  const isHost = room.hostId === playerId;
  const isSpectator = room.spectators.some((s) => s.id === playerId);
  const myPlayer = room.players.find((p) => p.id === playerId);
  const isReady = myPlayer?.ready === true;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    toast.success('Access code copied to clipboard!', { icon: '📋' });
  };

  const handleLeave = () => {
    leaveRoom(room.roomCode, playerId);
    navigate('/');
  };

  const handleToggleReady = () => {
    toggleReady(room.roomCode, playerId, !isReady);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(room.roomCode, playerId, message.trim());
      setMessage('');
    }
  };

  const handleSettingChange = (field, value) => {
    updateSettings(room.roomCode, playerId, { [field]: value });
  };

  // Check if all OTHER players are ready to activate the start button for the host
  const otherPlayers = room.players.filter((p) => p.id !== room.hostId);
  const canStartGame =
    otherPlayers.length > 0 &&
    otherPlayers.every((p) => p.ready) &&
    room.players.length >= 4 &&
    room.gameState === 'waiting' &&
    !isStarting;

  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-8 font-mono select-none text-xs">
      {/* Settings modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Network Alert Banner */}
      {!isConnected && (
        <div className="w-full max-w-6xl mb-4 bg-red-950/20 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-xs font-black text-center animate-pulse uppercase tracking-wider">
          ⚠️ Connection lost. Reconnecting to mainframe...
        </div>
      )}

      {/* Header Info */}
      <div className="flex w-full max-w-6xl flex-col justify-between gap-4 border-b border-cyan-500/10 pb-4 md:flex-row md:items-center">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white uppercase tracking-widest">FACILITY DEPLOYMENT LOBBY</h1>
            <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold text-slate-900 ${room.settings.isPublic ? 'bg-cyan-400' : 'bg-white/30'}`}>
              {room.settings.isPublic ? 'PUBLIC' : 'PRIVATE'}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-xl bg-white/5 border border-white/10 p-2 text-sm hover:bg-white/10 active:scale-95 transition-all ml-2"
              title="Open Settings"
              aria-label="Open Settings"
            >
              ⚙️
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Host ID: {room.hostId.substring(0, 12)}...</p>
        </div>

        {/* Room Code Display */}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2 md:self-end">
          <div className="px-3 text-left">
            <div className="text-[9px] uppercase tracking-wider text-slate-500">Access Key</div>
            <div className="text-base font-black tracking-widest text-amber-500">{room.roomCode}</div>
          </div>
          <button
            onClick={handleCopyCode}
            className="rounded-lg bg-cyan-600 hover:bg-cyan-700 px-4 py-2 text-xs font-bold text-white transition-all uppercase"
          >
            Copy Code
          </button>
        </div>
      </div>

      <div className="mt-6 flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        {/* Left Side: Players List */}
        <div className="flex-[2] flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-300 text-left flex justify-between items-center uppercase tracking-wider">
            <span>Personnel ({room.players.length} / {room.settings.maxPlayers})</span>
            {room.spectators.length > 0 && (
              <span className="text-xs font-normal text-slate-500">Spectators: {room.spectators.length}</span>
            )}
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {room.players.map((player) => {
                const isPlayerHost = player.id === room.hostId;
                const isMe = player.id === playerId;
                return (
                  <motion.div
                    key={player.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`glass-card relative flex items-center gap-4 p-4 border transition-all ${
                      player.ready
                        ? 'border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] bg-cyan-950/5'
                        : 'border-white/5'
                    }`}
                  >
                    {/* Disconnect Overlay */}
                    {!player.connected && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/75 backdrop-blur-[1px] z-10">
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-500 animate-pulse">
                          Disconnected (Re-link timer active)
                        </div>
                      </div>
                    )}

                    {/* Avatar */}
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl">
                      {player.avatar}
                      {/* Connection status indicator */}
                      <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${player.connected ? 'bg-cyan-500' : 'bg-amber-500 animate-ping'}`} />
                    </div>

                    {/* Player Info */}
                    <div className="text-left flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 font-bold text-white text-base">
                        <span className="truncate">{player.name}</span>
                        {isPlayerHost && <span title="Host">👑</span>}
                        {isMe && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-slate-300">You</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                        <span>Score: {player.score}</span>
                        <span>•</span>
                        <span className={player.ready ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                          {player.ready ? 'READY' : 'PREPARING'}
                        </span>
                      </div>
                    </div>

                    {/* Host Controls for other players */}
                    {isHost && !isMe && player.connected && (
                      <div className="flex flex-col gap-1.5 ml-auto text-[9px]">
                        <button
                          onClick={() => transferHost(room.roomCode, playerId, player.id)}
                          className="rounded bg-white/5 px-2.5 py-1 font-bold text-slate-300 hover:bg-white/10 transition-all uppercase"
                        >
                          Host
                        </button>
                        <button
                          onClick={() => kickPlayer(room.roomCode, playerId, player.id)}
                          className="rounded bg-red-950/20 border border-red-500/20 px-2.5 py-1 font-bold text-red-400 hover:bg-red-950/40 transition-all uppercase"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Spectator Display */}
          {room.spectators.length > 0 && (
            <div className="glass-card p-4 text-left border border-white/5">
              <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase">Spectating Mainframe:</h3>
              <div className="flex flex-wrap gap-2">
                {room.spectators.map((spec) => (
                  <span
                    key={spec.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white"
                  >
                    <span>{spec.avatar}</span>
                    <span className="font-semibold">{spec.name}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${spec.connected ? 'bg-cyan-500' : 'bg-amber-500 animate-pulse'}`} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Chat, Settings and Actions */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Room Settings Panel */}
          <div className="glass-card p-5 text-left flex flex-col gap-4 border border-white/5 text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Facility Settings</h3>

            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center">
                {isHost ? (
                  <label htmlFor="lobby-max-players" className="text-slate-400 uppercase font-bold">Max Roster</label>
                ) : (
                  <span className="text-slate-400 uppercase font-bold">Max Roster</span>
                )}
                {isHost ? (
                  <select
                    id="lobby-max-players"
                    name="lobby-max-players"
                    value={room.settings.maxPlayers}
                    onChange={(e) => handleSettingChange('maxPlayers', Number(e.target.value))}
                    className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n} className="bg-slate-900">
                        {n} Players
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-white font-bold">{room.settings.maxPlayers} Players</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                {isHost ? (
                  <label htmlFor="lobby-total-rounds" className="text-slate-400 uppercase font-bold">Match Rounds</label>
                ) : (
                  <span className="text-slate-400 uppercase font-bold">Match Rounds</span>
                )}
                {isHost ? (
                  <select
                    id="lobby-total-rounds"
                    name="lobby-total-rounds"
                    value={room.settings.totalRounds}
                    onChange={(e) => handleSettingChange('totalRounds', Number(e.target.value))}
                    className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n} className="bg-slate-900">
                        {n} Rounds
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-white font-bold">{room.settings.totalRounds} Rounds</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400 uppercase font-bold">Visibility</span>
                {isHost ? (
                  <button
                    onClick={() => handleSettingChange('isPublic', !room.settings.isPublic)}
                    className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 font-bold text-white hover:bg-white/10 transition-all uppercase"
                  >
                    Set {room.settings.isPublic ? 'Private' : 'Public'}
                  </button>
                ) : (
                  <span className="text-white font-bold">{room.settings.isPublic ? 'Public' : 'Private'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Lobby Chat Box */}
          <div className="glass-card flex flex-col h-72 border border-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lobby Comms
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {room.chat.length === 0 ? (
                <div className="text-center text-slate-600 text-xs py-10">Lobby comms silent. Broadcast transmission?</div>
              ) : (
                room.chat.map((msg, i) => {
                  const isSystem = msg.senderId === 'system';
                  const isMe = msg.senderId === playerId;
                  return (
                    <div
                      key={i}
                      className={`text-left text-[11px] leading-relaxed ${
                        isSystem
                          ? 'text-amber-500 font-medium italic text-center text-[10px] my-1'
                          : ''
                      }`}
                    >
                      {!isSystem && (
                        <span className={`font-bold mr-1.5 ${isMe ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {msg.senderName}:
                        </span>
                      )}
                      <span className={isSystem ? 'text-amber-500' : 'text-slate-200'}>{msg.text}</span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Send Form */}
            <form onSubmit={handleSendChat} className="border-t border-white/10 p-2 flex gap-2 bg-black/20">
              <label htmlFor="lobby-chat-input" className="sr-only">Type a message</label>
              <input
                id="lobby-chat-input"
                name="lobby-chat-input"
                type="text"
                maxLength={80}
                placeholder="Transmit message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-cyan-600 hover:bg-cyan-700 px-4 py-1.5 font-bold text-white hover:scale-105 active:scale-95 transition-all uppercase"
                disabled={!message.trim()}
              >
                Send
              </button>
            </form>
          </div>

          {/* Lobby Actions */}
          <div className="flex flex-col gap-3">
            {!isSpectator && !isHost && (
              <button
                onClick={handleToggleReady}
                className={`w-full py-3 rounded-xl font-bold transition-all text-white shadow-lg uppercase tracking-wider border ${
                  isReady
                    ? 'bg-gradient-to-r from-red-600 to-amber-700 border-red-500/20 hover:scale-[1.01] active:scale-95'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-700 border-cyan-500/20 hover:scale-[1.01] active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                }`}
              >
                {isReady ? 'Set Preparing' : 'Ready Up'}
              </button>
            )}

            {isHost && (
              <button
                className={`w-full py-3 rounded-xl font-bold transition-all text-white shadow-lg uppercase tracking-wider border ${
                  canStartGame
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500/20 hover:scale-[1.01] active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : 'bg-white/10 text-white/30 border border-white/10 cursor-not-allowed'
                }`}
                disabled={!canStartGame}
                onClick={async () => {
                  setIsStarting(true);
                  const success = await startGame(room.roomCode, playerId);
                  if (!success) {
                    setIsStarting(false);
                  }
                }}
              >
                {isStarting ? 'STARTING...' : 'Start Game (Needs 4+ Players & Ready)'}
              </button>
            )}

            <div className="flex gap-3">
              {isHost && (
                <button
                  onClick={() => deleteRoom(room.roomCode, playerId)}
                  className="flex-1 rounded-xl border border-red-500/20 bg-red-950/15 py-3 font-semibold text-red-400 transition-all hover:bg-red-950/30 uppercase tracking-wide"
                >
                  Delete Room
                </button>
              )}
              <button
                onClick={handleLeave}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-slate-300 transition-all hover:bg-white/10 uppercase tracking-wide"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
