// services/blackout.service.js
import { rooms, registerRoomCleanupCallback } from './room.service.js';
import { createSystems, getDerivedStatus } from './system.service.js';
import { updateActiveSabotages } from './sabotage.service.js';
import { createEvidence, sanitizeEvidence } from './evidence.service.js';

// Centralized role metadata
export const ROLES = {
  Engineer: {
    team: 'crew',
    name: 'Engineer',
    ability: 'rapid_repair',
    description: 'You repair facility systems faster than normal Crew.',
  },
  Investigator: {
    team: 'crew',
    name: 'Investigator',
    ability: 'investigate',
    description: 'You access additional investigation information and clues.',
  },
  Medic: {
    team: 'crew',
    name: 'Medic',
    ability: 'protect',
    description: 'You can protect one player from a sabotage effect per round.',
  },
  Operator: {
    team: 'crew',
    name: 'Operator',
    ability: 'boost_comms',
    description: 'You can restore communication systems faster than normal Crew.',
  },
  Tracker: {
    team: 'crew',
    name: 'Tracker',
    ability: 'track_movement',
    description: 'You can view the recent movement and location history of one player.',
  },
  Crew: {
    team: 'crew',
    name: 'Crew',
    ability: 'none',
    description: 'Restore facility systems, investigate suspicious behavior, and vote out the Saboteurs.',
  },
  Saboteur: {
    team: 'saboteur',
    name: 'Saboteur',
    ability: 'sabotage',
    description: 'Disrupt critical facility systems and eliminate Crew members without being detected.',
  },
  Hacker: {
    team: 'saboteur',
    name: 'Hacker',
    ability: 'manipulate_evidence',
    description: 'You can manipulate or corrupt evidence records later in the game.',
  },
  Mimic: {
    team: 'saboteur',
    name: 'Mimic',
    ability: 'disguise',
    description: 'You can temporarily disguise your identity and location info from Trackers.',
  },
};

// 2D Facility Layout Walkable Rectangles
export const WALKABLE_AREAS = [
  // Rooms
  { name: 'CENTRAL HUB', x: 450, y: 300, w: 300, h: 250, type: 'room' },
  { name: 'SECURITY', x: 450, y: 50, w: 300, h: 150, type: 'room' },
  { name: 'LAB', x: 100, y: 300, w: 250, h: 250, type: 'room' },
  { name: 'GENERATOR', x: 850, y: 300, w: 250, h: 250, type: 'room' },
  { name: 'COMMUNICATIONS', x: 450, y: 650, w: 300, h: 150, type: 'room' },
  { name: 'MEDICAL', x: 450, y: 850, w: 300, h: 120, type: 'room' },
  { name: 'STORAGE', x: 100, y: 650, w: 250, h: 150, type: 'room' },
  { name: 'CONTROL ROOM', x: 850, y: 50, w: 250, h: 150, type: 'room' },
  { name: 'EXIT', x: 850, y: 650, w: 250, h: 150, type: 'room' },

  // Hallways/Passages
  { name: 'HALLWAY_HUB_SECURITY', x: 575, y: 200, w: 50, h: 100, type: 'hallway' },
  { name: 'HALLWAY_HUB_LAB', x: 350, y: 400, w: 100, h: 50, type: 'hallway' },
  { name: 'HALLWAY_HUB_GENERATOR', x: 750, y: 400, w: 100, h: 50, type: 'hallway' },
  { name: 'HALLWAY_HUB_COMMS', x: 575, y: 550, w: 50, h: 100, type: 'hallway' },
  { name: 'HALLWAY_COMMS_MEDICAL', x: 575, y: 800, w: 50, h: 50, type: 'hallway' },
  { name: 'HALLWAY_LAB_STORAGE', x: 200, y: 550, w: 50, h: 100, type: 'hallway' },
  { name: 'HALLWAY_SECURITY_CONTROL', x: 750, y: 100, w: 100, h: 50, type: 'hallway' },
  { name: 'HALLWAY_GENERATOR_EXIT', x: 950, y: 550, w: 50, h: 100, type: 'hallway' }
];

