// services/sabotage.service.js
import { getDerivedStatus } from './system.service.js';
import { createEvidence } from './evidence.service.js';

export const SABOTAGE_COOLDOWNS = {
  generator: 25000,        // 25s
  communications: 30000,   // 30s
  security: 30000,         // 30s
  door_lockdown: 20000,    // 20s
  power_blackout: 35000,   // 35s
  system_corruption: 40000, // 40s
};

/**
 * Validates whether a player is authorized to use a sabotage ability.
 */
export const canSabotage = (room, playerId, sabotageType, targetId) => {
  if (!room || !room.game) {
    throw new Error('Game is not active.');
  }

  if (room.game.phase !== 'exploration') {
    throw new Error('Sabotage can only be used during exploration.');
  }

  const pGame = room.game.players[playerId];
  if (!pGame || !pGame.isAlive) {
    throw new Error('Only active, surviving players can execute sabotages.');
  }

  // Authorize team
  if (pGame.team !== 'saboteur') {
    throw new Error('UNAUTHORIZED');
  }

  // Check cooldown constraints
  const cooldowns = room.game.sabotages?.cooldowns?.[playerId];
  if (cooldowns && cooldowns[sabotageType] && Date.now() < cooldowns[sabotageType]) {
    throw new Error('Ability is currently on cooldown.');
  }

  // Validate specific targets
  if (sabotageType === 'generator') {
    const sys = room.game.systems.generator;
    if (!sys) throw new Error('Generator system not found.');
    if (sys.health <= 0) throw new Error('Generator is already offline.');
  } else if (sabotageType === 'system_corruption') {
    if (!targetId || !room.game.systems[targetId]) {
      throw new Error('Invalid system target for corruption.');
    }
  } else if (sabotageType === 'door_lockdown') {
    const walkableCorridors = [
      'HALLWAY_HUB_SECURITY',
      'HALLWAY_HUB_LAB',
      'HALLWAY_HUB_GENERATOR',
      'HALLWAY_HUB_COMMS',
      'HALLWAY_COMMS_MEDICAL',
      'HALLWAY_LAB_STORAGE',
      'HALLWAY_SECURITY_CONTROL',
      'HALLWAY_GENERATOR_EXIT',
    ];
    if (!targetId || !walkableCorridors.includes(targetId)) {
      throw new Error('Invalid doorway target for lockdown.');
    }
  }

  return true;
};

/**
 * Authoritatively executes a sabotage ability.
 */
