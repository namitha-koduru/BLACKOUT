// pages/Home.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useSocket } from '../hooks/useSocket.js';
import SettingsModal from '../components/SettingsModal.jsx';

const AVATARS = ['🎁', '👻', '🧙', '🐱', '🦊', '🐸', '🍕', '🚀', '👑', '🎮', '🦄', '🐼', '🤖', '👾', '🦁', '🌟'];

const Home = () => {
  const navigate = useNavigate();
  const { isConnected } = useSocket();
  
  const storedName = useUserStore((state) => state.name);
  const storedAvatar = useUserStore((state) => state.avatar);
  const setProfile = useUserStore((state) => state.setProfile);

  const [name, setName] = useState(storedName);
  const [selectedAvatar, setSelectedAvatar] = useState(storedAvatar);
  const [isSaved, setIsSaved] = useState(!!storedName);
  const [showSettings, setShowSettings] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setProfile(name.trim(), selectedAvatar);
    setIsSaved(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      {/* Settings modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Absolute settings button */}
      <button
        onClick={() => setShowSettings(true)}
        className="absolute top-4 right-4 rounded-xl bg-white/5 border border-white/10 p-2.5 text-xl hover:bg-white/10 active:scale-95 transition-all"
        title="Open Settings"
        aria-label="Open Settings"
      >
        ⚙️
      </button>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-7xl"
      >
        {selectedAvatar}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-gradient-to-r from-mystery-gold via-mystery-pink to-mystery-purple bg-clip-text text-5xl font-extrabold text-transparent sm:text-6xl"
      >
        Mystery Box
      </motion.h1>

      <p className="max-w-md text-white/70">
        Enter your party nickname and select an avatar to enter the multiplayer lobby.
      </p>

      {!isSaved ? (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card flex w-full max-w-md flex-col gap-5 p-6 text-left"
          onSubmit={handleSaveProfile}
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-white/90">Display Nickname</label>
            <input
              type="text"
              maxLength={15}
              placeholder="e.g. BoxMaster99"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-white placeholder-white/30 focus:border-mystery-pink focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white/90">Select Avatar</label>
            <div className="grid grid-cols-4 gap-2.5 max-h-40 overflow-y-auto pr-1">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`flex h-11 items-center justify-center rounded-xl text-2xl transition-all ${
                    selectedAvatar === avatar
                      ? 'bg-mystery-pink scale-110 shadow-lg'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={!name.trim()}>
            Enter Game Lobby
          </button>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card flex w-full max-w-sm flex-col gap-4 p-6"
        >
          <div className="flex items-center gap-4 rounded-xl bg-white/5 p-3">
            <span className="text-4xl">{selectedAvatar}</span>
            <div className="text-left">
              <div className="text-xs text-white/50">Current Profile</div>
              <div className="font-bold text-white text-lg">{name}</div>
            </div>
            <button
              onClick={() => setIsSaved(false)}
              className="ml-auto text-xs text-mystery-pink hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/create')} className="btn-primary py-3">
              Create Room
            </button>
            <button
              onClick={() => navigate('/join')}
              className="rounded-xl border border-white/20 bg-white/5 py-3 font-semibold text-white transition-all hover:bg-white/10"
            >
              Join Room
            </button>
          </div>
        </motion.div>
      )}

      {/* Network connection indicator */}
      <div className="glass-card flex w-full max-w-xs justify-between gap-4 px-4 py-2.5 text-xs text-white/50 mt-4">
        <span>Server Connection</span>
        <span className={`flex items-center gap-1.5 font-medium ${isConnected ? 'text-mystery-teal' : 'text-mystery-gold'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-mystery-teal animate-pulse' : 'bg-mystery-gold'}`} />
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>
    </div>
  );
};

export default Home;
