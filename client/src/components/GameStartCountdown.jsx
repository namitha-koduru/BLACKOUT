// components/GameStartCountdown.jsx
import { motion, AnimatePresence } from 'framer-motion';

const GameStartCountdown = ({ timer }) => {
  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[400px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={timer}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center flex flex-col items-center justify-center"
        >
          <span className="text-[120px] font-mono font-black text-cyan-400 tracking-tighter shadow-cyan-500/10">
            {timer}
          </span>
          <h2 className="text-xl font-black tracking-widest text-slate-300 uppercase mt-2">
            PREPARING FACILITY EXPLORATION
          </h2>
          <p className="text-xs text-slate-500 mt-2 tracking-wider">
            AIRLOCK DOOR CHARGING. VENTILATING GENERATOR ROOM.
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GameStartCountdown;
