// pages/Lobby.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import { useSocket } from '../hooks/useSocket.js';
import toast from 'react-hot-toast';
import BlackoutGame from './BlackoutGame.jsx';
import WinnerScreen from './WinnerScreen.jsx';
import SettingsModal from '../components/SettingsModal.jsx';

const Lobby = () => {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const { isConnected } = useSocket();

  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);

  const room = useRoomStore((state) => state.room);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const kickPlayer = useRoomStore((state) => state.kickPlayer);
  const transferHost = useRoomStore((state) => state.transferHost);
  const toggleReady = useRoomStore((state) => state.toggleReady);
  const updateSettings = useRoomStore((state) => state.updateSettings);
  const sendChatMessage = useRoomStore((state) => state.sendChatMessage);
  const deleteRoom = useRoomStore((state) => state.deleteRoom);
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
    if (!room && name && !sessionStorage.getItem('mysterybox_active_room_code')) {
      navigate('/');
    }
  }, [room, navigate, name]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat]);

  if (!room) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white font-bold text-xl">
        Connecting to room lobby...
      </div>
    );
  }

  // Dynamically switch panels based on game states to prevent reloads
  if (room.gameState !== 'waiting' && room.gameState !== 'game_over') {
    return <BlackoutGame />;
  }

  if (room.gameState === 'game_over') {
    return <WinnerScreen />;
  }

  const isHost = room.hostId === playerId;
  const currentPlayer = room.players.find((p) => p.id === playerId);
  const isReady = currentPlayer?.ready || false;
  const isSpectator = room.spectators.some((s) => s.id === playerId);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    toast.success('Room code copied to clipboard!');
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
    if (!message.trim()) return;
    sendChatMessage(room.roomCode, playerId, message.trim());
    setMessage('');
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
    <div className="flex min-h-screen flex-col items-center p-4 md:p-8">
      {/* Settings modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Network Alert Banner */}
      {!isConnected && (
        <div className="w-full max-w-6xl mb-4 bg-mystery-gold/20 border border-mystery-gold text-mystery-gold px-4 py-2.5 rounded-xl text-sm font-semibold text-center animate-pulse">
          Connection lost. Reconnecting to server...
        </div>
      )}

      {/* Header Info */}
      <div className="flex w-full max-w-6xl flex-col justify-between gap-4 border-b border-white/10 pb-4 md:flex-row md:items-center">
        <div className="text-left">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">Lobby Waiting Room</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-bold text-mystery-bg ${room.settings.isPublic ? 'bg-mystery-teal' : 'bg-white/30'}`}>
              {room.settings.isPublic ? 'Public' : 'Private'}
            </span>
            <button
              onClick={() => setShowSettings(true)}
              className="rounded-xl bg-white/5 border border-white/10 p-2 text-lg hover:bg-white/10 active:scale-95 transition-all ml-2"
              title="Open Settings"
              aria-label="Open Settings"
            >
              ⚙️
            </button>
          </div>
          <p className="text-sm text-white/50 mt-1">Host ID: {room.hostId.substring(0, 8)}...</p>
        </div>

        {/* Room Code Display */}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-2 md:self-end">
          <div className="px-3 text-left">
            <div className="text-[10px] uppercase tracking-wider text-white/50">Room Code</div>
            <div className="text-xl font-black tracking-widest text-mystery-gold">{room.roomCode}</div>
          </div>
          <button
            onClick={handleCopyCode}
            className="rounded-lg bg-mystery-pink px-4 py-2 text-xs font-bold text-white hover:scale-105 active:scale-95 transition-all"
          >
            Copy Code
          </button>
        </div>
      </div>

      <div className="mt-6 flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        {/* Left Side: Players List */}
        <div className="flex-[2] flex flex-col gap-4">
          <h2 className="text-xl font-bold text-white text-left flex justify-between items-center">
            <span>Players ({room.players.length} / {room.settings.maxPlayers})</span>
            {room.spectators.length > 0 && (
              <span className="text-xs font-normal text-white/55">Spectators: {room.spectators.length}</span>
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
                        ? 'border-mystery-teal/40 shadow-[0_0_15px_rgba(45,212,191,0.15)] bg-mystery-teal/5'
                        : 'border-white/5'
                    }`}
                  >
                    {/* Disconnect Overlay */}
                    {!player.connected && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-[2px] z-10">
                        <div className="rounded-lg bg-mystery-gold/20 border border-mystery-gold px-3 py-1.5 text-xs font-bold text-mystery-gold animate-pulse">
                          Disconnected (Grace Period)
                        </div>
                      </div>
                    )}

                    {/* Avatar */}
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl">
                      {player.avatar}
                      {/* Connection status indicator */}
                      <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-mystery-bg ${player.connected ? 'bg-mystery-teal' : 'bg-mystery-gold animate-ping'}`} />
                    </div>

                    {/* Player Info */}
                    <div className="text-left flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 font-bold text-white text-lg">
                        <span className="truncate">{player.name}</span>
                        {isPlayerHost && <span title="Host">👑</span>}
                        {isMe && <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-white/70">You</span>}
                      </div>
                      <div className="text-xs text-white/50 mt-0.5 flex gap-2">
                        <span>Score: {player.score}</span>
                        <span>•</span>
                        <span className={player.ready ? 'text-mystery-teal font-medium' : 'text-white/40'}>
                          {player.ready ? 'Ready' : 'Not Ready'}
                        </span>
                      </div>
                    </div>

                    {/* Host Controls for other players */}
                    {isHost && !isMe && player.connected && (
                      <div className="flex flex-col gap-1.5 ml-auto">
                        <button
                          onClick={() => transferHost(room.roomCode, playerId, player.id)}
                          className="rounded bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/80 hover:bg-white/10 transition-all"
                        >
                          Make Host
                        </button>
                        <button
                          onClick={() => kickPlayer(room.roomCode, playerId, player.id)}
                          className="rounded bg-mystery-pink/15 px-2.5 py-1 text-[10px] font-semibold text-mystery-pink hover:bg-mystery-pink/25 transition-all"
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
              <h3 className="text-sm font-bold text-white/70 mb-2">Spectating:</h3>
              <div className="flex flex-wrap gap-2">
                {room.spectators.map((spec) => (
                  <span
                    key={spec.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white"
                  >
                    <span>{spec.avatar}</span>
                    <span className="font-semibold">{spec.name}</span>
                    <span className={`h-1.5 w-1.5 rounded-full ${spec.connected ? 'bg-mystery-teal' : 'bg-mystery-gold animate-pulse'}`} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Chat, Settings and Actions */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Room Settings Panel */}
          <div className="glass-card p-5 text-left flex flex-col gap-4 border border-white/5">
            <h3 className="text-lg font-bold text-white">Room Settings</h3>

            <div className="flex flex-col gap-3.5">
              <div className="flex justify-between items-center">
                {isHost ? (
                  <label htmlFor="lobby-max-players" className="text-sm text-white/70">Max Players</label>
                ) : (
                  <span className="text-sm text-white/70">Max Players</span>
                )}
                {isHost ? (
                  <select
                    id="lobby-max-players"
                    name="lobby-max-players"
                    value={room.settings.maxPlayers}
                    onChange={(e) => handleSettingChange('maxPlayers', Number(e.target.value))}
                    className="rounded-lg border border-white/20 bg-black/40 px-2.5 py-1 text-sm text-white focus:outline-none focus:border-mystery-pink"
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <option key={n} value={n} className="bg-mystery-bg">
                        {n} Players
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-white font-bold">{room.settings.maxPlayers} Players</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                {isHost ? (
                  <label htmlFor="lobby-total-rounds" className="text-sm text-white/70">Total Rounds</label>
                ) : (
                  <span className="text-sm text-white/70">Total Rounds</span>
                )}
                {isHost ? (
                  <select
                    id="lobby-total-rounds"
                    name="lobby-total-rounds"
                    value={room.settings.totalRounds}
                    onChange={(e) => handleSettingChange('totalRounds', Number(e.target.value))}
                    className="rounded-lg border border-white/20 bg-black/40 px-2.5 py-1 text-sm text-white focus:outline-none focus:border-mystery-pink"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) => (
                      <option key={n} value={n} className="bg-mystery-bg">
                        {n} Rounds
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-white font-bold">{room.settings.totalRounds} Rounds</span>
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-white/70">Room Visibility</span>
                {isHost ? (
                  <button
                    onClick={() => handleSettingChange('isPublic', !room.settings.isPublic)}
                    className="rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-white hover:bg-white/10 transition-all"
                  >
                    Set {room.settings.isPublic ? 'Private' : 'Public'}
                  </button>
                ) : (
                  <span className="text-sm text-white font-bold">{room.settings.isPublic ? 'Public' : 'Private'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Lobby Chat Box */}
          <div className="glass-card flex flex-col h-72 border border-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-4 py-2.5 text-left text-xs font-bold text-white/60 uppercase tracking-wider">
              Lobby Chat
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {room.chat.length === 0 ? (
                <div className="text-center text-white/30 text-xs py-10">Lobby chat is quiet. Say hello!</div>
              ) : (
                room.chat.map((msg, i) => {
                  const isSystem = msg.senderId === 'system';
                  const isMe = msg.senderId === playerId;
                  return (
                    <div
                      key={i}
                      className={`text-left text-sm ${
                        isSystem
                          ? 'text-mystery-gold font-medium italic text-center text-xs my-1'
                          : ''
                      }`}
                    >
                      {!isSystem && (
                        <span className={`font-bold mr-1.5 ${isMe ? 'text-mystery-pink' : 'text-mystery-teal'}`}>
                          {msg.senderName}:
                        </span>
                      )}
                      <span className={isSystem ? 'text-mystery-gold' : 'text-white/90'}>{msg.text}</span>
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
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-mystery-pink"
              />
              <button
                type="submit"
                className="rounded-lg bg-mystery-pink px-4 py-1.5 text-xs font-bold text-white hover:scale-105 active:scale-95 transition-all"
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
                className={`w-full py-3.5 rounded-xl font-bold transition-all text-white shadow-lg ${
                  isReady
                    ? 'bg-gradient-to-r from-mystery-teal to-emerald-500 hover:scale-105 active:scale-95'
                    : 'bg-gradient-to-r from-mystery-pink to-mystery-purple hover:scale-105 active:scale-95'
                }`}
              >
                {isReady ? 'Set Unready' : 'Set Ready'}
              </button>
            )}

            {isHost && (
              <button
                className={`w-full py-3.5 rounded-xl font-bold transition-all text-white shadow-lg ${
                  canStartGame
                    ? 'bg-gradient-to-r from-mystery-teal to-emerald-500 hover:scale-105 active:scale-95 cursor-pointer'
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
                {isStarting ? 'STARTING...' : 'Start Game (Needs 4+ players & all ready)'}
              </button>
            )}

            <div className="flex gap-3">
              {isHost && (
                <button
                  onClick={() => deleteRoom(room.roomCode, playerId)}
                  className="flex-1 rounded-xl border border-mystery-pink/30 bg-mystery-pink/10 py-3 text-sm font-semibold text-mystery-pink transition-all hover:bg-mystery-pink/20"
                >
                  Delete Room
                </button>
              )}
              <button
                onClick={handleLeave}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
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