/**
 * Checks if a point lies in any walkable room or hallway.
 */
export const isValidPosition = (x, y) => {
  return WALKABLE_AREAS.some(
    (area) => x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h
  );
};

/**
 * Returns the area containing the coordinates.
 */
export const getAreaAtPosition = (x, y) => {
  for (const area of WALKABLE_AREAS) {
    if (x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h) {
      return area;
    }
  }
  return null;
};

/**
 * Resolves room name, maintaining lastRoom as fallback when transitioning hallways.
 */
export const getRoomAtPosition = (x, y, lastRoom) => {
  const area = getAreaAtPosition(x, y);
  if (area && area.type === 'room') {
    return area.name;
  }
  return lastRoom || 'CENTRAL HUB';
};

// Module-level storage for timers: roomCode -> { phaseStartedAt, phaseEndsAt, intervalId }
const roomTimers = new Map();
// Module-level storage for player position broadcast intervals: roomCode -> intervalId
const roomSyncIntervals = new Map();

/**
 * Clears any active timer and sync interval for the given room.
 * @param {string} roomCode
 */
export const clearRoomTimer = (roomCode) => {
  const code = roomCode.toUpperCase().trim();
  const existing = roomTimers.get(code);
  if (existing) {
    clearInterval(existing.intervalId);
    roomTimers.delete(code);
  }

  // Clear 10Hz position synchronization interval
  const syncInt = roomSyncIntervals.get(code);
  if (syncInt) {
    clearInterval(syncInt);
    roomSyncIntervals.delete(code);
  }
};

// Register cleanup with room service
registerRoomCleanupCallback((roomCode) => {
  clearRoomTimer(roomCode);
});

/**
 * Starts the 10Hz broadcast interval for player positions in exploration.
 * @param {string} roomCode
 * @param {object} io
 */
export const startExplorationPositionSync = (roomCode, io) => {
  const code = roomCode.toUpperCase().trim();
  
  // Clear any existing sync interval
  const existing = roomSyncIntervals.get(code);
  if (existing) {
    clearInterval(existing);
  }

  const intervalId = setInterval(() => {
    const room = rooms.get(code);
    if (!room || !room.game || room.game.phase !== 'exploration') {
      clearInterval(intervalId);
      roomSyncIntervals.delete(code);
      return;
    }

    const positions = {};
    room.players.forEach((p) => {
      const gp = room.game.players[p.id];
      if (gp) {
        positions[p.id] = {
          x: gp.position.x,
          y: gp.position.y,
          room: gp.currentRoom,
          connected: p.connected,
        };
      }
    });

    // Broadcast synchronization payload
    io.to(code).emit('playerPositions', { positions });
  }, 100);

  roomSyncIntervals.set(code, intervalId);
};

/**
 * Starts a timer for a specific phase.
 * @param {string} roomCode
 * @param {number} durationSeconds
 * @param {object} io
 * @param {function} onComplete
 */
export const startPhaseTimer = (roomCode, durationSeconds, io, onComplete) => {
  const code = roomCode.toUpperCase().trim();
  const existing = roomTimers.get(code);
  // Keep interval running if it exists, only override parameters

  const phaseStartedAt = Date.now();
  const phaseEndsAt = phaseStartedAt + durationSeconds * 1000;

  if (existing) {
    existing.phaseStartedAt = phaseStartedAt;
    existing.phaseEndsAt = phaseEndsAt;
  } else {
    const timerData = {
      phaseStartedAt,
      phaseEndsAt,
      intervalId: null,
    };

    timerData.intervalId = setInterval(() => {
      const room = rooms.get(code);
      if (!room || !room.game) {
        clearRoomTimer(code);
        return;
      }

      const remaining = Math.max(0, Math.ceil((timerData.phaseEndsAt - Date.now()) / 1000));
      room.game.timer = remaining;
      room.game.phaseEndsAt = timerData.phaseEndsAt;

      io.to(code).emit('timerUpdated', { timer: remaining, phaseEndsAt: timerData.phaseEndsAt });

      if (remaining <= 0) {
        clearRoomTimer(code);
        if (typeof onComplete === 'function') {
          onComplete(room, io);
        }
      }
    }, 1000);

    roomTimers.set(code, timerData);
  }

  // Update room object
  const room = rooms.get(code);
  if (room && room.game) {
    room.game.timer = durationSeconds;
    room.game.phaseStartedAt = phaseStartedAt;
    room.game.phaseEndsAt = phaseEndsAt;
  }

  // Emit initial timer value immediately
  io.to(code).emit('timerUpdated', { timer: durationSeconds, phaseEndsAt });
};

