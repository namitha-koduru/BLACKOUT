// components/SettingsModal.jsx
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
    showTradeHistory,
    setSoundVolume,
    setMusicOn,
    setAnimationSpeed,
    setTheme,
    setShowTimer,
    setShowTradeHistory,
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
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="glass-card z-10 w-full max-w-md border border-white/20 p-6 flex flex-col gap-5 text-white"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xl font-black flex items-center gap-2">
              <span>⚙️</span> Game Settings
            </h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-lg transition-all"
              aria-label="Close Settings"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-4 text-sm max-h-[350px] overflow-y-auto pr-1">
            {/* Volume control */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label htmlFor="settings-volume" className="font-semibold text-white/90">Sound Volume</label>
                <span className="text-xs font-bold text-mystery-gold">
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
                  className="flex-1 accent-mystery-pink cursor-pointer h-1.5 rounded-lg bg-white/10 appearance-none"
                />
                <button
                  type="button"
                  onClick={handleTestSound}
                  className="rounded bg-white/10 px-2.5 py-1 text-xs font-bold hover:bg-white/20"
                >
                  Test
                </button>
              </div>
            </div>

            {/* Music Toggle */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <div>
                <span className="font-semibold text-white/90">Background Music</span>
                <div className="text-[10px] text-white/50">Procedural ambient synth track</div>
              </div>
              <button
                type="button"
                onClick={handleMusicToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  musicOn ? 'bg-mystery-teal' : 'bg-white/10'
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
              <label htmlFor="settings-animation-speed" className="font-semibold text-white/90">Animation Speed</label>
              <select
                id="settings-animation-speed"
                name="settings-animation-speed"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(e.target.value)}
                className="rounded bg-black/40 border border-white/20 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-mystery-pink"
              >
                <option value="slow" className="bg-mystery-bg">Slow (Reduced Motion)</option>
                <option value="normal" className="bg-mystery-bg">Normal</option>
                <option value="fast" className="bg-mystery-bg">Fast (No Delay)</option>
              </select>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <label htmlFor="settings-theme" className="font-semibold text-white/90">Color Theme</label>
              <select
                id="settings-theme"
                name="settings-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="rounded bg-black/40 border border-white/20 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-mystery-pink"
              >
                <option value="party" className="bg-mystery-bg">Party Mode (Dark Violet)</option>
                <option value="neon" className="bg-mystery-bg">Neon Vibe (Cyan & Pink)</option>
                <option value="classic" className="bg-mystery-bg">Classic (Plain Slate)</option>
              </select>
            </div>

            {/* Visibility Settings */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <span className="font-semibold text-white/90">Display Round Timer</span>
              <button
                type="button"
                onClick={() => setShowTimer(!showTimer)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showTimer ? 'bg-mystery-teal' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showTimer ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="font-semibold text-white/90">Display Trade History Log</span>
              <button
                type="button"
                onClick={() => setShowTradeHistory(!showTradeHistory)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showTradeHistory ? 'bg-mystery-teal' : 'bg-white/10'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showTradeHistory ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary py-2.5 mt-2 font-bold"
          >
            Save & Apply
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;
