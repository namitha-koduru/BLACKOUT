// pages/WinnerScreen.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { playSound } from '../utils/sound.js';

const WinnerScreen = () => {
  const navigate = useNavigate();
  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);

  const room = useRoomStore((state) => state.room);
  const playAgain = useRoomStore((state) => state.playAgain);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);

  const { animationSpeed } = useSettingsStore();

  // If user hasn't configured profile, redirect back to Home
  useEffect(() => {
    if (!name) {
      navigate('/');
    }
  }, [name, navigate]);

  // Play triumphal victory sound on mount
  useEffect(() => {
    if (room) {
      playSound('winner');
    }
  }, [room]);

  if (!room) return null;

  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];
  const isHost = room.hostId === playerId;

  const handlePlayAgain = () => {
    playAgain(room.roomCode, playerId);
  };

  const handleLeave = () => {
    leaveRoom(room.roomCode, playerId);
    navigate('/');
  };

  // Adjust particle speeds based on preferences
  const durationBase = animationSpeed === 'fast' ? 1.5 : (animationSpeed === 'slow' ? 7.0 : 3.5);

  // Generate simple emoji confetti particles
  const confettiArray = Array.from({ length: 35 });

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 text-white text-center overflow-hidden select-none">
      
      {/* Emoji Confetti Animation */}
      {animationSpeed !== 'fast' && confettiArray.map((_, i) => (
        <motion.div
          key={i}
          initial={{
            y: -60,
            x: Math.random() * window.innerWidth - 100,
            rotate: 0,
            opacity: 1,
          }}
          animate={{
            y: window.innerHeight + 60,
            x: `calc(${Math.random() * 200 - 100}px + 50vw)`,
            rotate: 360 * Math.random(),
            opacity: 0,
          }}
          transition={{
            duration: durationBase + Math.random() * 4,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 5,
          }}
          className="absolute text-2xl select-none z-0"
        >
          {['🎉', '👑', '🪙', '✨', '🎁', '🎈'][Math.floor(Math.random() * 6)]}
        </motion.div>
      ))}

      <div className="z-10 flex w-full max-w-2xl flex-col items-center gap-6">
        
        {/* Victory Crown & Winner Card */}
        {winner && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 100, delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-7xl mb-2"
            >
              👑
            </motion.div>
            <h1 className="bg-gradient-to-r from-mystery-gold via-mystery-pink to-mystery-purple bg-clip-text text-5xl font-extrabold text-transparent tracking-wide">
              {winner.name} Wins!
            </h1>
            <p className="text-sm text-white/50 mt-1 uppercase tracking-widest">
              Lobby Champion with {winner.score} Coins
            </p>
          </motion.div>
        )}

        {/* Podium/Rankings Panel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card w-full p-6 flex flex-col gap-3.5 border border-white/5"
        >
          <h2 className="text-xl font-bold text-white border-b border-white/10 pb-3 text-left">
            Final Room Standings
          </h2>

          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
            {sortedPlayers.map((player, index) => {
              const isWinner = index === 0;
              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-xl p-3 border transition-all ${
                    isWinner
                      ? 'bg-mystery-gold/15 border-mystery-gold/40 shadow-[0_0_15px_rgba(250,204,21,0.15)]'
                      : 'bg-white/5 border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-black w-6 text-center ${isWinner ? 'text-mystery-gold' : 'text-white/40'}`}>
                      #{index + 1}
                    </span>
                    <span className="text-3xl">{player.avatar}</span>
                    <div className="text-left">
                      <div className={`font-bold ${isWinner ? 'text-mystery-gold text-lg' : 'text-white'}`}>
                        {player.name}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-white">{player.score} Coins</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Control Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3.5 w-full max-w-sm"
        >
          {isHost ? (
            <button
              onClick={handlePlayAgain}
              className="btn-primary flex-1 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-mystery-pink"
            >
              Play Again
            </button>
          ) : (
            <div className="flex-1 text-sm bg-white/5 border border-white/10 py-3.5 rounded-xl text-white/50 font-semibold animate-pulse">
              Waiting for host to restart...
            </div>
          )}
          
          <button
            onClick={handleLeave}
            className="flex-1 rounded-xl border border-white/20 bg-white/5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            Leave Lobby
          </button>
        </motion.div>

      </div>
    </div>
  );
};

export default WinnerScreen;