/**
 * Performs secure role assignments based on player count.
 * @param {array} players
 * @returns {object} playerId -> { role, team }
 */
export const assignRoles = (players) => {
  const count = players.length;
  
  // Calculate balanced count of Saboteurs
  let numSaboteurs = 1;
  if (count === 4 || count === 5) {
    numSaboteurs = 1;
  } else if (count >= 6 && count <= 8) {
    numSaboteurs = 2;
  } else if (count >= 9) {
    numSaboteurs = 3;
  }

  const numCrew = count - numSaboteurs;
  const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

  const saboteurGroup = shuffledPlayers.slice(0, numSaboteurs);
  const crewGroup = shuffledPlayers.slice(numSaboteurs);

  const crewSpecialPool = ['Engineer', 'Investigator', 'Medic', 'Operator', 'Tracker'];
  const saboteurSpecialPool = ['Hacker', 'Mimic'];

  const shuffledCrewSpecials = [...crewSpecialPool].sort(() => Math.random() - 0.5);
  const shuffledSabSpecials = [...saboteurSpecialPool].sort(() => Math.random() - 0.5);

  const assignments = {};

  // Assign Saboteur roles (ensure at least 1 standard Saboteur)
  let sabSpecCount = 0;
  if (numSaboteurs > 1) {
    sabSpecCount = Math.floor(Math.random() * numSaboteurs); // e.g. 1 special and 1 standard, or 1 special and 2 standard
  } else {
    sabSpecCount = Math.random() < 0.5 ? 1 : 0; // 50% chance of hacker/mimic if 1 saboteur
  }

  saboteurGroup.forEach((player, idx) => {
    const role = idx < sabSpecCount ? shuffledSabSpecials[idx] : 'Saboteur';
    assignments[player.id] = {
      role,
      team: 'saboteur',
    };
  });

  // Assign Crew roles (ensure at least 1 standard Crew exists)
  const maxCrewSpecials = Math.max(0, numCrew - 1);
  const crewSpecCount = Math.min(maxCrewSpecials, Math.floor(Math.random() * 3) + 1); // 1 to 3 special roles

  crewGroup.forEach((player, idx) => {
    const role = idx < crewSpecCount ? shuffledCrewSpecials[idx] : 'Crew';
    assignments[player.id] = {
      role,
      team: 'crew',
    };
  });

  return assignments;
};

/**
 * Sanitizes room state before sending to a specific player to prevent cheating.
 * @param {object} room
 * @param {string} playerId
 * @returns {object} Sanitized room
 */
