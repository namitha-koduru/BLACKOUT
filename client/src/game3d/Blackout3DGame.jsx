// game3d/Blackout3DGame.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import World from './World.jsx';
import Minimap3D from './Minimap3D.jsx';
import InteractionPrompt from './InteractionPrompt.jsx';
import RoleReveal from '../components/RoleReveal.jsx';
import GameStartCountdown from '../components/GameStartCountdown.jsx';
import MeetingScreen from '../components/MeetingScreen.jsx';
import EliminatedOverlay from '../components/EliminatedOverlay.jsx';
import SabotagePanel from '../components/SabotagePanel.jsx';
import InvestigationPanel from '../components/InvestigationPanel.jsx';
import CircuitRepair from '../components/CircuitRepair.jsx';
import FuseAlignment from '../components/FuseAlignment.jsx';
import SignalCalibration from '../components/SignalCalibration.jsx';
import PowerRouting from '../components/PowerRouting.jsx';
import SystemRestart from '../components/SystemRestart.jsx';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Walkable rectangles for boundary check (duplicates server definitions)
const WALKABLE_AREAS = [
  { name: 'CENTRAL HUB', x: 450, y: 300, w: 300, h: 250, type: 'room' },
  { name: 'SECURITY', x: 450, y: 50, w: 300, h: 150, type: 'room' },
  { name: 'LAB', x: 100, y: 300, w: 250, h: 250, type: 'room' },
  { name: 'GENERATOR', x: 850, y: 300, w: 250, h: 250, type: 'room' },
  { name: 'COMMUNICATIONS', x: 450, y: 650, w: 300, h: 150, type: 'room' },
  { name: 'MEDICAL', x: 450, y: 850, w: 300, h: 120, type: 'room' },
  { name: 'STORAGE', x: 100, y: 650, w: 250, h: 150, type: 'room' },
  { name: 'CONTROL ROOM', x: 850, y: 50, w: 250, h: 150, type: 'room' },
  { name: 'EXIT', x: 850, y: 650, w: 250, h: 150, type: 'room' },

  // Hallways
  { name: 'HALLWAY_HUB_SECURITY', x: 575, y: 200, w: 50, h: 100, type: 'hallway' },
  { name: 'HALLWAY_HUB_LAB', x: 350, y: 400, w: 100, h: 50, type: 'hallway' },
  { name: 'HALLWAY_HUB_GENERATOR', x: 750, y: 400, w: 100, h: 50, type: 'hallway' },
  { name: 'HALLWAY_HUB_COMMS', x: 575, y: 550, w: 50, h: 100, type: 'hallway' },
  { name: 'HALLWAY_COMMS_MEDICAL', x: 575, y: 800, w: 50, h: 50, type: 'hallway' },
  { name: 'HALLWAY_LAB_STORAGE', x: 200, y: 550, w: 50, h: 100, type: 'hallway' },
  { name: 'HALLWAY_SECURITY_CONTROL', x: 750, y: 100, w: 100, h: 50, type: 'hallway' },
  { name: 'HALLWAY_GENERATOR_EXIT', x: 950, y: 550, w: 50, h: 100, type: 'hallway' }
];

const SYSTEM_CONSOLES = [
  { id: 'generator', name: 'Generator', room: 'GENERATOR', x: 975, y: 425 },
  { id: 'communications', name: 'Communications', room: 'COMMUNICATIONS', x: 600, y: 725 },
  { id: 'security', name: 'Security', room: 'SECURITY', x: 600, y: 125 },
  { id: 'medical', name: 'Medical', room: 'MEDICAL', x: 600, y: 910 },
  { id: 'control', name: 'Control System', room: 'CONTROL ROOM', x: 975, y: 125 }
];

const isValidPosition = (x, y) => {
  return WALKABLE_AREAS.some(
    (area) => x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h
  );
};

