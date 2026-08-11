// services/body.service.js
import { startMeeting } from './meeting.service.js';

const REPORT_RANGE_UNITS = 120; // Proximity required to report a body

/**
 * Creates a body at the death position.
 */
export const createBody = (room, victimId, roomId, position, killerId) => {
  if (!room || !room.game) return null;

  room.game.bodies = room.game.bodies || [];
  const body = {
    id: `body_${Math.random().toString(36).substring(2, 9)}`,
    victimId,
    roomId,
    position: { ...position },
    killerId,
    deathTime: Date.now(),
    reported: false,
  };

  room.game.bodies.push(body);
  return body;
};

/**
 * Gets all active, unreported bodies in the room.
 */
export const getBodies = (room) => {
  if (!room || !room.game || !room.game.bodies) return [];
  return room.game.bodies.filter((b) => !b.reported);
};

/**
 * Validates and processes a body report.
 */
export const reportBody = (room, reporterId, bodyId, io) => {
  if (!room || !room.game) throw new Error('Game not active');

  const reporter = room.game.players[reporterId];
  if (!reporter || !reporter.isAlive) {
    throw new Error('Reporter is not alive or not found.');
  }

  room.game.bodies = room.game.bodies || [];
  const bodyIndex = room.game.bodies.findIndex((b) => b.id === bodyId);
  if (bodyIndex === -1) {
    throw new Error('Body not found.');
  }

  const body = room.game.bodies[bodyIndex];
  if (body.reported) {
    throw new Error('Body has already been reported.');
  }

  // Range validation
  const dist = Math.hypot(
    reporter.position.x - body.position.x,
    reporter.position.y - body.position.y
  );

  if (dist > REPORT_RANGE_UNITS) {
    throw new Error('Too far from the body to report.');
  }

  // Mark body as reported
  body.reported = true;

  // Clear all bodies from the map now that a meeting is starting
  room.game.bodies = [];

  // Start meeting with body report context
  // Set temporary custom property to indicate body report
  room.game.meetingContext = {
    isBodyReport: true,
    victimId: body.victimId,
    roomName: body.roomId,
  };

  // Call startMeeting from meeting.service
  startMeeting(room, reporterId, io);

  return { success: true };
};
