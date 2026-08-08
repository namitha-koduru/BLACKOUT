// services/gameResult.service.js
import { cleanupRoomMeetings } from './meeting.service.js';
import { clearRoomTimer } from './blackout.service.js';
import { rooms } from './room.service.js';

/**
 * Checks all active win conditions for Crew and Saboteurs.
 * Triggers game-over sequence immediately upon declaration.
 */
export const checkWinConditions = (room, io) => {
  if (!room || !room.game || room.game.gameOver) return;

  const players = Object.values(room.game.players);
  const livingSaboteurs = players.filter((p) => p.team === 'saboteur' && p.isAlive).length;
  const livingCrew = players.filter((p) => p.team === 'crew' && p.isAlive).length;

  const generatorHealth = room.game.systems?.generator?.health || 0;
  const allSystemsRestored = Object.values(room.game.systems || {}).every(
    (sys) => sys.health >= 100
  );

  let winner = null;

  // Saboteur Win Condition 1: Equal or outnumber Crew
  // Saboteur Win Condition 2: Critical Facility failure (Generator health 0)
  if (livingSaboteurs >= livingCrew || generatorHealth <= 0) {
    winner = 'saboteur';
  }
  // Crew Win Condition 1: All Saboteurs eliminated
  // Crew Win Condition 2: All critical systems fully restored
  else if (livingSaboteurs === 0 || allSystemsRestored) {
    winner = 'crew';
  }

  if (winner) {
    declareGameOver(room, winner, io);
  }
};

/**
 * Freezes gameplay and triggers the game over transition.
 */
const declareGameOver = (room, winner, io) => {
  room.gameState = 'game_over';
  room.game.phase = 'game_over';
  room.game.winner = winner;
  room.game.gameOver = true;
  room.game.meetingActive = false;

  const now = Date.now();
  room.game.timeline.push({
    timestamp: now,
    text: `Game Over. Winner declared: ${winner.toUpperCase()} WINS.`,
  });

  // Clean up all running intervals and timers
  clearRoomTimer(room.roomCode);
  cleanupRoomMeetings(room.roomCode);
  room.game.repairSessions = {};

  // Broadcast immediate game over notice to allow 5-second transition
  io.to(room.roomCode).emit('gameOver', { winner, transitionDuration: 5 });

  // Store final statistics survival values
  Object.keys(room.game.players).forEach((pId) => {
    const gp = room.game.players[pId];
    if (room.game.statistics?.playerStats?.[pId]) {
      room.game.statistics.playerStats[pId].survival = gp.isAlive;
    }
  });

  // After 5 seconds, build and transmit full results payload
  setTimeout(() => {
    // Check if room still exists before compiling
    const activeRoom = rooms.get(room.roomCode);
    if (!activeRoom || !activeRoom.game) return;

    const results = buildFinalResults(activeRoom);
    activeRoom.game.finalResults = results; // Cache for reconnecting players
    io.to(activeRoom.roomCode).emit('finalResults', results);
  }, 5000);
};

/**
 * Builds the comprehensive game result payload.
 */
export const buildFinalResults = (room) => {
  if (!room || !room.game) return null;

  return {
    winner: room.game.winner,
    roles: Object.keys(room.game.players).map((pId) => {
      const p = room.players.find((player) => player.id === pId);
      const gp = room.game.players[pId];
      return {
        playerId: pId,
        name: p?.name || 'Player',
        avatar: p?.avatar || '👤',
        role: gp.role,
        team: gp.team,
      };
    }),
    rankings: calculatePlayerRankings(room),
    statistics: room.game.statistics?.playerStats || {},
    timeline: room.game.timeline || [],
    evidence: compileFinalEvidence(room),
    votingHistory: room.game.statistics?.votingHistory || [],
    sabotageHistory: compileSabotageHistory(room),
  };
};

/**
 * Calculates game scores and ranks players.
 */
const calculatePlayerRankings = (room) => {
  const list = room.players.map((p) => {
    const gp = room.game.players[p.id];
    const stats = room.game.statistics?.playerStats?.[p.id] || {};
    let score = 0;

    if (gp.team === 'crew') {
      score =
        (stats.repairsCompleted || 0) * 100 +
        (stats.systemsRepaired || 0) * 200 +
        (stats.evidenceDiscovered || 0) * 150 +
        (stats.correctVotes || 0) * 200 +
        (gp.isAlive ? 300 : 0);
    } else {
      score =
        (stats.successfulSabotage || 0) * 150 +
        (stats.commsDisabled || 0) * 100 +
        (stats.doorsLocked || 0) * 100 +
        (stats.blackoutsCaused || 0) * 100 +
        (stats.evidenceCorrupted || 0) * 150 +
        (stats.playersEliminated || 0) * 250 +
        (gp.isAlive ? 300 : 0);
    }

    return {
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      role: gp.role,
      team: gp.team,
      score,
    };
  });

  return list.sort((a, b) => b.score - a.score);
};

/**
 * Compiles all captured evidence items, exposing uncorrupted values and Hackers.
 */
const compileFinalEvidence = (room) => {
  if (!room.game.evidence) return [];

  return room.game.evidence.map((ev) => {
    const pInfo = room.players.find((p) => p.id === ev.playerId);
    const hackerInfo = ev.corruptedBy
      ? room.players.find((p) => p.id === ev.corruptedBy)
      : null;

    return {
      id: ev.id,
      timestamp: ev.timestamp,
      type: ev.type,
      location: ev.location,
      visibleDescription: ev.description,
      actualDescription: ev.originalDescription || ev.description,
      corrupted: !!ev.corruptedBy,
      corruptedByName: hackerInfo ? hackerInfo.name : null,
      playerRevealedName: pInfo ? pInfo.name : 'Unknown',
    };
  });
};

/**
 * Compiles sabotage history entries mapping player names.
 */
const compileSabotageHistory = (room) => {
  const history = room.game.statistics?.sabotageHistory || [];
  return history.map((sab) => {
    const p = room.players.find((player) => player.id === sab.playerId);
    return {
      timestamp: sab.timestamp,
      type: sab.type,
      playerName: p ? p.name : 'Unknown',
    };
  });
};

/**
 * Resets the room and lobby parameters completely.
 */
export const resetGame = (room) => {
  if (!room) return;

  room.gameState = 'waiting';
  room.game = null;

  // Reset players ready parameters
  room.players.forEach((p) => {
    p.ready = false;
    delete p.role; // Remove revealed roles from previous rounds
  });

  return room;
};
