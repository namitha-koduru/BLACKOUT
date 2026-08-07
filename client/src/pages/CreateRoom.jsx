// pages/CreateRoom.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';

const CreateRoom = () => {
  const navigate = useNavigate();
  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);
  const avatar = useUserStore((state) => state.avatar);

  const room = useRoomStore((state) => state.room);
  const createRoom = useRoomStore((state) => state.createRoom);
  const loading = useRoomStore((state) => state.loading);

  const [maxPlayers, setMaxPlayers] = useState(12);
  const [totalRounds, setTotalRounds] = useState(5);
  const [isPublic, setIsPublic] = useState(true);

  // If user hasn't configured profile, redirect back to Home
  useEffect(() => {
    if (!name) {
      navigate('/');
    }
  }, [name, navigate]);

  // Navigate to lobby once created
  useEffect(() => {
    if (room) {
      navigate(`/room/${room.roomCode}`);
    }
  }, [room, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    createRoom(playerId, name, avatar, {
      maxPlayers,
      totalRounds,
      isPublic,
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-mystery-gold via-mystery-pink to-mystery-purple bg-clip-text text-4xl font-extrabold text-transparent sm:text-5xl"
      >
        Lobby Settings
      </motion.h1>

      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card flex w-full max-w-md flex-col gap-5 p-6 text-left"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="mb-2 block text-sm font-semibold text-white/90">Max Players (2 - 12)</label>
          <select
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white focus:border-mystery-pink focus:outline-none"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
              <option key={num} value={num} className="bg-mystery-bg">
                {num} Players
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-white/90">Total Rounds (1 - 20)</label>
          <select
            value={totalRounds}
            onChange={(e) => setTotalRounds(Number(e.target.value))}
            className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white focus:border-mystery-pink focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((num) => (
              <option key={num} value={num} className="bg-mystery-bg">
                {num} Rounds
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-b border-white/10 my-1">
          <div>
            <div className="font-semibold text-white">Public Lobby</div>
            <div className="text-xs text-white/50">Allow other players to discover and join this room</div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              isPublic ? 'bg-mystery-teal' : 'bg-white/10'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPublic ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3 font-semibold text-white transition-all hover:bg-white/10"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 py-3" disabled={loading}>
            {loading ? 'Creating...' : 'Create Lobby'}
          </button>
        </div>
      </motion.form>
    </div>
  );
};

export default CreateRoom;
