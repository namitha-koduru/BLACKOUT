// services/game.service.js
import { rooms, registerRoomCleanupCallback } from './room.service.js';

// Module-level storage for timers and timeouts
const roomTimers = new Map(); // roomCode -> IntervalId
const tradeTimeouts = new Map(); // tradeId -> TimeoutId
const roomTradeTimeouts = new Map(); // roomCode -> Set of tradeIds

export const clearRoomTimer = (roomCode) => {
  const code = roomCode.toUpperCase().trim();
  const existingTimer = roomTimers.get(code);
  if (existingTimer) {
    clearInterval(existingTimer);
    roomTimers.delete(code);
  }
};

const clearTradeTimeout = (tradeId) => {
  const timeoutId = tradeTimeouts.get(tradeId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    tradeTimeouts.delete(tradeId);
  }
  for (const [code, tradeSet] of roomTradeTimeouts.entries()) {
    if (tradeSet.has(tradeId)) {
      tradeSet.delete(tradeId);
      if (tradeSet.size === 0) {
        roomTradeTimeouts.delete(code);
      }
      break;
    }
  }
};

export const clearAllTradeTimeoutsForRoom = (roomCode) => {
  const code = roomCode.toUpperCase().trim();
  const tradeSet = roomTradeTimeouts.get(code);
  if (tradeSet) {
    tradeSet.forEach((tradeId) => {
      const timeoutId = tradeTimeouts.get(tradeId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        tradeTimeouts.delete(tradeId);
      }
    });
    roomTradeTimeouts.delete(code);
  }
};

registerRoomCleanupCallback((roomCode) => {
  clearRoomTimer(roomCode);
  clearAllTradeTimeoutsForRoom(roomCode);
});

// Box definitions and weights for randomization
const BOX_TYPES = [
  { type: 'coins_20', category: 'reward', value: 20, weight: 15, name: '+20 Coins' },
  { type: 'coins_40', category: 'reward', value: 40, weight: 15, name: '+40 Coins' },
  { type: 'coins_60', category: 'reward', value: 60, weight: 12, name: '+60 Coins' },
  { type: 'coins_100', category: 'reward', value: 100, weight: 10, name: '+100 Coins' },
  { type: 'coins_150', category: 'reward', value: 150, weight: 8, name: '+150 Coins' },
  { type: 'coins_250', category: 'reward', value: 250, weight: 5, name: '+250 Coins' },
  { type: 'treasure', category: 'reward', value: 350, weight: 3, name: 'Treasure' },
  { type: 'golden_chest', category: 'reward', value: 500, weight: 2, name: 'Golden Chest' },
  { type: 'bomb', category: 'penalty', value: -150, weight: 8, name: 'Bomb' },
  { type: 'snake', category: 'penalty', value: -80, weight: 8, name: 'Snake' },
  { type: 'half_coins', category: 'penalty', value: 'half', weight: 5, name: 'Half Coins' },
  { type: 'lose_turn', category: 'penalty', value: 'lose_turn', weight: 5, name: 'Lose Turn' },
  { type: 'reverse_score', category: 'penalty', value: 'reverse', weight: 3, name: 'Reverse Score' },
  { type: 'nothing', category: 'penalty', value: 0, weight: 11, name: 'Nothing' },
];

const CARD_TYPES = [
  { type: 'Shield', description: 'Protects you from steals, bombs, snakes, and point halving this round.' },
  { type: 'Peek', description: 'Allows you to secretly see your own box or another player\'s box.' },
  { type: 'Steal', description: 'Steals the final box contents of a target player this round (unless shielded).' },
  { type: 'Double', description: 'Doubles any positive coin rewards you gain this round.' },
  { type: 'Bomb Squad', description: 'Disarms a Bomb inside your box, turning it into a +100 Coins reward.' },
  { type: 'Shuffle', description: 'Shuffles all boxes in the lobby randomly before reveal.' },
  { type: 'Freeze', description: 'Freezes target player. Cancels their card plays and locks their box.' },
  { type: 'Reverse', description: 'Inverts target player\'s score change this round (rewards become penalties).' },
];

