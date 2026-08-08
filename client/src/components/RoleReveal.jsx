// components/RoleReveal.jsx
import { motion } from 'framer-motion';
import RoleCard from './RoleCard.jsx';

const RoleReveal = ({ timer, roleInfo }) => {
  // Sequence stages based on the 8-second authoritative timer
  const isBlackoutStage = timer >= 7;
  const isInitializingStage = timer === 5 || timer === 6;
  const isRevealStage = timer <= 4;

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[400px]">
      {isBlackoutStage && (
        <motion.div
          key="blackout-detected"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="text-center flex flex-col items-center gap-4"
        >
          <div className="text-5xl md:text-7xl font-black text-red-500 animate-pulse tracking-widest">
            🚨 BLACKOUT 🚨
          </div>
          <div className="text-sm font-mono tracking-widest text-red-400 border border-red-500/30 px-4 py-1 rounded bg-red-500/5 mt-2 animate-bounce">
            CRITICAL POWER FAILURE DETECTED
          </div>
        </motion.div>
      )}

      {isInitializingStage && (
        <motion.div
          key="system-initializing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-center w-full max-w-sm flex flex-col gap-4 px-6"
        >
          <div className="text-xs font-mono text-cyan-400 tracking-widest uppercase animate-pulse">
            System Initializing...
          </div>
          
          <div className="w-full bg-cyan-950/30 border border-cyan-500/20 h-4 rounded-full p-0.5 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'linear' }}
              className="bg-cyan-500 h-full rounded-full"
            ></motion.div>
          </div>
          
          <div className="text-[10px] font-mono text-slate-500 text-left flex flex-col gap-1">
            <div>&gt; Securing airlocks... OK</div>
            <div>&gt; Syncing server logs... OK</div>
            <div>&gt; Decrypting personal access token...</div>
          </div>
        </motion.div>
      )}

      {isRevealStage && (
        <motion.div
          key="card-reveal"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full flex justify-center px-4"
        >
          {roleInfo ? (
            <RoleCard
              role={roleInfo.role}
              team={roleInfo.team}
              ability={roleInfo.ability}
              description={roleInfo.description}
            />
          ) : (
            <div className="text-sm font-mono text-cyan-400 animate-pulse">
              DECRYPTING ENCRYPTED FILE...
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default RoleReveal;
