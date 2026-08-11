import React from 'react';
import { Html } from '@react-three/drei';
import Facility, { getFloorHeight } from './Facility.jsx';
import Player3D from './Player3D.jsx';
import OtherPlayer3D from './OtherPlayer3D.jsx';
import CameraController from './CameraController.jsx';
import Lighting from './Lighting.jsx';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';

export const SCALE = 0.08; // scale factor to translate 2D coordinate values to 3D meters

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

const TASK_POSITIONS = {
  generator_calibration: { x: 220, y: 1110 },
  coolant_pressure: { x: 520, y: 1110 },
  camera_alignment: { x: 920, y: 190 },
  server_maintenance: { x: 1300, y: 460 },
  sample_analysis: { x: 920, y: 840 },
  comms_calibration: { x: 1300, y: 770 },
  water_purification: { x: 900, y: 1110 },
  air_filtration: { x: 980, y: 1110 },
  fuel_transfer: { x: 220, y: 750 },
  power_routing: { x: 220, y: 450 },
  access_reset: { x: 980, y: 190 },
  data_backup: { x: 1380, y: 460 },
  reactor_temp: { x: 620, y: 1110 },
  sensor_calibration: { x: 550, y: 800 },
  facility_inspection: { x: 940, y: 525 }
};

const TaskMarker3D = ({ x, z, taskName }) => {
  const floorY = getFloorHeight(x, z);
  return (
    <group position={[x, floorY + 0.01, z]}>
      {/* Pulsing base ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.4, 32]} />
        <meshBasicMaterial color="#22d3ee" side={2} />
      </mesh>
      {/* Thin glowing cylinder */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </mesh>
      {/* Small hover label */}
      <Html position={[0, 0.6, 0]} center distanceFactor={8}>
        <div className="px-1 py-0.2 bg-[#0c1421]/95 border border-cyan-400/40 rounded text-[7px] font-black font-mono text-cyan-400 select-none whitespace-nowrap shadow-md uppercase tracking-widest pointer-events-none">
          🛰️ TASK
        </div>
      </Html>
    </group>
  );
};

const DeadBody3D = ({ x, z, victimName, playerIdx }) => {
  const safeIdx = playerIdx !== undefined && playerIdx >= 0 ? playerIdx : 0;
  const accentColor = ACCENT_COLORS[safeIdx % ACCENT_COLORS.length];
  const floorY = getFloorHeight(x, z);

  return (
    <group position={[x, floorY + 0.05, z]}>
      {/* Tilted Torso */}
      <group rotation={[Math.PI / 2, 0, Math.PI / 4]} position={[0, 0.1, 0]}>
        <mesh castShadow receiveShadow>
          <capsuleGeometry args={[0.22, 0.7, 8, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.7} />
        </mesh>
        {/* Decoupled Helmet */}
        <mesh position={[0, 0.3, 0.1]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#0f172a" emissive={accentColor} emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Scattered tools */}
      <mesh position={[-0.4, 0.05, 0.2]} castShadow>
        <boxGeometry args={[0.12, 0.08, 0.12]} />
        <meshStandardMaterial color="#475569" metalness={0.6} />
      </mesh>
      <mesh position={[0.3, 0.05, -0.3]} castShadow>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>

      {/* Flashing Emergency Beacon */}
      <mesh position={[0.2, 0.12, 0.1]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <pointLight position={[0.2, 0.2, 0.1]} color="#ef4444" intensity={1.5} distance={1.8} decay={1.5} />

      {/* Floating Deceased Label */}
      <Html position={[0, 0.7, 0]} center distanceFactor={8}>
        <div className="px-1.5 py-0.5 bg-red-950/95 border border-red-500/50 rounded text-[7px] font-bold font-mono text-red-400 select-none whitespace-nowrap shadow-md uppercase tracking-widest animate-pulse">
          ☠ {victimName}
        </div>
      </Html>
    </group>
  );
};

const World = ({ posX, posY, activeRepairSession, nearSystem, nearTerminal, onInteract, settings }) => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const playerPositions = useRoomStore((state) => state.playerPositions);

  if (!room || !room.game) return null;

  // Sync door lockdown states
  const lockedDoors = Object.keys(room.game?.sabotages?.lockedDoors || {})
    .filter((k) => room.game.sabotages.lockedDoors[k] > Date.now());

  // Incomplete tasks for local player
  const myTasks = room.game.playerTasks?.[playerId] || [];
  const incompleteTasks = myTasks.filter((t) => t.status !== 'COMPLETED');

  // Deceased bodies array
  const bodies = room.game.bodies || [];

  return (
    <>
      {/* 3D LIGHTING & ALARM STATES */}
      <Lighting settings={settings} />

      {/* SUBTLE FACILITY FOG */}
      {settings.effects && <fogExp2 attach="fog" color="#101827" density={0.035} />}

      {/* 3D FACILITY LAYOUT (FLOORS, WALLS, DOORS, SYSTEMS) */}
      <Facility lockedDoors={lockedDoors} />

      {/* RENDER TASKS MARKERS */}
      {room.game.phase === 'exploration' && incompleteTasks.map((t) => {
        const pos = TASK_POSITIONS[t.taskId];
        if (!pos) return null;
        return (
          <TaskMarker3D
            key={t.taskId}
            x={pos.x * SCALE}
            z={pos.y * SCALE}
            taskName={t.name}
          />
        );
      })}

      {/* RENDER DECEASED BODIES */}
      {bodies.map((b) => {
        const pData = room.players.find((p) => p.id === b.victimId);
        const playerIdx = room.players.findIndex((p) => p.id === b.victimId);
        return (
          <DeadBody3D
            key={b.id}
            x={b.position.x * SCALE}
            z={b.position.y * SCALE}
            victimName={pData?.name || 'Worker'}
            playerIdx={playerIdx}
          />
        );
      })}

      {/* OTHER PLAYERS IN ROOM */}
      {Object.keys(playerPositions).map((pId) => {
        if (pId === playerId) return null;
        const pos = playerPositions[pId];
        const pData = room.players.find((p) => p.id === pId);
        if (!pData || !pos) return null;

        // Obtain visual accent color from player list idx
        const playerIdx = room.players.findIndex((p) => p.id === pId);
        
        return (
          <OtherPlayer3D
            key={pId}
            name={pData.name}
            avatar={pData.avatar}
            targetX={pos.x * SCALE}
            targetZ={pos.y * SCALE}
            isDisconnected={!pos.connected}
            isAlive={room.game?.players?.[pId]?.isAlive !== false}
            playerIdx={playerIdx}
          />
        );
      })}

      {/* LOCAL CONTROLLABLE PLAYER */}
      {(() => {
        const myData = room.players.find((p) => p.id === playerId);
        const myGameData = room.game?.players?.[playerId];
        if (!myData) return null;

        const playerIdx = room.players.findIndex((p) => p.id === playerId);

        return (
          <Player3D
            x={posX * SCALE}
            z={posY * SCALE}
            name={myData.name}
            avatar={myData.avatar}
            isAlive={myGameData?.isAlive !== false}
            playerIdx={playerIdx}
          />
        );
      })()}

      {/* CAMERA FOLLOWING RIG */}
      <CameraController
        targetX={posX * SCALE}
        targetZ={posY * SCALE}
        activeRepairSession={activeRepairSession}
        nearSystem={nearSystem}
        nearTerminal={nearTerminal}
      />
    </>
  );
};

export default World;