/**
 * Picks a random item from an array using weights.
 */
const pickWeighted = (items) => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    if (random < item.weight) {
      return { ...item };
    }
    random -= item.weight;
  }
  return { ...items[0] };
};

/**
 * Starts the game for a room.
 * @param {string} roomCode
 * @param {object} io - Socket.IO server reference to emit ticks
 */
export const startGame = (roomCode, io) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  if (room.players.length < 2) {
    throw new Error('Need at least 2 players to start the game.');
  }

  // Clear existing timers before creating game object
  clearRoomTimer(room.roomCode);
  clearAllTradeTimeoutsForRoom(room.roomCode);

  // Clear ready states, reset scores
  room.players.forEach((p) => {
    p.score = 0;
    p.ready = false;
  });

  room.gameState = 'countdown';

  room.game = {
    currentRound: 1,
    totalRounds: room.settings.totalRounds,
    timer: 5,
    boxes: {},
    cards: {},
    trades: [],
    tradeHistory: [], // keeps record of accepted trades
    playedCardsThisRound: [],
    roundResults: null,
    lostTurnNextRound: {}, // playerId -> boolean
  };

  // Start the countdown timer
  startPhaseTimer(roomCode, io);
  return room;
};

/**
 * Handles countdown timer for active game phases.
 */
const startPhaseTimer = (roomCode, io) => {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;

  // Clear any existing timer
  clearRoomTimer(roomCode);

  const durationMs = room.game.timer * 1000;
  const phaseEndsAt = Date.now() + durationMs;

  io.to(roomCode).emit('timerUpdated', { timer: room.game.timer });

  console.log(`[GAME TIMER] room=${roomCode} phase=${room.gameState.toUpperCase()} duration=${room.game.timer} timerStarted=${new Date().toISOString()}`);

  const timerIntervalId = setInterval(() => {
    const r = rooms.get(roomCode);
    if (!r || !r.game) {
      clearRoomTimer(roomCode);
      return;
    }

    const remainingSeconds = Math.ceil((phaseEndsAt - Date.now()) / 1000);
    r.game.timer = Math.max(0, remainingSeconds);

    console.log(`[GAME TIMER] room=${roomCode} remaining=${r.game.timer}`);

    io.to(roomCode).emit('timerUpdated', { timer: r.game.timer });

    if (r.game.timer <= 0) {
      clearRoomTimer(roomCode);
      transitionPhase(roomCode, io);
    }
  }, 1000);

  roomTimers.set(roomCode, timerIntervalId);
};

/**
 * Generates and distributes random boxes and cards to players.
 */
const distributeBoxesAndCards = (room) => {
  room.game.boxes = {};
  room.game.cards = {};
  room.game.trades = [];
  room.game.playedCardsThisRound = [];
  room.game.roundResults = null;

  room.players.forEach((player) => {
    // Check if player has lost turn penalty
    const losesTurn = room.game.lostTurnNextRound?.[player.id] === true;
    
    // Generate Box
    room.game.boxes[player.id] = {
      ...pickWeighted(BOX_TYPES),
      opened: false,
      ownerId: player.id,
    };

    // Generate Card
    if (losesTurn) {
      room.game.cards[player.id] = {
        type: 'None',
        description: 'You lost your turn due to a box penalty last round.',
        played: true,
      };
      // Reset penalty
      room.game.lostTurnNextRound[player.id] = false;
    } else {
      const randomCard = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
      room.game.cards[player.id] = {
        ...randomCard,
        played: false,
      };
    }
  });
};

/**
 * Manages the transitions between phases in the game lifecycle.
 */
