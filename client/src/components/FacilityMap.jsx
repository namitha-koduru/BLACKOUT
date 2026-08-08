// components/FacilityMap.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';
import Room from './Room.jsx';
import Doorway from './Doorway.jsx';
import Player from './Player.jsx';
import toast from 'react-hot-toast';

// 2D Facility Layout Walkable Rectangles (Mirrors Server boundaries)
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

  // Fallback initial position (Server dictates starting stagger coordinates)
  const myInitialPos = room?.game?.players[playerId]?.position || { x: 600, y: 450 };

  const [posX, setPosX] = useState(myInitialPos.x);
  const [posY, setPosY] = useState(myInitialPos.y);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600, scale: 0.5 });

  const activeKeys = useRef({});
  const lastEmitTime = useRef(0);
  const wasMoving = useRef(false);
  const loopRef = useRef(null);

  // Sync state if server dictates position shifts (e.g. game start / reconnects)
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

  // Movement loop
  useEffect(() => {
    let lastTime = performance.now();

    const gameLoop = (time) => {
      const elapsedMs = time - lastTime;
      lastTime = time;

      let dx = 0;
      let dy = 0;

      if (activeKeys.current['w'] || activeKeys.current['arrowup']) dy -= 1;
      if (activeKeys.current['s'] || activeKeys.current['arrowdown']) dy += 1;
      if (activeKeys.current['a'] || activeKeys.current['arrowleft']) dx -= 1;
      if (activeKeys.current['d'] || activeKeys.current['arrowright']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        // Diagonal Speed normalization
        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        // Apply speed rate
        const speed = 0.18; // units per millisecond (approx 180 units/sec)
        const nextX = Math.round(posX + dx * speed * elapsedMs);
        const nextY = Math.round(posY + dy * speed * elapsedMs);

        if (isValidPosition(nextX, nextY)) {
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

          // Throttle movement network updates (approx every 50ms)
          const now = Date.now();
          if (now - lastEmitTime.current >= 50) {
            sendPlayerMove(room.roomCode, playerId, nextX, nextY);
            lastEmitTime.current = now;
          }
        }
      } else if (wasMoving.current) {
        // Emit final stopping coordinate immediately
        wasMoving.current = false;
        sendPlayerStopped(room.roomCode, playerId, posX, posY);
      }

      loopRef.current = requestAnimationFrame(gameLoop);
    };

    loopRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(loopRef.current);
  }, [posX, posY, room.roomCode, playerId, sendPlayerMove, sendPlayerStopped, onRoomChange]);

  // Center coordinate of map relative container offsets
  const mapCenterOffset = {
    x: (dimensions.width - 1200 * dimensions.scale) / 2,
    y: (dimensions.height - 1000 * dimensions.scale) / 2,
  };

  return (
    <div
      ref={mapRef}
      className="relative w-full h-full min-h-[480px] bg-[#030407] rounded-2xl border border-cyan-500/10 shadow-inner overflow-hidden select-none"
    >
      {/* GRID NET DECORATION */}
      <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] bg-[size:30px_30px]" />

      <div
        className="absolute origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${mapCenterOffset.x}px, ${mapCenterOffset.y}px) scale(${dimensions.scale})`,
          width: 1200,
          height: 1000,
        }}
      >
        {/* Draw Hallways first so rooms overlay their doors */}
        {WALKABLE_AREAS.filter((a) => a.type === 'hallway').map((hall) => (
          <Doorway key={hall.name} x={hall.x} y={hall.y} w={hall.w} h={hall.h} />
        ))}

        {/* Draw Rooms */}
        {WALKABLE_AREAS.filter((a) => a.type === 'room').map((r) => (
          <Room key={r.name} name={r.name} x={r.x} y={r.y} w={r.w} h={r.h} />
        ))}

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
    </div>
  );
};

export default FacilityMap;