export const useSabotage = (room, playerId, sabotageType, targetId, io) => {
  // Validate request authorization first
  canSabotage(room, playerId, sabotageType, targetId);

  const now = Date.now();
  let expiresAt = now;

  // Initialize store map variables if not created
  if (!room.game.sabotages) {
    room.game.sabotages = {
      active: {},
      cooldowns: {},
      lockedDoors: {},
      blackoutActive: false,
      communicationsDisabled: false,
      securityDegraded: false,
      corruptedSystems: {},
      communicationsDisabledExpiresAt: 0,
      securityDegradedExpiresAt: 0,
      blackoutActiveExpiresAt: 0,
    };
  }

  const id = Math.random().toString(36).substring(2, 9).toUpperCase();

  // Execute specific sabotage mechanics
  if (sabotageType === 'generator') {
    const system = room.game.systems.generator;
    if (system && system.health > 0) {
      const previousHealth = system.health;
      system.health = Math.max(0, system.health - 25);
      system.status = getDerivedStatus(system.health);
      system.lastUpdated = now;

      room.game.timeline.push({
        timestamp: now,
        text: 'Generator health damaged by sabotage.',
      });

      createEvidence(room, 'SYSTEM_EVENT', 'GENERATOR', playerId, 'generator', `Generator integrity health dropped: ${previousHealth}% -> ${system.health}%. Cause: UNKNOWN.`);
      // Sabotage trace only (internal)
      createEvidence(room, 'SABOTAGE_TRACE', 'GENERATOR', playerId, 'generator', `Generator integrity compromised by sabotage. Source identified: ${playerId}.`, 'HIGH', playerId);
    }
  } else if (sabotageType === 'communications') {
    expiresAt = now + 20000; // 20s
    room.game.sabotages.communicationsDisabled = true;
    room.game.sabotages.communicationsDisabledExpiresAt = expiresAt;

    room.game.timeline.push({
      timestamp: now,
      text: 'Facility communications hijacked and disabled.',
    });

    createEvidence(room, 'COMMUNICATION_LOG', 'COMMUNICATIONS', playerId, 'comms', 'Communications mainframe offline. Broadcast failure.');
    createEvidence(room, 'SABOTAGE_TRACE', 'COMMUNICATIONS', playerId, 'comms', `Communications mainframe hijacked. Jammer device deployed by: ${playerId}.`, 'HIGH', playerId);
  } else if (sabotageType === 'security') {
    expiresAt = now + 25000; // 25s
    room.game.sabotages.securityDegraded = true;
    room.game.sabotages.securityDegradedExpiresAt = expiresAt;

    room.game.timeline.push({
      timestamp: now,
      text: 'Facility security systems degraded.',
    });

    createEvidence(room, 'SYSTEM_EVENT', 'SECURITY', playerId, 'security', 'Security network diagnostics report degraded integrity.');
    createEvidence(room, 'SABOTAGE_TRACE', 'SECURITY', playerId, 'security', `Security network firewall breached by user: ${playerId}.`, 'HIGH', playerId);
  } else if (sabotageType === 'door_lockdown') {
    expiresAt = now + 15000; // 15s
    room.game.sabotages.lockedDoors[targetId] = expiresAt;

    room.game.timeline.push({
      timestamp: now,
      text: `Facility lockdown activated on corridor ${targetId}.`,
    });

    createEvidence(room, 'DOOR_LOG', targetId, playerId, targetId, `Doorway corridor ${targetId} locked down authoritatively.`);
    createEvidence(room, 'SABOTAGE_TRACE', targetId, playerId, targetId, `Doorway corridor ${targetId} locked down manually. Overridden by: ${playerId}.`, 'HIGH', playerId);
  } else if (sabotageType === 'power_blackout') {
    expiresAt = now + 15000; // 15s
    room.game.sabotages.blackoutActive = true;
    room.game.sabotages.blackoutActiveExpiresAt = expiresAt;

    room.game.timeline.push({
      timestamp: now,
      text: 'Power blackout activated. Facility brightness reduced.',
    });

    createEvidence(room, 'SYSTEM_EVENT', 'FACILITY', playerId, 'blackout', 'Main power grid offline. AUX power operating.');
    createEvidence(room, 'SABOTAGE_TRACE', 'FACILITY', playerId, 'blackout', `Main power breaker tripped. Manual override by: ${playerId}.`, 'HIGH', playerId);
  } else if (sabotageType === 'system_corruption') {
    expiresAt = now + 20000; // 20s
    const targetSystem = room.game.systems[targetId];
    if (targetSystem) {
      const falseHealth = targetSystem.health <= 50 ? 80 : 30;
      room.game.sabotages.corruptedSystems[targetId] = {
        falseHealth,
        expiresAt,
      };

      room.game.timeline.push({
        timestamp: now,
        text: `Diagnostics signals corrupted on system ${targetSystem.name}.`,
      });

      // Sabotage trace only (internal)
      createEvidence(room, 'SABOTAGE_TRACE', targetId, playerId, targetId, `System integrity corruption sabotage occurred on ${targetId}.`, 'HIGH', playerId);
    }
  }

  // Apply ability cooldown clock
  if (!room.game.sabotages.cooldowns[playerId]) {
    room.game.sabotages.cooldowns[playerId] = {};
  }
  const cooldownPeriod = SABOTAGE_COOLDOWNS[sabotageType] || 25000;
  room.game.sabotages.cooldowns[playerId][sabotageType] = now + cooldownPeriod;

  // Track session details
  const session = {
    id,
    type: sabotageType,
    startedAt: now,
    expiresAt,
    sourcePlayerId: playerId,
    targetId,
    active: expiresAt > now,
  };

  room.game.sabotages.active[id] = session;

  // Increment player statistics
  if (room.game.statistics?.playerStats?.[playerId]) {
    const stats = room.game.statistics.playerStats[playerId];
    stats.systemsSabotaged += (sabotageType === 'generator' || sabotageType === 'system_corruption') ? 1 : 0;
    stats.commsDisabled += (sabotageType === 'communications') ? 1 : 0;
    stats.doorsLocked += (sabotageType === 'door_lockdown') ? 1 : 0;
    stats.blackoutsCaused += (sabotageType === 'power_blackout') ? 1 : 0;
    stats.successfulSabotage += 1;
  }

  // Record sabotage history
  if (room.game.statistics?.sabotageHistory) {
    room.game.statistics.sabotageHistory.push({
      timestamp: now,
      type: sabotageType,
      playerId,
    });
  }

  // Check win conditions (e.g. if generator health <= 0)
  const { checkWinConditions } = require('./gameResult.service.js');
  checkWinConditions(room, io);

  return session;
};

/**
 * Lazily evaluates active cooldown clocks and clears expired sabotage states.
 */
export const updateActiveSabotages = (room) => {
  if (!room || !room.game || !room.game.sabotages) return;

  const now = Date.now();
  const game = room.game;

  // Restore Communications
  if (game.communicationsDisabled && now >= game.sabotages.communicationsDisabledExpiresAt) {
    game.communicationsDisabled = false;
    game.timeline.push({
      timestamp: now,
      text: 'Communications channel auto-restored.',
    });
  }

  // Restore Security
  if (game.securityDegraded && now >= game.sabotages.securityDegradedExpiresAt) {
    game.securityDegraded = false;
  }

  // Restore Power Blackout
  if (game.blackoutActive && now >= game.sabotages.blackoutActiveExpiresAt) {
    game.blackoutActive = false;
  }

  // Restore Corrupted Systems
  Object.keys(game.sabotages.corruptedSystems).forEach((sysId) => {
    const data = game.sabotages.corruptedSystems[sysId];
    if (now >= data.expiresAt) {
      delete game.sabotages.corruptedSystems[sysId];
    }
  });

  // Clean expired locked doors
  Object.keys(game.sabotages.lockedDoors).forEach((doorId) => {
    if (now >= game.sabotages.lockedDoors[doorId]) {
      delete game.sabotages.lockedDoors[doorId];
      game.timeline.push({
        timestamp: now,
        text: `Hallway door auto-unlocked: ${doorId}`,
      });
    }
  });

  // Deactivate active tracking objects
  Object.keys(game.sabotages.active).forEach((id) => {
    const sab = game.sabotages.active[id];
    if (sab.active && now >= sab.expiresAt) {
      sab.active = false;
    }
  });
};

/**
 * Clears room timers and map configurations.
 */
export const cleanupRoomSabotages = (room) => {
  if (room && room.game && room.game.sabotages) {
    room.game.sabotages = {
      active: {},
      cooldowns: {},
      lockedDoors: {},
      blackoutActive: false,
      communicationsDisabled: false,
      securityDegraded: false,
      corruptedSystems: {},
      communicationsDisabledExpiresAt: 0,
      securityDegradedExpiresAt: 0,
      blackoutActiveExpiresAt: 0,
    };
  }
};
