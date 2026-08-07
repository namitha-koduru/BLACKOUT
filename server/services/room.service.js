// services/room.service.js
import { generateRoomCode } from '../utils/roomCode.js';

// In-memory room store: roomCode -> Room object
export const rooms = new Map();

// Active disconnect timeouts to allow reconnection grace periods: playerId -> Timeout
const disconnectTimeouts = new Map();

/**
 * Generates a unique room code not currently in use.
 * @returns {string}
 */
export const generateUniqueRoomCode = () => {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    code = generateRoomCode(6);
    if (!rooms.has(code)) {
      isUnique = true;
    }
    attempts += 1;
  }

  if (!isUnique) {
    throw new Error('Failed to generate a unique room code');
  }

  return code;
};

/**
 * Creates a new room in memory.
 * @param {object} hostPlayer - Host player details { id, name, avatar, socketId }
 * @param {object} settings - Room settings { maxPlayers, totalRounds, isPublic }
 * @returns {object} The created room
 */
export const createRoom = (hostPlayer, settings = {}) => {
  const roomCode = generateUniqueRoomCode();

  const newRoom = {
    roomCode,
    hostId: hostPlayer.id,
    players: [
      {
        id: hostPlayer.id,
        socketId: hostPlayer.socketId,
        name: hostPlayer.name,
        avatar: hostPlayer.avatar,
        ready: false,
        connected: true,
        score: 0,
      },
    ],
    spectators: [],
    chat: [],
    settings: {
      maxPlayers: Math.max(2, Math.min(12, Number(settings.maxPlayers) || 12)),
      totalRounds: Math.max(1, Math.min(20, Number(settings.totalRounds) || 5)),
      isPublic: settings.isPublic !== false,
    },
    gameState: 'waiting',
    createdAt: new Date(),
  };

  rooms.set(roomCode, newRoom);
  return newRoom;
};

/**
 * Retrieves a room by its code.
 * @param {string} roomCode
 * @returns {object|null}
 */
export const getRoom = (roomCode) => {
  if (!roomCode) return null;
  return rooms.get(roomCode.toUpperCase().trim()) || null;
};

/**
 * Adds a player or spectator to a room.
 * @param {string} roomCode
 * @param {object} playerInfo - Player details { id, name, avatar, socketId }
 * @param {boolean} asSpectator - Whether to join as spectator
 * @returns {object} The updated room
 */
export const joinRoom = (roomCode, playerInfo, asSpectator = false) => {
  const code = roomCode.toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    throw new Error('Room not found');
  }

  // If the player is already in the room (e.g. duplicate join event), just return room
  const existingPlayer = room.players.find((p) => p.id === playerInfo.id);
  const existingSpectator = room.spectators.find((s) => s.id === playerInfo.id);

  if (existingPlayer) {
    existingPlayer.socketId = playerInfo.socketId;
    existingPlayer.connected = true;
    return room;
  }
  if (existingSpectator) {
    existingSpectator.socketId = playerInfo.socketId;
    existingSpectator.connected = true;
    return room;
  }

  // Check duplicate names among active players/spectators
  const isDuplicateName =
    room.players.some((p) => p.name.toLowerCase() === playerInfo.name.toLowerCase() && p.connected) ||
    room.spectators.some((s) => s.name.toLowerCase() === playerInfo.name.toLowerCase() && s.connected);

  if (isDuplicateName) {
    throw new Error('Display name is already taken in this room');
  }

  // Check if forced to spectate (game already in progress or chosen manually)
  if (room.gameState !== 'waiting' || asSpectator) {
    room.spectators.push({
      id: playerInfo.id,
      socketId: playerInfo.socketId,
      name: playerInfo.name,
      avatar: playerInfo.avatar,
      connected: true,
    });
    return room;
  }

  // Check if room is full
  if (room.players.length >= room.settings.maxPlayers) {
    throw new Error('Room is full');
  }

  // Add as player
  room.players.push({
    id: playerInfo.id,
    socketId: playerInfo.socketId,
    name: playerInfo.name,
    avatar: playerInfo.avatar,
    ready: false,
    connected: true,
    score: 0,
  });

  return room;
};

