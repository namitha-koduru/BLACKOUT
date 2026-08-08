// pages/JoinRoom.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import { useSocket } from '../hooks/useSocket.js';

const JoinRoom = () => {
  const navigate = useNavigate();
  const { isConnected } = useSocket();

  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);
  const avatar = useUserStore((state) => state.avatar);

  const room = useRoomStore((state) => state.room);
  const publicRooms = useRoomStore((state) => state.publicRooms);
  const joinRoom = useRoomStore((state) => state.joinRoom);
  const fetchPublicRooms = useRoomStore((state) => state.fetchPublicRooms);
  const loading = useRoomStore((state) => state.loading);

  const [code, setCode] = useState('');

  // If user hasn't configured profile, redirect back to Home
  useEffect(() => {
    if (!name) {
      navigate('/');
    }
  }, [name, navigate]);

  // Navigate to lobby once joined successfully
  useEffect(() => {
    if (room) {
      navigate(`/room/${room.roomCode}`);
    }
  }, [room, navigate]);

  // Fetch initial public rooms list on mount, and bind socket updating
  useEffect(() => {
    if (isConnected) {
      fetchPublicRooms();
    }
  }, [isConnected, fetchPublicRooms]);

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) return;
    joinRoom(code.toUpperCase().trim(), playerId, name, avatar);
  };

  const handleJoinPublic = (roomCode) => {
    joinRoom(roomCode, playerId, name, avatar);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-mystery-gold via-mystery-pink to-mystery-purple bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl"
      >
        Join a Room
      </motion.h1>

      <div className="flex w-full max-w-4xl flex-col gap-6 md:flex-row md:items-start text-left">
        {/* Join by Code Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card flex-1 p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">
            <label htmlFor="room-code">Enter Room Code</label>
          </h2>
          <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
            <div>
              <input
                id="room-code"
                name="room-code"
                type="text"
                maxLength={6}
                placeholder="6-character code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-center text-xl font-bold tracking-widest text-white placeholder-white/20 focus:border-mystery-pink focus:outline-none"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 font-semibold text-white transition-all hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 py-3"
                disabled={loading || code.trim().length !== 6}
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Public Rooms List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card flex-1 p-6 flex flex-col min-h-64 max-h-[350px]"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Public Lobbies</h2>
            <button
              onClick={fetchPublicRooms}
              className="text-xs text-mystery-teal hover:underline"
            >
              Refresh
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {publicRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/40 text-sm py-12">
                <span>No public lobbies found.</span>
                <span>Create one to start!</span>
              </div>
            ) : (
              publicRooms.map((pubRoom) => (
                <div
                  key={pubRoom.roomCode}
                  className="flex items-center justify-between rounded-xl bg-white/5 p-3.5 hover:bg-white/10 transition-all border border-white/5"
                >
                  <div>
                    <div className="text-sm font-bold text-white tracking-wide">
                      ROOM: {pubRoom.roomCode}
                    </div>
                    <div className="text-xs text-white/50 mt-0.5">
                      Players: {pubRoom.playerCount} / {pubRoom.maxPlayers}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinPublic(pubRoom.roomCode)}
                    className="rounded-lg bg-mystery-teal px-4 py-1.5 text-xs font-bold text-mystery-bg hover:scale-105 transition-all"
                    disabled={loading || pubRoom.playerCount >= pubRoom.maxPlayers}
                  >
                    {pubRoom.playerCount >= pubRoom.maxPlayers ? 'Full' : 'Join'}
                  </button>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinRoom;
