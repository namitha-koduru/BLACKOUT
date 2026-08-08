// services/evidence.service.js

/**
 * Creates and stores a new evidence record on the room.
 */
export const createEvidence = (
  room,
  type,
  location,
  subjectPlayerId,
  targetId,
  description,
  reliability = 'HIGH',
  hiddenSourcePlayerId = null
) => {
  if (!room || !room.game) return null;

  const now = Date.now();
  const id = `ev_${Math.random().toString(36).substring(2, 9)}`;

  // If Security is sabotaged, degrade security/movement related logs
  let finalReliability = reliability;
  if (room.game.securityDegraded && (type === 'SECURITY_LOG' || type === 'MOVEMENT_TRACE')) {
    finalReliability = Math.random() < 0.5 ? 'MEDIUM' : 'LOW';
  }

  const evidence = {
    id,
    type,
    timestamp: now,
    location,
    subjectPlayerId,
    targetId,
    description,
    reliability: finalReliability,
    corrupted: false,
    corruptedSubjectPlayerId: null,
    corruptedTargetId: null,
    corruptedDescription: null,
    createdAt: now,
    discoveredBy: [],
    hiddenSourcePlayerId,
  };

  room.game.evidence = room.game.evidence || [];
  room.game.evidence.push(evidence);

  return evidence;
};

/**
 * Allows a player to investigate a specific console terminal.
 */
export const discoverEvidence = (room, playerId, terminalId) => {
  if (!room || !room.game) {
    throw new Error('Game is not active.');
  }

  // 1. Cooldown constraints validation
  room.game.investigationCooldowns = room.game.investigationCooldowns || {};
  const nextAllowed = room.game.investigationCooldowns[playerId] || 0;
  if (Date.now() < nextAllowed) {
    const diff = Math.ceil((nextAllowed - Date.now()) / 1000);
    throw new Error(`Terminal access locked. Cooldown: ${diff}s`);
  }

  // 2. Communications hijack validation
  if (terminalId === 'communications' && room.game.communicationsDisabled) {
    throw new Error('COMMUNICATIONS OFFLINE');
  }

  // 3. Map terminalId to allowed evidence types
  let allowedTypes = [];
  if (terminalId === 'security') {
    allowedTypes = ['SECURITY_LOG', 'MOVEMENT_TRACE', 'DOOR_LOG'];
  } else if (terminalId === 'control') {
    allowedTypes = ['SYSTEM_EVENT', 'ACCESS_RECORD'];
  } else if (terminalId === 'generator') {
    allowedTypes = ['REPAIR_LOG', 'SYSTEM_EVENT'];
  } else if (terminalId === 'communications') {
    allowedTypes = ['COMMUNICATION_LOG'];
  } else if (terminalId === 'medical') {
    allowedTypes = ['REPAIR_LOG', 'SYSTEM_EVENT'];
  } else {
    throw new Error('Invalid investigation terminal.');
  }

  room.game.evidence = room.game.evidence || [];

  // Filter evidence logs matching criteria
  const undiscovered = room.game.evidence.filter((ev) => {
    // 1. Matches terminal types
    if (!allowedTypes.includes(ev.type)) return false;
    // 2. Exclude internal sabotage traces
    if (ev.type === 'SABOTAGE_TRACE') return false;
    // 3. Has NOT been discovered by this player yet
    if (ev.discoveredBy.includes(playerId)) return false;
    // 4. Specifically match generator/medical for their terminals
    if (terminalId === 'generator' && ev.location !== 'GENERATOR') return false;
    if (terminalId === 'medical' && ev.location !== 'MEDICAL') return false;
    return true;
  });

  if (undiscovered.length === 0) {
    throw new Error('No new logs found at this terminal.');
  }

  // Pick the most recent evidence
  const picked = undiscovered[undiscovered.length - 1];
  picked.discoveredBy.push(playerId);

  // Increment discovered evidence statistics
  if (room.game.statistics?.playerStats?.[playerId]) {
    room.game.statistics.playerStats[playerId].evidenceDiscovered += 1;
  }

  // Set authoritative cooldown (5s)
  room.game.investigationCooldowns[playerId] = Date.now() + 5000;

  return picked;
};

/**
 * Allows a Hacker to corrupt an evidence log.
 */
