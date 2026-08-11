// services/kill.service.js
import { createEvidence } from './evidence.service.js';
import { createBody } from './body.service.js';

const KILL_COOLDOWN = 30000; // 30 seconds
const KILL_RANGE_UNITS = 80; // Roughly 2-3 meters in map scale

/**
 * Validates whether an Imposter can kill a target player.
 */
export const canKill = (room, killerId, victimId) => {
  if (!room || !room.game) {
    throw new Error('Game is not active.');
  }

  if (room.game.phase !== 'exploration' || room.gameState !== 'exploration') {
    throw new Error('Kills can only occur during map exploration.');
  }

  if (room.game.meetingActive) {
    throw new Error('Cannot kill during emergency meetings.');
  }

  const killer = room.game.players[killerId];
  if (!killer || !killer.isAlive) {
    throw new Error('Killer is not alive or not found.');
  }

  if (killer.team !== 'saboteur') {
    throw new Error('Only Saboteurs can eliminate other players.');
  }

  const victim = room.game.players[victimId];
  if (!victim || !victim.isAlive) {
    throw new Error('Target is already eliminated or not found.');
  }

  if (victim.team === 'saboteur') {
    throw new Error('Saboteurs cannot eliminate teammate Saboteurs.');
  }

  // Check kill cooldown
  room.game.killCooldowns = room.game.killCooldowns || {};
  const cooldownEnd = room.game.killCooldowns[killerId] || 0;
  if (Date.now() < cooldownEnd) {
    const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
    throw new Error(`Kill ability cooling down. Please wait ${remaining}s.`);
  }

  // Check distance
  const dist = Math.hypot(
    killer.position.x - victim.position.x,
    killer.position.y - victim.position.y
  );

  if (dist > KILL_RANGE_UNITS) {
    throw new Error('Target is too far away.');
  }

  return true;
};

/**
 * Executes a player kill, spawning a body and resetting cooldown.
 */
export const killPlayer = (room, killerId, victimId, io) => {
  canKill(room, killerId, victimId);

  const victim = room.game.players[victimId];
  // Perform elimination
  victim.isAlive = false;
  
  // Set position to zero/off-map for ghost, but save deathPosition
  const deathPosition = { ...victim.position };
  victim.position = { x: 0, y: 0 }; 

  // Reset kill cooldown
  room.game.killCooldowns = room.game.killCooldowns || {};
  room.game.killCooldowns[killerId] = Date.now() + KILL_COOLDOWN;

  // Add dead body
  createBody(room, victimId, victim.currentRoom, deathPosition, killerId);

  // Broadcast event to update spectators and player list
  const victimName = room.players.find((p) => p.id === victimId)?.name || 'Player';

  room.game.timeline.push({
    timestamp: Date.now(),
    text: `${victimName} was eliminated in the facility.`,
  });

  // Create evidence (do not reveal killerId in normal logs, but log privately)
  createEvidence(
    room,
    'SYSTEM_EVENT',
    victim.currentRoom,
    victimId,
    'death',
    `Deceased bio-signature detected in ${victim.currentRoom}.`
  );

  // Record stats
  if (room.game.statistics?.playerStats?.[killerId]) {
    room.game.statistics.playerStats[killerId].playersEliminated += 1;
  }

  // Emit playerKilled socket event
  io.to(room.roomCode).emit('playerKilled', {
    victimId,
    room: victim.currentRoom,
    position: deathPosition,
  });

  // Emit private cooldown update to the killer
  const killerSocket = room.players.find((p) => p.id === killerId)?.socketId;
  if (killerSocket) {
    io.to(killerSocket).emit('killCooldownUpdated', {
      cooldownEnd: room.game.killCooldowns[killerId],
    });
  }

  // Check win conditions
  import('./gameResult.service.js').then(({ checkWinConditions }) => {
    checkWinConditions(room, io);
  }).catch(err => {
    console.error('Error importing gameResult.service.js in kill.service:', err);
  });

  return { success: true, victimId };
};

/**
 * Returns remaining cooldown for killer.
 */
export const getKillCooldown = (room, playerId) => {
  if (!room || !room.game || !room.game.killCooldowns) return 0;
  const end = room.game.killCooldowns[playerId] || 0;
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
};

/**
 * Reset cooldown (e.g. at meeting end/start or play again).
 */
export const resetKillCooldown = (room, playerId) => {
  if (!room || !room.game) return;
  room.game.killCooldowns = room.game.killCooldowns || {};
  room.game.killCooldowns[playerId] = Date.now() + 10000; // 10s cooldown head start after meeting
};
