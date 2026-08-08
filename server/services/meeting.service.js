// services/meeting.service.js
import { createEvidence } from './evidence.service.js';
import { rooms } from './room.service.js';
import * as blackoutService from './blackout.service.js';

const DISCUSSION_DURATION = 30000; // 30s
const VOTING_DURATION = 15000;     // 15s
const RESULT_DURATION = 5000;       // 5s
const COOLDOWN_DURATION = 20000;   // 20s

const meetingIntervals = new Map();

/**
 * Validates whether a player is permitted to trigger an emergency meeting.
 */
export const canCallMeeting = (room, playerId) => {
  if (!room || !room.game) {
    throw new Error('Game is not active.');
  }

  if (room.gameState !== 'exploration') {
    throw new Error('Meetings can only be called during exploration.');
  }

  const pGame = room.game.players[playerId];
  if (!pGame || !pGame.isAlive) {
    throw new Error('Only active, surviving players can call meetings.');
  }

  // Check round limits: 1 call per round per player
  room.game.meetingUsedByPlayer = room.game.meetingUsedByPlayer || {};
  if (room.game.meetingUsedByPlayer[playerId]) {
    throw new Error('You have already called an emergency meeting this round.');
  }

  // Check cooldown locks
  room.game.meetingCooldownEndsAt = room.game.meetingCooldownEndsAt || 0;
  if (Date.now() < room.game.meetingCooldownEndsAt) {
    const remaining = Math.ceil((room.game.meetingCooldownEndsAt - Date.now()) / 1000);
    throw new Error(`Emergency siren cooling down. Please wait ${remaining}s.`);
  }

  if (room.game.meetingActive) {
    throw new Error('A meeting is already in progress.');
  }

  return true;
};

/**
 * Starts the meeting timer loop.
 */
export const startMeetingTimer = (roomCode, io) => {
  const code = roomCode.toUpperCase().trim();

  if (meetingIntervals.has(code)) {
    clearInterval(meetingIntervals.get(code));
  }

  const intervalId = setInterval(() => {
    const r = rooms.get(code);
    if (!r || !r.game || !r.game.meetingActive || !r.game.meeting) {
      clearInterval(intervalId);
      meetingIntervals.delete(code);
      return;
    }

    const now = Date.now();
    const mt = r.game.meeting;

    if (now >= mt.phaseEndsAt) {
      if (mt.phase === 'DISCUSSION') {
        startVoting(r, io);
      } else if (mt.phase === 'VOTING') {
        resolveVotes(r, io);
      } else if (mt.phase === 'RESULT') {
        endMeeting(r, io);
        clearInterval(intervalId);
        meetingIntervals.delete(code);
      }
    } else {
      const remaining = Math.max(0, Math.ceil((mt.phaseEndsAt - now) / 1000));
      io.to(code).emit('meetingTimer', { remaining, phase: mt.phase });
    }
  }, 500);

  meetingIntervals.set(code, intervalId);
};

/**
 * Starts an emergency meeting, pausing systems and resetting coordinate parameters.
 */
export const startMeeting = (room, playerId, io) => {
  canCallMeeting(room, playerId);

  const now = Date.now();

  // Cancel any active repair sessions
  room.game.repairSessions = {};

  // Setup meeting state attributes
  room.gameState = 'meeting';
  room.game.meetingActive = true;
  room.game.meetingUsedByPlayer = room.game.meetingUsedByPlayer || {};
  room.game.meetingUsedByPlayer[playerId] = true;

  const eligibleVoters = Object.keys(room.game.players).filter(
    (pId) => room.game.players[pId].isAlive
  );

  room.game.meeting = {
    active: true,
    calledBy: playerId,
    startedAt: now,
    phase: 'DISCUSSION',
    phaseStartedAt: now,
    phaseEndsAt: now + DISCUSSION_DURATION,
    discussionDuration: DISCUSSION_DURATION,
    votingDuration: VOTING_DURATION,
    resultDuration: RESULT_DURATION,
    votes: {}, // voterId -> targetId
    eligibleVoters,
    eliminatedPlayerId: null,
    result: null,
    chat: [],
  };

  const callerName = room.players.find((p) => p.id === playerId)?.name || 'Player';
  room.game.timeline.push({
    timestamp: now,
    text: `Emergency meeting called by ${callerName}.`,
  });

  // Log system event evidence
  createEvidence(
    room,
    'SYSTEM_EVENT',
    'FACILITY',
    playerId,
    'meeting',
    `Emergency meeting called by ${callerName}. Pausing systems.`
  );

  // Increment meetings called stats
  if (room.game.statistics?.playerStats?.[playerId]) {
    room.game.statistics.playerStats[playerId].meetingsCalled += 1;
  }

  // Broadcast meeting started and run server timer ticks loop
  io.to(room.roomCode).emit('meetingStarted', { meeting: room.game.meeting });
  startMeetingTimer(room.roomCode, io);
};