const transitionPhase = (roomCode, io) => {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;

  const currentPhase = room.gameState;

  if (currentPhase === 'countdown') {
    // Move to Box Distribution
    room.gameState = 'box_distribution';
    distributeBoxesAndCards(room);
    room.game.timer = 4; // 4 seconds distribution intro
    io.to(roomCode).emit('phaseChanged', { phase: 'BOX_DISTRIBUTION', room });
    startPhaseTimer(roomCode, io);
  } 
  else if (currentPhase === 'box_distribution') {
    // Move to Trading
    room.gameState = 'trading';
    room.game.timer = 45; // 45 seconds for active trading
    io.to(roomCode).emit('phaseChanged', { phase: 'TRADING', room });
    startPhaseTimer(roomCode, io);
  } 
  else if (currentPhase === 'trading') {
    // Clear all trade timeouts for the room
    clearAllTradeTimeoutsForRoom(roomCode);
    // Cancel any active trades
    room.game.trades = [];
    // Move to Card Phase
    room.gameState = 'card_phase';
    room.game.timer = 20; // 20 seconds for special card plays
    io.to(roomCode).emit('phaseChanged', { phase: 'CARD_PHASE', room });
    startPhaseTimer(roomCode, io);
  } 
  else if (currentPhase === 'card_phase') {
    // Resolve all special card actions and calculate scores
    calculateRoundScores(room);
    
    // Move to Reveal
    room.gameState = 'reveal';
    room.game.timer = 7; // 7 seconds reveal animation
    io.to(roomCode).emit('phaseChanged', { phase: 'REVEAL', room });
    startPhaseTimer(roomCode, io);
  } 
  else if (currentPhase === 'reveal') {
    // Update players score
    room.players.forEach((p) => {
      const gain = room.game.roundResults?.[p.id]?.roundGain || 0;
      const isHalf = room.game.roundResults?.[p.id]?.halfScore || false;
      if (isHalf) {
        p.score = Math.floor(p.score / 2);
      }
      p.score = Math.max(0, p.score + gain);
    });

    // Move to Leaderboard
    room.gameState = 'leaderboard';
    room.game.timer = 10; // 10 seconds leaderboard display
    io.to(roomCode).emit('phaseChanged', { phase: 'LEADERBOARD', room });
    startPhaseTimer(roomCode, io);
  } 
  else if (currentPhase === 'leaderboard') {
    if (room.game.currentRound >= room.game.totalRounds) {
      // Game Over
      room.gameState = 'game_over';
      room.game.timer = 0;
      io.to(roomCode).emit('gameFinished', room);
    } else {
      // Move to next round
      room.game.currentRound += 1;
      room.gameState = 'box_distribution';
      distributeBoxesAndCards(room);
      room.game.timer = 4;
      io.to(roomCode).emit('phaseChanged', { phase: 'BOX_DISTRIBUTION', room });
      startPhaseTimer(roomCode, io);
    }
  }

  console.log(`[GAME PHASE] room=${roomCode} ${currentPhase.toUpperCase()} -> ${room.gameState.toUpperCase()}`);
};

/**
 * Submits a trade request between two players.
 */
