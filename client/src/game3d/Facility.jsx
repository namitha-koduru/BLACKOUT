// game3d/Facility.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRoomStore } from '../store/roomStore.js';
import * as THREE from 'three';

const SCALE = 0.08; // scale factor to translate 2D coordinate values to 3D meters

// 2D Facility Layout Walkable Rectangles
const WALKABLE_AREAS = [
  // Rooms
  { name: 'CENTRAL HUB', x: 450, y: 300, w: 300, h: 250, type: 'room', color: '#22d3ee', floorBg: '#1e293b' },
  { name: 'SECURITY', x: 450, y: 50, w: 300, h: 150, type: 'room', color: '#3b82f6', floorBg: '#1e293b' },
  { name: 'LABORATORY', x: 100, y: 300, w: 250, h: 250, type: 'room', color: '#8b5cf6', floorBg: '#1e293b' },
  { name: 'GENERATOR ROOM', x: 850, y: 300, w: 250, h: 250, type: 'room', color: '#f59e0b', floorBg: '#1e293b' },
  { name: 'COMMUNICATIONS ROOM', x: 450, y: 650, w: 300, h: 150, type: 'room', color: '#22d3ee', floorBg: '#1e293b' },
  { name: 'MEDICAL LAB', x: 450, y: 850, w: 300, h: 120, type: 'room', color: '#22c55e', floorBg: '#1e293b' },
  { name: 'STORAGE', x: 100, y: 650, w: 250, h: 150, type: 'room', color: '#f97316', floorBg: '#1e293b' },
  { name: 'CONTROL ROOM', x: 850, y: 50, w: 250, h: 150, type: 'room', color: '#8b5cf6', floorBg: '#1e293b' },
  { name: 'REACTOR / ENGINEERING', x: 850, y: 650, w: 250, h: 150, type: 'room', color: '#ef4444', floorBg: '#1e293b' },
  { name: 'SERVER ROOM', x: 100, y: 50, w: 250, h: 150, type: 'room', color: '#a855f7', floorBg: '#1e293b' },
  { name: 'ELECTRICAL ROOM', x: 100, y: 850, w: 250, h: 120, type: 'room', color: '#eab308', floorBg: '#1e293b' },

  // Hallways/Passages
  { name: 'HALLWAY_SERVER_SECURITY', x: 350, y: 100, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_SECURITY_CONTROL', x: 750, y: 100, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_SERVER_LAB', x: 200, y: 200, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_HUB_SECURITY', x: 575, y: 200, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_HUB_LAB', x: 350, y: 400, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_HUB_GENERATOR', x: 750, y: 400, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_LAB_STORAGE', x: 200, y: 550, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_HUB_COMMS', x: 575, y: 550, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_GENERATOR_REACTOR', x: 950, y: 550, w: 50, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_STORAGE_ELECTRICAL', x: 200, y: 800, w: 50, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_COMMS_MEDICAL', x: 575, y: 800, w: 50, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ELECTRICAL_MEDICAL', x: 350, y: 880, w: 100, h: 50, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' }
];

