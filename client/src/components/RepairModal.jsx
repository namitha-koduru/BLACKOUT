// components/RepairModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import CircuitRepair from './CircuitRepair.jsx';
import FuseAlignment from './FuseAlignment.jsx';
import SignalCalibration from './SignalCalibration.jsx';
import PowerRouting from './PowerRouting.jsx';
import SystemRestart from './SystemRestart.jsx';

const RepairModal = ({ systemId, systemName, session, onClose }) => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const completeRepair = useRoomStore((state) => state.completeRepair);
  const failRepair = useRoomStore((state) => state.failRepair);

  const { repairSessionId, miniGameType, expiresAt } = session;

  const [timeLeft, setTimeLeft] = useState(12);
  const [status, setStatus] = useState('playing'); // 'playing' | 'success' | 'failed'
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Synchronize local countdown display to server expiresAt timestamp
  useEffect(() => {
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && status === 'playing') {
        handleLocalFailure('Time limit expired.');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 200);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const handleMiniGameSuccess = async () => {
    if (status !== 'playing') return;
    setStatus('processing');

    try {
      const res = await completeRepair(room.roomCode, playerId, systemId, repairSessionId);
      if (res.success) {
        setStatus('success');
        setFeedbackMessage(`+${res.reward || 20} SYSTEM HEALTH`);
        setTimeout(() => onClose(), 1800);
      } else {
        setStatus('failed');
        setFeedbackMessage(res.message || 'Authentication error.');
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      setStatus('failed');
      setFeedbackMessage('System validation error.');
      setTimeout(() => onClose(), 2000);
    }
  };

  const handleLocalFailure = async (reason = 'Repair aborted.') => {
    if (status !== 'playing') return;
    setStatus('failed');
    setFeedbackMessage(reason);

    try {
      await failRepair(room.roomCode, playerId, systemId, repairSessionId);
    } catch (err) {
      console.error('[Repair] failed cleanup error:', err.message);
    }

    setTimeout(() => onClose(), 1500);
  };

  // Mount corresponding mini-game component
  const renderMiniGame = () => {
    switch (miniGameType) {
      case 1:
        return <CircuitRepair onSuccess={handleMiniGameSuccess} />;
      case 2:
        return <FuseAlignment onSuccess={handleMiniGameSuccess} />;
      case 3:
        return <SignalCalibration onSuccess={handleMiniGameSuccess} />;
      case 4:
        return <PowerRouting onSuccess={handleMiniGameSuccess} />;
      case 5:
        return <SystemRestart onSuccess={handleMiniGameSuccess} />;
      default:
        return <div className="text-center py-6 text-red-500 font-mono">Invalid Game Key</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[#0a0b12] border border-cyan-500/20 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative overflow-hidden"
      >
        {/* HEADER BAR */}
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔧 REPAIR:</span>
              <span className="text-cyan-400">{systemName}</span>
            </h3>
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
              Session: {repairSessionId}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">⏳</span>
            <span
              className={`text-lg font-mono font-black tracking-wider ${
                timeLeft <= 3 ? 'text-red-500 animate-pulse' : 'text-amber-400'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* ACTIVE AREA */}
        <div className="flex justify-center items-center py-2 relative">
          {status === 'playing' && renderMiniGame()}

          {status === 'processing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500/10 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-xs font-mono text-cyan-400 tracking-widest uppercase">
                Verifying repair...
              </span>
            </div>
          )}

          {status === 'success' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-2xl mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                ✓
              </div>
              <h4 className="text-lg font-black text-emerald-400 tracking-wider uppercase">
                REPAIR SUCCESSFUL
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-2 tracking-wide uppercase">
                {feedbackMessage}
              </p>
            </motion.div>
          )}

          {status === 'failed' && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center text-red-500 text-2xl mb-4 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                ✕
              </div>
              <h4 className="text-lg font-black text-red-500 tracking-wider uppercase">
                REPAIR FAILED
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-2 tracking-wide uppercase">
                {feedbackMessage || 'Connection severed.'}
              </p>
            </motion.div>
          )}
        </div>

        {/* FOOTER ACTION */}
        {status === 'playing' && (
          <button
            onClick={() => handleLocalFailure('Repair canceled.')}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-black text-xs uppercase tracking-wider rounded-lg border border-slate-700 transition-all active:scale-[0.98]"
          >
            Abort Connection
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default RepairModal;