export const sanitizeRoomForPlayer = (room, playerId) => {
  if (!room) return null;

  // Deep clone
  const sanitized = JSON.parse(JSON.stringify(room));

  if (sanitized.game) {
    const isGameOver = sanitized.gameState === 'game_over';

    // Map role and team status per player selectively
    sanitized.players = sanitized.players.map((p) => {
      const gamePlayer = sanitized.game.players[p.id];
      const playerCopy = { ...p };

      if (gamePlayer) {
        if (isGameOver || p.id === playerId) {
          playerCopy.role = gamePlayer.role;
          playerCopy.team = gamePlayer.team;
        } else {
          // Hide roles and teams for other players
          playerCopy.role = 'hidden';
          playerCopy.team = 'hidden';
        }
        playerCopy.isAlive = gamePlayer.isAlive;
        playerCopy.currentRoom = gamePlayer.currentRoom;
        playerCopy.position = gamePlayer.position;
      }
      return playerCopy;
    });

    // Mask secret information inside room.game itself
    const sanitizedGamePlayers = {};
    Object.keys(sanitized.game.players).forEach((pId) => {
      const gp = sanitized.game.players[pId];
      if (isGameOver || pId === playerId) {
        sanitizedGamePlayers[pId] = gp;
      } else {
        sanitizedGamePlayers[pId] = {
          isAlive: gp.isAlive,
          currentRoom: gp.currentRoom,
          position: gp.position,
          // Hide identity details
          role: 'hidden',
          team: 'hidden',
        };
      }
    });

    sanitized.game.players = sanitizedGamePlayers;

    // --- SABOTAGE SYSTEM SANITIZATIONS ---
    updateActiveSabotages(sanitized);

    const isReceiverSaboteur = room.game.players[playerId]?.team === 'saboteur';

    if (sanitized.game.sabotages) {
      // 1. Hide sourcePlayerId from active sabotages list for Crew
      const sanitizedActive = {};
      Object.keys(sanitized.game.sabotages.active).forEach((sabId) => {
        const sab = sanitized.game.sabotages.active[sabId];
        const sabCopy = { ...sab };
        if (!isReceiverSaboteur) {
          delete sabCopy.sourcePlayerId;
        }
        sanitizedActive[sabId] = sabCopy;
      });
      sanitized.game.sabotages.active = sanitizedActive;

      // 2. Hide raw cooldown list from Crew
      if (!isReceiverSaboteur) {
        sanitized.game.sabotages.cooldowns = {};
      }
    }

    // 3. System health corruption display masking
    if (sanitized.game.systems) {
      Object.keys(sanitized.game.systems).forEach((sysId) => {
        const sys = sanitized.game.systems[sysId];
        const corruptData = sanitized.game.sabotages?.corruptedSystems?.[sysId];
        if (corruptData && Date.now() < corruptData.expiresAt && !isReceiverSaboteur) {
          sys.health = corruptData.falseHealth;
          sys.status = getDerivedStatus(corruptData.falseHealth);
        }
      });
    }

    // 4. Update root game attributes for direct socket indicators
    sanitized.game.blackoutActive = sanitized.game.blackoutActive || false;
    sanitized.game.communicationsDisabled = sanitized.game.communicationsDisabled || false;
    sanitized.game.securityDegraded = sanitized.game.securityDegraded || false;

    // 5. Package player-specific discovered evidence logs and public timeline
    const discoveredList = [];
    const timelineList = [];
    const playersMap = {};
    room.players.forEach((p) => {
      playersMap[p.id] = p;
    });

    const pGame = room.game.players[playerId];

    if (room.game.evidence) {
      room.game.evidence.forEach((ev) => {
        // Discovered list
        if (ev.discoveredBy.includes(playerId)) {
          const sanitizedEv = sanitizeEvidence(ev, playerId, pGame?.role, pGame?.team, playersMap);
          if (sanitizedEv) {
            discoveredList.push(sanitizedEv);
          }
        }
        // Public logs timeline (e.g. system events, repairs, locks, comms)
        if (['SYSTEM_EVENT', 'REPAIR_LOG', 'DOOR_LOG', 'COMMUNICATION_LOG'].includes(ev.type)) {
          const sanitizedTimeline = sanitizeEvidence(ev, playerId, pGame?.role, pGame?.team, playersMap);
          if (sanitizedTimeline) {
            timelineList.push({
              timestamp: sanitizedTimeline.timestamp,
              description: sanitizedTimeline.description,
            });
          }
        }
      });
    }

    sanitized.game.discoveredEvidence = discoveredList;
    sanitized.game.publicTimeline = timelineList;
  }

  return sanitized;
};

/**
 * Broadcasts personalized, sanitized updates to all clients in the room.
 * @param {object} room
 * @param {object} io
 */