// Interactive System Consoles
const SYSTEM_CONSOLES = [
  { id: 'generator', name: 'Generator', room: 'GENERATOR ROOM', x: 975, y: 425, color: '#f59e0b' },
  { id: 'communications', name: 'Communications', room: 'COMMUNICATIONS ROOM', x: 600, y: 725, color: '#22d3ee' },
  { id: 'security', name: 'Security', room: 'SECURITY', x: 600, y: 125, color: '#3b82f6' },
  { id: 'medical', name: 'Medical', room: 'MEDICAL LAB', x: 600, y: 910, color: '#22c55e' },
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
      {/* GLOWING INTERACTION BASE RING */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.65, 0.7, 32]} />
        <meshBasicMaterial color={indicatorColor} side={THREE.DoubleSide} />
      </mesh>

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
            {/* WALKABLE FLOOR SLAB (DARK SLATE SHINY METAL) */}
            <mesh position={[cenX, -0.05, cenZ]} receiveShadow>
              <boxGeometry args={[width3D, 0.1, depth3D]} />
              <meshStandardMaterial
                color={area.floorBg}
                roughness={0.2}
                metalness={0.8}
              />
            </mesh>

            {/* GRID LINES PATTERN (Holographic Room Accent Grid) */}
            <gridHelper
              args={[Math.max(width3D, depth3D), 12, area.color || '#334155', area.color || '#334155']}
              position={[cenX, 0.015, cenZ]}
            />

            {/* CEILING SLABS (DARK INDIGO CEILING PANELING) */}
            <mesh position={[cenX, 5.5, cenZ]} castShadow>
              <boxGeometry args={[width3D, 0.1, depth3D]} />
              <meshStandardMaterial
                color="#111827"
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>

            {/* SOLID ROOM WALLS (Sleek Graphite Gray Metal) */}
            {/* Left Wall */}
            <mesh position={[cenX - width3D / 2, 2.75, cenZ]}>
              <boxGeometry args={[0.15, 5.5, depth3D]} />
              <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.6} />
            </mesh>
            {/* Right Wall */}
            <mesh position={[cenX + width3D / 2, 2.75, cenZ]}>
              <boxGeometry args={[0.15, 5.5, depth3D]} />
              <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.6} />
            </mesh>
            {/* Front Wall */}
            <mesh position={[cenX, 2.75, cenZ - depth3D / 2]}>
              <boxGeometry args={[width3D, 5.5, 0.15]} />
              <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.6} />
            </mesh>
            {/* Back Wall */}
            <mesh position={[cenX, 2.75, cenZ + depth3D / 2]}>
              <boxGeometry args={[width3D, 5.5, 0.15]} />
              <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.6} />
            </mesh>

            {/* NEON GLOW WALL BORDER TRIMS (Renders on all four room walls) */}
            {area.type === 'room' && (
              <group>
                <mesh position={[cenX, 2.2, cenZ + depth3D / 2 - 0.1]}>
                  <boxGeometry args={[width3D * 0.85, 0.05, 0.05]} />
                  <meshStandardMaterial color={area.color} emissive={area.color} emissiveIntensity={1.5} />
                </mesh>
                <mesh position={[cenX, 2.2, cenZ - depth3D / 2 + 0.1]}>
                  <boxGeometry args={[width3D * 0.85, 0.05, 0.05]} />
                  <meshStandardMaterial color={area.color} emissive={area.color} emissiveIntensity={1.5} />
                </mesh>
                <mesh position={[cenX - width3D / 2 + 0.1, 2.2, cenZ]} rotation={[0, Math.PI / 2, 0]}>
                  <boxGeometry args={[depth3D * 0.85, 0.05, 0.05]} />
                  <meshStandardMaterial color={area.color} emissive={area.color} emissiveIntensity={1.5} />
                </mesh>
                <mesh position={[cenX + width3D / 2 - 0.1, 2.2, cenZ]} rotation={[0, Math.PI / 2, 0]}>
                  <boxGeometry args={[depth3D * 0.85, 0.05, 0.05]} />
                  <meshStandardMaterial color={area.color} emissive={area.color} emissiveIntensity={1.5} />
                </mesh>
              </group>
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

            {/* ROOM DECORATIVE FURNITURE / OBSTACLES */}
            {area.type === 'room' && (
              <RoomObjects
                roomName={area.name}
                cenX={cenX}
                cenZ={cenZ}
                width3D={width3D}
                depth3D={depth3D}
                roomColor={area.color}
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

// Room Objects & Furniture Decoration Component
const RoomObjects = ({ roomName, cenX, cenZ, width3D, depth3D, roomColor }) => {
  switch (roomName) {
    case 'GENERATOR ROOM':
      return (
        <group>
          {/* Large Generator Core */}
          <mesh position={[cenX, 1.2, cenZ]} castShadow>
            <cylinderGeometry args={[1.2, 1.5, 2.4, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
          {/* Copper winding pipes */}
          <mesh position={[cenX, 1.2, cenZ]}>
            <torusGeometry args={[1.3, 0.08, 12, 24]} />
            <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[cenX, 2.4, cenZ]}>
            <cylinderGeometry args={[0.8, 0.8, 0.2, 24]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    case 'LABORATORY':
      return (
        <group>
          {/* Containment Pods */}
          <mesh position={[cenX - width3D / 3, 1.1, cenZ + depth3D / 4]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 2.2, 16]} />
            <meshStandardMaterial color="#8b5cf6" transparent opacity={0.3} roughness={0.1} />
          </mesh>
          <mesh position={[cenX - width3D / 3, 2.25, cenZ + depth3D / 4]}>
            <cylinderGeometry args={[0.42, 0.42, 0.1, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>
          <mesh position={[cenX - width3D / 3, 0.05, cenZ + depth3D / 4]}>
            <cylinderGeometry args={[0.42, 0.42, 0.1, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>

          <mesh position={[cenX + width3D / 3, 1.1, cenZ - depth3D / 4]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 2.2, 16]} />
            <meshStandardMaterial color="#8b5cf6" transparent opacity={0.3} roughness={0.1} />
          </mesh>
          <mesh position={[cenX + width3D / 3, 2.25, cenZ - depth3D / 4]}>
            <cylinderGeometry args={[0.42, 0.42, 0.1, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>
          <mesh position={[cenX + width3D / 3, 0.05, cenZ - depth3D / 4]}>
            <cylinderGeometry args={[0.42, 0.42, 0.1, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>
        </group>
      );
    case 'SECURITY':
      return (
        <group>
          {/* Security Monitoring Desks & consoles */}
          <mesh position={[cenX, 0.5, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[2.0, 1.0, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Monitors */}
          <mesh position={[cenX - 0.5, 1.2, cenZ - depth3D / 4 + 0.1]} rotation={[0.1, 0.2, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.08]} />
            <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[cenX + 0.5, 1.2, cenZ - depth3D / 4 + 0.1]} rotation={[0.1, -0.2, 0]}>
            <boxGeometry args={[0.6, 0.4, 0.08]} />
            <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    case 'MEDICAL LAB':
      return (
        <group>
          {/* Treatment Beds */}
          <mesh position={[cenX - width3D / 4, 0.35, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[0.7, 0.7, 1.4]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          <mesh position={[cenX - width3D / 4, 0.75, cenZ - depth3D / 4]}>
            <boxGeometry args={[0.6, 0.1, 1.2]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} />
          </mesh>

          <mesh position={[cenX + width3D / 4, 0.35, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.7, 0.7, 1.4]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          <mesh position={[cenX + width3D / 4, 0.75, cenZ + depth3D / 4]}>
            <boxGeometry args={[0.6, 0.1, 1.2]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} />
          </mesh>
        </group>
      );
    case 'STORAGE':
      return (
        <group>
          {/* Cargo Crates */}
          <mesh position={[cenX - width3D / 3, 0.45, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <meshStandardMaterial color="#d97706" metalness={0.1} roughness={0.9} />
          </mesh>
          <mesh position={[cenX - width3D / 3 + 0.3, 0.35, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color="#78350f" metalness={0.1} roughness={0.9} />
          </mesh>
          <mesh position={[cenX + width3D / 3, 0.5, cenZ]} castShadow>
            <boxGeometry args={[1.0, 1.0, 1.0]} />
            <meshStandardMaterial color="#92400e" metalness={0.1} roughness={0.9} />
          </mesh>
        </group>
      );
    case 'CENTRAL HUB':
      return (
        <group>
          {/* Columns in Hub Corners */}
          <mesh position={[cenX - width3D / 2.3, 2.75, cenZ - depth3D / 2.3]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 5.5, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>
          <mesh position={[cenX - width3D / 2.3, 2.75, cenZ + depth3D / 2.3]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 5.5, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>
          <mesh position={[cenX + width3D / 2.3, 2.75, cenZ - depth3D / 2.3]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 5.5, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>
          <mesh position={[cenX + width3D / 2.3, 2.75, cenZ + depth3D / 2.3]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 5.5, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.8} />
          </mesh>
        </group>
      );
    case 'SERVER ROOM':
      return (
        <group>
          {/* Multiple Tall Server Racks */}
          <mesh position={[cenX - 1.2, 1.2, cenZ - 0.8]} castShadow>
            <boxGeometry args={[0.6, 2.4, 1.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[cenX - 1.2 + 0.31, 1.2, cenZ - 0.8]}>
            <boxGeometry args={[0.02, 2.2, 1.0]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>

          <mesh position={[cenX + 1.2, 1.2, cenZ + 0.8]} castShadow>
            <boxGeometry args={[0.6, 2.4, 1.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[cenX + 1.2 - 0.31, 1.2, cenZ + 0.8]}>
            <boxGeometry args={[0.02, 2.2, 1.0]} />
            <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    case 'ELECTRICAL ROOM':
      return (
        <group>
          {/* Power Transformers & Panels */}
          <mesh position={[cenX, 0.9, cenZ - depth3D / 3]} castShadow>
            <boxGeometry args={[1.6, 1.8, 0.6]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[cenX - 0.4, 1.1, cenZ - depth3D / 3 + 0.31]}>
            <boxGeometry args={[0.3, 0.3, 0.05]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
          </mesh>
          <mesh position={[cenX + 0.4, 1.1, cenZ - depth3D / 3 + 0.31]}>
            <boxGeometry args={[0.3, 0.3, 0.05]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.0} />
          </mesh>
        </group>
      );
    case 'REACTOR / ENGINEERING':
      return (
        <group>
          {/* Glowing Reactor Core and Cooling Pipes */}
          <mesh position={[cenX, 1.4, cenZ]} castShadow>
            <cylinderGeometry args={[0.9, 1.2, 2.8, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Plasma core glow */}
          <mesh position={[cenX, 1.4, cenZ]}>
            <cylinderGeometry args={[0.92, 0.92, 1.5, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.8} transparent opacity={0.65} />
          </mesh>
          {/* Cooling pipe loops */}
          <mesh position={[cenX, 0.8, cenZ]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.5, 0.12, 8, 24]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
};

export default Facility;
