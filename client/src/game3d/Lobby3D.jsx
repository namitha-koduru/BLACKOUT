// game3d/Lobby3D.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import SettingsModal from '../components/SettingsModal.jsx';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT_COLORS = ['#06b6d4', '#f59e0b', '#8b5cf6', '#10b981', '#f1f5f9', '#ec4899', '#3b82f6'];

// Central Holographic Console Model
const CentralHologram = ({ roomCode, playersCount, maxPlayers, readyCount }) => {
  const meshRef = useRef();

  useFrame((state) => {
    // Spin the hologram display slowly
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.45;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* BASE CONSOLE UNIT */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.8, 1.0, 0.8, 16]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* GLOWING EMITTER LAYER */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.05, 16]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* HOLOGRAPH DECORATIVE RINGS */}
      <group ref={meshRef} position={[0, 1.6, 0]}>
        <mesh>
          <torusGeometry args={[0.5, 0.02, 8, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.65} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.015, 8, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.45} />
        </mesh>

        {/* HOLOGRAPH FLOATING DISPLAY BILLBOARD */}
        <Html position={[0, 0, 0]} center distanceFactor={6}>
          <div className="flex flex-col items-center justify-center p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-center select-none backdrop-blur-sm pointer-events-none">
            <div className="text-[8px] text-cyan-400 font-extrabold uppercase tracking-widest">Facility Code</div>
            <div className="text-lg font-black text-amber-500 tracking-widest">{roomCode}</div>
            <div className="text-[7px] text-slate-400 uppercase mt-1">
              Personnel: {playersCount} / {maxPlayers}
            </div>
            <div className="text-[7px] text-cyan-400 font-bold mt-0.5 animate-pulse">
              Ready: {readyCount} / {playersCount}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};