export const broadcastRoomState = (room, io) => {
  if (!room) return;

  // Send sanitized state to players
  room.players.forEach((p) => {
    if (p.socketId && p.connected) {
      const state = sanitizeRoomForPlayer(room, p.id);
      io.to(p.socketId).emit('roomUpdated', state);
    }
  });

  // Send sanitized state to spectators (they see no roles)
  room.spectators.forEach((s) => {
    if (s.socketId && s.connected) {
      const state = sanitizeRoomForPlayer(room, s.id);
      io.to(s.socketId).emit('roomUpdated', state);
    }
  });
};

/**
 * Emits private role information directly to individual players.
 * @param {object} room
 * @param {object} io
 */
export const emitPrivateRoles = (room, io) => {
  room.players.forEach((p) => {
    if (p.socketId && p.connected) {
      const pGame = room.game.players[p.id];
      const roleMeta = ROLES[pGame.role];
      io.to(p.socketId).emit('roleAssigned', {
        role: pGame.role,
        team: roleMeta.team,
        ability: roleMeta.ability,
        description: roleMeta.description,
      });
    }
  });
};

/**
 * Validates and updates player movement intent.
 * @returns {object} Validation result { success, rollback, roomChanged, newRoom }
 */
export const handlePlayerMove = (roomCode, playerId, x, y) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room || !room.game) return { success: false };

  // Validate game phase and player state
  if (room.game.phase !== 'exploration') {
    return { success: false, rollback: room.game.players[playerId]?.position };
  }

  const pGame = room.game.players[playerId];
  if (!pGame || !pGame.isAlive) {
    return { success: false };
  }

  // Validate walkable collision boundaries
  if (!isValidPosition(x, y)) {
    return { success: false, rollback: pGame.position };
  }

  // Update active sabotages and check locked doorways
  updateActiveSabotages(room);
  const targetArea = getAreaAtPosition(x, y);
  if (targetArea && targetArea.type === 'hallway') {
    const isLocked = room.game.sabotages?.lockedDoors?.[targetArea.name];
    if (isLocked && Date.now() < isLocked) {
      // Locked door blockage: rollback position!
      return { success: false, rollback: pGame.position };
    }
  }

  // Validate speed limits to prevent teleports
  const now = Date.now();
  const elapsed = Math.max(0.05, Math.min(2.0, (now - pGame.lastActive) / 1000));
  pGame.lastActive = now;

  const maxSpeed = 230; // Max speed allowed (units/sec)
  const maxDist = maxSpeed * elapsed + 40; // 40 units safety jitter buffer

  const dx = x - pGame.position.x;
  const dy = y - pGame.position.y;
  const dist = Math.hypot(dx, dy);

  if (dist > maxDist) {
    // Suspected speed hack or teleport
    return { success: false, rollback: pGame.position };
  }

  const lastRoom = pGame.currentRoom;
  pGame.position = { x, y };

  const newRoom = getRoomAtPosition(x, y, lastRoom);
  let roomChanged = false;
  if (newRoom !== lastRoom) {
    pGame.currentRoom = newRoom;
    roomChanged = true;

    // Record movement security logs and traces
    if (newRoom && !newRoom.startsWith('HALLWAY_')) {
      createEvidence(room, 'SECURITY_LOG', newRoom, playerId, newRoom, `${pGame.name || 'Player'} entered ${newRoom} Room.`);
    }
    createEvidence(room, 'MOVEMENT_TRACE', newRoom, playerId, newRoom, `${pGame.name || 'Player'} traversed to ${newRoom}.`);
  }

  // Sync state variables mapped to room.players
  const pRoom = room.players.find((p) => p.id === playerId);
  if (pRoom) {
    pRoom.position = pGame.position;
    pRoom.currentRoom = pGame.currentRoom;
  }

  return { success: true, roomChanged, newRoom };
};

/**
 * Starts the Blackout game.
 * @param {string} roomCode
 * @param {object} io
 * @param {string} hostId
 * @returns {object} The updated room
 */
