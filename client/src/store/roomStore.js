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
  incomingTrade: null, // { id, senderId, senderName, senderAvatar, status }
  outgoingTrade: null, // { id, receiverId, status }
  peekResult: null,   // { targetName, boxName, value, type }

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
    socket.off('tradeRequested');
    socket.off('tradeRejected');
    socket.off('tradeCancelled');
    socket.off('gameFinished');

    socket.on('roomUpdated', (room) => {
      set({ room, error: null });
    });

    socket.on('chatMessageReceived', (message) => {
      const currentRoom = get().room;
      if (currentRoom) {
        const exists = currentRoom.chat.some((msg) => msg.timestamp === message.timestamp && msg.senderId === message.senderId);
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
      set({ room: null, kicked: true });
      sessionStorage.removeItem('mysterybox_active_room_code');
      stopBackgroundMusic();
    });

    socket.on('lobbyClosed', ({ message }) => {
      toast.error(message || 'The lobby was closed by the host.');
      set({ room: null, incomingTrade: null, outgoingTrade: null, peekResult: null });
      sessionStorage.removeItem('mysterybox_active_room_code');
      stopBackgroundMusic();
    });

    // --- GAME ENGINE EVENTS ---
    socket.on('gameStarted', (room) => {
      toast.success('Game started! Prepare yourself!');
      set({ room, incomingTrade: null, outgoingTrade: null, peekResult: null, error: null });
      playSound('ready');
      startBackgroundMusic();
    });

    socket.on('phaseChanged', ({ phase, room }) => {
      set({ room });
      // Reset trading state when moving away from TRADING phase
      if (phase !== 'TRADING') {
        set({ incomingTrade: null, outgoingTrade: null });
      }
      // Reset peeks at start of round
      if (phase === 'BOX_DISTRIBUTION') {
        set({ peekResult: null });
      }
      
      // Toast notification and audio cues for new phase
      if (phase === 'TRADING') {
        toast('Trading Phase Started! Swap your boxes!', { icon: '🤝' });
        playSound('trade_request');
      } else if (phase === 'CARD_PHASE') {
        toast('Special Card Phase! Play your abilities!', { icon: '⚡' });
        playSound('ready');
      } else if (phase === 'REVEAL') {
        toast('Revealing Box Contents...', { icon: '🎁' });
        playSound('box_open');
      } else if (phase === 'LEADERBOARD') {
        toast('Round Scores updated!', { icon: '🏆' });
        playSound('leaderboard');
      } else if (phase === 'BOX_DISTRIBUTION') {
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

    socket.on('tradeRequested', (trade) => {
      set({ incomingTrade: trade });
      playSound('trade_request');
    });

    socket.on('tradeRejected', () => {
      toast.error('Your trade request was rejected.');
      set({ outgoingTrade: null });
      playSound('trade_rejected');
    });

    socket.on('tradeCancelled', () => {
      set({ incomingTrade: null });
      playSound('trade_rejected');
    });

    socket.on('gameFinished', (room) => {
      toast.success('Game Over! Let\'s see who won!', { icon: '🎉' });
      set({ room, incomingTrade: null, outgoingTrade: null, peekResult: null });
      playSound('winner');
      stopBackgroundMusic();
    });
  },

  createRoom: (playerId, name, avatar, settings) => {
    const { socket } = get();
    if (!socket) return;

    set({ loading: true, error: null });
    socket.emit('createRoom', { playerId, name, avatar, settings }, (res) => {
      set({ loading: false });
      if (res.success) {
        set({ room: res.room, kicked: false });
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
        set({ room: res.room, kicked: false });
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
        set({ room: null, error: res.message });
        sessionStorage.removeItem('mysterybox_active_room_code');
      }
    });
  },

  leaveRoom: (roomCode, playerId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('leaveRoom', { roomCode, playerId }, (res) => {
      if (res.success) {
        set({ room: null, incomingTrade: null, outgoingTrade: null, peekResult: null });
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
        set({ room: null, incomingTrade: null, outgoingTrade: null, peekResult: null });
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
    if (!socket) return;

    socket.emit('startGame', { roomCode, hostId }, (res) => {
      if (!res.success) {
        toast.error(res.message);
      }
    });
  },

  sendTradeRequest: (roomCode, senderId, receiverId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('tradeRequest', { roomCode, senderId, receiverId }, (res) => {
      if (res.success) {
        set({ outgoingTrade: res.trade });
        toast.success('Trade request sent!');
      } else {
        toast.error(res.message);
      }
    });
  },

  acceptTrade: (roomCode, tradeId, receiverId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('tradeAccepted', { roomCode, tradeId, receiverId }, (res) => {
      if (res.success) {
        set({ incomingTrade: null });
        toast.success('Trade accepted!');
        playSound('trade_accepted');
      } else {
        toast.error(res.message);
      }
    });
  },

  rejectTrade: (roomCode, tradeId, receiverId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('tradeRejected', { roomCode, tradeId, receiverId }, (res) => {
      if (res.success) {
        set({ incomingTrade: null });
        toast('Trade request rejected.', { icon: '❌' });
        playSound('trade_rejected');
      } else {
        toast.error(res.message);
      }
    });
  },

  cancelTrade: (roomCode, playerId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('tradeCancelled', { roomCode, playerId }, (res) => {
      if (res.success) {
        set({ outgoingTrade: null });
        toast('Trade request cancelled.', { icon: '🚫' });
        playSound('trade_rejected');
      } else {
        toast.error(res.message);
      }
    });
  },

  playCard: (roomCode, playerId, targetPlayerId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('cardPlayed', { roomCode, playerId, targetPlayerId }, (res) => {
      if (res.success) {
        if (res.peekResult) {
          set({ peekResult: res.peekResult });
          toast.success(`Peek result: ${res.peekResult.targetName}'s box has ${res.peekResult.boxName}!`, { duration: 5000 });
          playSound('card_played');
        } else {
          toast.success('Special card played!');
          playSound('card_played');
        }
      } else {
        toast.error(res.message);
      }
    });
  },

  playAgain: (roomCode, hostId) => {
    const { socket } = get();
    if (!socket) return;

    socket.emit('playAgain', { roomCode, hostId }, (res) => {
      if (res.success) {
        stopBackgroundMusic();
      } else {
        toast.error(res.message);
      }
    });
  },
}));