/**
 * Transitions the meeting to the secret VOTING phase.
 */
export const startVoting = (room, io) => {
  if (!room || !room.game || !room.game.meeting) return;

  const now = Date.now();
  const mt = room.game.meeting;

  mt.phase = 'VOTING';
  mt.phaseStartedAt = now;
  mt.phaseEndsAt = now + mt.votingDuration;

  io.to(room.roomCode).emit('meetingPhaseChanged', {
    phase: 'VOTING',
    phaseEndsAt: mt.phaseEndsAt,
  });
};

/**
 * Submits a player vote authoritatively.
 */
export const submitVote = (room, playerId, targetPlayerId, io) => {
  if (!room || !room.game || !room.game.meeting) {
    throw new Error('No active meeting.');
  }

  const mt = room.game.meeting;
  if (mt.phase !== 'VOTING') {
    throw new Error('Voting phase is not active.');
  }

  if (mt.votes[playerId]) {
    throw new Error('Vote already cast. Cannot change votes.');
  }

  // Voter validation
  if (!mt.eligibleVoters.includes(playerId) || !room.game.players[playerId]?.isAlive) {
    throw new Error('You are not eligible to vote.');
  }

  // Target validation
  if (targetPlayerId !== 'skip') {
    if (!room.game.players[targetPlayerId] || !room.game.players[targetPlayerId].isAlive) {
      throw new Error('Target player is not active or eliminated.');
    }
    if (targetPlayerId === playerId) {
      throw new Error('Self-voting is not allowed.');
    }
  }

  // Record vote in secret maps
  mt.votes[playerId] = targetPlayerId;

  const totalVotes = Object.keys(mt.votes).length;
  const totalEligible = mt.eligibleVoters.length;

  // Immediately resolve if all eligible voters have submitted
  if (totalVotes === totalEligible) {
    resolveVotes(room, io);
  } else {
    // Broadcast generic confirmation (obfuscated)
    io.to(room.roomCode).emit('voteSubmitted', {
      voterId: playerId,
      totalVotes,
      totalEligible,
    });
  }
};

/**
 * Tallies votes, evaluates skip majorities and ties, and executes role reveal animations.
 */