export const createTradeRequest = (roomCode, senderId, receiverId, io) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room || !room.game) throw new Error('Room or active game not found.');

  if (room.gameState !== 'trading') {
    throw new Error('Trades are only allowed in the TRADING phase.');
  }

  // Prevent self trade
  if (senderId === receiverId) throw new Error('Cannot trade with yourself.');

  // Validate active players
  const sender = room.players.find((p) => p.id === senderId);
  const receiver = room.players.find((p) => p.id === receiverId);
  if (!sender || !receiver) throw new Error('Players not found.');

  // Prevent multiple active trades per player
  const activeTrade = room.game.trades.find(
    (t) =>
      t.status === 'pending' &&
      (t.senderId === senderId ||
        t.receiverId === senderId ||
        t.senderId === receiverId ||
        t.receiverId === receiverId)
  );
  if (activeTrade) {
    throw new Error('One of the players already has a pending trade.');
  }

  const trade = {
    id: 't_' + Math.random().toString(36).substring(2, 9),
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    receiverId,
    receiverName: receiver.name,
    status: 'pending',
    createdAt: Date.now(),
  };

  room.game.trades.push(trade);

  // Set a 12-second timeout to auto-expire the trade request
  const tradeId = trade.id;
  const timeoutId = setTimeout(() => {
    const currentRoom = rooms.get(roomCode.toUpperCase().trim());
    if (currentRoom && currentRoom.game) {
      const pendingIndex = currentRoom.game.trades.findIndex(
        (t) => t.id === tradeId && t.status === 'pending'
      );
      if (pendingIndex !== -1) {
        currentRoom.game.trades[pendingIndex].status = 'cancelled_timeout';
        currentRoom.game.trades = currentRoom.game.trades.filter((t) => t.id !== tradeId);
        
        // Emit state updates to sync frontend clocks/views
        io.to(currentRoom.roomCode).emit('roomUpdated', currentRoom);
        
        // Find sender and receiver to notify them of expiration
        const sender = currentRoom.players.find((p) => p.id === senderId);
        const receiver = currentRoom.players.find((p) => p.id === receiverId);
        
        if (sender && sender.socketId) {
          io.to(sender.socketId).emit('tradeExpired');
        }
        if (receiver && receiver.socketId) {
          io.to(receiver.socketId).emit('tradeExpired');
        }
      }
    }
    tradeTimeouts.delete(tradeId);
    const roomCodeUpper = roomCode.toUpperCase().trim();
    const tradeSet = roomTradeTimeouts.get(roomCodeUpper);
    if (tradeSet) {
      tradeSet.delete(tradeId);
      if (tradeSet.size === 0) roomTradeTimeouts.delete(roomCodeUpper);
    }
  }, 12000);

  tradeTimeouts.set(tradeId, timeoutId);
  const roomCodeUpper = roomCode.toUpperCase().trim();
  if (!roomTradeTimeouts.has(roomCodeUpper)) {
    roomTradeTimeouts.set(roomCodeUpper, new Set());
  }
  roomTradeTimeouts.get(roomCodeUpper).add(tradeId);

  return { room, trade, receiverSocketId: receiver.socketId };
};

/**
 * Accepts a pending trade request and swaps the boxes.
 */
export const acceptTradeRequest = (roomCode, tradeId, receiverId) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room || !room.game) throw new Error('Room or active game not found.');

  const tradeIndex = room.game.trades.findIndex((t) => t.id === tradeId && t.status === 'pending');
  if (tradeIndex === -1) throw new Error('Pending trade not found.');

  const trade = room.game.trades[tradeIndex];
  if (trade.receiverId !== receiverId) throw new Error('Unauthorized.');

  // Swap boxes
  const senderBox = room.game.boxes[trade.senderId];
  const receiverBox = room.game.boxes[trade.receiverId];

  room.game.boxes[trade.senderId] = receiverBox;
  room.game.boxes[receiverId] = senderBox;

  trade.status = 'accepted';

  // Log trade into history
  room.game.tradeHistory.push({
    id: trade.id,
    senderName: trade.senderName,
    receiverName: trade.receiverName,
    timestamp: Date.now(),
  });

  // Clear accepted trade timeout
  clearTradeTimeout(tradeId);

  // Automatically cancel all other pending trades involving either player, and clear their timeouts
  room.game.trades.forEach((t) => {
    if (
      t.id !== tradeId &&
      t.status === 'pending' &&
      (t.senderId === trade.senderId ||
        t.receiverId === trade.senderId ||
        t.senderId === trade.receiverId ||
        t.receiverId === trade.receiverId)
    ) {
      clearTradeTimeout(t.id);
    }
  });

  room.game.trades = room.game.trades.filter(
    (t) =>
      t.id === tradeId ||
      t.status !== 'pending' ||
      (t.senderId !== trade.senderId &&
        t.receiverId !== trade.senderId &&
        t.senderId !== trade.receiverId &&
        t.receiverId !== trade.receiverId)
  );

  return room;
};

/**
 * Rejects a pending trade request.
 */
export const rejectTradeRequest = (roomCode, tradeId, receiverId) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room || !room.game) throw new Error('Room or active game not found.');

  const tradeIndex = room.game.trades.findIndex((t) => t.id === tradeId && t.status === 'pending');
  if (tradeIndex === -1) throw new Error('Pending trade not found.');

  const trade = room.game.trades[tradeIndex];
  if (trade.receiverId !== receiverId) throw new Error('Unauthorized.');

  trade.status = 'rejected';

  // Clear trade timeout
  clearTradeTimeout(tradeId);

  // Remove from trades list
  room.game.trades = room.game.trades.filter((t) => t.id !== tradeId);

  const sender = room.players.find((p) => p.id === trade.senderId);
  return { room, senderSocketId: sender?.socketId, senderName: trade.senderName };
};

