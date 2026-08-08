// services/system.service.js

export const SYSTEM_CONSOLES = {
  generator: { id: 'generator', name: 'Generator', room: 'GENERATOR', x: 975, y: 425 },
  communications: { id: 'communications', name: 'Communications', room: 'COMMUNICATIONS', x: 600, y: 725 },
  security: { id: 'security', name: 'Security', room: 'SECURITY', x: 600, y: 125 },
  medical: { id: 'medical', name: 'Medical', room: 'MEDICAL', x: 600, y: 910 },
  control: { id: 'control', name: 'Control System', room: 'CONTROL ROOM', x: 975, y: 125 },
};

/**
 * Returns derived status string based on system health value.
 */
export const getDerivedStatus = (health) => {
  if (health >= 70) return 'ONLINE';
  if (health >= 40) return 'DAMAGED';
  if (health > 0) return 'CRITICAL';
  return 'OFFLINE';
};

/**
 * Returns the average health of all critical systems.
 */
export const calculateRestorationProgress = (systems) => {
  if (!systems) return 100;
  const list = Object.values(systems);
  if (list.length === 0) return 100;
  const total = list.reduce((sum, s) => sum + s.health, 0);
  return Math.round(total / list.length);
};

/**
 * Initializes the five critical facility systems with default damaged health.
 */
export const createSystems = () => {
  return {
    generator: {
      id: 'generator',
      name: 'Generator',
      room: 'GENERATOR',
      health: 40,
      maxHealth: 100,
      status: 'DAMAGED',
      repairProgress: 0,
      isSabotaged: false,
      lastUpdated: Date.now(),
    },
    communications: {
      id: 'communications',
      name: 'Communications',
      room: 'COMMUNICATIONS',
      health: 50,
      maxHealth: 100,
      status: 'DAMAGED',
      repairProgress: 0,
      isSabotaged: false,
      lastUpdated: Date.now(),
    },
    security: {
      id: 'security',
      name: 'Security',
      room: 'SECURITY',
      health: 60,
      maxHealth: 100,
      status: 'DAMAGED',
      repairProgress: 0,
      isSabotaged: false,
      lastUpdated: Date.now(),
    },
    medical: {
      id: 'medical',
      name: 'Medical',
      room: 'MEDICAL',
      health: 30,
      maxHealth: 100,
      status: 'CRITICAL',
      repairProgress: 0,
      isSabotaged: false,
      lastUpdated: Date.now(),
    },
    control: {
      id: 'control',
      name: 'Control System',
      room: 'CONTROL ROOM',
      health: 50,
      maxHealth: 100,
      status: 'DAMAGED',
      repairProgress: 0,
      isSabotaged: false,
      lastUpdated: Date.now(),
    },
  };
};

/**
 * Generates an authoritative repair session for a player.
 */
export const startRepair = (room, playerId, systemId) => {
  if (!room || !room.game) {
    throw new Error('Game is not active.');
  }

  if (room.game.phase !== 'exploration') {
    throw new Error('Systems can only be repaired during active exploration.');
  }

  const pGame = room.game.players[playerId];
  if (!pGame || !pGame.isAlive) {
    throw new Error('Only active, surviving players can perform repairs.');
  }

  const system = room.game.systems[systemId];
  if (!system) {
    throw new Error('System not found.');
  }

  if (system.health >= 100) {
    throw new Error('System is already fully operational.');
  }

  // Validate Proximity: Player must be within 150 units of the system console
  const consolePos = SYSTEM_CONSOLES[systemId];
  if (!consolePos) {
    throw new Error('Invalid system console definition.');
  }

  const dist = Math.hypot(
    pGame.position.x - consolePos.x,
    pGame.position.y - consolePos.y
  );

  if (dist > 150) {
    throw new Error('Too far from system console to initiate repair.');
  }

  // Generate Session Token
  const repairSessionId = `rep_${Math.random().toString(36).substring(2, 9)}`;
  const miniGameType = Math.floor(Math.random() * 5) + 1; // 1 to 5

  if (!room.game.repairSessions) {
    room.game.repairSessions = {};
  }

  room.game.repairSessions[repairSessionId] = {
    repairSessionId,
    playerId,
    systemId,
    startedAt: Date.now(),
    expiresAt: Date.now() + 15000, // 15 second validation grace window
    miniGameType,
    completed: false,
  };

  return {
    repairSessionId,
    miniGameType,
    expiresAt: room.game.repairSessions[repairSessionId].expiresAt,
  };
};

/**
 * Authoritatively validates and processes a completed repair.
 */
export const completeRepair = (room, playerId, systemId, repairSessionId) => {
  if (!room || !room.game) {
    throw new Error('Game is not active.');
  }

  if (!room.game.repairSessions || !room.game.repairSessions[repairSessionId]) {
    throw new Error('Invalid or expired repair session.');
  }

  const session = room.game.repairSessions[repairSessionId];

  // Anti-Cheat verifications
  if (session.completed) {
    throw new Error('This repair session has already been processed.');
  }

  if (session.playerId !== playerId || session.systemId !== systemId) {
    throw new Error('Repair session ownership validation failed.');
  }

  if (Date.now() > session.expiresAt) {
    delete room.game.repairSessions[repairSessionId];
    throw new Error('Repair session timeout expired.');
  }

  const pGame = room.game.players[playerId];
  if (!pGame || !pGame.isAlive) {
    delete room.game.repairSessions[repairSessionId];
    throw new Error('Player is not active or eliminated.');
  }

  const system = room.game.systems[systemId];
  if (!system) {
    delete room.game.repairSessions[repairSessionId];
    throw new Error('System not found.');
  }

  session.completed = true;
  delete room.game.repairSessions[repairSessionId];

  // Saboteurs cannot repair normally
  if (pGame.team === 'saboteur') {
    return {
      success: false,
      message: 'Repair interface error: system authentication failed.',
      system,
    };
  }

  // Calculate speed modifiers based on roles
  let multiplier = 1.0;
  if (pGame.role === 'Engineer') {
    multiplier = 1.5;
  } else if (pGame.role === 'Operator' && systemId === 'communications') {
    multiplier = 1.5;
  }

  const baseRepair = 20;
  const reward = Math.round(baseRepair * multiplier);

  system.health = Math.min(100, system.health + reward);
  system.status = getDerivedStatus(system.health);
  system.lastUpdated = Date.now();

  // Add event to timeline log if system fully restored
  if (system.health === 100) {
    room.game.timeline.push({
      timestamp: Date.now(),
      text: `${system.name} system has been fully restored by Crew.`,
    });
  }

  return {
    success: true,
    reward,
    system,
  };
};

/**
 * Fails and cleans up an active session.
 */
export const failRepair = (room, playerId, systemId, repairSessionId) => {
  if (room && room.game && room.game.repairSessions) {
    delete room.game.repairSessions[repairSessionId];
  }
  return true;
};

/**
 * Cleans up all repair sessions belonging to a player.
 */
export const cleanupPlayerRepairSessions = (room, playerId) => {
  if (room && room.game && room.game.repairSessions) {
    Object.keys(room.game.repairSessions).forEach((sessionId) => {
      if (room.game.repairSessions[sessionId].playerId === playerId) {
        delete room.game.repairSessions[sessionId];
      }
    });
  }
};