export const resolveVotes = (room, io) => {
  if (!room || !room.game || !room.game.meeting) return;

  const now = Date.now();
  const mt = room.game.meeting;

  mt.phase = 'RESULT';
  mt.phaseStartedAt = now;
  mt.phaseEndsAt = now + mt.resultDuration;

  // Initialize vote counts mapping
  const tallies = { skip: 0 };
  mt.eligibleVoters.forEach((pId) => {
    tallies[pId] = 0;
  });

  // Tally secret votes
  Object.values(mt.votes).forEach((target) => {
    if (tallies[target] !== undefined) {
      tallies[target] += 1;
    }
  });

  // Calculate highest vote counts
  let highestCount = -1;
  let candidatesWithHighest = [];

  Object.keys(tallies).forEach((candidate) => {
    const count = tallies[candidate];
    if (count > highestCount) {
      highestCount = count;
      candidatesWithHighest = [candidate];
    } else if (count === highestCount) {
      candidatesWithHighest.push(candidate);
    }
  });

  let eliminatedPlayerId = null;

  // Elimination criteria: Highest candidate wins, cannot be Skip, and cannot be a Tie
  if (candidatesWithHighest.length === 1 && candidatesWithHighest[0] !== 'skip' && highestCount > 0) {
    eliminatedPlayerId = candidatesWithHighest[0];
    const pGame = room.game.players[eliminatedPlayerId];

    pGame.isAlive = false;
    pGame.position = { x: 0, y: 0 }; // Remove from active map grid coordinates

    const pRoom = room.players.find((p) => p.id === eliminatedPlayerId);
    if (pRoom) {
      pRoom.role = pGame.role; // Reveal role publicly on player roster list
    }

    room.game.timeline.push({
      timestamp: now,
      text: `${pRoom?.name || 'Player'} was eliminated by vote. Role was ${pGame.role}.`,
    });

    createEvidence(
      room,
      'SYSTEM_EVENT',
      'FACILITY',
      eliminatedPlayerId,
      'elimination',
      `${pRoom?.name || 'Player'} was eliminated by vote. Role: ${pGame.role}.`
    );
  } else {
    room.game.timeline.push({
      timestamp: now,
      text: 'Meeting ended: No one was eliminated.',
    });

    createEvidence(
      room,
      'SYSTEM_EVENT',
      'FACILITY',
      'skip',
      'elimination',
      'Emergency meeting resolved with no eliminations.'
    );
  }

  // Pack result metadata
  mt.result = {
    tallies,
    eliminatedPlayerId,
    roleReveal: eliminatedPlayerId ? room.game.players[eliminatedPlayerId].role : null,
  };

  // Record voting round history
  room.game.statistics = room.game.statistics || {};
  room.game.statistics.votingHistory = room.game.statistics.votingHistory || [];
  room.game.statistics.votingHistory.push({
    round: room.game.currentRound || 1,
    votes: { ...mt.votes },
    eliminatedPlayerId,
    roleReveal: eliminatedPlayerId ? room.game.players[eliminatedPlayerId].role : null,
  });

  // Increment correctVotes for Crew who voted for Saboteurs
  Object.keys(mt.votes).forEach((voterId) => {
    const targetId = mt.votes[voterId];
    if (targetId !== 'skip') {
      const targetGP = room.game.players[targetId];
      if (targetGP && targetGP.team === 'saboteur') {
        if (room.game.statistics?.playerStats?.[voterId]) {
          room.game.statistics.playerStats[voterId].correctVotes += 1;
        }
      }
    }
  });

  // Increment playersEliminated for Saboteurs who voted for the eliminated Crew member
  if (eliminatedPlayerId) {
    const eliminatedGP = room.game.players[eliminatedPlayerId];
    if (eliminatedGP && eliminatedGP.team === 'crew') {
      Object.keys(mt.votes).forEach((voterId) => {
        if (mt.votes[voterId] === eliminatedPlayerId) {
          const voterGP = room.game.players[voterId];
          if (voterGP && voterGP.team === 'saboteur') {
            if (room.game.statistics?.playerStats?.[voterId]) {
              room.game.statistics.playerStats[voterId].playersEliminated += 1;
            }
          }
        }
      });
    }
  }

  io.to(room.roomCode).emit('voteResults', mt.result);

  // Check win conditions (e.g. if all saboteurs eliminated or crew outnumbered)
  const { checkWinConditions } = require('./gameResult.service.js');
  checkWinConditions(room, io);
};

/**
 * Ends the meeting, resetting cooldown parameters and resuming map exploration.
 */
export const endMeeting = (room, io) => {
  if (!room || !room.game) return;

  room.gameState = 'exploration';
  room.game.meetingActive = false;
  room.game.meetingCooldownEndsAt = Date.now() + COOLDOWN_DURATION;

  // Retain meeting results object so clients can inspect counts, but mark active as false
  if (room.game.meeting) {
    room.game.meeting.active = false;
  }

  io.to(room.roomCode).emit('meetingEnded');
  blackoutService.broadcastRoomState(room, io);
};

/**
 * Appends a message to the active meeting discussion chat feed.
 */
export const addMeetingChatMessage = (room, playerId, text, io) => {
  if (!room || !room.game || !room.game.meeting) {
    throw new Error('No active meeting.');
  }

  const mt = room.game.meeting;
  if (mt.phase !== 'DISCUSSION') {
    throw new Error('Chat channel is only active during the discussion phase.');
  }

  // Elimination check
  if (!room.game.players[playerId]?.isAlive) {
    throw new Error('Eliminated players cannot transmit messages.');
  }

  if (!text || text.trim() === '') {
    throw new Error('Message text cannot be empty.');
  }

  const senderName = room.players.find((p) => p.id === playerId)?.name || 'Player';

  const msg = {
    senderId: playerId,
    senderName,
    text: text.trim(),
    timestamp: Date.now(),
  };

  mt.chat.push(msg);

  // Broadcast message to room
  io.to(room.roomCode).emit('meetingChatMessageReceived', msg);
};

/**
 * Clears room timers and active intervals.
 */
export const cleanupRoomMeetings = (roomCode) => {
  const code = roomCode.toUpperCase().trim();
  if (meetingIntervals.has(code)) {
    clearInterval(meetingIntervals.get(code));
    meetingIntervals.delete(code);
  }
};
