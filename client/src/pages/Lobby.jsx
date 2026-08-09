// pages/Lobby.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import { useSocket } from '../hooks/useSocket.js';
import SettingsModal from '../components/SettingsModal.jsx';
import BlackoutGame from './BlackoutGame.jsx';
import WinnerScreen from './WinnerScreen.jsx';
import Lobby3D from '../game3d/Lobby3D.jsx';
import toast from 'react-hot-toast';

const Lobby = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { isConnected } = useSocket();

  const playerId = useUserStore((state) => state.playerId);
  const name = useUserStore((state) => state.name);
  const avatar = useUserStore((state) => state.avatar);

  const room = useRoomStore((state) => state.room);
  const loading = useRoomStore((state) => state.loading);
  const error = useRoomStore((state) => state.error);
  const kicked = useRoomStore((state) => state.kicked);

  const joinRoom = useRoomStore((state) => state.joinRoom);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const toggleReady = useRoomStore((state) => state.toggleReady);
  const updateSettings = useRoomStore((state) => state.updateSettings);
  const transferHost = useRoomStore((state) => state.transferHost);
  const kickPlayer = useRoomStore((state) => state.kickPlayer);
  const deleteRoom = useRoomStore((state) => state.deleteRoom);
  const sendChatMessage = useRoomStore((state) => state.sendChatMessage);
  const startGame = useRoomStore((state) => state.startGame);

  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const chatEndRef = useRef(null);

  // Redirect to Home if user setup is missing
  useEffect(() => {
    if (!name) {
      navigate('/');
    }
  }, [name, navigate]);

  // If room is closed or player is kicked, the store's room becomes null. Redirect to home.
  useEffect(() => {
    // Wait for initial connection or reconnect attempts before navigating away
    if (!room && name && !sessionStorage.getItem('blackout_active_room_code')) {
      navigate('/');
    }
  }, [room, navigate, name]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat]);

  // Connect player if not already in the room state
  useEffect(() => {
    if (isConnected && name && !room && !loading && !error && !kicked) {
      if (roomCode) {
        joinRoom(roomCode.toUpperCase(), playerId, name, avatar);
      }
    }
  }, [isConnected, name, room, roomCode, joinRoom, playerId, avatar, loading, error, kicked]);

  if (loading && !room) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs uppercase tracking-widest text-cyan-400">
        <span className="animate-pulse">Accessing facility mainframe...</span>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center font-mono">
        <div className="text-3xl text-red-500">⚠️</div>
        <h2 className="text-sm font-bold text-red-400 uppercase tracking-widest">ACCESS DENIED</h2>
        <p className="text-xs text-slate-500 max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/10"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  if (!room) return null;

  // Handle re-routing depending on gameState
  if (room.gameState !== 'waiting' && room.gameState !== 'game_over') {
    return <BlackoutGame />;
  }

  if (room.gameState === 'game_over') {
    return <WinnerScreen />;
  }

  // Render 3D waiting lobby stage
  return <Lobby3D />;
};

export default Lobby;
