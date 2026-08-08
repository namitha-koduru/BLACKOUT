// socket/index.js
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import * as roomService from '../services/room.service.js';
import * as blackoutService from '../services/blackout.service.js';
import { cleanupPlayerRepairSessions, startRepair, completeRepair, failRepair } from '../services/system.service.js';
import { useSabotage } from '../services/sabotage.service.js';
import { discoverEvidence, corruptEvidence, inspectTrackerTrace, sanitizeEvidence } from '../services/evidence.service.js';
import { startMeeting, submitVote, addMeetingChatMessage } from '../services/meeting.service.js';
import { resetGame } from '../services/gameResult.service.js';

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`[socket] client connected: ${socket.id}`);

    // --- START GAME ---
    socket.on('startGame', ({ roomCode, hostId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        if (!room) throw new Error('Room not found');
        if (room.hostId !== hostId) throw new Error('Only the host can start the game');

        const updatedRoom = blackoutService.startGame(roomCode, io, hostId);

        // eslint-disable-next-line no-console
        console.log(`[socket] Game started in room: ${roomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        // Emit gameStarted securely (sanitized per player/spectator)
        updatedRoom.players.forEach((p) => {
          if (p.socketId && p.connected) {
            const state = blackoutService.sanitizeRoomForPlayer(updatedRoom, p.id);
            io.to(p.socketId).emit('gameStarted', state);
          }
        });
        updatedRoom.spectators.forEach((s) => {
          if (s.socketId && s.connected) {
            const state = blackoutService.sanitizeRoomForPlayer(updatedRoom, s.id);
            io.to(s.socketId).emit('gameStarted', state);
          }
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] startGame error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- PLAY AGAIN ---
    socket.on('playAgain', ({ roomCode, hostId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        if (!room) throw new Error('Room not found');
        if (room.hostId !== hostId) throw new Error('Only the host can reset the lobby');

        const updatedRoom = blackoutService.resetToLobby(roomCode);

        // eslint-disable-next-line no-console
        console.log(`[socket] Game reset back to waiting lobby: ${roomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        // No secret roles exist in waiting phase, can use standard broadcast
        blackoutService.broadcastRoomState(updatedRoom, io);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] playAgain error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- PLAYER MOVEMENT ---
    socket.on('playerMove', ({ roomCode, playerId, x, y }) => {
      try {
        const result = blackoutService.handlePlayerMove(roomCode, playerId, x, y);
        if (!result.success && result.rollback) {
          socket.emit('movementError', { x: result.rollback.x, y: result.rollback.y });
        } else if (result.success && result.roomChanged) {
          io.to(roomCode.toUpperCase().trim()).emit('playerEnteredRoom', { playerId, room: result.newRoom });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] playerMove error:', err.message);
      }
    });

    socket.on('playerStopped', ({ roomCode, playerId, x, y }) => {
      try {
        const result = blackoutService.handlePlayerMove(roomCode, playerId, x, y);
        if (!result.success && result.rollback) {
          socket.emit('movementError', { x: result.rollback.x, y: result.rollback.y });
        } else {
          const roomObj = roomService.getRoom(roomCode);
          const newRoom = result.newRoom || (roomObj?.game?.players[playerId]?.currentRoom);
          io.to(roomCode.toUpperCase().trim()).emit('playerStopped', { playerId, x, y, room: newRoom });
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] playerStopped error:', err.message);
      }
    });

    // --- SYSTEM REPAIR EVENTS ---
    socket.on('startRepair', ({ roomCode, playerId, systemId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        const session = startRepair(room, playerId, systemId);

        if (typeof callback === 'function') {
          callback({ success: true, session });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('completeRepair', ({ roomCode, playerId, systemId, repairSessionId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        const result = completeRepair(room, playerId, systemId, repairSessionId, io);

        if (typeof callback === 'function') {
          callback(result);
        }

        // Broadcast updated room state showing system health increase
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('failRepair', ({ roomCode, playerId, systemId, repairSessionId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        failRepair(room, playerId, systemId, repairSessionId);

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- SABOTAGE ABILITY EVENTS ---
    socket.on('sabotageRequest', ({ roomCode, playerId, sabotageType, targetId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        const session = useSabotage(room, playerId, sabotageType, targetId, io);

        if (typeof callback === 'function') {
          callback({ success: true, session });
        }

        // Broadcast the updated state to all room sockets
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- EVIDENCE & INVESTIGATION EVENTS ---
    socket.on('investigationRequest', ({ roomCode, playerId, terminalId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        const evidence = discoverEvidence(room, playerId, terminalId);

        if (typeof callback === 'function') {
          callback({ success: true, evidence });
        }

        // Notify client and other players of updated discoveries
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('evidenceCorruptRequest', ({ roomCode, playerId, evidenceId, falseSubjectId, falseTargetId, falseDescription }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        corruptEvidence(room, playerId, evidenceId, falseSubjectId, falseTargetId, falseDescription);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        // Broadcast updated states (masked/corrupted descriptions) to everyone
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('trackerInspectRequest', ({ roomCode, playerId, targetPlayerId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        const traces = inspectTrackerTrace(room, playerId, targetPlayerId);

        // Sanitize movement trace descriptions before returning to client
        const playersMap = {};
        room.players.forEach(p => { playersMap[p.id] = p; });
        const pGame = room.game.players[playerId];

        const sanitizedTraces = traces.map(t => sanitizeEvidence(t, playerId, pGame?.role, pGame?.team, playersMap));

        if (typeof callback === 'function') {
          callback({ success: true, traces: sanitizedTraces });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- EMERGENCY MEETINGS & VOTING EVENTS ---
    socket.on('callMeeting', ({ roomCode, playerId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        startMeeting(room, playerId, io);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        // Broadcast updated room state immediately
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('submitVote', ({ roomCode, playerId, targetPlayerId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        submitVote(room, playerId, targetPlayerId, io);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        // Broadcast updated state (hides target vote, shows checkmark hasVoted indicator)
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('meetingChatMessage', ({ roomCode, playerId, text }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        addMeetingChatMessage(room, playerId, text, io);

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });
    socket.on('playAgain', ({ roomCode }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        resetGame(room);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        io.to(room.roomCode).emit('gameReset');
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('returnToLobby', ({ roomCode }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        resetGame(room);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        io.to(room.roomCode).emit('gameReset');
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });
    // --- CREATE ROOM ---
    socket.on('createRoom', ({ playerId, name, avatar, settings }, callback) => {
      try {
        if (!playerId || !name) {
          throw new Error('Player ID and name are required.');
        }

        const room = roomService.createRoom(
          { id: playerId, name, avatar, socketId: socket.id },
          settings
        );

        socket.join(room.roomCode);

        // eslint-disable-next-line no-console
        console.log(`[socket] Room created: ${room.roomCode} by host: ${name} (${playerId})`);

        if (typeof callback === 'function') {
          callback({ success: true, room });
        }

        // Notify room players securely
        blackoutService.broadcastRoomState(room, io);
        // Broadcast updated public rooms list
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] createRoom error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- JOIN ROOM ---
    socket.on('joinRoom', ({ roomCode, playerId, name, avatar, asSpectator }, callback) => {
      try {
        if (!roomCode || !playerId || !name) {
          throw new Error('Room code, player ID, and name are required.');
        }

        const room = roomService.joinRoom(
          roomCode,
          { id: playerId, name, avatar, socketId: socket.id },
          asSpectator === true
        );

        socket.join(room.roomCode);

        // eslint-disable-next-line no-console
        console.log(`[socket] Player ${name} joined room: ${room.roomCode}`);

        const sanitizedRoom = blackoutService.sanitizeRoomForPlayer(room, playerId);
        if (typeof callback === 'function') {
          callback({ success: true, room: sanitizedRoom });
        }

        // Notify room players securely
        blackoutService.broadcastRoomState(room, io);
        // Broadcast updated public rooms list
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] joinRoom error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- RECONNECT ---
    socket.on('reconnectSession', ({ roomCode, playerId }, callback) => {
      try {
        if (!roomCode || !playerId) {
          throw new Error('Room code and player ID are required to reconnect.');
        }

        const room = roomService.reconnectPlayer(roomCode, playerId, socket.id);
        socket.join(room.roomCode);

        // If game is active, emit role metadata again so client reconstructs it
        if (room.game && room.game.players[playerId]) {
          const pGame = room.game.players[playerId];
          const roleMeta = blackoutService.ROLES[pGame.role];
          if (roleMeta) {
            socket.emit('roleAssigned', {
              role: pGame.role,
              team: roleMeta.team,
              ability: roleMeta.ability,
              description: roleMeta.description
            });
          }
        }

        // eslint-disable-next-line no-console
        console.log(`[socket] Player ${playerId} reconnected to room: ${room.roomCode}`);

        const sanitizedRoom = blackoutService.sanitizeRoomForPlayer(room, playerId);
        if (typeof callback === 'function') {
          callback({ success: true, room: sanitizedRoom });
        }

        // Notify room players securely
        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] reconnect error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- LEAVE ROOM ---
    socket.on('leaveRoom', ({ roomCode, playerId }, callback) => {
      try {
        if (!roomCode || !playerId) {
          throw new Error('Room code and player ID are required.');
        }

        const room = roomService.leaveRoom(roomCode, playerId);
        socket.leave(roomCode.toUpperCase().trim());

        // eslint-disable-next-line no-console
        console.log(`[socket] Player ${playerId} left room: ${roomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        if (room) {
          blackoutService.broadcastRoomState(room, io);
        }

        // Broadcast updated public rooms list
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] leaveRoom error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- KICK PLAYER ---
    socket.on('kickPlayer', ({ roomCode, hostId, targetPlayerId }, callback) => {
      try {
        const { room, targetSocketId } = roomService.kickPlayer(roomCode, hostId, targetPlayerId);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        // Notify target player they were kicked
        if (targetSocketId) {
          io.to(targetSocketId).emit('kicked', { message: 'You have been kicked from the lobby.' });
        }

        // Notify remaining room players securely
        blackoutService.broadcastRoomState(room, io);
        // Broadcast updated public rooms list
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] kickPlayer error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- TRANSFER HOST ---
    socket.on('transferHost', ({ roomCode, hostId, targetPlayerId }, callback) => {
      try {
        const room = roomService.transferHost(roomCode, hostId, targetPlayerId);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] transferHost error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- PLAYER READY STATUS ---
    socket.on('playerReady', ({ roomCode, playerId }, callback) => {
      try {
        const room = roomService.setPlayerReady(roomCode, playerId, true);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] playerReady error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    socket.on('playerUnready', ({ roomCode, playerId }, callback) => {
      try {
        const room = roomService.setPlayerReady(roomCode, playerId, false);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        blackoutService.broadcastRoomState(room, io);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] playerUnready error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- UPDATE ROOM SETTINGS ---
    socket.on('updateSettings', ({ roomCode, hostId, settings }, callback) => {
      try {
        const room = roomService.updateRoomSettings(roomCode, hostId, settings);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        blackoutService.broadcastRoomState(room, io);
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] updateSettings error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- CHAT MESSAGE ---
    socket.on('chatMessage', ({ roomCode, playerId, text }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);

        // Block chat transmissions if communications sabotage is active
        if (room && room.game && room.game.communicationsDisabled) {
          throw new Error('COMMUNICATIONS OFFLINE');
        }

        if (!text || text.trim() === '') {
          throw new Error('Message text cannot be empty.');
        }

        const message = roomService.addChatMessage(roomCode, playerId, text);

        if (typeof callback === 'function') {
          callback({ success: true, message });
        }

        io.to(roomCode.toUpperCase().trim()).emit('chatMessageReceived', message);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] chatMessage error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- DELETE ROOM (Host manually closes it) ---
    socket.on('deleteRoom', ({ roomCode, hostId }, callback) => {
      try {
        const room = roomService.getRoom(roomCode);
        if (!room) throw new Error('Room not found');

        if (room.hostId !== hostId) {
          throw new Error('Only the host can close the room');
        }

        // Notify all sockets in room that the lobby is closing
        io.to(room.roomCode).emit('lobbyClosed', { message: 'The host has closed this lobby.' });

        // Remove room using clean up service
        roomService.deleteRoom(room.roomCode);

        // Make all sockets leave this room
        const roomSockets = io.sockets.adapter.rooms.get(room.roomCode);
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const s = io.sockets.sockets.get(socketId);
            if (s) s.leave(room.roomCode);
          }
        }

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        // Broadcast updated public rooms list
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] deleteRoom error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- GET PUBLIC ROOMS LIST ---
    socket.on('getPublicRooms', (callback) => {
      if (typeof callback === 'function') {
        callback({ success: true, rooms: roomService.getPublicRooms() });
      }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`[socket] client disconnected: ${socket.id}`);

      const disconnectResult = roomService.handleDisconnect(socket.id, (roomCode, playerId, updatedRoom) => {
        // Callback if grace period expires and player is removed
        // eslint-disable-next-line no-console
        console.log(`[socket] Reconnect grace period expired for player: ${playerId} in room: ${roomCode}`);

        if (updatedRoom) {
          blackoutService.broadcastRoomState(updatedRoom, io);
          io.to(roomCode).emit('chatMessageReceived', {
            senderId: 'system',
            senderName: 'System',
            text: `Player has disconnected permanently.`,
            timestamp: Date.now(),
          });
        }
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      });

      if (disconnectResult) {
        const { room, player } = disconnectResult;
        // Clean up repair session immediately upon disconnect
        cleanupPlayerRepairSessions(room, player.id);
        blackoutService.broadcastRoomState(room, io);
      }
    });
  });

  return io;
};