/**
 * Removes a player or spectator from a room. Handles host migration and room deletion.
 * @param {string} roomCode
 * @param {string} playerId
 * @returns {object|null} The updated room, or null if deleted
 */
export const leaveRoom = (roomCode, playerId) => {
  const code = roomCode.toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) return null;

  // Clear any disconnect timeouts
  if (disconnectTimeouts.has(playerId)) {
    clearTimeout(disconnectTimeouts.get(playerId));
    disconnectTimeouts.delete(playerId);
  }

  // Filter player lists
  room.players = room.players.filter((p) => p.id !== playerId);
  room.spectators = room.spectators.filter((s) => s.id !== playerId);

  // If room is now empty, delete it
  if (room.players.length === 0 && room.spectators.length === 0) {
    rooms.delete(code);
    return null;
  }

  // Host migration: if the host left, assign the host to the next active player
  if (room.hostId === playerId && room.players.length > 0) {
    // Prefer connected players first
    const nextConnectedPlayer = room.players.find((p) => p.connected);
    const nextHost = nextConnectedPlayer || room.players[0];
    room.hostId = nextHost.id;
  }

  return room;
};

/**
 * Kicks a player from a room (host only).
 * @param {string} roomCode
 * @param {string} hostId
 * @param {string} targetPlayerId
 * @returns {object} The updated room
 */
export const kickPlayer = (roomCode, hostId, targetPlayerId) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  if (room.hostId !== hostId) {
    throw new Error('Only the host can kick players');
  }

  if (targetPlayerId === hostId) {
    throw new Error('Host cannot kick themselves');
  }

  // Clear timeouts
  if (disconnectTimeouts.has(targetPlayerId)) {
    clearTimeout(disconnectTimeouts.get(targetPlayerId));
    disconnectTimeouts.delete(targetPlayerId);
  }

  const targetSocketId = getSocketIdByPlayerId(room, targetPlayerId);

  // Filter lists
  room.players = room.players.filter((p) => p.id !== targetPlayerId);
  room.spectators = room.spectators.filter((s) => s.id !== targetPlayerId);

  // If host leaves (shouldn't happen here as host can't kick themselves), handle it just in case
  if (room.hostId === targetPlayerId && room.players.length > 0) {
    room.hostId = room.players[0].id;
  }

  return { room, targetSocketId };
};

/**
 * Transfers host privileges to another player (host only).
 * @param {string} roomCode
 * @param {string} hostId
 * @param {string} targetPlayerId
 * @returns {object} The updated room
 */
export const transferHost = (roomCode, hostId, targetPlayerId) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  if (room.hostId !== hostId) {
    throw new Error('Only the host can transfer host ownership');
  }

  const isPlayerInRoom = room.players.some((p) => p.id === targetPlayerId);
  if (!isPlayerInRoom) {
    throw new Error('Target player must be a player in the lobby to become host');
  }

  room.hostId = targetPlayerId;
  return room;
};

/**
 * Updates player ready status.
 * @param {string} roomCode
 * @param {string} playerId
 * @param {boolean} readyStatus
 * @returns {object} The updated room
 */
export const setPlayerReady = (roomCode, playerId, readyStatus) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found in this room');

  player.ready = readyStatus;
  return room;
};

/**
 * Updates the settings of a room (host only).
 * @param {string} roomCode
 * @param {string} hostId
 * @param {object} newSettings - settings options { maxPlayers, totalRounds, isPublic }
 * @returns {object} The updated room
 */
