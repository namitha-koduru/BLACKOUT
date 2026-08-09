// game3d/Minimap3D.jsx
import React from 'react';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';

// Walkable rectangles for layout drawing
const MAP_ROOMS = [
  { name: 'HUB', x: 450, y: 300, w: 300, h: 250 },
  { name: 'SEC', x: 450, y: 50, w: 300, h: 150 },
  { name: 'LAB', x: 100, y: 300, w: 250, h: 250 },
  { name: 'GEN', x: 850, y: 300, w: 250, h: 250 },
  { name: 'COM', x: 450, y: 650, w: 300, h: 150 },
  { name: 'MED', x: 450, y: 850, w: 300, h: 120 },
  { name: 'STO', x: 100, y: 650, w: 250, h: 150 },
  { name: 'CON', x: 850, y: 50, w: 250, h: 150 },
  { name: 'EXT', x: 850, y: 650, w: 250, h: 150 }
];

const Minimap3D = ({ posX, posY }) => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const playerPositions = useRoomStore((state) => state.playerPositions);

  if (!room || !room.game) return null;

  const systems = room.game.systems || {};
  const isBlackoutActive = room.game.blackoutActive === true;

  // Scale factors to map 1200x1000 bounds to 180x150 pixels
  const scaleX = 180 / 1200;
  const scaleY = 150 / 1000;

  return (
    <div className="relative w-[200px] h-[170px] bg-[#172235]/90 border border-[#22d3ee]/35 rounded-xl p-2 select-none shadow-md shadow-cyan-950/20 font-mono text-[8px] overflow-hidden">
      <div className="text-[9px] text-[#22d3ee] font-black uppercase tracking-wider mb-1.5 border-b border-cyan-500/10 pb-0.5 text-left flex justify-between">
        <span>FACILITY MAP</span>
        {isBlackoutActive && <span className="text-[#ef4444] animate-pulse font-black">L-OFFLINE</span>}
      </div>

      <div className="relative w-[180px] h-[135px] mx-auto bg-[#101827]/60 border border-[#22304a]/60 rounded-lg overflow-hidden">
        {/* ROOM BOUNDS */}
        {MAP_ROOMS.map((r) => {
          // Identify if room has a system console and check its health
          let systemStatus = 'OK';
          let systemId = '';
          if (r.name === 'GEN') systemId = 'generator';
          else if (r.name === 'COM') systemId = 'communications';
          else if (r.name === 'SEC') systemId = 'security';
          else if (r.name === 'MED') systemId = 'medical';
          else if (r.name === 'CON') systemId = 'control';

          const health = systemId ? systems[systemId]?.health : 100;
          if (health === 0) systemStatus = 'OFFLINE';
          else if (health <= 40) systemStatus = 'CRITICAL';

          const drawX = r.x * scaleX;
          const drawY = r.y * scaleY;
          const drawW = r.w * scaleX;
          const drawH = r.h * scaleY;

          return (
            <div
              key={r.name}
              style={{
                left: `${drawX}px`,
                top: `${drawY}px`,
                width: `${drawW}px`,
                height: `${drawH}px`
              }}
              className={`absolute border border-white/10 rounded flex flex-col items-center justify-center font-bold tracking-tighter ${
                systemStatus === 'OFFLINE'
                  ? 'bg-red-950/20 border-[#ef4444]/40 text-[#ef4444] animate-pulse'
                  : systemStatus === 'CRITICAL'
                  ? 'bg-amber-950/20 border-[#f59e0b]/40 text-[#f59e0b]'
                  : 'bg-[#22304a]/40 text-[#cbd5e1]'
              }`}
            >
              <span>{r.name}</span>
              {systemId && (
                <span className={`text-[6px] ${systemStatus === 'OFFLINE' ? 'text-red-400 font-extrabold' : 'text-slate-600'}`}>
                  {health}%
                </span>
              )}
            </div>
          );
        })}

        {/* OTHER PLAYERS INDICATORS (Degraded during Power Blackout) */}
        {!isBlackoutActive &&
          Object.keys(playerPositions).map((pId) => {
            if (pId === playerId) return null;
            const pos = playerPositions[pId];
            if (!pos || !pos.connected) return null;

            const drawX = pos.x * scaleX;
            const drawY = pos.y * scaleY;

            return (
              <div
                key={pId}
                style={{
                  left: `${drawX - 2.5}px`,
                  top: `${drawY - 2.5}px`
                }}
                className="absolute w-1.5 h-1.5 rounded-full bg-slate-400 shadow-[0_0_4px_rgba(255,255,255,0.5)] z-10"
                title={room.players.find((p) => p.id === pId)?.name}
              />
            );
          })}

        {/* LOCAL CONTROLLABLE PLAYER */}
        <div
          style={{
            left: `${posX * scaleX - 3}px`,
            top: `${posY * scaleY - 3}px`
          }}
          className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-950 shadow-[0_0_8px_rgba(6,182,212,0.8)] z-20 animate-pulse"
          title="You"
        />
      </div>
    </div>
  );
};

export default Minimap3D;
