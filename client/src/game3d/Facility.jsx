// game3d/Facility.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SCALE } from './World.jsx';
import { useRoomStore } from '../store/roomStore.js';
import * as THREE from 'three';

// 2D Facility Layout Walkable Rectangles
const WALKABLE_AREAS = [
  // Rooms
  { name: 'CENTRAL HUB', x: 450, y: 300, w: 300, h: 250, type: 'room', color: '#22d3ee', floorBg: '#1e293b' },
  { name: 'SECURITY', x: 450, y: 50, w: 300, h: 150, type: 'room', color: '#3b82f6', floorBg: '#1e293b' },
  { name: 'LAB', x: 100, y: 300, w: 250, h: 250, type: 'room', color: '#8b5cf6', floorBg: '#1e293b' },
  { name: 'GENERATOR', x: 850, y: 300, w: 250, h: 250, type: 'room', color: '#f59e0b', floorBg: '#1e293b' },
  { name: 'COMMUNICATIONS', x: 450, y: 650, w: 300, h: 150, type: 'room', color: '#22d3ee', floorBg: '#1e293b' },
  { name: 'MEDICAL', x: 450, y: 850, w: 300, h: 120, type: 'room', color: '#22c55e', floorBg: '#1e293b' },
  { name: 'STORAGE', x: 100, y: 650, w: 250, h: 150, type: 'room', color: '#f97316', floorBg: '#1e293b' },
  { name: 'CONTROL ROOM', x: 850, y: 50, w: 250, h: 150, type: 'room', color: '#8b5cf6', floorBg: '#1e293b' },
  { name: 'EXIT', x: 850, y: 650, w: 250, h: 150, type: 'room', color: '#ef4444', floorBg: '#1e293b' },

  // Hallways/Passages
  { name: 'HALLWAY_HUB_SECURITY', x: 575, y: 200, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_HUB_LAB', x: 350, y: 400, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_HUB_GENERATOR', x: 750, y: 400, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_HUB_COMMS', x: 575, y: 550, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_COMMS_MEDICAL', x: 575, y: 800, w: 50, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_LAB_STORAGE', x: 200, y: 550, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_SECURITY_CONTROL', x: 750, y: 100, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_GENERATOR_EXIT', x: 950, y: 550, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' }
];

// Interactive System Consoles
const SYSTEM_CONSOLES = [
  { id: 'generator', name: 'Generator', room: 'GENERATOR', x: 975, y: 425, color: '#f59e0b' },
  { id: 'communications', name: 'Communications', room: 'COMMUNICATIONS', x: 600, y: 725, color: '#22d3ee' },
  { id: 'security', name: 'Security', room: 'SECURITY', x: 600, y: 125, color: '#3b82f6' },
  { id: 'medical', name: 'Medical', room: 'MEDICAL', x: 600, y: 910, color: '#22c55e' },
  { id: 'control', name: 'Control System', room: 'CONTROL ROOM', x: 975, y: 125, color: '#8b5cf6' }
];