export const corruptEvidence = (room, playerId, evidenceId, falseSubjectId, falseTargetId, falseDescription) => {
  if (!room || !room.game) throw new Error('Game not active.');

  const pGame = room.game.players[playerId];
  if (!pGame || pGame.role !== 'Hacker') {
    throw new Error('UNAUTHORIZED');
  }

  const ev = room.game.evidence?.find((e) => e.id === evidenceId);
  if (!ev) throw new Error('Evidence record not found.');

  ev.corrupted = true;
  ev.corruptedSubjectPlayerId = falseSubjectId;
  ev.corruptedTargetId = falseTargetId;
  ev.corruptedDescription = falseDescription;
  ev.corruptedBy = playerId; // Log who corrupted the evidence for the post-game reveal

  // Increment evidence corrupted statistics
  if (room.game.statistics?.playerStats?.[playerId]) {
    room.game.statistics.playerStats[playerId].evidenceCorrupted += 1;
  }

  return ev;
};

/**
 * Allows a Tracker to trace a selected player's recent movement history.
 */
export const inspectTrackerTrace = (room, playerId, targetPlayerId) => {
  if (!room || !room.game) throw new Error('Game not active.');

  const pGame = room.game.players[playerId];
  if (!pGame || pGame.role !== 'Tracker') {
    throw new Error('UNAUTHORIZED');
  }

  room.game.evidence = room.game.evidence || [];

  // Filter movement traces of the target player
  const traces = room.game.evidence.filter(
    (ev) => ev.type === 'MOVEMENT_TRACE' && ev.subjectPlayerId === targetPlayerId
  );

  return traces;
};

/**
 * Returns formatted and sanitized description details for a player socket payload.
 */
export const getFormattedDescription = (evidence, isInvestigator, playersMap) => {
  const subjectName = playersMap[evidence.subjectPlayerId]?.name || 'Someone';
  const timeStr = new Date(evidence.timestamp).toLocaleTimeString();

  // Return corrupted descriptions if active and receiver is not a Saboteur
  if (evidence.corrupted) {
    const falseSubjectName = playersMap[evidence.corruptedSubjectPlayerId]?.name || 'Someone';
    return isInvestigator
      ? `${falseSubjectName} was detected in ${evidence.location} at ${timeStr} under low sensor threshold.`
      : `${falseSubjectName} entered ${evidence.location}.`;
  }

  // Normal formatting
  switch (evidence.type) {
    case 'SECURITY_LOG':
      if (isInvestigator) {
        return `${subjectName} entered ${evidence.location} room at ${timeStr} and matched biometrics.`;
      }
      return `${evidence.reliability === 'HIGH' ? subjectName : 'Someone'} entered ${evidence.location}.`;

    case 'ACCESS_RECORD':
      if (isInvestigator) {
        return `${subjectName} unlocked console terminal in ${evidence.location} at ${timeStr}.`;
      }
      return `${subjectName} accessed ${evidence.location} Terminal.`;

    case 'MOVEMENT_TRACE':
      if (isInvestigator) {
        return `${subjectName} traversed hallway linking to ${evidence.location} at ${timeStr}.`;
      }
      return `${evidence.reliability === 'HIGH' ? subjectName : 'Someone'} moved toward ${evidence.location}.`;

    case 'SYSTEM_EVENT':
      return evidence.description; // e.g. "Generator integrity decreased: 80 -> 55"

    case 'REPAIR_LOG':
      if (isInvestigator) {
        return `${subjectName} completed systems alignment console in ${evidence.location} at ${timeStr}.`;
      }
      return `${subjectName} repaired ${evidence.location} system.`;

    case 'DOOR_LOG':
      return evidence.description; // e.g. "Door lockdown triggered: HALLWAY"

    case 'COMMUNICATION_LOG':
      return evidence.description; // e.g. "Comms system channel offline"

    default:
      return evidence.description;
  }
};

/**
 * Sanitizes an evidence record for a specific player's socket payload.
 */
export const sanitizeEvidence = (evidence, playerId, role, team, playersMap) => {
  if (!evidence) return null;

  // Deep copy to prevent mutating the database
  const copy = JSON.parse(JSON.stringify(evidence));

  // Mask hidden source playerId from payloads
  delete copy.hiddenSourcePlayerId;

  // Mask corruption original fields
  delete copy.corruptedSubjectPlayerId;
  delete copy.corruptedTargetId;
  delete copy.corruptedDescription;

  const isInvestigator = role === 'Investigator';
  const isSaboteurTeam = team === 'saboteur';

  // Apply corruption presentation if active and recipient is not on Saboteur team
  if (evidence.corrupted && !isSaboteurTeam) {
    copy.subjectPlayerId = evidence.corruptedSubjectPlayerId;
    copy.targetId = evidence.corruptedTargetId;
    copy.description = getFormattedDescription(evidence, isInvestigator, playersMap);
    copy.reliability = 'LOW';
  } else {
    // Standard format description dynamically based on role (Investigator vs Crew)
    copy.description = getFormattedDescription(evidence, isInvestigator, playersMap);
  }

  return copy;
};
