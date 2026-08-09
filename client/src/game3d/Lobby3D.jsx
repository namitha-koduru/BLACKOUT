// game3d/Lobby3D.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import SettingsModal from '../components/SettingsModal.jsx';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ACCENT_COLORS = [
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#8b5cf6', // Purple
  '#10b981', // Green
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#a855f7', // Violet
  '#f1f5f9', // White
  '#14b8a6', // Teal
  '#f43f5e'  // Rose
];

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
        <meshStandardMaterial color="#273449" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* GLOWING EMITTER LAYER */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.05, 16]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>

      {/* HOLOGRAPH DECORATIVE RINGS */}
      <group ref={meshRef} position={[0, 1.6, 0]}>
        <mesh>
          <torusGeometry args={[0.5, 0.02, 8, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.4, 0.015, 8, 32]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
        </mesh>

        {/* HOLOGRAPH FLOATING DISPLAY BILLBOARD */}
        <Html position={[0, 0, 0]} center distanceFactor={6}>
          <div className="flex flex-col items-center justify-center p-4 bg-[#172235]/95 border-2 border-[#22d3ee]/40 rounded-xl text-center select-none backdrop-blur-md pointer-events-none shadow-lg shadow-cyan-950/40 w-32">
            <div className="text-[8px] text-[#22d3ee] font-black uppercase tracking-widest">Sector Link</div>
            <div className="text-lg font-black text-[#f59e0b] tracking-widest">{roomCode}</div>
            <div className="text-[7.5px] text-[#cbd5e1] uppercase mt-1.5">
              Roster: <span className="text-[#f8fafc] font-extrabold">{playersCount} / {maxPlayers}</span>
            </div>
            <div className="text-[7.5px] text-[#22c55e] font-extrabold mt-0.5 animate-pulse">
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
        {/* SUIT (CAPSULE) - MAIN ACCENT COLOR */}
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.22, 0.95, 8, 16]} />
          <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.2} />
        </mesh>

        {/* BACKPACK */}
        <mesh position={[0, 0.1, -0.18]} castShadow>
          <boxGeometry args={[0.22, 0.55, 0.18]} />
          <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
        </mesh>

        {/* VISOR */}
        <mesh position={[0, 0.35, 0.14]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={1.5}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>

        {/* DOWN-LIGHT UNDER CHARACTER */}
        <pointLight
          position={[0, -0.65, 0]}
          color={isReady ? '#22c55e' : '#cbd5e1'}
          intensity={1.8}
          distance={2.5}
        />
      </group>

      {/* GLOWING BASE RING INDICATION */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color={isReady ? '#22c55e' : '#475569'} side={2} />
      </mesh>

      {/* FLOAT LABELS */}
      <Html position={[0, 1.8, 0]} center distanceFactor={8}>
        <div className="flex flex-col items-center gap-1 select-none pointer-events-none whitespace-nowrap font-mono text-[9px]">
          <div className="flex items-center gap-1 bg-[#172235]/95 border border-[#22d3ee]/30 px-2 py-0.5 rounded shadow shadow-cyan-950/20">
            <span>{avatar}</span>
            <span style={{ color: accentColor }} className="font-bold">{name}</span>
            {isHost && <span title="Host">👑</span>}
            {isMe && <span className="bg-[#22d3ee]/20 px-1 rounded text-[7px] text-[#22d3ee] font-bold">You</span>}
          </div>
          <div className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase border ${
            isReady 
              ? 'bg-[#22c55e]/20 border-[#22c55e]/30 text-[#22c55e]' 
              : 'bg-slate-900/60 border-white/5 text-[#cbd5e1]'
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
    <div className="relative flex h-screen w-screen bg-[#101827] overflow-hidden font-mono select-none">
      {/* 3D CANVAS WAITING STAGE */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 5, 7], fov: 50 }} shadows>
          <ambientLight intensity={0.4} color="#a5f3fc" />
          <directionalLight position={[5, 12, 5]} intensity={0.7} color="#ffffff" castShadow />
          <pointLight position={[0, 2.5, 0]} intensity={1.5} color="#22d3ee" />
          <fogExp2 attach="fog" color="#101827" density={0.05} />

          {/* ROOM FLOOR DISK */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
            <cylinderGeometry args={[5, 5, 0.1, 32]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} metalness={0.4} />
          </mesh>

          {/* HOLOGRAPHIC GRID OVERLAY ON FLOOR */}
          <gridHelper args={[10, 16, '#334155', '#334155']} position={[0, 0.01, 0]} />

          {/* CENTRAL COMMAND holograph */}
          <CentralHologram
            roomCode={room.roomCode}
            playersCount={room.players.length}
            maxPlayers={room.settings?.maxPlayers || 10}
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
        <div className="flex justify-between items-start pointer-events-auto w-full">
          <div className="text-left bg-[#172235]/95 border border-[#22d3ee]/35 rounded-xl p-3 shadow-lg shadow-cyan-950/20 max-w-sm">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black text-[#f8fafc] uppercase tracking-widest">DEPLOYMENT SECTOR</h1>
              <span className={`text-[8px] px-2 py-0.5 rounded font-black text-slate-900 ${room.settings?.isPublic ? 'bg-[#22d3ee]' : 'bg-white/30'}`}>
                {room.settings?.isPublic ? 'PUBLIC' : 'PRIVATE'}
              </span>
            </div>
            <p className="text-[9px] text-[#cbd5e1] mt-1">Ready up and check parameters. Room link requires 4+ technicians.</p>
          </div>

          <div className="flex gap-2">
            {/* Room Code Display */}
            <div className="bg-[#172235]/95 border border-[#22d3ee]/35 rounded-xl p-1.5 px-3 flex items-center gap-2 shadow-lg">
              <span className="text-[8px] text-[#cbd5e1]">CODE:</span>
              <span className="text-xs font-black text-[#f59e0b] tracking-wider select-text">{room.roomCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-1 hover:bg-[#22304a] rounded text-[#cbd5e1]"
                title="Copy Room Code"
              >
                📋
              </button>
            </div>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettings(true)}
              className="bg-[#172235]/95 border border-[#22304a]/50 hover:bg-[#22304a] rounded-xl px-4 py-2 text-white transition-all text-xs font-bold shadow-lg"
            >
              ⚙️ Parameters
            </button>
          </div>
        </div>

        {/* Center Prompt Guidance */}
        <div className="self-center bg-[#172235]/60 text-[8px] text-[#cbd5e1] px-4 py-1 rounded-full uppercase tracking-widest border border-white/5">
          Drag window screen to rotate characters
        </div>

        {/* Bottom Panel (Controls & Chat) */}
        <div className="flex flex-col md:flex-row gap-4 w-full max-w-6xl mx-auto pointer-events-auto items-end">
          {/* Chat Interface */}
          <div className="w-full md:w-[380px] bg-[#172235]/95 border border-[#22d3ee]/35 rounded-xl flex flex-col h-56 overflow-hidden shadow-lg shadow-cyan-950/20">
            <div className="border-b border-white/5 px-3 py-2 text-[9px] text-[#22d3ee] font-extrabold uppercase tracking-widest text-left">
              SECTOR COMMS LOG
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              {room.chat.length === 0 ? (
                <div className="text-center text-[#94a3b8] text-[10px] py-12">Mainframe connection active. Broadcast log status?</div>
              ) : (
                room.chat.map((msg, i) => {
                  const isSystem = msg.senderId === 'system';
                  const isMe = msg.senderId === playerId;
                  return (
                    <div key={i} className={`text-left text-[10px] leading-relaxed ${isSystem ? 'text-amber-500 italic text-[9px]' : 'text-[#cbd5e1]'}`}>
                      {!isSystem && (
                        <span className={`font-bold mr-1 ${isMe ? 'text-[#22d3ee]' : 'text-[#cbd5e1]'}`}>
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
            <form onSubmit={handleSendChat} className="border-t border-white/5 p-1.5 flex gap-1.5 bg-black/40">
              <input
                type="text"
                maxLength={80}
                placeholder="Broadcast log message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 rounded bg-black/50 border border-white/5 px-2 py-1 text-[10px] text-white placeholder-slate-600 focus:outline-none focus:border-[#22d3ee]"
              />
              <button type="submit" className="bg-[#22d3ee] hover:bg-cyan-500 text-slate-950 font-black px-3.5 py-1 rounded text-[10px] uppercase">
                Send
              </button>
            </form>
          </div>

          {/* Right Action buttons */}
          <div className="flex-1 flex flex-col gap-2.5 w-full">
            {/* Host Controls - Gradient glow */}
            {isHost && (
              <button
                disabled={!canStartGame}
                onClick={async () => {
                  setIsStarting(true);
                  const ok = await startGame(room.roomCode, playerId);
                  if (!ok) setIsStarting(false);
                }}
                className={`w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest border transition-all ${
                  canStartGame
                    ? 'bg-gradient-to-r from-[#22d3ee] to-[#8b5cf6] border-cyan-400/40 text-white hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(34,211,238,0.35)] active:scale-95'
                    : 'bg-slate-900/50 border-white/5 text-[#94a3b8] cursor-not-allowed opacity-50'
                }`}
              >
                {isStarting ? 'INITIALIZING FACILITY...' : '[ ⚡ START BLACKOUT ]'}
              </button>
            )}

            {/* Client ready checks */}
            {!isHost && (
              <button
                onClick={handleToggleReady}
                className={`w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest border transition-all ${
                  isReady
                    ? 'bg-gradient-to-r from-[#ef4444] to-[#f59e0b] border-red-500/20 text-white hover:scale-[1.01] active:scale-95'
                    : 'bg-gradient-to-r from-[#22d3ee] to-[#3b82f6] border-cyan-400/20 text-white hover:scale-[1.01] hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] active:scale-95'
                }`}
              >
                {isReady ? 'Cancel Deployment' : 'Ready for Deployment'}
              </button>
            )}

            <div className="flex gap-2">
              {isHost && (
                <button
                  onClick={() => deleteRoom(room.roomCode, playerId)}
                  className="flex-1 py-2.5 rounded-xl border border-red-500/20 bg-red-950/20 hover:bg-red-950/40 text-[#ef4444] font-bold uppercase text-[9px] tracking-wider"
                >
                  Delete Sector
                </button>
              )}
              <button
                onClick={() => {
                  leaveRoom(room.roomCode, playerId);
                }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[#cbd5e1] font-bold uppercase text-[9px] tracking-wider"
              >
                Leave Sector
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