const DoorGate3D = ({ name, x, y, w, h, isLocked }) => {
  const leftRef = useRef();
  const rightRef = useRef();

  useFrame((state) => {
    if (isLocked) {
      if (leftRef.current) leftRef.current.position.x = 0;
      if (rightRef.current) rightRef.current.position.x = 0;
    } else {
      const stateStore = useRoomStore.getState();
      const myId = stateStore.socket?.id;
      const mePos = stateStore.room?.game?.players?.[myId]?.position;
      let openFactor = 0;
      if (mePos) {
        const dx = (x + w / 2) - mePos.x;
        const dy = (y + h / 2) - mePos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          openFactor = 1.0 - (dist / 80);
        }
      }
      const slideDist = (w > h ? w : h) * SCALE * 0.45 * openFactor;
      if (leftRef.current) leftRef.current.position.x = -slideDist;
      if (rightRef.current) rightRef.current.position.x = slideDist;
    }
  });

  const isVert = h > w;
  const cenX = (x + w / 2) * SCALE;
  const cenZ = (y + h / 2) * SCALE;

  return (
    <group position={[cenX, 0, cenZ]} rotation={isVert ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
      {/* DOOR HOUSING FRAMES */}
      <mesh position={[-w * SCALE * 0.5, 1.25, 0]}>
        <boxGeometry args={[0.2, 2.5, 0.4]} />
        <meshStandardMaterial color="#273449" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[w * SCALE * 0.5, 1.25, 0]}>
        <boxGeometry args={[0.2, 2.5, 0.4]} />
        <meshStandardMaterial color="#273449" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[w * SCALE, 0.2, 0.4]} />
        <meshStandardMaterial color="#273449" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* LEFT SLIDING LEAF */}
      <mesh ref={leftRef} position={[-w * SCALE * 0.25, 1.1, 0]}>
        <boxGeometry args={[w * SCALE * 0.5, 2.2, 0.08]} />
        <meshStandardMaterial
          color={isLocked ? '#f43f5e' : '#475569'}
          metalness={0.8}
          roughness={0.2}
          emissive={isLocked ? '#f43f5e' : '#000'}
          emissiveIntensity={isLocked ? 0.75 : 0}
        />
      </mesh>
      {/* RIGHT SLIDING LEAF */}
      <mesh ref={rightRef} position={[w * SCALE * 0.25, 1.1, 0]}>
        <boxGeometry args={[w * SCALE * 0.5, 2.2, 0.08]} />
        <meshStandardMaterial
          color={isLocked ? '#f43f5e' : '#475569'}
          metalness={0.8}
          roughness={0.2}
          emissive={isLocked ? '#f43f5e' : '#000'}
          emissiveIntensity={isLocked ? 0.75 : 0}
        />
      </mesh>

      {/* LOCKDOWN BARRIER LIGHT */}
      {isLocked && (
        <mesh position={[0, 1.1, 0.06]}>
          <planeGeometry args={[w * SCALE * 0.8, 1.0]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const Console3D = ({ consoleData, systemState }) => {
  const cenX = consoleData.x * SCALE;
  const cenZ = consoleData.y * SCALE;
  
  let indicatorColor = consoleData.color; // Standard category color
  if (systemState) {
    if (systemState.health === 0) indicatorColor = '#ef4444'; // Red
    else if (systemState.health <= 40) indicatorColor = '#f59e0b'; // Amber
  }

  return (
    <group position={[cenX, 0, cenZ]}>
      {/* BASE PILLAR */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.6, 1.1, 0.6]} />
        <meshStandardMaterial color="#273449" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* SLANTED CONSOLE SLAB */}
      <mesh position={[0, 1.05, 0.15]} rotation={[Math.PI / 6, 0, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* GLOWING HOLOGRAPHIC SCREEN PANEL */}
      <mesh position={[0, 1.25, 0.1]}>
        <planeGeometry args={[0.6, 0.45]} />
        <meshStandardMaterial
          color={indicatorColor}
          emissive={indicatorColor}
          emissiveIntensity={1.0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* STATUS LED */}
      <mesh position={[0.25, 1.15, 0.35]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={indicatorColor} />
      </mesh>
    </group>
  );
};

const Facility = ({ lockedDoors }) => {
  const room = useRoomStore((state) => state.room);
  const systems = room?.game?.systems || {};

  return (
    <group>
      {/* FLOOR PLAN SLABS */}
      {WALKABLE_AREAS.map((area) => {
        const width3D = area.w * SCALE;
        const depth3D = area.h * SCALE;
        const cenX = (area.x + area.w / 2) * SCALE;
        const cenZ = (area.y + area.h / 2) * SCALE;

        return (
          <group key={area.name}>
            {/* WALKABLE FLOOR SLAB (DARK SLATE) */}
            <mesh position={[cenX, -0.05, cenZ]} receiveShadow>
              <boxGeometry args={[width3D, 0.1, depth3D]} />
              <meshStandardMaterial
                color={area.floorBg}
                roughness={0.5}
                metalness={0.4}
              />
            </mesh>

            {/* GRID LINES PATTERN (Holographic Tech Grid) */}
            <gridHelper
              args={[Math.max(width3D, depth3D), 12, '#334155', '#334155']}
              position={[cenX, 0.015, cenZ]}
            />

            {/* CEILING SLABS (DARK INDIGO CEILING PANELING) */}
            <mesh position={[cenX, 3.0, cenZ]} castShadow>
              <boxGeometry args={[width3D, 0.1, depth3D]} />
              <meshStandardMaterial
                color="#111827"
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>

            {/* SOLID ROOM WALLS (Graphite Gray) */}
            {/* Left Wall */}
            <mesh position={[cenX - width3D / 2, 1.5, cenZ]}>
              <boxGeometry args={[0.15, 3.0, depth3D]} />
              <meshStandardMaterial color="#273449" roughness={0.7} metalness={0.3} />
            </mesh>
            {/* Right Wall */}
            <mesh position={[cenX + width3D / 2, 1.5, cenZ]}>
              <boxGeometry args={[0.15, 3.0, depth3D]} />
              <meshStandardMaterial color="#273449" roughness={0.7} metalness={0.3} />
            </mesh>
            {/* Front Wall */}
            <mesh position={[cenX, 1.5, cenZ - depth3D / 2]}>
              <boxGeometry args={[width3D, 3.0, 0.15]} />
              <meshStandardMaterial color="#273449" roughness={0.7} metalness={0.3} />
            </mesh>
            {/* Back Wall */}
            <mesh position={[cenX, 1.5, cenZ + depth3D / 2]}>
              <boxGeometry args={[width3D, 3.0, 0.15]} />
              <meshStandardMaterial color="#273449" roughness={0.7} metalness={0.3} />
            </mesh>

            {/* ROOM COLOR LIGHTING ACCENTS ON WALLS (Glowing neon stripe) */}
            {area.type === 'room' && (
              <mesh position={[cenX, 1.8, cenZ + depth3D / 2 - 0.1]}>
                <boxGeometry args={[width3D * 0.75, 0.06, 0.06]} />
                <meshStandardMaterial
                  color={area.color}
                  emissive={area.color}
                  emissiveIntensity={1.2}
                />
              </mesh>
            )}

            {/* ROOM POINT LIGHT SOURCES */}
            {area.type === 'room' && (
              <pointLight
                position={[cenX, 2.5, cenZ]}
                color={area.color}
                intensity={1.5}
                distance={15}
                decay={1.5}
              />
            )}
          </group>
        );
      })}

      {/* AUTOMATIC PASSAGES AND DOORS */}
      {WALKABLE_AREAS.filter((a) => a.type === 'hallway').map((hall) => {
        const isLocked = lockedDoors.some((d) => hall.name.toLowerCase().includes(d.toLowerCase()));
        return (
          <DoorGate3D
            key={hall.name}
            name={hall.name}
            x={hall.x}
            y={hall.y}
            w={hall.w}
            h={hall.h}
            isLocked={isLocked}
          />
        );
      })}

      {/* SYSTEM CONSOLES */}
      {SYSTEM_CONSOLES.map((consoleData) => {
        const state = systems[consoleData.id];
        return (
          <Console3D
            key={consoleData.id}
            consoleData={consoleData}
            systemState={state}
          />
        );
      })}
    </group>
  );
};

export default Facility;
