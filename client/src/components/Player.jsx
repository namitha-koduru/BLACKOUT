// components/Player.jsx
import { motion } from 'framer-motion';

const Player = ({ name, avatar, x, y, isMe, isDisconnected }) => {
  return (
    <motion.div
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 ${
        isDisconnected ? 'opacity-40 grayscale' : ''
      }`}
      style={{ left: 0, top: 0 }}
    >
      {/* Nickname above player */}
      <span
        className={`text-[9px] font-black px-1.5 py-0.2 rounded border mb-1 whitespace-nowrap tracking-wide uppercase select-none ${
          isMe
            ? 'bg-cyan-950/80 border-cyan-400/40 text-cyan-300'
            : 'bg-[#0f111a]/85 border-slate-700/60 text-slate-300'
        }`}
      >
        {name} {isDisconnected && '⚠️'}
      </span>

      {/* Circular Avatar Character Body */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 shadow-md transition-all select-none ${
          isMe
            ? 'border-cyan-400 bg-cyan-900/60 shadow-cyan-500/10'
            : 'border-slate-500 bg-slate-800/80'
        }`}
      >
        {avatar || '●'}
      </div>
    </motion.div>
  );
};

export default Player;