export const updateRoomSettings = (roomCode, hostId, newSettings) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  if (room.hostId !== hostId) {
    throw new Error('Only the host can update room settings');
  }

  if (newSettings.maxPlayers !== undefined) {
    const maxVal = Math.max(2, Math.min(12, Number(newSettings.maxPlayers)));
    if (room.players.length > maxVal) {
      throw new Error('Cannot set max players lower than the current player count');
    }
    room.settings.maxPlayers = maxVal;
  }

  if (newSettings.totalRounds !== undefined) {
    room.settings.totalRounds = Math.max(1, Math.min(20, Number(newSettings.totalRounds)));
  }

  if (newSettings.isPublic !== undefined) {
    room.settings.isPublic = newSettings.isPublic === true;
  }

  return room;
};

/**
 * Adds a chat message to the room's log.
 * @param {string} roomCode
 * @param {string} playerId
 * @param {string} text
 * @returns {object} The chat message object { senderId, senderName, text, timestamp }
 */
export const addChatMessage = (roomCode, playerId, text) => {
  const room = rooms.get(roomCode.toUpperCase().trim());
  if (!room) throw new Error('Room not found');

  const player = room.players.find((p) => p.id === playerId) || room.spectators.find((s) => s.id === playerId);
  if (!player) throw new Error('Sender not found in this room');

  const message = {
    senderId: playerId,
    senderName: player.name,
    text: text.trim(),
    timestamp: Date.now(),
  };

  room.chat.push(message);
  // Keep last 100 messages
  if (room.chat.length > 100) {
    room.chat.shift();
  }

  return message;
};

/**
 * Flags a socket as disconnected and starts a cleanup grace period.
 * @param {string} socketId
 * @param {function} onGraceExpiredCallback - Callback invoked if grace period expires and player is removed
 * @returns {object|null} Room code and player details if found
 */
export const handleDisconnect = (socketId, onGraceExpiredCallback) => {
  for (const [roomCode, room] of rooms.entries()) {
    const player = room.players.find((p) => p.socketId === socketId);
    const spectator = room.spectators.find((s) => s.socketId === socketId);
    const target = player || spectator;

    if (target) {
      target.connected = false;
      target.socketId = null;

      // Start 25-second grace period for reconnection
      const playerId = target.id;
      const timeoutId = setTimeout(() => {
        disconnectTimeouts.delete(playerId);
        const updatedRoom = leaveRoom(roomCode, playerId);
        onGraceExpiredCallback(roomCode, playerId, updatedRoom);
      }, 25000);

      disconnectTimeouts.set(playerId, timeoutId);

      return { roomCode, player: target, room };
    }
  }

  return null;
};

/**
 * Re-associates a player session with a new socket connection.
 * @param {string} roomCode
 * @param {string} playerId
 * @param {string} socketId
 * @returns {object} The updated room
 */
export const reconnectPlayer = (roomCode, playerId, socketId) => {
  const code = roomCode.toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) throw new Error('Room not found');

  const player = room.players.find((p) => p.id === playerId);
  const spectator = room.spectators.find((s) => s.id === playerId);
  const target = player || spectator;

  if (!target) {
    throw new Error('Player not found in this room');
  }

  // Cancel grace period timeout
  if (disconnectTimeouts.has(playerId)) {
    clearTimeout(disconnectTimeouts.get(playerId));
    disconnectTimeouts.delete(playerId);
  }

  target.connected = true;
  target.socketId = socketId;

  return room;
};

/**
 * Helper to get the socket ID of a player.
 */
const getSocketIdByPlayerId = (room, playerId) => {
  const p = room.players.find((player) => player.id === playerId);
  const s = room.spectators.find((spec) => spec.id === playerId);
  return p ? p.socketId : (s ? s.socketId : null);
};

/**
 * Retrieves all active rooms that are configured as public.
 * @returns {array}
 */
export const getPublicRooms = () => {
  const publicRoomsList = [];
  for (const room of rooms.values()) {
    if (room.settings.isPublic && room.gameState === 'waiting') {
      publicRoomsList.push({
        roomCode: room.roomCode,
        playerCount: room.players.length,
        maxPlayers: room.settings.maxPlayers,
      });
    }
  }
  return publicRoomsList;
};
