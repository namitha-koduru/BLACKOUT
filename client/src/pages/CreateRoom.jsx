// pages/CreateRoom.jsx
import React, { useState, useEffect } from 'react';
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

  const [maxPlayers, setMaxPlayers] = useState(10);
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center select-none font-mono">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-3xl font-black uppercase tracking-widest text-transparent sm:text-4xl"
      >
        LOBBY CREATION
      </motion.h1>

      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card flex w-full max-w-md flex-col gap-5 p-6 text-left"
        onSubmit={handleSubmit}
      >
        <div>
          <label htmlFor="create-max-players" className="mb-2 block text-xs font-bold text-slate-300 uppercase tracking-wider">Max Players (4 - 10)</label>
          <select
            id="create-max-players"
            name="create-max-players"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {[4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num} className="bg-slate-900">
                {num} Players
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="create-total-rounds" className="mb-2 block text-xs font-bold text-slate-300 uppercase tracking-wider">Total Rounds (1 - 10)</label>
          <select
            id="create-total-rounds"
            name="create-total-rounds"
            value={totalRounds}
            onChange={(e) => setTotalRounds(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num} className="bg-slate-900">
                {num} Rounds
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-b border-white/10 my-1 text-xs">
          <div>
            <div className="font-bold text-slate-200">Public Lobby</div>
            <div className="text-[10px] text-slate-500">Allow other players to discover and join this room</div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(!isPublic)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              isPublic ? 'bg-cyan-500' : 'bg-white/10'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isPublic ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex gap-3 mt-2 text-xs">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-bold text-slate-300 transition-all hover:bg-white/10 uppercase"
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
