// components/FacilityMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import Room from './Room.jsx';
import Doorway from './Doorway.jsx';
import Player from './Player.jsx';
import RepairModal from './RepairModal.jsx';
import toast from 'react-hot-toast';

// 2D Facility Layout Walkable Rectangles
const WALKABLE_AREAS = [
  // Rooms
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

// Interactive System Console Coordinates (Investigate & Repair)
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

const FacilityMap = ({ onRoomChange }) => {
  const mapRef = useRef(null);
  const playerId = useUserStore((state) => state.playerId);
  const room = useRoomStore((state) => state.room);
  const playerPositions = useRoomStore((state) => state.playerPositions);
  const sendPlayerMove = useRoomStore((state) => state.sendPlayerMove);
  const sendPlayerStopped = useRoomStore((state) => state.sendPlayerStopped);
  const setOnMovementError = useRoomStore((state) => state.setOnMovementError);
  const startRepair = useRoomStore((state) => state.startRepair);
  const discoverTerminalEvidence = useRoomStore((state) => state.discoverTerminalEvidence);

  // Fallback initial position
  const myInitialPos = room?.game?.players[playerId]?.position || { x: 600, y: 450 };

  const [posX, setPosX] = useState(myInitialPos.x);
  const [posY, setPosY] = useState(myInitialPos.y);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600, scale: 0.5 });

  // Interaction proximities
  const [nearSystem, setNearSystem] = useState(null);
  const [nearTerminal, setNearTerminal] = useState(null);
  const [activeRepairSession, setActiveRepairSession] = useState(null);

  const activeKeys = useRef({});
  const lastEmitTime = useRef(0);
  const wasMoving = useRef(false);
  const loopRef = useRef(null);

  // Sync state if server dictates position shifts
  useEffect(() => {
    if (room?.game?.players[playerId]?.position) {
      const serverPos = room.game.players[playerId].position;
      setPosX(serverPos.x);
      setPosY(serverPos.y);
    }
  }, [room?.game?.players[playerId]?.position, playerId]);

  // Responsive canvas resizing
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        const parent = mapRef.current.parentElement;
        const parentWidth = parent.clientWidth;
        const parentHeight = parent.clientHeight || 550;

        const scaleX = parentWidth / 1200;
        const scaleY = parentHeight / 1000;
        const scale = Math.min(scaleX, scaleY, 1.0);

        setDimensions({ width: parentWidth, height: parentHeight, scale });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e) => {
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

  // Rollback sync handling
  useEffect(() => {
    setOnMovementError((rollbackX, rollbackY) => {
      setPosX(rollbackX);
      setPosY(rollbackY);
      toast.error('Sync rollback: Teleport speed limit exceeded.');
    });
    return () => setOnMovementError(null);
  }, [setOnMovementError]);

  // Repair keybind (E)
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.key.toLowerCase() === 'e') {
        if (nearSystem && !activeRepairSession && room?.gameState === 'exploration') {
          const res = await startRepair(room.roomCode, playerId, nearSystem.id);
          if (res.success) {
            setActiveRepairSession({
              systemId: nearSystem.id,
              systemName: nearSystem.name,
              session: res.session,
            });
          } else {
            toast.error(res.message || 'System interface unresponsive.');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearSystem, activeRepairSession, room, playerId, startRepair]);

  // Investigation keybind (I)
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (e.key.toLowerCase() === 'i') {
        if (nearTerminal && room?.gameState === 'exploration' && !activeRepairSession) {
          try {
            const res = await discoverTerminalEvidence(room.roomCode, playerId, nearTerminal.id);
            if (res.success) {
              toast.success(`LOG RETRIEVED: ${res.evidence.description.substring(0, 45)}...`, { icon: '🔍' });
            } else {
              toast.error(res.message || 'Terminal database locked.');
            }
          } catch (err) {
            toast.error('Terminal query interface error.');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearTerminal, room, playerId, discoverTerminalEvidence, activeRepairSession]);

  // Movement update loop
  useEffect(() => {
    let lastTime = performance.now();

    const gameLoop = (time) => {
      const elapsedMs = time - lastTime;
      lastTime = time;

      let dx = 0;
      let dy = 0;

      if (!activeRepairSession && room.gameState !== 'meeting') {
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
        const nextX = Math.round(posX + dx * speed * elapsedMs);
        const nextY = Math.round(posY + dy * speed * elapsedMs);

        // Check Local Locked Doors collision bounds
        let pathIsBlockedByLock = false;
        const targetArea = WALKABLE_AREAS.find(
          (area) => nextX >= area.x && nextX <= area.x + area.w && nextY >= area.y && nextY <= area.y + area.h
        );
        if (targetArea && targetArea.type === 'hallway') {
          const lockExpiresAt = room?.game?.sabotages?.lockedDoors?.[targetArea.name];
          if (lockExpiresAt && Date.now() < lockExpiresAt) {
            pathIsBlockedByLock = true;
          }
        }

        if (isValidPosition(nextX, nextY) && !pathIsBlockedByLock) {
          setPosX(nextX);
          setPosY(nextY);
          wasMoving.current = true;

          // Track room change locally
          const currentArea = WALKABLE_AREAS.find(
            (area) => nextX >= area.x && nextX <= area.x + area.w && nextY >= area.y && nextY <= area.y + area.h
          );
          if (currentArea && currentArea.type === 'room' && onRoomChange) {
            onRoomChange(currentArea.name);
          }

          // Throttle movement network updates
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

      // Proximity check to system consoles & terminals
      let closestSystem = null;
      let closestTerminal = null;
      let minDistance = 150;

      SYSTEM_CONSOLES.forEach((sys) => {
        const dist = Math.hypot(posX - sys.x, posY - sys.y);
        if (dist < minDistance) {
          closestTerminal = { id: sys.id, name: sys.name };
          
          const sysState = room?.game?.systems?.[sys.id];
          if (sysState && sysState.health < 100) {
            closestSystem = { id: sys.id, name: sys.name, health: sysState.health };
          }
        }
      });

      setNearSystem(closestSystem);
      setNearTerminal(closestTerminal);

      loopRef.current = requestAnimationFrame(gameLoop);
    };

    loopRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(loopRef.current);
  }, [posX, posY, room, playerId, sendPlayerMove, sendPlayerStopped, onRoomChange, activeRepairSession]);

  const mapCenterOffset = {
    x: (dimensions.width - 1200 * dimensions.scale) / 2,
    y: (dimensions.height - 1000 * dimensions.scale) / 2,
  };

  const handleProximityRepairStart = async () => {
    if (nearSystem && !activeRepairSession) {
      const res = await startRepair(room.roomCode, playerId, nearSystem.id);
      if (res.success) {
        setActiveRepairSession({
          systemId: nearSystem.id,
          systemName: nearSystem.name,
          session: res.session,
        });
      } else {
        toast.error(res.message || 'System interface unresponsive.');
      }
    }
  };

  const handleProximityInvestigationStart = async () => {
    if (nearTerminal && !activeRepairSession) {
      try {
        const res = await discoverTerminalEvidence(room.roomCode, playerId, nearTerminal.id);
        if (res.success) {
          toast.success(`LOG RETRIEVED: ${res.evidence.description.substring(0, 45)}...`, { icon: '🔍' });
        } else {
          toast.error(res.message || 'Terminal database locked.');
        }
      } catch (err) {
        toast.error('Terminal query interface error.');
      }
    }
  };

  const isBlackoutActive = room?.game?.blackoutActive || false;

  return (
    <div
      ref={mapRef}
      className="relative w-full h-full min-h-[480px] bg-[#030407] rounded-2xl border border-cyan-500/10 shadow-inner overflow-hidden select-none"
    >
      {/* GRID DECORATION */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] bg-[size:30px_30px]" />

      <div
        className="absolute origin-top-left transition-all duration-300"
        style={{
          transform: `translate(${mapCenterOffset.x}px, ${mapCenterOffset.y}px) scale(${dimensions.scale})`,
          width: 1200,
          height: 1000,
          filter: isBlackoutActive ? 'brightness(0.18) contrast(1.15)' : 'none',
        }}
      >
        {/* Draw Hallways & Locked Overlays */}
        {WALKABLE_AREAS.filter((a) => a.type === 'hallway').map((hall) => {
          const lockExpiresAt = room?.game?.sabotages?.lockedDoors?.[hall.name];
          const isLocked = lockExpiresAt && Date.now() < lockExpiresAt;

          return (
            <React.Fragment key={hall.name}>
              <Doorway x={hall.x} y={hall.y} w={hall.w} h={hall.h} />
              {isLocked && (
                <div
                  className="absolute bg-red-950/70 border-2 border-dashed border-red-500/60 rounded flex items-center justify-center z-10 transition-all select-none shadow-[inset_0_0_12px_rgba(239,68,68,0.25)] animate-pulse"
                  style={{
                    left: hall.x,
                    top: hall.y,
                    width: hall.w,
                    height: hall.h,
                  }}
                >
                  <span className="text-[14px] leading-none drop-shadow-[0_0_4px_rgba(0,0,0,0.8)] select-none">
                    🔒
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Draw Rooms */}
        {WALKABLE_AREAS.filter((a) => a.type === 'room').map((r) => (
          <Room key={r.name} name={r.name} x={r.x} y={r.y} w={r.w} h={r.h} />
        ))}

        {/* Draw System Consoles */}
        {SYSTEM_CONSOLES.map((sys) => {
          const sysState = room?.game?.systems?.[sys.id];
          const isDamaged = sysState && sysState.health < 100;
          return (
            <div
              key={sys.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none animate-pulse"
              style={{ left: sys.x, top: sys.y }}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border border-black shadow-md ${
                  isDamaged ? 'bg-red-500 shadow-red-500/60' : 'bg-emerald-500 shadow-emerald-500/60'
                }`}
              />
              <span className="text-[7px] font-black text-slate-400 mt-1 uppercase font-mono tracking-wider">
                {sys.name} ({sysState ? `${sysState.health}%` : '100%'})
              </span>
            </div>
          );
        })}

        {/* Draw other players */}
        {Object.keys(playerPositions).map((pId) => {
          if (pId === playerId) return null;
          const pos = playerPositions[pId];
          const pData = room.players.find((player) => player.id === pId);
          if (!pData) return null;

          return (
            <Player
              key={pId}
              name={pData.name}
              avatar={pData.avatar}
              x={pos.x}
              y={pos.y}
              isMe={false}
              isDisconnected={!pos.connected}
            />
          );
        })}

        {/* Draw self */}
        {(() => {
          const myData = room.players.find((player) => player.id === playerId);
          if (!myData) return null;
          return (
            <Player
              name={myData.name}
              avatar={myData.avatar}
              x={posX}
              y={posY}
              isMe={true}
              isDisconnected={false}
            />
          );
        })()}
      </div>

      {/* FLOATING PROXIMITY INTERACTION BANNER (REPAIR) */}
      {nearSystem && !activeRepairSession && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/90 border border-cyan-500/30 rounded-xl px-4 py-2 flex items-center gap-3 z-30 shadow-lg animate-bounce select-none">
          <span className="bg-cyan-500 text-black px-1.5 py-0.5 rounded font-black text-xs font-mono">E</span>
          <span className="text-xs font-bold text-slate-100">
            REPAIR {nearSystem.name} ({nearSystem.health}%)
          </span>
          <button
            onClick={handleProximityRepairStart}
            className="px-2.5 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-black uppercase tracking-wider rounded transition-colors"
          >
            START
          </button>
        </div>
      )}

      {/* FLOATING PROXIMITY INTERACTION BANNER (INVESTIGATE) */}
      {nearTerminal && !activeRepairSession && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/90 border border-cyan-500/30 rounded-xl px-4 py-2 flex items-center gap-3 z-30 shadow-lg animate-bounce select-none">
          <span className="bg-cyan-500 text-black px-1.5 py-0.5 rounded font-black text-xs font-mono">I</span>
          <span className="text-xs font-bold text-slate-100">
            INVESTIGATE {nearTerminal.name} TERMINAL
          </span>
          <button
            onClick={handleProximityInvestigationStart}
            className="px-2.5 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-black uppercase tracking-wider rounded transition-colors"
          >
            ACCESS
          </button>
        </div>
      )}

      {/* FLOATING BLACKOUT NOTIFICATION BANNER */}
      {isBlackoutActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-950/80 border border-red-500/30 rounded-xl px-4 py-2 z-30 shadow-lg flex items-center gap-2 select-none animate-pulse">
          <span className="text-red-500 font-black">⚠️</span>
          <span className="text-xs font-mono font-black text-red-400 uppercase tracking-wider">
            SYSTEM BLACKOUT: POWER FAILURE
          </span>
        </div>
      )}

      {/* REPAIR INTERACTIVE MODAL */}
      {activeRepairSession && (
        <RepairModal
          systemId={activeRepairSession.systemId}
          systemName={activeRepairSession.systemName}
          session={activeRepairSession.session}
          onClose={() => setActiveRepairSession(null)}
        />
      )}
    </div>
  );
};

export default FacilityMap;
