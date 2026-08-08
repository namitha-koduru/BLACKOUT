// store/roomStore.js
import { create } from 'zustand';
import toast from 'react-hot-toast';
import { playSound, startBackgroundMusic, stopBackgroundMusic } from '../utils/sound.js';

export const useRoomStore = create((set, get) => ({
  socket: null,
  room: null,
  publicRooms: [],
  error: null,
  loading: false,
  kicked: false,

  // Game specific state
  timer: 0,
  myRoleInfo: null, // { role, team, ability, description }
  playerPositions: {}, // playerId -> { x, y, room, connected }
  onMovementError: null,

  setOnMovementError: (cb) => set({ onMovementError: cb }),

  // Bind the socket instance and register event listeners
  initSocketListeners: (socket) => {
    set({ socket });

    socket.off('roomUpdated');
    socket.off('chatMessageReceived');
    socket.off('publicRoomsUpdated');
    socket.off('kicked');
    socket.off('lobbyClosed');

    // Game socket events
    socket.off('gameStarted');
    socket.off('phaseChanged');
    socket.off('timerUpdated');
    socket.off('gameFinished');
    socket.off('roleAssigned');

    // Movement socket events
    socket.off('playerPositions');
    socket.off('playerStopped');
    socket.off('playerEnteredRoom');
    socket.off('movementError');

    socket.on('roomUpdated', (room) => {
      set({ room, error: null });
    });

    socket.on('chatMessageReceived', (message) => {
      const currentRoom = get().room;
      if (currentRoom) {
        const exists = currentRoom.chat.some(
          (msg) => msg.timestamp === message.timestamp && msg.senderId === message.senderId
        );
        if (!exists) {
          const updatedChat = [...currentRoom.chat, message];
          set({
            room: {
              ...currentRoom,
              chat: updatedChat,
            },
          });
        }
      }
    });

    socket.on('publicRoomsUpdated', (publicRooms) => {
      set({ publicRooms });
    });

    socket.on('kicked', ({ message }) => {
      toast.error(message || 'You have been kicked from the lobby.');
      set({ room: null, kicked: true, myRoleInfo: null, playerPositions: {} });
      sessionStorage.removeItem('mysterybox_active_room_code');
      stopBackgroundMusic();
    });

    socket.on('lobbyClosed', ({ message }) => {
      toast.error(message || 'The lobby was closed by the host.');
      set({ room: null, myRoleInfo: null, playerPositions: {} });
      sessionStorage.removeItem('mysterybox_active_room_code');
      stopBackgroundMusic();
    });

    // --- GAME ENGINE EVENTS ---
    socket.on('gameStarted', (room) => {
      toast.success('Game started! Prepare yourself!');
      set({ room, error: null, playerPositions: {} });
      playSound('ready');
      startBackgroundMusic();
    });

    socket.on('roleAssigned', (roleInfo) => {
      set({ myRoleInfo: roleInfo });
    });

    socket.on('phaseChanged', ({ phase, room }) => {
      if (room) {
        set({ room });
      }

      // Audio cues and toasts for phase changes
      if (phase === 'ROLE_ASSIGNMENT') {
        toast('Your secret role is assigned!', { icon: '🔍' });
        playSound('ready');
      } else if (phase === 'COUNTDOWN') {
        toast('Prepare to explore the facility!', { icon: '🚨' });
        playSound('ready');
      } else if (phase === 'EXPLORATION') {
        toast('Exploration started! Complete your tasks!', { icon: '⚡' });
        playSound('ready');
      }
    });

    socket.on('timerUpdated', ({ timer }) => {
      set({ timer });
      if (timer > 0 && timer <= 5) {
        playSound('countdown_tick');
      } else if (timer === 0) {
        playSound('countdown_start');
      }
    });

    socket.on('gameFinished', (room) => {
      toast.success('Game Over! Let\'s see who won!', { icon: '🎉' });
      set({ room, playerPositions: {} });
      playSound('winner');
      stopBackgroundMusic();
    });

    // --- MOVEMENT SYNCHRONIZERS ---
    socket.on('playerPositions', ({ positions }) => {
      set({ playerPositions: positions });
    });

    socket.on('playerStopped', ({ playerId, x, y, room }) => {
      set((state) => ({
        playerPositions: {
          ...state.playerPositions,
          [playerId]: {
            ...state.playerPositions[playerId],
            x,
            y,
            room,
          },
        },
      }));
    });

    socket.on('playerEnteredRoom', ({ playerId, room }) => {
      // Optional logging for transitions
      console.log(`[Multiplayer] Player ${playerId} entered room: ${room}`);
    });

    socket.on('movementError', ({ x, y }) => {
      const cb = get().onMovementError;
      if (cb) cb(x, y);
    });
  },

  createRoom: (playerId, name, avatar, settings) => {
    const { socket } = get();
    if (!socket) return;

    set({ loading: true, error: null });
    socket.emit('createRoom', { playerId, name, avatar, settings }, (res) => {
      set({ loading: false });
      if (res.success) {
        set({ room: res.room, kicked: false, myRoleInfo: null, playerPositions: {} });
        sessionStorage.setItem('mysterybox_active_room_code', res.room.roomCode);
      } else {
        set({ error: res.message });
        toast.error(res.message);
      }
    });
  },

  joinRoom: (roomCode, playerId, name, avatar, asSpectator = false) => {
    const { socket } = get();
    if (!socket) return;

    set({ loading: true, error: null });
    socket.emit('joinRoom', { roomCode, playerId, name, avatar, asSpectator }, (res) => {
      set({ loading: false });
      if (res.success) {
        set({ room: res.room, kicked: false, myRoleInfo: null, playerPositions: {} });
        sessionStorage.setItem('mysterybox_active_room_code', res.room.roomCode);
      } else {
        set({ error: res.message });
        toast.error(res.message);
      }
    });
  },

  reconnectSession: (roomCode, playerId) => {
    const { socket } = get();
    if (!socket) return;

    set({ loading: true, error: null });
    socket.emit('reconnectSession', { roomCode, playerId }, (res) => {
      set({ loading: false });
      if (res.success) {
        set({ room: res.room, kicked: false });
        sessionStorage.setItem('mysterybox_active_room_code', res.room.roomCode);
        toast.success('Reconnected to lobby!');
      } else {
        set({ room: null, error: res.message, myRoleInfo: null, playerPositions: {} });
        sessionStorage.removeItem('mysterybox_active_room_code');
      }
    });
  },

  leaveRoom: (roomCode, playerId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('leaveRoom', { roomCode, playerId }, (res) => {
      if (res.success) {
        set({ room: null, myRoleInfo: null, playerPositions: {} });
        sessionStorage.removeItem('mysterybox_active_room_code');
      }
    });
  },

  kickPlayer: (roomCode, hostId, targetPlayerId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('kickPlayer', { roomCode, hostId, targetPlayerId }, (res) => {
      if (!res.success) {
        toast.error(res.message);
      } else {
        toast.success('Player kicked.');
      }
    });
  },

  transferHost: (roomCode, hostId, targetPlayerId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('transferHost', { roomCode, hostId, targetPlayerId }, (res) => {
      if (!res.success) {
        toast.error(res.message);
      } else {
        toast.success('Lobby host transferred.');
      }
    });
  },

  toggleReady: (roomCode, playerId, isReady) => {
    const { socket } = get();
    if (!socket) return;

    const event = isReady ? 'playerReady' : 'playerUnready';
    socket.emit(event, { roomCode, playerId }, (res) => {
      if (!res.success) {
        toast.error(res.message);
      }
    });
  },

  updateSettings: (roomCode, hostId, newSettings) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('updateSettings', { roomCode, hostId, settings: newSettings }, (res) => {
      if (!res.success) {
        toast.error(res.message);
      }
    });
  },

  sendChatMessage: (roomCode, playerId, text) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('chatMessage', { roomCode, playerId, text }, (res) => {
      if (!res.success) {
        toast.error(res.message);
      }
    });
  },

  deleteRoom: (roomCode, hostId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('deleteRoom', { roomCode, hostId }, (res) => {
      if (res.success) {
        set({ room: null, myRoleInfo: null, playerPositions: {} });
        sessionStorage.removeItem('mysterybox_active_room_code');
        toast.success('Room closed.');
      } else {
        toast.error(res.message);
      }
    });
  },

  fetchPublicRooms: () => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('getPublicRooms', (res) => {
      if (res.success) {
        set({ publicRooms: res.rooms });
      }
    });
  },

  // --- GAME SPECIFIC ACTIONS ---
  startGame: (roomCode, hostId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve(false);

    return new Promise((resolve) => {
      socket.emit('startGame', { roomCode, hostId }, (res) => {
        if (!res.success) {
          toast.error(res.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  },

  playAgain: (roomCode, hostId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('playAgain', { roomCode, hostId }, (res) => {
      if (res.success) {
        set({ myRoleInfo: null, playerPositions: {} });
        stopBackgroundMusic();
      } else {
        toast.error(res.message);
      }
    });
  },

  // --- MOVEMENT EMITTERS ---
  sendPlayerMove: (roomCode, playerId, x, y) => {
    const { socket } = get();
    if (socket) {
      socket.emit('playerMove', { roomCode, playerId, x, y });
    }
  },

  sendPlayerStopped: (roomCode, playerId, x, y) => {
    const { socket } = get();
    if (socket) {
      socket.emit('playerStopped', { roomCode, playerId, x, y });
    }
  },

  // --- SYSTEM REPAIR ACTIONS ---
  startRepair: (roomCode, playerId, systemId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, message: 'No socket connection' });

    return new Promise((resolve) => {
      socket.emit('startRepair', { roomCode, playerId, systemId }, (res) => {
        resolve(res);
      });
    });
  },

  completeRepair: (roomCode, playerId, systemId, repairSessionId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, message: 'No socket connection' });

    return new Promise((resolve) => {
      socket.emit('completeRepair', { roomCode, playerId, systemId, repairSessionId }, (res) => {
        resolve(res);
      });
    });
  },

  failRepair: (roomCode, playerId, systemId, repairSessionId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, message: 'No socket connection' });

    return new Promise((resolve) => {
      socket.emit('failRepair', { roomCode, playerId, systemId, repairSessionId }, (res) => {
        resolve(res);
      });
    });
  },

  // --- SABOTAGE ACTIONS ---
  sendSabotageRequest: (roomCode, playerId, sabotageType, targetId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, message: 'No socket connection' });

    return new Promise((resolve) => {
      socket.emit('sabotageRequest', { roomCode, playerId, sabotageType, targetId }, (res) => {
        resolve(res);
      });
    });
  },

  // --- EVIDENCE & INVESTIGATION ACTIONS ---
  discoverTerminalEvidence: (roomCode, playerId, terminalId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, message: 'No socket connection' });

    return new Promise((resolve) => {
      socket.emit('investigationRequest', { roomCode, playerId, terminalId }, (res) => {
        resolve(res);
      });
    });
  },

  corruptEvidenceRecord: (roomCode, playerId, evidenceId, falseSubjectId, falseTargetId, falseDescription) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, message: 'No socket connection' });

    return new Promise((resolve) => {
      socket.emit('evidenceCorruptRequest', { roomCode, playerId, evidenceId, falseSubjectId, falseTargetId, falseDescription }, (res) => {
        resolve(res);
      });
    });
  },

  requestTrackerTrace: (roomCode, playerId, targetPlayerId) => {
    const { socket } = get();
    if (!socket) return Promise.resolve({ success: false, message: 'No socket connection' });

    return new Promise((resolve) => {
      socket.emit('trackerInspectRequest', { roomCode, playerId, targetPlayerId }, (res) => {
        resolve(res);
      });
    });
  },
}));