/**
 * Cancels a pending trade request (sender only).
 */
export const cancelTradeRequest = (roomCode, playerId) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room || !room.game) throw new Error('Room or active game not found.');

  const pendingTrade = room.game.trades.find(
    (t) => t.senderId === playerId && t.status === 'pending'
  );
  if (!pendingTrade) throw new Error('No pending trade request found to cancel.');

  // Clear trade timeout
  clearTradeTimeout(pendingTrade.id);

  room.game.trades = room.game.trades.filter((t) => t.id !== pendingTrade.id);
  
  const receiver = room.players.find((p) => p.id === pendingTrade.receiverId);
  return { room, receiverSocketId: receiver?.socketId };
};

/**
 * Handles playing a special card.
 */
export const playSpecialCard = (roomCode, playerId, targetPlayerId) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room || !room.game) throw new Error('Room or active game not found.');

  if (room.gameState !== 'card_phase') {
    throw new Error('Cards can only be played in the Special Card Phase.');
  }

  const card = room.game.cards[playerId];
  if (!card) throw new Error('No card assigned to you.');
  if (card.played) throw new Error('You have already played your card this round.');

  // Validate target player (unless target is not required or self)
  const targetRequired = ['Steal', 'Freeze', 'Reverse', 'Peek'].includes(card.type);
  if (targetRequired && !targetPlayerId) {
    throw new Error(`A target player is required to play ${card.type}.`);
  }

  const targetPlayer = room.players.find((p) => p.id === targetPlayerId);
  if (targetRequired && !targetPlayer) {
    throw new Error('Target player not found.');
  }

  // Handle immediate Peeks
  if (card.type === 'Peek') {
    card.played = true;
    const box = room.game.boxes[targetPlayerId];
    return { room, peekResult: { targetName: targetPlayer.name, boxName: box.name, value: box.value, type: box.type } };
  }

  // Register play for batch resolution at end of phase
  room.game.playedCardsThisRound.push({
    cardPlayerId: playerId,
    cardType: card.type,
    targetPlayerId: targetPlayerId || playerId,
  });

  card.played = true;
  return { room };
};

/**
 * Resolves all played cards in order and updates scores.
 */