const Blackout3DGame = () => {
  const playerId = useUserStore((state) => state.playerId);
  const room = useRoomStore((state) => state.room);
  const timer = useRoomStore((state) => state.timer);
  const myRoleInfo = useRoomStore((state) => state.myRoleInfo);
  const playAgain = useRoomStore((state) => state.playAgain);
  const returnToLobby = useRoomStore((state) => state.returnToLobby);
  const sendChatMessage = useRoomStore((state) => state.sendChatMessage);
  const sendPlayerMove = useRoomStore((state) => state.sendPlayerMove);
  const sendPlayerStopped = useRoomStore((state) => state.sendPlayerStopped);
  const setOnMovementError = useRoomStore((state) => state.setOnMovementError);
  const startRepair = useRoomStore((state) => state.startRepair);
  const completeRepair = useRoomStore((state) => state.completeRepair);
  const failRepair = useRoomStore((state) => state.failRepair);
  const discoverTerminalEvidence = useRoomStore((state) => state.discoverTerminalEvidence);
  const callEmergencyMeeting = useRoomStore((state) => state.callEmergencyMeeting);

  // Position States
  const [posX, setPosX] = useState(600);
  const [posY, setPosY] = useState(425);
  const [currentRoom, setCurrentRoom] = useState('CENTRAL HUB');

  // Input states
  const activeKeys = useRef({});
  const lastEmitTime = useRef(0);
  const wasMoving = useRef(false);

  // Focus and trigger state managers
  const [nearSystem, setNearSystem] = useState(null);
  const [nearTerminal, setNearTerminal] = useState(null);
  const [activeRepairSession, setActiveRepairSession] = useState(null);
  const [sabPanelOpen, setSabPanelOpen] = useState(false);
  const [investigateOpen, setInvestigateOpen] = useState(false);

  // UI settings
  const [graphicsSettings, setGraphicsSettings] = useState({
    shadows: true,
    effects: true,
    particles: true
  });

  const isHost = room.hostId === playerId;
  const currentPhase = room.game?.phase || 'countdown';
  const myPlayerAlive = room?.game?.players?.[playerId]?.isAlive === true;
  const myRoleName = myRoleInfo?.role || 'Crew';
  const myTeamName = myRoleInfo?.team || 'crew';
  const isSaboteurTeam = myTeamName.toLowerCase() === 'saboteur';

  // Handle spawn position update on game start
  useEffect(() => {
    if (room?.game?.players?.[playerId]?.position) {
      const pos = room.game.players[playerId].position;
      setPosX(pos.x);
      setPosY(pos.y);
    }
  }, [room?.game?.players, playerId]);

  // Rollback error handles
  useEffect(() => {
    setOnMovementError((rollbackX, rollbackY) => {
      setPosX(rollbackX);
      setPosY(rollbackY);
      toast.error('Mainframe speed violation: rollbacked position.');
    });
    return () => setOnMovementError(null);
  }, [setOnMovementError]);

  // Keyboard Event bindings
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in chat
      if (document.activeElement.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        activeKeys.current[key] = true;
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        activeKeys.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Proximity trigger interaction keybinds
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (document.activeElement.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      
      // E: Repair System
      if (key === 'e' && nearSystem && !activeRepairSession && currentPhase === 'exploration') {
        const res = await startRepair(room.roomCode, playerId, nearSystem.id);
        if (res.success) {
          setActiveRepairSession({
            systemId: nearSystem.id,
            systemName: nearSystem.name,
            session: res.session,
            gameType: res.gameType || 1
          });
        } else {
          toast.error(res.message || 'Terminal connection failed.');
        }
      }

      // I: Investigate Database Logs
      if (key === 'i' && nearTerminal && currentPhase === 'exploration') {
        try {
          const res = await discoverTerminalEvidence(room.roomCode, playerId, nearTerminal.id);
          if (res.success) {
            toast.success(`Log decrypted: ${res.evidence.description.substring(0, 45)}...`, { icon: '🔍' });
          } else {
            toast.error(res.message || 'Evidence database firewall block.');
          }
        } catch (err) {
          toast.error('Decryption script failed.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearSystem, nearTerminal, activeRepairSession, room, playerId, currentPhase, startRepair, discoverTerminalEvidence]);

  // Movement Frame Tick Loop
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const tick = (time) => {
      const delta = time - lastTime;
      lastTime = time;

      let dx = 0;
      let dy = 0;

      // Allow movement only during exploration, if alive, and not currently repairing
      if (currentPhase === 'exploration' && myPlayerAlive && !activeRepairSession) {
        if (activeKeys.current['w'] || activeKeys.current['arrowup']) dy -= 1;
        if (activeKeys.current['s'] || activeKeys.current['arrowdown']) dy += 1;
        if (activeKeys.current['a'] || activeKeys.current['arrowleft']) dx -= 1;
        if (activeKeys.current['d'] || activeKeys.current['arrowright']) dx += 1;
      }

      if (dx !== 0 || dy !== 0) {
        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        const speed = 0.18;
        const nextX = Math.round(posX + dx * speed * delta);
        const nextY = Math.round(posY + dy * speed * delta);

        // Lockdown corridor block check
        let isLockedDoor = false;
        const targetArea = WALKABLE_AREAS.find(
          (area) => nextX >= area.x && nextX <= area.x + area.w && nextY >= area.y && nextY <= area.y + area.h
        );
        if (targetArea && targetArea.type === 'hallway') {
          const lockVal = room?.game?.sabotages?.lockedDoors?.[targetArea.name];
          if (lockVal && Date.now() < lockVal) {
            isLockedDoor = true;
          }
        }

        if (isValidPosition(nextX, nextY) && !isLockedDoor) {
          setPosX(nextX);
          setPosY(nextY);
          wasMoving.current = true;

          // Track room changes
          if (targetArea && targetArea.type === 'room' && targetArea.name !== currentRoom) {
            setCurrentRoom(targetArea.name);
          }

          // Throttle socket sync signals to 20Hz (50ms interval)
          const now = Date.now();
          if (now - lastEmitTime.current >= 50) {
            sendPlayerMove(room.roomCode, playerId, nextX, nextY);
            lastEmitTime.current = now;
          }
        }
      } else if (wasMoving.current) {
        wasMoving.current = false;
        sendPlayerStopped(room.roomCode, playerId, posX, posY);
      }

      // Check proximity to system consoles
      let nearestSys = null;
      let nearestTerm = null;
      let minDistance = 90;

      SYSTEM_CONSOLES.forEach((sys) => {
        const dist = Math.hypot(posX - sys.x, posY - sys.y);
        if (dist < minDistance) {
          nearestTerm = { id: sys.id, name: sys.name };
          
          const sysState = room?.game?.systems?.[sys.id];
          if (sysState && sysState.health < 100) {
            nearestSys = { id: sys.id, name: sys.name, health: sysState.health, x: sys.x, y: sys.y };
          }
        }
      });

      setNearSystem(nearestSys);
      setNearTerminal(nearestTerm);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [posX, posY, currentPhase, myPlayerAlive, activeRepairSession, room, currentRoom, playerId, sendPlayerMove, sendPlayerStopped]);

  // Mini-game repair handlers
  const handleMiniGameComplete = async () => {
    if (!activeRepairSession) return;
    const ok = await completeRepair(room.roomCode, playerId, activeRepairSession.systemId, activeRepairSession.session);
    if (ok) {
      toast.success('Integrity restored!');
      setActiveRepairSession(null);
    }
  };

  const handleMiniGameFail = () => {
    if (activeRepairSession) {
      failRepair(room.roomCode, playerId, activeRepairSession.systemId);
      setActiveRepairSession(null);
    }
  };

  const handleReturnToLobby = () => {
    returnToLobby(room.roomCode, playerId);
  };

  const isBlackoutActive = room.game?.blackoutActive === true;

  // Map mini-game type parameters
  const renderMiniGame = () => {
    if (!activeRepairSession) return null;
    const gType = activeRepairSession.gameType;

    switch (gType) {
      case 1:
        return <CircuitRepair onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 2:
        return <FuseAlignment onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 3:
        return <SignalCalibration onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 4:
        return <PowerRouting onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 5:
        return <SystemRestart onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      default:
        return <CircuitRepair onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
    }
  };

  return (
    <div className="relative h-screen w-screen bg-[#030408] overflow-hidden select-none font-mono">
      
      {/* 3D CANVAS PORTAL */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ fov: 45, position: [0, 5, 8] }} shadows>
          <World
            posX={posX}
            posY={posY}
            activeRepairSession={activeRepairSession}
            nearSystem={nearSystem}
            nearTerminal={nearTerminal}
            settings={graphicsSettings}
          />
        </Canvas>
      </div>

      {/* SCREEN SCANLINES DECORATOR */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] z-20 opacity-30"></div>

      {/* POWER BLACKOUT DARK OVERLAY */}
      {isBlackoutActive && (
        <div className="absolute inset-0 bg-red-950/20 pointer-events-none mix-blend-color-burn z-10 transition-all duration-1000 animate-pulse" />
      )}

      {/* TRANSPARENT HUD OVERLAY PANELS */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        
        {/* Top Panel: Header HUD */}
        <div className="flex justify-between items-start w-full">
          {/* Header left */}
          <div className="bg-slate-950/85 border border-cyan-500/25 p-3 rounded-xl text-left pointer-events-auto flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isBlackoutActive ? 'bg-red-500 animate-ping' : 'bg-cyan-500'}`} />
            <div>
              <div className="text-[10px] text-white font-black tracking-widest uppercase">FACILITY SYSTEM</div>
              <div className="text-[8px] text-slate-500">SECTOR: {currentRoom}</div>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <div className="text-[7px] text-slate-500 uppercase">Phase</div>
              <div className="text-[9px] text-cyan-400 font-extrabold">{currentPhase.replace('_', ' ')}</div>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <div className="text-[7px] text-slate-500 uppercase">Time limit</div>
              <div className="text-[10px] font-black text-amber-500">{String(timer).padStart(2, '0')}s</div>
            </div>
          </div>

          {/* Roster right */}
          <div className="bg-slate-950/85 border border-white/5 p-3 rounded-xl pointer-events-auto max-h-[140px] overflow-y-auto flex flex-col gap-1 w-44">
            <div className="text-[8px] text-slate-500 border-b border-white/5 pb-1 mb-1 font-black uppercase text-left">
              Personnel Link ({room.players.length})
            </div>
            {room.players.map((p) => {
              const pState = room.game?.players?.[p.id];
              const isDisconnected = !p.connected;
              const isMe = p.id === playerId;
              
              return (
                <div key={p.id} className="flex justify-between items-center text-[8px] leading-relaxed">
                  <span className="text-slate-300 truncate max-w-[70px] text-left">
                    {p.avatar} {p.name} {isMe && '(You)'}
                  </span>
                  <span>
                    {isDisconnected ? (
                      <span className="text-red-500 font-bold uppercase text-[7px] animate-pulse">Offline</span>
                    ) : pState?.isAlive === false ? (
                      <span className="text-slate-600 uppercase text-[7px]">☠ Deceased</span>
                    ) : (
                      <span className="text-emerald-500 font-bold text-[7px]">Online</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Proximity Action Prompts */}
        {currentPhase === 'exploration' && (
          <div className="self-center flex flex-col items-center gap-1.5 pointer-events-auto">
            {nearSystem && (
              <InteractionPrompt label={nearSystem.name} actionName="REPAIR" />
            )}
            {nearTerminal && !nearSystem && (
              <InteractionPrompt label={nearTerminal.name} actionName="QUERY LOG" />
            )}
          </div>
        )}

        {/* Bottom Section */}
        <div className="flex justify-between items-end w-full">
          {/* Left panel: Minimap and system health */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="bg-slate-950/85 border border-white/5 p-3 rounded-xl w-48 text-left">
              <div className="text-[8px] text-slate-500 border-b border-white/5 pb-1 mb-1 font-black uppercase">
                Systems Diagnostics
              </div>
              {Object.keys(room.game.systems).map((sId) => {
                const sys = room.game.systems[sId];
                return (
                  <div key={sId} className="flex justify-between items-center text-[8px] mt-1 leading-relaxed">
                    <span className="text-slate-400 uppercase">{sId}</span>
                    <span className={sys.health === 0 ? 'text-red-500 font-black animate-pulse' : sys.health <= 40 ? 'text-amber-500 font-bold' : 'text-cyan-400'}>
                      {sys.health}%
                    </span>
                  </div>
                );
              })}
            </div>
            <Minimap3D posX={posX} posY={posY} />
          </div>

          {/* Center chat channel (standard feed) */}
          <div className="bg-slate-950/85 border border-white/5 rounded-xl w-[280px] h-32 flex flex-col overflow-hidden pointer-events-auto self-end shadow-md">
            <div className="border-b border-white/5 px-2 py-1.5 text-[8px] text-slate-500 text-left font-black uppercase tracking-widest">
              Broadcast Signal
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 max-h-20">
              {room.chat.slice(-8).map((msg, i) => {
                const isSystem = msg.senderId === 'system';
                const isMe = msg.senderId === playerId;
                return (
                  <div key={i} className="text-left text-[9px] leading-snug">
                    {!isSystem && (
                      <span className={`font-bold mr-1 ${isMe ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {msg.senderName}:
                      </span>
                    )}
                    <span className={isSystem ? 'text-amber-500 italic text-[8px]' : 'text-slate-200'}>
                      {msg.text}
                    </span>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = e.target.elements.chatInput.value;
                if (text?.trim()) {
                  sendChatMessage(room.roomCode, playerId, text.trim());
                  e.target.reset();
                }
              }}
              className="border-t border-white/5 p-1 flex bg-black/40"
            >
              <input
                name="chatInput"
                type="text"
                disabled={room.game.communicationsDisabled}
                placeholder={room.game.communicationsDisabled ? '📡 NET LOCK' : 'Broadcast...'}
                className="flex-1 bg-black/50 border border-white/5 px-2 py-1 text-[9px] text-white focus:outline-none focus:border-cyan-500 disabled:text-red-500/40"
              />
              <button type="submit" disabled={room.game.communicationsDisabled} className="bg-cyan-600 hover:bg-cyan-700 px-2 py-1 rounded text-[9px] font-bold text-white disabled:bg-slate-900 disabled:text-slate-600">
                Send
              </button>
            </form>
          </div>

          {/* Right Panel: Abilities, Meetings, settings */}
          <div className="flex flex-col gap-2 w-44 pointer-events-auto">
            {currentPhase === 'exploration' && myPlayerAlive && (
              <>
                {/* EMERGENCY MEETING BUTTON */}
                <button
                  onClick={() => {
                    callEmergencyMeeting(room.roomCode, playerId);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-700 border border-cyan-500/20 text-white hover:scale-[1.01] rounded-xl text-[9px] font-black uppercase tracking-wider shadow"
                >
                  📢 Call Meeting
                </button>

                {/* SABOTAGE BUTTON TRIGGER (For Saboteurs) */}
                {isSaboteurTeam && (
                  <button
                    onClick={() => setSabPanelOpen(!sabPanelOpen)}
                    className={`w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border shadow transition-all ${
                      sabPanelOpen
                        ? 'bg-red-500 text-slate-950 border-red-400'
                        : 'bg-red-950/20 border-red-500/20 text-red-400'
                    }`}
                  >
                    ⚠️ Sabotage menu
                  </button>
                )}

                {/* INVESTIGATE MODAL BTN */}
                <button
                  onClick={() => setInvestigateOpen(true)}
                  className="w-full py-2 bg-slate-950/85 border border-white/10 text-slate-300 hover:bg-slate-900/85 rounded-xl text-[9px] font-black uppercase tracking-wider shadow"
                >
                  🔍 Query Logs
                </button>
              </>
            )}

            {/* Graphics controls */}
            <div className="bg-slate-950/85 border border-white/5 p-2 rounded-xl text-left text-[8px] flex flex-col gap-1.5">
              <div className="font-black text-slate-500 uppercase border-b border-white/5 pb-1 mb-1">
                Graphics Quality
              </div>
              <div className="flex justify-between">
                <span>Shadows</span>
                <button
                  onClick={() => setGraphicsSettings((prev) => ({ ...prev, shadows: !prev.shadows }))}
                  className={`px-1.5 rounded font-bold ${graphicsSettings.shadows ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}
                >
                  {graphicsSettings.shadows ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex justify-between">
                <span>Effects</span>
                <button
                  onClick={() => setGraphicsSettings((prev) => ({ ...prev, effects: !prev.effects }))}
                  className={`px-1.5 rounded font-bold ${graphicsSettings.effects ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}
                >
                  {graphicsSettings.effects ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Return to Lobby host button */}
            {isHost && (
              <button
                onClick={handleReturnToLobby}
                className="w-full py-2.5 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-950/40 rounded-xl text-[9px] font-bold uppercase tracking-wide"
              >
                Return to Lobby
              </button>
            )}
          </div>
        </div>

      </div>

      {/* DECISION & OVERLAYS INTERACTION MODALS */}
      <AnimatePresence>
        {/* Sabotage panel modal overlay */}
        {sabPanelOpen && isSaboteurTeam && currentPhase === 'exploration' && (
          <div className="absolute top-20 right-6 z-30">
            <SabotagePanel onClose={() => setSabPanelOpen(false)} />
          </div>
        )}

        {/* Investigation database logs overlay */}
        {investigateOpen && (
          <InvestigationPanel onClose={() => setInvestigateOpen(false)} />
        )}

        {/* Holographic repair panel mini-game */}
        {activeRepairSession && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-slate-950 border border-cyan-500/30 p-5 rounded-2xl max-w-lg w-full flex flex-col items-center">
              <h3 className="text-sm font-black text-cyan-400 mb-4 uppercase tracking-widest">
                Restoring system: {activeRepairSession.systemName}
              </h3>
              {renderMiniGame()}
            </div>
          </div>
        )}

        {/* Role assignments reveals */}
        {currentPhase === 'role_assignment' && (
          <div className="absolute inset-0 bg-slate-950 z-50 flex items-center justify-center">
            <RoleReveal timer={timer} roleInfo={myRoleInfo} />
          </div>
        )}

        {/* Synchronized Match Countdown overlay */}
        {currentPhase === 'countdown' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <GameStartCountdown timer={timer} />
          </div>
        )}

        {/* Emergency Meeting discussion & voting phases */}
        {room.gameState === 'meeting' && (
          <div className="absolute inset-0 bg-[#030408]/90 backdrop-blur-md z-40">
            <MeetingScreen />
          </div>
        )}

        {/* Eliminated status display for ghost spectators */}
        {!myPlayerAlive && room.gameState !== 'meeting' && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
            <EliminatedOverlay role={myRoleName} />
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Blackout3DGame;
