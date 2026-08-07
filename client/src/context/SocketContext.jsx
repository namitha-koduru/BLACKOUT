// context/SocketContext.jsx
// Establishes a single Socket.IO connection for the whole app and exposes it
// via context + the useSocket() hook (see hooks/useSocket.js).
//
// Phase 4 will expand this to auto-attach the JWT for socket auth and expose
// connection-status state (connected / reconnecting / disconnected) for UI.

import { createContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);

  const socket = useMemo(() => {
    console.log('[SocketContext] Initializing socket with URL:', SOCKET_URL);
    const s = io(SOCKET_URL, {
      autoConnect: false,
      withCredentials: true,
    });
    return s;
  }, []);

  useEffect(() => {
    console.log('[SocketContext] Registering socket event listeners. Current connected status:', socket.connected);

    // Initialize roomStore listeners with this socket instance
    useRoomStore.getState().initSocketListeners(socket);

    const onConnect = () => {
      console.log('[SocketContext] Socket connected event fired! ID:', socket.id);
      setIsConnected(true);

      // Support automatic reconnection on page refresh
      const roomCode = sessionStorage.getItem('mysterybox_active_room_code');
      const playerId = useUserStore.getState().playerId;
      if (roomCode && playerId) {
        console.log('[SocketContext] Auto-reconnecting player:', playerId, 'to room:', roomCode);
        useRoomStore.getState().reconnectSession(roomCode, playerId);
      }
    };

    const onDisconnect = (reason) => {
      console.log('[SocketContext] Socket disconnected event fired. Reason:', reason);
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      console.error('[SocketContext] Socket connection error event fired:', error);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Connect socket on mount
    socket.connect();

    return () => {
      console.log('[SocketContext] Cleaning up socket event listeners and disconnecting.');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
};
