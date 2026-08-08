// components/SettingsModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore } from '../store/settingsStore.js';
import { playSound } from '../utils/sound.js';

const SettingsModal = ({ isOpen, onClose }) => {
  const {
    soundVolume,
    musicOn,
    animationSpeed,
    theme,
    showTimer,
    setSoundVolume,
    setMusicOn,
    setAnimationSpeed,
    setTheme,
    setShowTimer,
  } = useSettingsStore();

  if (!isOpen) return null;

  const handleVolumeChange = (e) => {
    const val = Number(e.target.value);
    setSoundVolume(val);
  };

  const handleTestSound = () => {
    playSound('ready');
  };

  const handleMusicToggle = () => {
    setMusicOn(!musicOn);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-900 border border-cyan-500/20 shadow-2xl shadow-cyan-500/5 rounded-2xl z-10 w-full max-w-md p-6 flex flex-col gap-5 text-white"
        >
          <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3">
            <h2 className="text-base font-black flex items-center gap-2 font-mono uppercase tracking-widest text-cyan-400">
              <span>⚙️</span> System Settings
            </h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-lg transition-all"
              aria-label="Close Settings"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-4 text-xs font-mono max-h-[350px] overflow-y-auto pr-1">
            {/* Volume control */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="settings-volume" className="font-semibold text-slate-300">Auditory Volume</label>
                <span className="text-xs font-black text-cyan-400">
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">{soundVolume === 0 ? '🔇' : '🔊'}</span>
                <input
                  id="settings-volume"
                  name="settings-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  onChange={handleVolumeChange}
                  className="flex-1 accent-cyan-500 cursor-pointer h-1.5 rounded-lg bg-white/10 appearance-none"
                />
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="rounded bg-white/10 px-2.5 py-1 text-[10px] font-bold hover:bg-white/20 uppercase"
                >
                  Test
                </button>
              </div>
            </div>

            {/* Music Toggle */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <div>
                <span className="font-semibold text-slate-300">Ambient Hum</span>
                <div className="text-[9px] text-slate-500">Facility background soundscape</div>
              </div>
              <button
                type="button"
                onClick={handleMusicToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  musicOn ? 'bg-cyan-500' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    musicOn ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Animation Speed Selector */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <label htmlFor="settings-animation-speed" className="font-semibold text-slate-300">Animation Speed</label>
              <select
                id="settings-animation-speed"
                name="settings-animation-speed"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(e.target.value)}
                className="rounded bg-black/40 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="slow" className="bg-slate-900">Slow (Reduced Motion)</option>
                <option value="normal" className="bg-slate-900">Normal</option>
                <option value="fast" className="bg-slate-900">Fast (Instant)</option>
              </select>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <label htmlFor="settings-theme" className="font-semibold text-slate-300">Diagnostics Theme</label>
              <select
                id="settings-theme"
                name="settings-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="rounded bg-black/40 border border-white/10 px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="classic" className="bg-slate-900">Facility Charcoal (Classic)</option>
                <option value="neon" className="bg-slate-900">Emergency Cyan (Neon)</option>
              </select>
            </div>

            {/* Visibility Settings */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="font-semibold text-slate-300">Display Diagnostics Clocks</span>
              <button
                type="button"
                onClick={() => setShowTimer(!showTimer)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showTimer ? 'bg-cyan-500' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showTimer ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg py-2 text-xs font-mono font-black uppercase tracking-wider transition-colors mt-2"
          >
            Apply Changes
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;
