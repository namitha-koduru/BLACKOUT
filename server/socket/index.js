// socket/index.js
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import * as roomService from '../services/room.service.js';
import * as gameService from '../services/game.service.js';

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

        const updatedRoom = gameService.startGame(roomCode, io);

        // eslint-disable-next-line no-console
        console.log(`[socket] Game started in room: ${roomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        io.to(roomCode).emit('gameStarted', updatedRoom);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] startGame error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- TRADE REQUEST ---
    socket.on('tradeRequest', ({ roomCode, senderId, receiverId }, callback) => {
      try {
        const { room, trade, receiverSocketId } = gameService.createTradeRequest(
          roomCode,
          senderId,
          receiverId,
          io
        );

        if (typeof callback === 'function') {
          callback({ success: true, trade });
        }

        // Notify receiver
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('tradeRequested', trade);
        }

        io.to(room.roomCode).emit('roomUpdated', room);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] tradeRequest error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- ACCEPT TRADE ---
    socket.on('tradeAccepted', ({ roomCode, tradeId, receiverId }, callback) => {
      try {
        const room = gameService.acceptTradeRequest(roomCode, tradeId, receiverId);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        io.to(room.roomCode).emit('roomUpdated', room);
        io.to(room.roomCode).emit('chatMessageReceived', {
          senderId: 'system',
          senderName: 'System',
          text: `A trade was accepted and boxes were swapped!`,
          timestamp: Date.now(),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] tradeAccepted error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- REJECT TRADE ---
    socket.on('tradeRejected', ({ roomCode, tradeId, receiverId }, callback) => {
      try {
        const { room, senderSocketId } = gameService.rejectTradeRequest(
          roomCode,
          tradeId,
          receiverId
        );

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        if (senderSocketId) {
          io.to(senderSocketId).emit('tradeRejected', { tradeId });
        }

        io.to(room.roomCode).emit('roomUpdated', room);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] tradeRejected error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- CANCEL TRADE ---
    socket.on('tradeCancelled', ({ roomCode, playerId }, callback) => {
      try {
        const { room, receiverSocketId } = gameService.cancelTradeRequest(roomCode, playerId);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('tradeCancelled', { playerId });
        }

        io.to(room.roomCode).emit('roomUpdated', room);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] tradeCancelled error:', err.message);
        if (typeof callback === 'function') {
          callback({ success: false, message: err.message });
        }
      }
    });

    // --- PLAY SPECIAL CARD ---
    socket.on('cardPlayed', ({ roomCode, playerId, targetPlayerId }, callback) => {
      try {
        const result = gameService.playSpecialCard(roomCode, playerId, targetPlayerId);

        if (typeof callback === 'function') {
          if (result.peekResult) {
            callback({ success: true, peekResult: result.peekResult });
          } else {
            callback({ success: true });
          }
        }

        io.to(result.room.roomCode).emit('roomUpdated', result.room);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] cardPlayed error:', err.message);
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

        const updatedRoom = gameService.resetToLobby(roomCode);

        // eslint-disable-next-line no-console
        console.log(`[socket] Game reset back to waiting lobby: ${roomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true });
        }

        io.to(roomCode).emit('roomUpdated', updatedRoom);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[socket] playAgain error:', err.message);
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

        // Notify room players
        io.to(room.roomCode).emit('roomUpdated', room);
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

        if (typeof callback === 'function') {
          callback({ success: true, room });
        }

        // Notify room players
        io.to(room.roomCode).emit('roomUpdated', room);
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

        // eslint-disable-next-line no-console
        console.log(`[socket] Player ${playerId} reconnected to room: ${room.roomCode}`);

        if (typeof callback === 'function') {
          callback({ success: true, room });
        }

        // Notify room players of reconnection
        io.to(room.roomCode).emit('roomUpdated', room);
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
          io.to(room.roomCode).emit('roomUpdated', room);
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

        // Notify remaining room players
        io.to(room.roomCode).emit('roomUpdated', room);
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

        io.to(room.roomCode).emit('roomUpdated', room);
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

        io.to(room.roomCode).emit('roomUpdated', room);
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

        io.to(room.roomCode).emit('roomUpdated', room);
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

        io.to(room.roomCode).emit('roomUpdated', room);
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

        // Remove room from map
        roomService.leaveRoom(room.roomCode, room.hostId); // this will trigger host migration or delete, but we delete anyway:
        roomService.rooms.delete(room.roomCode);

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

      roomService.handleDisconnect(socket.id, (roomCode, playerId, updatedRoom) => {
        // Callback if grace period expires and player is removed
        // eslint-disable-next-line no-console
        console.log(`[socket] Reconnect grace period expired for player: ${playerId} in room: ${roomCode}`);

        if (updatedRoom) {
          io.to(roomCode).emit('roomUpdated', updatedRoom);
          io.to(roomCode).emit('chatMessageReceived', {
            senderId: 'system',
            senderName: 'System',
            text: `Player has disconnected permanently.`,
            timestamp: Date.now(),
          });
        }
        io.emit('publicRoomsUpdated', roomService.getPublicRooms());
      });
    });
  });

  return io;
};