// 3D Player Standee
const LobbyPlayer = ({ name, avatar, isHost, isReady, isMe, idx, count }) => {
  // Draw players in a circle around central hologram
  const angle = (idx * 2 * Math.PI) / count;
  const radius = 3.2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Face the central hologram console
  const rotY = -angle - Math.PI / 2;

  const accentColor = ACCENT_COLORS[idx % ACCENT_COLORS.length];

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* 3D CHARACTER MODEL */}
      <group position={[0, 0.7, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.22, 0.95, 8, 16]} />
          <meshStandardMaterial color={isMe ? '#1e293b' : '#334155'} metalness={0.5} roughness={0.4} />
        </mesh>

        <mesh position={[0, 0.1, -0.18]} castShadow>
          <boxGeometry args={[0.22, 0.55, 0.18]} />
          <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.3} />
        </mesh>

        <mesh position={[0, 0.35, 0.14]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.65} />
        </mesh>
      </group>

      {/* GLOWING BASE RING INDICATION */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.34, 32]} />
        <meshBasicMaterial color={isReady ? '#10b981' : '#475569'} side={2} />
      </mesh>

      {/* FLOAT LABELS */}
      <Html position={[0, 1.8, 0]} center distanceFactor={8}>
        <div className="flex flex-col items-center gap-1 select-none pointer-events-none whitespace-nowrap font-mono text-[9px]">
          <div className="flex items-center gap-1 bg-slate-950/80 border border-white/10 px-2 py-0.5 rounded shadow">
            <span>{avatar}</span>
            <span className="text-white font-bold">{name}</span>
            {isHost && <span title="Host">👑</span>}
            {isMe && <span className="bg-white/15 px-1 rounded text-[7px] text-slate-300">You</span>}
          </div>
          <div className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase border ${
            isReady 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-900/60 border-white/5 text-slate-500'
          }`}>
            {isReady ? 'Ready' : 'Not Ready'}
          </div>
        </div>
      </Html>
    </group>
  );
};

const Lobby3D = () => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);

  const toggleReady = useRoomStore((state) => state.toggleReady);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const deleteRoom = useRoomStore((state) => state.deleteRoom);
  const sendChatMessage = useRoomStore((state) => state.sendChatMessage);
  const startGame = useRoomStore((state) => state.startGame);
  const updateSettings = useRoomStore((state) => state.updateSettings);

  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat]);

  if (!room) return null;

  const isHost = room.hostId === playerId;
  const myPlayer = room.players.find((p) => p.id === playerId);
  const isReady = myPlayer?.ready === true;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    toast.success('Room code copied to clipboard!', { icon: '📋' });
  };

  const handleToggleReady = () => {
    toggleReady(room.roomCode, playerId, !isReady);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendChatMessage(room.roomCode, playerId, message.trim());
      setMessage('');
    }
  };

  const handleSettingChange = (field, value) => {
    updateSettings(room.roomCode, playerId, { [field]: value });
  };

  const readyCount = room.players.filter((p) => p.ready).length;
  const otherPlayers = room.players.filter((p) => p.id !== room.hostId);
  const canStartGame =
    otherPlayers.length > 0 &&
    otherPlayers.every((p) => p.ready) &&
    room.players.length >= 4 &&
    !isStarting;

  return (
    <div className="relative flex h-screen w-screen bg-[#030408] overflow-hidden font-mono select-none">
      {/* 3D CANVAS WAITING STAGE */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 5, 7], fov: 50 }}>
          <ambientLight intensity={0.4} color="#a5f3fc" />
          <directionalLight position={[5, 12, 5]} intensity={0.7} color="#ffffff" castShadow />
          <fogExp2 attach="fog" color="#030408" density={0.05} />

          {/* ROOM FLOOR DISK */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
            <cylinderGeometry args={[5, 5, 0.1, 32]} />
            <meshStandardMaterial color="#0c0f16" roughness={0.7} metalness={0.4} />
          </mesh>

          {/* CENTRAL COMMAND holograph */}
          <CentralHologram
            roomCode={room.roomCode}
            playersCount={room.players.length}
            maxPlayers={room.settings.maxPlayers}
            readyCount={readyCount}
          />

          {/* 3D PLAYERS PLACED IN A CIRCLE */}
          {room.players.map((p, idx) => (
            <LobbyPlayer
              key={p.id}
              name={p.name}
              avatar={p.avatar}
              isHost={p.id === room.hostId}
              isReady={p.ready}
              isMe={p.id === playerId}
              idx={idx}
              count={room.players.length}
            />
          ))}

          <OrbitControls maxPolarAngle={Math.PI / 2.2} minDistance={3.5} maxDistance={9.5} />
        </Canvas>
      </div>

      {/* OVERLAY INTERFACE PANELS */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-6 pointer-events-none">
        {/* Top Header */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="text-left bg-slate-950/75 border border-cyan-500/25 rounded-xl p-3 shadow-md max-w-sm">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-white uppercase tracking-widest">DEPLOYMENT ROOM</h1>
              <span className={`text-[8px] px-2 py-0.5 rounded font-black text-slate-900 ${room.settings.isPublic ? 'bg-cyan-400' : 'bg-white/30'}`}>
                {room.settings.isPublic ? 'PUBLIC' : 'PRIVATE'}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Configure parameters and ready up. Game requires 4+ players.</p>
          </div>

          {/* Settings Trigger */}
          <button
            onClick={() => setShowSettings(true)}
            className="bg-slate-950/75 border border-white/10 hover:bg-slate-900/75 rounded-xl p-3 text-white transition-all text-xs"
          >
            ⚙️ Room Settings
          </button>
        </div>

        {/* Center Prompt Guidance */}
        <div className="self-center bg-slate-950/45 text-[8px] text-slate-400 px-3 py-1 rounded-full uppercase tracking-wider">
          Drag screen to inspect characters
        </div>

        {/* Bottom Panel (Controls & Chat) */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-6xl mx-auto pointer-events-auto items-end">
          {/* Chat Interface */}
          <div className="w-full md:w-[360px] bg-slate-950/85 border border-cyan-500/20 rounded-xl flex flex-col h-56 overflow-hidden shadow-lg">
            <div className="border-b border-white/15 px-3 py-2 text-[9px] text-cyan-400 font-extrabold uppercase tracking-widest text-left">
              ROOM COMMS LOG
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              {room.chat.length === 0 ? (
                <div className="text-center text-slate-600 text-[10px] py-12">Lobby link active. Transmit status?</div>
              ) : (
                room.chat.map((msg, i) => {
                  const isSystem = msg.senderId === 'system';
                  const isMe = msg.senderId === playerId;
                  return (
                    <div key={i} className={`text-left text-[10px] leading-relaxed ${isSystem ? 'text-amber-500 italic text-[9px]' : 'text-slate-300'}`}>
                      {!isSystem && (
                        <span className={`font-bold mr-1 ${isMe ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {msg.senderName}:
                        </span>
                      )}
                      <span>{msg.text}</span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="border-t border-white/10 p-1.5 flex gap-1.5 bg-black/30">
              <input
                type="text"
                maxLength={80}
                placeholder="Type transmission..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 rounded bg-black/50 border border-white/10 px-2 py-1 text-[10px] text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
              <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-3 py-1 rounded text-[10px] uppercase">
                Send
              </button>
            </form>
          </div>

          {/* Right Action buttons */}
          <div className="flex-1 flex flex-col gap-2 w-full">
            {/* Host Controls */}
            {isHost && (
              <button
                disabled={!canStartGame}
                onClick={async () => {
                  setIsStarting(true);
                  const ok = await startGame(room.roomCode, playerId);
                  if (!ok) setIsStarting(false);
                }}
                className={`w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider border shadow-md transition-all ${
                  canStartGame
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-500/20 text-white hover:scale-[1.01] active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : 'bg-white/5 border-white/10 text-slate-600 cursor-not-allowed'
                }`}
              >
                {isStarting ? 'STARTING FACILITY...' : 'Start Game (All Ready)'}
              </button>
            )}

            {/* Client ready checks */}
            {!isHost && (
              <button
                onClick={handleToggleReady}
                className={`w-full py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider border shadow-md transition-all ${
                  isReady
                    ? 'bg-gradient-to-r from-red-600 to-amber-700 border-red-500/20 text-white hover:scale-[1.01] active:scale-95'
                    : 'bg-gradient-to-r from-cyan-600 to-blue-700 border-cyan-500/20 text-white hover:scale-[1.01] active:scale-95 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                }`}
              >
                {isReady ? 'Cancel Deployment' : 'Ready for Deployment'}
              </button>
            )}

            <div className="flex gap-2">
              {isHost && (
                <button
                  onClick={() => deleteRoom(room.roomCode, playerId)}
                  className="flex-1 py-2.5 rounded-xl border border-red-500/20 bg-red-950/15 hover:bg-red-950/30 text-red-400 font-bold uppercase text-[10px]"
                >
                  Delete Room
                </button>
              )}
              <button
                onClick={() => {
                  leaveRoom(room.roomCode, playerId);
                }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 font-bold uppercase text-[10px]"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      </div>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Lobby3D;
