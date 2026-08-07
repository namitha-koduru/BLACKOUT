// pages/GameScreen.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import { useSettingsStore } from '../store/settingsStore.js';
import toast from 'react-hot-toast';

const GameScreen = () => {
  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);

  const room = useRoomStore((state) => state.room);
  const timer = useRoomStore((state) => state.timer);
  const incomingTrade = useRoomStore((state) => state.incomingTrade);
  const outgoingTrade = useRoomStore((state) => state.outgoingTrade);
  const peekResult = useRoomStore((state) => state.peekResult);

  const sendTradeRequest = useRoomStore((state) => state.sendTradeRequest);
  const acceptTrade = useRoomStore((state) => state.acceptTrade);
  const rejectTrade = useRoomStore((state) => state.rejectTrade);
  const cancelTrade = useRoomStore((state) => state.cancelTrade);
  const playCard = useRoomStore((state) => state.playCard);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);

  const { animationSpeed, showTimer, showTradeHistory } = useSettingsStore();

  const [selectedTargetId, setSelectedTargetId] = useState(null);
  const [showTargetSelect, setShowTargetSelect] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [tradeCountdown, setTradeCountdown] = useState(12);

  // Determine transition speed scale multiplier
  const speedMultiplier = animationSpeed === 'fast' ? 0.2 : (animationSpeed === 'slow' ? 1.8 : 1);

  if (!room || !room.game) return null;

  const { currentRound, totalRounds, boxes, cards, trades, tradeHistory = [], roundResults } = room.game;
  const phase = room.gameState;
  const myBox = boxes?.[playerId];
  const myCard = cards?.[playerId];
  const isHost = room.hostId === playerId;
  const isSpectator = room.spectators.some((s) => s.id === playerId);

  // Monitor incoming/outgoing trade request timer (12s expiry)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    let interval = null;
    const activeTrade = incomingTrade || outgoingTrade;

    if (activeTrade && activeTrade.createdAt) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - activeTrade.createdAt) / 1000);
        const remaining = Math.max(0, 12 - elapsed);
        setTradeCountdown(remaining);
      };
      
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setTradeCountdown(12);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [incomingTrade, outgoingTrade]);

  const handleSendTrade = (targetId) => {
    if (outgoingTrade || incomingTrade) {
      toast.error('You already have a trade request pending.');
      return;
    }
    sendTradeRequest(room.roomCode, playerId, targetId);
  };

  const handleAccept = () => {
    if (incomingTrade) {
      acceptTrade(room.roomCode, incomingTrade.id, playerId);
    }
  };

  const handleReject = () => {
    if (incomingTrade) {
      rejectTrade(room.roomCode, incomingTrade.id, playerId);
    }
  };

  const handleCancel = () => {
    cancelTrade(room.roomCode, playerId);
  };

  const handlePlayCardClick = () => {
    if (!myCard || myCard.played || myCard.type === 'None') return;

    const targetRequired = ['Steal', 'Freeze', 'Reverse', 'Peek'].includes(myCard.type);
    if (targetRequired) {
      setShowTargetSelect(true);
    } else {
      setIsFlipped(true);
      setTimeout(() => {
        playCard(room.roomCode, playerId, playerId);
      }, 400 * speedMultiplier);
    }
  };

  const handleSelectTargetAndPlay = (targetId) => {
    setIsFlipped(true);
    setTimeout(() => {
      playCard(room.roomCode, playerId, targetId);
      setShowTargetSelect(false);
      setSelectedTargetId(null);
    }, 400 * speedMultiplier);
  };

  const getPhaseTitle = () => {
    switch (phase) {
      case 'countdown': return 'GET READY!';
      case 'box_distribution': return 'DISTRIBUTING BOXES & CARDS';
      case 'trading': return 'TRADING PHASE';
      case 'card_phase': return 'SPECIAL CARD PHASE';
      case 'reveal': return 'REVEAL PHASE';
      case 'leaderboard': return 'ROUND LEADERBOARD';
      default: return 'MYSTERY BOX';
    }
  };

  const getPhaseDescription = () => {
    switch (phase) {
      case 'countdown': return 'Game starts in a few seconds...';
      case 'box_distribution': return 'Generating closed Mystery Boxes and Random Special Cards...';
      case 'trading': return 'Request a trade to swap boxes! You can only trade once.';
      case 'card_phase': return 'Decide if you want to play your card on yourself or a target.';
      case 'reveal': return 'Opening all boxes simultaneously! Let\'s check the values!';
      case 'leaderboard': return 'Check player standings before the next round begins.';
      default: return '';
    }
  };

  const getBoxRewardIcon = (type) => {
    if (type.startsWith('coins_')) return '🪙';
    if (type === 'treasure') return '💎';
    if (type === 'golden_chest') return '👑';
    if (type === 'bomb') return '💥';
    if (type === 'snake') return '🐍';
    if (type === 'half_coins') return '📉';
    if (type === 'lose_turn') return '⏳';
    if (type === 'reverse_score') return '🔄';
    return '📦';
  };

  // Determine custom visual style based on reveal results
  const getRevealStyle = (result) => {
    if (result.boxType === 'bomb') {
      return {
        cardClass: 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-red-950/20',
        glowClass: 'bg-red-500/10 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse',
      };
    }
    if (result.boxType === 'treasure' || result.boxType === 'golden_chest') {
      return {
        cardClass: 'border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.25)] bg-yellow-950/20',
        glowClass: 'bg-yellow-400/15 shadow-[0_0_55px_rgba(234,179,8,0.45)]',
      };
    }
    if (result.boxType.startsWith('coins_')) {
      return {
        cardClass: 'border-teal-400/40 shadow-[0_0_15px_rgba(45,212,191,0.2)] bg-teal-950/10',
        glowClass: 'bg-teal-400/10 shadow-[0_0_40px_rgba(45,212,191,0.35)]',
      };
    }
    return {
      cardClass: 'border-white/10 bg-white/5',
      glowClass: 'bg-white/5',
    };
  };

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6 text-white text-left select-none">
      {/* Game Header */}
      <div className="glass-card p-5 border border-white/10 flex flex-col justify-between items-center gap-4 sm:flex-row">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-mystery-gold">
            Round {currentRound} / {totalRounds}
          </div>
          <h2 className="text-2xl font-black mt-1">{getPhaseTitle()}</h2>
          <p className="text-xs text-white/60 mt-0.5">{getPhaseDescription()}</p>
        </div>

        {/* Big Timer */}
        {showTimer && phase !== 'countdown' && phase !== 'game_over' && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Time Remaining</div>
              <div className="text-3xl font-black text-mystery-gold leading-none">{timer}s</div>
            </div>
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10">
              <span className="text-xl">⏱️</span>
              {timer <= 5 && (
                <span className="absolute inset-0 rounded-xl border-2 border-mystery-pink animate-ping" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Panel Content */}
      <div className="flex flex-col gap-6 lg:flex-row items-stretch">
        
        {/* LEFT COLUMN: ACTIVE PHASE SCREEN */}
        <div className="flex-[2.5] flex flex-col">
          
          {/* 1. COUNTDOWN VIEW */}
          {phase === 'countdown' && (
            <div className="glass-card flex-1 flex flex-col items-center justify-center min-h-[400px]">
              <motion.div
                key={timer}
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.5 * speedMultiplier }}
                className="text-[120px] font-black text-mystery-gold"
              >
                {timer}
              </motion.div>
              <p className="text-white/50 tracking-wider font-semibold uppercase animate-pulse">
                Preparing boxes...
              </p>
            </div>
          )}

          {/* 2. BOX DISTRIBUTION VIEW */}
          {phase === 'box_distribution' && (
            <div className="glass-card flex-1 flex flex-col items-center justify-center p-8 min-h-[400px]">
              <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
                {/* Visual closed Box dealing */}
                <motion.div
                  initial={{ y: -120, opacity: 0, rotate: -45 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 90, delay: 0.1 * speedMultiplier }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="text-[100px] hover:scale-110 active:scale-95 transition-all cursor-grab select-none">🎁</div>
                  <div className="rounded-xl bg-mystery-purple/20 border border-mystery-purple/40 px-4 py-1.5 text-sm font-bold text-mystery-purple">
                    Your Box
                  </div>
                </motion.div>

                <div className="text-3xl text-white/20 select-none">➕</div>

                {/* Visual card dealing */}
                <motion.div
                  initial={{ y: 120, opacity: 0, rotate: 45 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 90, delay: 0.4 * speedMultiplier }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="flex h-[150px] w-[100px] flex-col justify-between rounded-xl bg-gradient-to-br from-mystery-pink to-mystery-purple border-2 border-mystery-gold p-3 shadow-lg select-none">
                    <div className="text-left font-black text-xs">CARD</div>
                    <div className="text-3xl text-center">⚡</div>
                    <div className="text-right text-[10px] font-bold">MYSTERY</div>
                  </div>
                  <div className="rounded-xl bg-mystery-pink/20 border border-mystery-pink/40 px-4 py-1.5 text-sm font-bold text-mystery-pink">
                    Your Card
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {/* 3. TRADING VIEW */}
          {phase === 'trading' && (
            <div className="flex flex-col gap-6 flex-grow min-h-[400px]">
              {/* Overlays / Modals */}
              <AnimatePresence>
                {/* Incoming Request prompt */}
                {incomingTrade && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="glass-card border-mystery-pink/50 bg-black/85 flex flex-col items-center justify-center p-6 text-center gap-4 min-h-[240px]"
                  >
                    <div className="text-4xl">{incomingTrade.senderAvatar}</div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Trade Offer Received!</h3>
                      <p className="text-sm text-white/70 mt-1">
                        <span className="font-extrabold text-mystery-teal">{incomingTrade.senderName}</span> wants to swap boxes with you.
                      </p>
                    </div>

                    {/* Visual countdown progress */}
                    <div className="w-full max-w-xs flex flex-col gap-1 items-center">
                      <div className="text-[10px] text-white/50">Trade expires in <span className="font-bold text-mystery-gold">{tradeCountdown}s</span></div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: '100%' }}
                          animate={{ width: `${(tradeCountdown / 12) * 100}%` }}
                          transition={{ duration: 1, ease: 'linear' }}
                          className="h-full bg-mystery-pink"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 w-full max-w-xs mt-1">
                      <button
                        onClick={handleReject}
                        className="flex-1 rounded-xl border border-white/20 bg-white/5 py-2.5 font-bold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-mystery-pink"
                      >
                        Reject
                      </button>
                      <button
                        onClick={handleAccept}
                        className="flex-1 rounded-xl bg-mystery-teal px-5 py-2.5 font-bold text-mystery-bg hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-mystery-teal"
                      >
                        Accept
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Outgoing Request waiting status */}
                {outgoingTrade && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="glass-card border-mystery-gold/50 bg-black/75 flex flex-col items-center justify-center p-6 text-center gap-4 min-h-[240px]"
                  >
                    <div className="h-10 w-10 border-4 border-mystery-gold border-t-transparent rounded-full animate-spin" />
                    <div>
                      <h3 className="text-lg font-bold text-white">Waiting for Response...</h3>
                      <p className="text-sm text-white/60 mt-1">
                        Trade request sent to <span className="font-extrabold text-mystery-gold">{outgoingTrade.receiverName}</span>.
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs flex flex-col gap-1 items-center">
                      <div className="text-[10px] text-white/50">Auto-expires in <span className="font-bold text-mystery-gold">{tradeCountdown}s</span></div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: '100%' }}
                          animate={{ width: `${(tradeCountdown / 12) * 100}%` }}
                          transition={{ duration: 1, ease: 'linear' }}
                          className="h-full bg-mystery-gold"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleCancel}
                      className="rounded-xl border border-mystery-pink/30 bg-mystery-pink/10 px-6 py-2.5 font-bold text-mystery-pink hover:bg-mystery-pink/20 transition-all focus:outline-none focus:ring-2 focus:ring-mystery-pink"
                    >
                      Cancel Trade Request
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trading Dashboard Grid */}
              {!incomingTrade && !outgoingTrade && (
                <div className="glass-card flex-1 p-6 border border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span>Lobby Trading Dashboard</span>
                      <span className="text-xs font-normal text-white/50 bg-white/5 px-2 py-0.5 rounded-full">Select Player to Swap</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {room.players
                      .filter((p) => p.id !== playerId)
                      .map((p) => {
                        const isPlayerConnected = p.connected;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3.5 hover:bg-white/10 hover:border-white/20 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">{p.avatar}</span>
                              <div className="text-left">
                                <div className="font-bold text-white text-sm">{p.name}</div>
                                <div className={`text-[10px] ${isPlayerConnected ? 'text-mystery-teal animate-pulse' : 'text-mystery-gold'}`}>
                                  {isPlayerConnected ? 'Connected' : 'Disconnected'}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSendTrade(p.id)}
                              disabled={isSpectator || !isPlayerConnected}
                              className="rounded-lg bg-mystery-pink px-3.5 py-1.5 text-xs font-bold text-white hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-mystery-pink"
                            >
                              Offer Trade
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. CARD PHASE VIEW */}
          {phase === 'card_phase' && (
            <div className="glass-card flex-1 p-6 border border-white/5 flex flex-col gap-4 min-h-[400px]">
              <h3 className="text-xl font-bold text-white">Abilities Dashboard</h3>

              {showTargetSelect ? (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-semibold text-white/90">
                      Select Target Player for <span className="text-mystery-pink font-extrabold">{myCard?.type}</span>:
                    </div>
                    <button
                      onClick={() => setShowTargetSelect(false)}
                      className="text-xs text-white/50 hover:underline"
                    >
                      Cancel Target Select
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {room.players.map((p) => {
                      const isMe = p.id === playerId;
                      const canTarget = myCard?.type === 'Peek' || !isMe;
                      if (!canTarget) return null;

                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSelectTargetAndPlay(p.id)}
                          className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-3.5 hover:bg-mystery-pink/15 hover:border-mystery-pink/55 transition-all text-left focus:outline-none focus:ring-2 focus:ring-mystery-pink"
                        >
                          <span className="text-3xl">{p.avatar}</span>
                          <div>
                            <div className="font-bold text-white text-sm">{p.name}</div>
                            {isMe && <div className="text-[10px] text-white/55">Yourself</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-grow gap-6 p-4">
                  
                  {/* Ability Card (Flipped element animation) */}
                  {myCard && (
                    <motion.div
                      style={{ perspective: 1000 }}
                      className="cursor-pointer"
                      onClick={() => setIsFlipped(!isFlipped)}
                    >
                      <motion.div
                        animate={{ rotateY: isFlipped || myCard.played ? 180 : 0 }}
                        transition={{ duration: 0.6 * speedMultiplier, ease: 'easeOut' }}
                        style={{ transformStyle: 'preserve-3d' }}
                        className="flex h-[280px] w-[200px] flex-col justify-between rounded-2xl bg-gradient-to-br from-mystery-pink to-mystery-purple border-[3px] border-mystery-gold p-5 shadow-2xl relative"
                      >
                        {/* Front Side */}
                        <div
                          style={{ backfaceVisibility: 'hidden' }}
                          className="absolute inset-0 p-5 flex flex-col justify-between"
                        >
                          <div className="text-left font-black text-xs tracking-wider text-mystery-gold">SPECIAL CARD</div>
                          <div className="flex flex-col items-center text-center">
                            <div className="text-5xl mb-2 animate-bounce">⚡</div>
                            <div className="text-lg font-black">{myCard.type}</div>
                          </div>
                          <div className="text-center text-[10px] leading-relaxed text-white/80">
                            {myCard.description}
                          </div>
                        </div>

                        {/* Back Side / Played Side */}
                        <div
                          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                          className="absolute inset-0 p-5 flex flex-col justify-between items-center justify-center bg-black/85 rounded-xl border border-mystery-gold/50"
                        >
                          <span className="rounded-xl border-2 border-mystery-gold bg-mystery-gold/15 px-4 py-2 text-sm font-black tracking-widest text-mystery-gold rotate-12">
                            {myCard.played ? 'PLAYED' : 'CARD READY'}
                          </span>
                          <span className="text-[10px] text-white/55 mt-3 text-center">
                            {myCard.played ? 'Ability locked for round resolution' : 'Click to flip back'}
                          </span>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}

                  {!isSpectator && myCard && !myCard.played && myCard.type !== 'None' && (
                    <button
                      onClick={handlePlayCardClick}
                      className="btn-primary px-8 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-mystery-bg focus:ring-mystery-pink"
                    >
                      Play Ability Card
                    </button>
                  )}
                  
                  {myCard?.type === 'None' && (
                    <div className="text-white/40 text-sm font-semibold">You cannot play cards this round.</div>
                  )}

                  {isSpectator && (
                    <div className="text-white/40 text-sm font-semibold">Spectators are viewing card play.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 5. REVEAL VIEW */}
          {phase === 'reveal' && (
            <div className="glass-card flex-1 p-6 border border-white/5 flex flex-col gap-5 min-h-[400px]">
              <h3 className="text-xl font-bold text-white">Opening Mystery Boxes!</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 flex-grow justify-center">
                {room.players.map((p) => {
                  const result = roundResults?.[p.id];
                  if (!result) return null;
                  
                  const isPositive = result.roundGain >= 0;
                  const isZero = result.roundGain === 0;
                  const styling = getRevealStyle(result);

                  return (
                    <div key={p.id} className="relative flex flex-col">
                      {/* Box Glow Particle Radial Effect */}
                      <div className={`absolute inset-0 rounded-2xl blur-xl filter opacity-45 -z-10 ${styling.glowClass}`} />

                      <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 90, delay: 0.1 * speedMultiplier }}
                        className={`flex flex-col items-center rounded-2xl border p-5 gap-3.5 bg-black/40 backdrop-blur-md ${styling.cardClass}`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-sm font-bold truncate max-w-[100px]">{p.name}</span>
                          <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded">
                            {result.playedCard}
                          </span>
                        </div>

                        {/* Shake and Pop animations */}
                        <motion.div
                          animate={{
                            y: [0, -6, 0, -4, 0],
                            rotate: [0, 4, -4, 2, 0],
                          }}
                          transition={{
                            duration: 1.2 * speedMultiplier,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          }}
                          className="text-6xl select-none"
                        >
                          {getBoxRewardIcon(result.boxType)}
                        </motion.div>

                        <div className="text-center">
                          <div className="text-[10px] text-white/50">Box: {result.boxName}</div>
                          
                          <div className={`text-xl font-black mt-1 ${
                            isZero ? 'text-white/60' : (isPositive ? 'text-mystery-teal' : 'text-mystery-pink')
                          }`}>
                            {isZero ? '0' : (isPositive ? `+${result.roundGain}` : `${result.roundGain}`)}
                          </div>
                        </div>

                        {/* Shielded / Frozen status icons */}
                        <div className="flex gap-1.5 mt-0.5">
                          {result.isShielded && (
                            <span className="rounded bg-mystery-teal/20 border border-mystery-teal/30 px-1.5 py-0.5 text-[9px] font-bold text-mystery-teal uppercase">
                              Shielded
                            </span>
                          )}
                          {result.isFrozen && (
                            <span className="rounded bg-sky-500/20 border border-sky-500/30 px-1.5 py-0.5 text-[9px] font-bold text-sky-400 uppercase">
                              Frozen
                            </span>
                          )}
                          {result.halfScore && (
                            <span className="rounded bg-mystery-pink/20 border border-mystery-pink/30 px-1.5 py-0.5 text-[9px] font-bold text-mystery-pink uppercase">
                              Halved
                            </span>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. ROUND LEADERBOARD VIEW */}
          {phase === 'leaderboard' && (
            <div className="glass-card flex-1 p-6 border border-white/5 flex flex-col gap-4 min-h-[400px]">
              <h2 className="text-xl font-bold text-white flex justify-between items-center">
                <span>Round Rankings</span>
                <span className="text-xs font-normal text-white/50">Next round starts in {timer}s...</span>
              </h2>

              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[350px] pr-1">
                {[...room.players]
                  .sort((a, b) => b.score - a.score)
                  .map((p, index) => {
                    const roundGain = roundResults?.[p.id]?.roundGain || 0;
                    const isPositive = roundGain >= 0;
                    const isZero = roundGain === 0;

                    return (
                      <motion.div
                        key={p.id}
                        layout
                        transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                        className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3.5 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-black text-mystery-gold w-6 text-center">
                            #{index + 1}
                          </span>
                          <span className="text-3xl">{p.avatar}</span>
                          <div className="text-left">
                            <div className="font-bold text-white">{p.name}</div>
                            <div className="text-[10px] text-white/50">Total: {p.score} Coins</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-sm font-extrabold ${
                            isZero ? 'text-white/60' : (isPositive ? 'text-mystery-teal' : 'text-mystery-pink')
                          }`}>
                            {isZero ? '0' : (isPositive ? `+${roundGain}` : `${roundGain}`)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CHAT, LOGS & PLAYERS INVENTORY */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Inventory info (user box & card) during gameplay */}
          {phase !== 'countdown' && phase !== 'leaderboard' && (
            <div className="glass-card p-5 text-left border border-white/5 flex flex-col gap-3.5">
              <h3 className="text-base font-bold text-white border-b border-white/10 pb-2">Your Inventory</h3>
              
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/65">Mystery Box:</span>
                  <span className="font-bold text-white text-right flex items-center gap-1.5">
                    🎁 <span>Closed Box</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-white/65">Ability Card:</span>
                  <span className="font-extrabold text-mystery-gold text-right">
                    {myCard?.type || 'None'}
                  </span>
                </div>

                {peekResult && (
                  <div className="mt-2 rounded-xl bg-mystery-gold/15 border border-mystery-gold/30 p-2.5 text-xs text-mystery-gold">
                    <div className="font-bold uppercase tracking-wider text-[9px] text-mystery-gold mb-1">
                      Peek Report:
                    </div>
                    {peekResult.targetName}&apos;s box contains: <span className="font-extrabold">{peekResult.boxName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trade History Log */}
          {showTradeHistory && phase === 'trading' && (
            <div className="glass-card p-5 text-left border border-white/5 flex flex-col gap-3.5 h-[170px] overflow-hidden">
              <h3 className="text-sm font-bold text-white/70 border-b border-white/10 pb-2">Swaps Log</h3>
              <div className="overflow-y-auto flex-1 flex flex-col gap-1.5 pr-1">
                {tradeHistory.length === 0 ? (
                  <div className="text-center text-white/30 text-xs py-6">No completed swaps yet.</div>
                ) : (
                  tradeHistory.map((hist, index) => (
                    <div key={index} className="text-xs text-white/70 bg-white/5 rounded p-2 border border-white/5">
                      🤝 <span className="font-bold text-mystery-teal">{hist.senderName}</span> swapped with <span className="font-bold text-mystery-pink">{hist.receiverName}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Lobby chat box */}
          <div className="glass-card flex flex-col h-64 border border-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-4 py-2.5 text-left text-xs font-bold text-white/60 uppercase tracking-wider">
              Lobby Chat
            </div>
            
            {/* Chat message logs */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {room.chat.length === 0 ? (
                <div className="text-center text-white/30 text-xs py-10">Lobby chat is quiet. Say hello!</div>
              ) : (
                room.chat.map((msg, i) => {
                  const isSystem = msg.senderId === 'system';
                  const isMe = msg.senderId === playerId;
                  return (
                    <div
                      key={i}
                      className={`text-left text-sm ${
                        isSystem
                          ? 'text-mystery-gold font-medium italic text-center text-xs my-1'
                          : ''
                      }`}
                    >
                      {!isSystem && (
                        <span className={`font-bold mr-1.5 ${isMe ? 'text-mystery-pink' : 'text-mystery-teal'}`}>
                          {msg.senderName}:
                        </span>
                      )}
                      <span className={isSystem ? 'text-mystery-gold' : 'text-white/90'}>{msg.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                leaveRoom(room.roomCode, playerId);
              }}
              className="w-full rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