const calculateRoundScores = (room) => {
  const evals = {};

  // Setup player evaluation profiles
  room.players.forEach((p) => {
    evals[p.id] = {
      playerId: p.id,
      name: p.name,
      box: { ...room.game.boxes[p.id] },
      isShielded: false,
      isFrozen: false,
      hasBombSquad: false,
      doubleMultiplier: 1,
      reverseMultiplier: 1,
      stolenBy: [], // player IDs stealing this player's gains
      scoreChange: 0,
      halfScore: false,
    };
  });

  const playedCards = room.game.playedCardsThisRound;

  // 1. FREEZE RESOLUTION (cancels cards played by frozen targets)
  playedCards.forEach((play) => {
    if (play.cardType === 'Freeze') {
      evals[play.targetPlayerId].isFrozen = true;
    }
  });

  // Filter out plays from frozen players
  const activePlays = playedCards.filter((play) => !evals[play.cardPlayerId].isFrozen);

  // 2. SHIELD RESOLUTION
  activePlays.forEach((play) => {
    if (play.cardType === 'Shield') {
      evals[play.cardPlayerId].isShielded = true;
    }
  });

  // 3. SHUFFLE RESOLUTION (shuffles boxes among ALL players)
  const shufflesCount = activePlays.filter((p) => p.cardType === 'Shuffle').length;
  if (shufflesCount > 0) {
    // Get all box values
    const playerIds = room.players.map((p) => p.id);
    const boxCopies = playerIds.map((id) => ({ ...room.game.boxes[id] }));
    
    // Fisher-Yates shuffle
    for (let i = boxCopies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = boxCopies[i];
      boxCopies[i] = boxCopies[j];
      boxCopies[j] = temp;
    }

    // Apply back to room and evals
    playerIds.forEach((id, index) => {
      room.game.boxes[id] = boxCopies[index];
      evals[id].box = boxCopies[index];
    });
  }

  // 4. BOMB SQUAD, DOUBLE, REVERSE, STEAL REGISTRATION
  activePlays.forEach((play) => {
    const pid = play.cardPlayerId;
    const tid = play.targetPlayerId;

    if (play.cardType === 'Bomb Squad') {
      evals[pid].hasBombSquad = true;
    } else if (play.cardType === 'Double') {
      evals[pid].doubleMultiplier = 2;
    } else if (play.cardType === 'Reverse') {
      evals[tid].reverseMultiplier *= -1;
    } else if (play.cardType === 'Steal') {
      evals[tid].stolenBy.push(pid);
    }
  });

  // 5. EVALUATE BASE BOX SCORES
  room.players.forEach((p) => {
    const e = evals[p.id];
    let value = e.box.value;

    if (e.box.type === 'bomb') {
      if (e.hasBombSquad) {
        value = 100; // Bomb Squad converts bomb to reward
      } else if (e.isShielded) {
        value = 0; // Shield blocks bomb
      } else {
        value = -150;
      }
    } else if (e.box.type === 'snake') {
      if (e.isShielded) {
        value = 0; // Shield blocks snake
      } else {
        value = -80;
      }
    } else if (e.box.type === 'half_coins') {
      if (e.isShielded) {
        e.halfScore = false;
      } else {
        e.halfScore = true;
        value = 0;
      }
    } else if (e.box.type === 'lose_turn') {
      if (e.isShielded) {
        value = 0;
      } else {
        value = 0;
        room.game.lostTurnNextRound[p.id] = true;
      }
    } else if (e.box.type === 'reverse_score') {
      if (e.isShielded) {
        value = 0;
      } else {
        e.reverseMultiplier *= -1;
        value = 0;
      }
    }

    e.scoreChange = value;
  });

  // 6. APPLY STEALS
  const stealsApplied = {};
  room.players.forEach((p) => {
    const e = evals[p.id];
    if (e.stolenBy.length > 0) {
      if (e.isShielded) {
        // Shield blocks steals
        stealsApplied[p.id] = { success: false };
      } else {
        const stolenGains = e.scoreChange;
        stealsApplied[p.id] = { success: true, stolenGains, thieves: e.stolenBy };
        
        // Give stolen gains to all thieves (duplicated or divided? duplicate is fun and simple)
        e.stolenBy.forEach((thiefId) => {
          evals[thiefId].scoreChange += stolenGains;
        });

        // Target gets 0 round score change
        e.scoreChange = 0;
      }
    }
  });

  // 7. MULTIPLIERS (DOUBLE & REVERSE) AND COMPILE RESULTS
  const roundResults = {};
  room.players.forEach((p) => {
    const e = evals[p.id];
    let finalGain = e.scoreChange;

    // Double applies only to positive rewards
    if (finalGain > 0) {
      finalGain = finalGain * e.doubleMultiplier;
    }

    // Apply Reverse multiplier
    finalGain = finalGain * e.reverseMultiplier;

    roundResults[p.id] = {
      name: p.name,
      boxType: e.box.type,
      boxName: e.box.name,
      boxValue: e.box.value,
      isShielded: e.isShielded,
      isFrozen: e.isFrozen,
      halfScore: e.halfScore,
      roundGain: finalGain,
      playedCard: room.game.cards[p.id]?.type || 'None',
    };
  });

  room.game.roundResults = roundResults;
};

/**
 * Resets a finished game back into a clean lobby room state.
 */
export const resetToLobby = (roomCode) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  // Clear timer and trade timeouts
  clearRoomTimer(room.roomCode);
  clearAllTradeTimeoutsForRoom(room.roomCode);

  room.gameState = 'waiting';
  room.game = null;
  room.players.forEach((p) => {
    p.score = 0;
    p.ready = false;
  });

  return room;
};