export const startGame = (roomCode, io, hostId) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  // Enforce host validation
  if (room.hostId !== hostId) {
    throw new Error('Only the host can start the game');
  }

  // Enforce waiting status validation
  if (room.gameState !== 'waiting') {
    throw new Error('Game has already started.');
  }

  // Enforce minimum player count validation
  if (room.players.length < 4) {
    throw new Error('At least 4 players are required.');
  }

  // Enforce maximum player count validation
  if (room.players.length > 10) {
    throw new Error('Lobby has exceeded the maximum player limit of 10.');
  }

  // Validate that all other players are ready
  const otherPlayers = room.players.filter((p) => p.id !== room.hostId);
  const allReady = otherPlayers.every((p) => p.ready);
  if (!allReady) {
    throw new Error('Not all players are ready.');
  }

  // Clear any running timers
  clearRoomTimer(room.roomCode);

  // Reset scores and ready states
  room.players.forEach((p) => {
    p.score = 0;
    p.ready = false;
  });

  room.gameState = 'role_assignment';

  // Initialize Blackout state
  const roleAssignments = assignRoles(room.players);
  const gamePlayers = {};

  room.players.forEach((p, idx) => {
    // Stagger initial positions inside the CENTRAL HUB (x: 450-750, y: 300-550)
    const staggerX = 600 + (idx % 5) * 30 - 60;
    const staggerY = 450 + Math.floor(idx / 5) * 30 - 15;

    gamePlayers[p.id] = {
      role: roleAssignments[p.id].role,
      team: roleAssignments[p.id].team,
      isAlive: true,
      currentRoom: 'CENTRAL HUB',
      position: { x: staggerX, y: staggerY },
      lastActive: Date.now(),
    };
  });

  room.game = {
    gameStartedAt: Date.now(),
    phase: 'role_assignment',
    timer: 8,
    phaseStartedAt: Date.now(),
    phaseEndsAt: Date.now() + 8000,
    currentRound: 1,
    players: gamePlayers,
    systems: createSystems(),
    evidence: [],
    investigationCooldowns: {},
    blackoutActive: false,
    communicationsDisabled: false,
    securityDegraded: false,
    sabotages: {
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
    },
    timeline: [
      {
        timestamp: Date.now(),
        text: 'Game started. Trapped in the facility during a blackout!',
      },
    ],
    votes: {},
    votesRevealed: false,
    winner: null,
    gameOver: false,
    meetingActive: false,
    roleAssignmentComplete: false,
  };

  // Emit private roles securely to each player's socket first
  emitPrivateRoles(room, io);

  // Start Phase 1: 8 second role assignment phase
  startPhaseTimer(room.roomCode, 8, io, (r, socketIo) => {
    // When role assignment ends, transition to 5 second countdown phase
    r.gameState = 'countdown';
    r.game.phase = 'countdown';
    r.game.roleAssignmentComplete = true;
    
    // Broadcast transition
    socketIo.to(r.roomCode).emit('phaseChanged', { phase: 'COUNTDOWN' });
    broadcastRoomState(r, socketIo);

    // Start 5 second countdown display
    startPhaseTimer(r.roomCode, 5, socketIo, (r2, socketIo2) => {
      // When countdown ends, transition to exploration phase
      r2.gameState = 'exploration';
      r2.game.phase = 'exploration';

      // Record event in timeline
      r2.game.timeline.push({
        timestamp: Date.now(),
        text: 'Exploration phase commenced. Systems offline.',
      });

      socketIo2.to(r2.roomCode).emit('phaseChanged', { phase: 'EXPLORATION' });
      broadcastRoomState(r2, socketIo2);

      // Start 10Hz player position broadcast synchronizer
      startExplorationPositionSync(r2.roomCode, socketIo2);
    });
  });

  return room;
};

/**
 * Resets the active room back to lobby.
 * @param {string} roomCode
 * @returns {object} The reset room
 */
export const resetToLobby = (roomCode) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  clearRoomTimer(roomCode);

  room.gameState = 'waiting';
  room.game = null;

  room.players.forEach((p) => {
    p.ready = false;
    p.score = 0;
    delete p.role;
    delete p.team;
    delete p.position;
    delete p.currentRoom;
  });

  return room;
};
