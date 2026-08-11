// game3d/Facility.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRoomStore } from '../store/roomStore.js';
import * as THREE from 'three';

const SCALE = 0.08; // scale factor to translate 2D coordinate values to 3D meters

export const getFloorHeight = (x3D, z3D) => {
  // Convert 3D coordinates back to 2D for easier bounds checking
  const x2D = x3D / SCALE;
  const y2D = z3D / SCALE;

  // 1. Check if inside any specific Ground Level rooms
  if (x2D >= 800 && x2D <= 1080 && y2D >= 400 && y2D <= 650) return 0; // Atrium
  if (x2D >= 800 && x2D <= 1050 && y2D >= 100 && y2D <= 280) return 0; // Security
  if (x2D >= 450 && x2D <= 700 && y2D >= 400 && y2D <= 600) return 0;  // Offices
  if (x2D >= 1180 && x2D <= 1460 && y2D >= 100 && y2D <= 300) return 0; // Control Center
  if (x2D >= 1180 && x2D <= 1460 && y2D >= 380 && y2D <= 600) return 0; // Server Room
  if (x2D >= 1180 && x2D <= 1430 && y2D >= 680 && y2D <= 860) return 0; // Comms Room
  if (x2D >= 450 && x2D <= 730 && y2D >= 700 && y2D <= 920) return 0;  // Research Lab
  if (x2D >= 800 && x2D <= 1050 && y2D >= 750 && y2D <= 930) return 0;  // Medical Lab
  if (x2D >= 1180 && x2D <= 1460 && y2D >= 920 && y2D <= 1140) return 0; // Cafeteria
  if (x2D >= 450 && x2D <= 700 && y2D >= 100 && y2D <= 280) return 0;  // Roof Access

  // Ground level hallways
  if (x2D >= 550 && x2D <= 610 && y2D >= 280 && y2D <= 400) return 0;
  if (x2D >= 700 && x2D <= 800 && y2D >= 480 && y2D <= 540) return 0;
  if (x2D >= 910 && x2D <= 970 && y2D >= 280 && y2D <= 400) return 0;
  if (x2D >= 1050 && x2D <= 1180 && y2D >= 160 && y2D <= 220) return 0;
  if (x2D >= 1290 && x2D <= 1350 && y2D >= 300 && y2D <= 380) return 0;
  if (x2D >= 1080 && x2D <= 1180 && y2D >= 460 && y2D <= 520) return 0;
  if (x2D >= 1290 && x2D <= 1350 && y2D >= 600 && y2D <= 680) return 0;
  if (x2D >= 1080 && x2D <= 1180 && y2D >= 730 && y2D <= 790) return 0;
  if (x2D >= 1290 && x2D <= 1350 && y2D >= 860 && y2D <= 920) return 0;
  if (x2D >= 900 && x2D <= 960 && y2D >= 650 && y2D <= 750) return 0;
  if (x2D >= 700 && x2D <= 800 && y2D >= 760 && y2D <= 820) return 0;

  // 2. Check if inside Lower Level rooms
  if (x2D >= 100 && x2D <= 350 && y2D >= 100 && y2D <= 300) return -4;  // Engineering
  if (x2D >= 100 && x2D <= 350 && y2D >= 380 && y2D <= 580) return -4;  // Maintenance
  if (x2D >= 100 && x2D <= 350 && y2D >= 680 && y2D <= 930) return -4;  // Storage
  if (x2D >= 100 && x2D <= 350 && y2D >= 1000 && y2D <= 1220) return -4; // Generator Room
  if (x2D >= 450 && x2D <= 730 && y2D >= 1000 && y2D <= 1220) return -4; // Reactor Core
  if (x2D >= 800 && x2D <= 1050 && y2D >= 1020 && y2D <= 1200) return -4; // Utility Room

  // Lower level hallways
  if (x2D >= 190 && x2D <= 250 && y2D >= 300 && y2D <= 380) return -4;
  if (x2D >= 190 && x2D <= 250 && y2D >= 580 && y2D <= 680) return -4;
  if (x2D >= 190 && x2D <= 250 && y2D >= 930 && y2D <= 1000) return -4;
  if (x2D >= 350 && x2D <= 450 && y2D >= 1080 && y2D <= 1140) return -4;
  if (x2D >= 730 && x2D <= 800 && y2D >= 1080 && y2D <= 1140) return -4;

  // 3. Transition slopes/stairs
  if (x2D >= 350 && x2D <= 450 && y2D >= 750 && y2D <= 810) { // HALLWAY_STAIRS
    const t = (x2D - 350) / 100;
    return -4 * (1 - t);
  }
  if (x2D >= 350 && x2D <= 450 && y2D >= 450 && y2D <= 510) { // HALLWAY_ELEVATOR
    const t = (x2D - 350) / 100;
    return -4 * (1 - t);
  }
  if (x2D >= 560 && x2D <= 620 && y2D >= 920 && y2D <= 1000) { // HALLWAY_LAB_REACTOR
    const t = (y2D - 920) / 80;
    return -4 * t;
  }
  if (x2D >= 900 && x2D <= 960 && y2D >= 930 && y2D <= 1020) { // HALLWAY_MEDICAL_UTILITY
    const t = (y2D - 930) / 90;
    return -4 * t;
  }

  return 0;
};

// 2D Facility Layout Walkable Rectangles
const WALKABLE_AREAS = [
  // Rooms
  { name: 'CENTRAL ATRIUM', x: 800, y: 400, w: 280, h: 250, type: 'room', color: '#64748b', floorBg: '#1e293b' },
  { name: 'SECURITY', x: 800, y: 100, w: 250, h: 180, type: 'room', color: '#475569', floorBg: '#0f172a' },
  { name: 'OFFICES', x: 450, y: 400, w: 250, h: 200, type: 'room', color: '#94a3b8', floorBg: '#334155' },
  { name: 'CONTROL CENTER', x: 1180, y: 100, w: 280, h: 200, type: 'room', color: '#334155', floorBg: '#0f172a' },
  { name: 'SERVER ROOM', x: 1180, y: 380, w: 280, h: 220, type: 'room', color: '#1e293b', floorBg: '#020617' },
  { name: 'COMMUNICATIONS ROOM', x: 1180, y: 680, w: 250, h: 180, type: 'room', color: '#475569', floorBg: '#1e293b' },
  { name: 'RESEARCH LAB', x: 450, y: 700, w: 280, h: 220, type: 'room', color: '#cbd5e1', floorBg: '#0f172a' },
  { name: 'MEDICAL LAB', x: 800, y: 750, w: 250, h: 180, type: 'room', color: '#e2e8f0', floorBg: '#1e293b' },
  { name: 'CAFETERIA', x: 1180, y: 920, w: 280, h: 220, type: 'room', color: '#94a3b8', floorBg: '#334155' },
  { name: 'ROOF ACCESS', x: 450, y: 100, w: 250, h: 180, type: 'room', color: '#64748b', floorBg: '#1e293b' },
  { name: 'ENGINEERING', x: 100, y: 100, w: 250, h: 200, type: 'room', color: '#475569', floorBg: '#0f172a' },
  { name: 'MAINTENANCE', x: 100, y: 380, w: 250, h: 200, type: 'room', color: '#334155', floorBg: '#1e293b' },
  { name: 'STORAGE', x: 100, y: 680, w: 250, h: 250, type: 'room', color: '#64748b', floorBg: '#0f172a' },
  { name: 'GENERATOR ROOM', x: 100, y: 1000, w: 250, h: 220, type: 'room', color: '#334155', floorBg: '#020617' },
  { name: 'REACTOR / POWER CORE', x: 450, y: 1000, w: 280, h: 220, type: 'room', color: '#475569', floorBg: '#020617' },
  { name: 'UTILITY ROOM', x: 800, y: 1020, w: 250, h: 180, type: 'room', color: '#334155', floorBg: '#1e293b' },

  // Hallways/Passages
  { name: 'HALLWAY_ROOF_OFFICES', x: 550, y: 280, w: 60, h: 120, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_OFFICES_ATRIUM', x: 700, y: 480, w: 100, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ATRIUM_SECURITY', x: 910, y: 280, w: 60, h: 120, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_SECURITY_CONTROL', x: 1050, y: 160, w: 130, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_CONTROL_SERVER', x: 1290, y: 300, w: 60, h: 80, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ATRIUM_SERVER', x: 1080, y: 460, w: 100, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_SERVER_COMMS', x: 1290, y: 600, w: 60, h: 80, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ATRIUM_COMMS', x: 1080, y: 730, w: 100, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_COMMS_CAFETERIA', x: 1290, y: 860, w: 60, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ATRIUM_MEDICAL', x: 900, y: 650, w: 60, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_MEDICAL_UTILITY', x: 900, y: 930, w: 60, h: 90, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ATRIUM_LAB', x: 700, y: 760, w: 100, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_LAB_REACTOR', x: 560, y: 920, w: 60, h: 80, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_STAIRS', x: 350, y: 750, w: 100, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ELEVATOR', x: 350, y: 450, w: 100, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_ENGINEERING_MAINTENANCE', x: 190, y: 300, w: 60, h: 80, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_MAINTENANCE_STORAGE', x: 190, y: 580, w: 60, h: 100, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_STORAGE_GENERATOR', x: 190, y: 930, w: 60, h: 70, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_GENERATOR_REACTOR', x: 350, y: 1080, w: 100, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' },
  { name: 'HALLWAY_REACTOR_UTILITY', x: 730, y: 1080, w: 70, h: 60, type: 'hallway', color: '#cbd5e1', floorBg: '#1e293b' }
];

// Interactive System Consoles
const SYSTEM_CONSOLES = [
  { id: 'generator', name: 'Generator', room: 'GENERATOR ROOM', x: 220, y: 1110, color: '#f59e0b' },
  { id: 'communications', name: 'Communications', room: 'COMMUNICATIONS ROOM', x: 1300, y: 770, color: '#22d3ee' },
  { id: 'security', name: 'Security', room: 'SECURITY', x: 920, y: 190, color: '#3b82f6' },
  { id: 'medical', name: 'Medical', room: 'MEDICAL LAB', x: 920, y: 840, color: '#22c55e' },
  { id: 'control', name: 'Control System', room: 'CONTROL CENTER', x: 1320, y: 200, color: '#8b5cf6' }
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

        // Determine area-specific floor height
        const floorY = getFloorHeight(cenX, cenZ);

        return (
          <group key={area.name} position={[0, floorY, 0]}>
            {/* WALKABLE FLOOR SLAB */}
            {area.name === 'HALLWAY_STAIRS' ? (
              // RENDER DETAILED STAIR STEPS
              <group>
                {Array.from({ length: 10 }).map((_, i) => {
                  const stepW = width3D / 10;
                  const stepH = 4.0 / 10;
                  // Left side (Storage) is -4, right side (Research Lab) is 0
                  const stepX = cenX - width3D / 2 + stepW * (i + 0.5);
                  // Absolute Y coordinates for the step
                  const stepY = -4 + stepH * i;
                  return (
                    <mesh key={i} position={[stepX, stepY - floorY + stepH / 2, cenZ]} castShadow receiveShadow>
                      <boxGeometry args={[stepW, stepH, depth3D]} />
                      <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
                    </mesh>
                  );
                })}
                {/* Stair Handrails */}
                <mesh position={[cenX, 1.0 - floorY, cenZ - depth3D / 2 + 0.05]} rotation={[0, 0, Math.atan2(4, width3D)]}>
                  <cylinderGeometry args={[0.04, 0.04, Math.hypot(width3D, 4), 8]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
                </mesh>
                <mesh position={[cenX, 1.0 - floorY, cenZ + depth3D / 2 - 0.05]} rotation={[0, 0, Math.atan2(4, width3D)]}>
                  <cylinderGeometry args={[0.04, 0.04, Math.hypot(width3D, 4), 8]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
                </mesh>
              </group>
            ) : area.name === 'HALLWAY_ELEVATOR' ? (
              // RENDER SLEEK GLASS & INDUSTRIAL ELEVATOR CABIN
              <group>
                {/* Floor plate */}
                <mesh position={[cenX, -0.05, cenZ]} receiveShadow>
                  <boxGeometry args={[width3D, 0.1, depth3D]} />
                  <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.3} />
                </mesh>
                {/* Corner vertical guide rails */}
                <mesh position={[cenX - width3D / 2 + 0.1, 2 - floorY, cenZ - depth3D / 2 + 0.1]}>
                  <boxGeometry args={[0.1, 8, 0.1]} />
                  <meshStandardMaterial color="#64748b" metalness={0.8} />
                </mesh>
                <mesh position={[cenX - width3D / 2 + 0.1, 2 - floorY, cenZ + depth3D / 2 - 0.1]}>
                  <boxGeometry args={[0.1, 8, 0.1]} />
                  <meshStandardMaterial color="#64748b" metalness={0.8} />
                </mesh>
                <mesh position={[cenX + width3D / 2 - 0.1, 2 - floorY, cenZ - depth3D / 2 + 0.1]}>
                  <boxGeometry args={[0.1, 8, 0.1]} />
                  <meshStandardMaterial color="#64748b" metalness={0.8} />
                </mesh>
                <mesh position={[cenX + width3D / 2 - 0.1, 2 - floorY, cenZ + depth3D / 2 - 0.1]}>
                  <boxGeometry args={[0.1, 8, 0.1]} />
                  <meshStandardMaterial color="#64748b" metalness={0.8} />
                </mesh>
              </group>
            ) : (
              // STANDARD FLOOR SLAB
              <mesh position={[cenX, -0.05, cenZ]} receiveShadow>
                <boxGeometry args={[width3D, 0.1, depth3D]} />
                <meshStandardMaterial
                  color={area.floorBg}
                  roughness={0.2}
                  metalness={0.8}
                />
              </mesh>
            )}

            {/* GRID LINES PATTERN */}
            {area.name !== 'HALLWAY_STAIRS' && (
              <gridHelper
                args={[Math.max(width3D, depth3D), 12, area.color || '#334155', area.color || '#334155']}
                position={[cenX, 0.015, cenZ]}
              />
            )}

            {/* CEILING SLABS */}
            <mesh position={[cenX, 5.5, cenZ]} castShadow>
              <boxGeometry args={[width3D, 0.1, depth3D]} />
              <meshStandardMaterial
                color="#111827"
                roughness={0.8}
                metalness={0.2}
              />
            </mesh>

            {/* SOLID ROOM WALLS */}
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

            {/* NEON GLOW WALL BORDER TRIMS */}
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

const RoomObjects = ({ roomName, cenX, cenZ, width3D, depth3D, roomColor }) => {
  switch (roomName) {
    case 'CENTRAL ATRIUM':
      return (
        <group>
          {/* Central Reception Desk */}
          <mesh position={[cenX, 0.45, cenZ]} castShadow receiveShadow>
            <boxGeometry args={[3.2, 0.9, 1.4]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Holographic display stand */}
          <mesh position={[cenX, 1.25, cenZ]}>
            <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
          <mesh position={[cenX, 1.65, cenZ]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} transparent opacity={0.6} />
          </mesh>
          {/* Circular waiting bench around holo globe */}
          <mesh position={[cenX, 0.2, cenZ]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.0, 0.2, 8, 32]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          {/* Atrium corner plants */}
          <mesh position={[cenX - width3D / 2.3, 0.4, cenZ - depth3D / 2.3]} castShadow>
            <cylinderGeometry args={[0.4, 0.3, 0.8, 12]} />
            <meshStandardMaterial color="#475569" roughness={0.6} />
          </mesh>
          <mesh position={[cenX - width3D / 2.3, 1.0, cenZ - depth3D / 2.3]}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshStandardMaterial color="#10b981" roughness={0.9} />
          </mesh>
          <mesh position={[cenX + width3D / 2.3, 0.4, cenZ + depth3D / 2.3]} castShadow>
            <cylinderGeometry args={[0.4, 0.3, 0.8, 12]} />
            <meshStandardMaterial color="#475569" roughness={0.6} />
          </mesh>
          <mesh position={[cenX + width3D / 2.3, 1.0, cenZ + depth3D / 2.3]}>
            <sphereGeometry args={[0.35, 12, 12]} />
            <meshStandardMaterial color="#10b981" roughness={0.9} />
          </mesh>
        </group>
      );
    case 'SECURITY':
      return (
        <group>
          {/* CCTV Monitor Desk */}
          <mesh position={[cenX, 0.5, cenZ - depth3D / 3]} castShadow>
            <boxGeometry args={[2.8, 0.9, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
          </mesh>
          {/* Monitor Screens */}
          <mesh position={[cenX - 0.7, 1.2, cenZ - depth3D / 3 + 0.15]} rotation={[0.1, 0.25, 0]}>
            <boxGeometry args={[0.6, 0.45, 0.05]} />
            <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[cenX, 1.2, cenZ - depth3D / 3 + 0.15]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.7, 0.45, 0.05]} />
            <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.9} />
          </mesh>
          <mesh position={[cenX + 0.7, 1.2, cenZ - depth3D / 3 + 0.15]} rotation={[0.1, -0.25, 0]}>
            <boxGeometry args={[0.6, 0.45, 0.05]} />
            <meshStandardMaterial color="#0f172a" emissive="#3b82f6" emissiveIntensity={0.8} />
          </mesh>
          {/* Security locker cabinets grid */}
          <mesh position={[cenX - width3D / 3, 0.9, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.6, 1.8, 0.6]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[cenX + width3D / 3, 0.9, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[0.5, 1.8, 1.0]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          {/* Flashing server beacon */}
          <mesh position={[cenX + width3D / 3, 1.7, cenZ - depth3D / 4]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
        </group>
      );
    case 'OFFICES':
      return (
        <group>
          {/* Cubicle Desks */}
          <mesh position={[cenX - width3D / 4, 0.45, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[1.4, 0.9, 0.8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
          </mesh>
          {/* Office computer */}
          <mesh position={[cenX - width3D / 4, 1.1, cenZ - depth3D / 4]}>
            <boxGeometry args={[0.5, 0.35, 0.05]} />
            <meshStandardMaterial color="#020617" emissive="#22d3ee" emissiveIntensity={0.6} />
          </mesh>
          {/* Office chair 1 */}
          <group position={[cenX - width3D / 4, 0.45, cenZ - depth3D / 4 + 0.6]}>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.2, 0.25, 0.05, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.5, 0.06, 0.5]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.5, -0.22]}>
              <boxGeometry args={[0.45, 0.5, 0.06]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </group>

          <mesh position={[cenX + width3D / 4, 0.45, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[1.4, 0.9, 0.8]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
          </mesh>
          <mesh position={[cenX + width3D / 4, 1.1, cenZ + depth3D / 4]}>
            <boxGeometry args={[0.5, 0.35, 0.05]} />
            <meshStandardMaterial color="#020617" emissive="#22d3ee" emissiveIntensity={0.6} />
          </mesh>
          {/* Office chair 2 */}
          <group position={[cenX + width3D / 4, 0.45, cenZ + depth3D / 4 - 0.6]}>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.2, 0.25, 0.05, 12]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.4, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.5, 0.06, 0.5]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.5, 0.22]}>
              <boxGeometry args={[0.45, 0.5, 0.06]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
          </group>

          {/* Whiteboard */}
          <mesh position={[cenX - width3D / 2.1, 1.2, cenZ]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[1.8, 1.2, 0.05]} />
            <meshStandardMaterial color="#f8fafc" roughness={0.1} />
          </mesh>
          <mesh position={[cenX - width3D / 2.1, 0.5, cenZ]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[1.9, 0.05, 0.1]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>
      );
    case 'CONTROL CENTER':
      return (
        <group>
          {/* Large Central Command Table */}
          <mesh position={[cenX, 0.45, cenZ]} castShadow receiveShadow>
            <cylinderGeometry args={[1.4, 1.4, 0.9, 32]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Holographic Projection Core */}
          <mesh position={[cenX, 1.25, cenZ]}>
            <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
          <mesh position={[cenX, 1.7, cenZ]}>
            <sphereGeometry args={[0.8, 16, 16]} />
            <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={1.4} transparent opacity={0.4} wireframe />
          </mesh>
          {/* Front wall status screen */}
          <mesh position={[cenX, 2.0, cenZ - depth3D / 2 + 0.1]} castShadow>
            <boxGeometry args={[3.2, 1.2, 0.08]} />
            <meshStandardMaterial color="#020617" emissive="#8b5cf6" emissiveIntensity={0.8} />
          </mesh>
          {/* Operator chairs */}
          <mesh position={[cenX - 1.8, 0.45, cenZ]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.9, 12]} />
            <meshStandardMaterial color="#334155" roughness={0.5} />
          </mesh>
          <mesh position={[cenX + 1.8, 0.45, cenZ]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.9, 12]} />
            <meshStandardMaterial color="#334155" roughness={0.5} />
          </mesh>
        </group>
      );
    case 'SERVER ROOM':
      return (
        <group>
          {/* Multiple Tall Server Racks */}
          <mesh position={[cenX - 1.5, 1.2, cenZ - 0.8]} castShadow>
            <boxGeometry args={[0.6, 2.4, 1.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[cenX - 1.5 + 0.31, 1.2, cenZ - 0.8]}>
            <boxGeometry args={[0.02, 2.2, 1.0]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[cenX - 1.5, 1.2, cenZ + 0.8]} castShadow>
            <boxGeometry args={[0.6, 2.4, 1.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[cenX - 1.5 + 0.31, 1.2, cenZ + 0.8]}>
            <boxGeometry args={[0.02, 2.2, 1.0]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>

          <mesh position={[cenX + 1.5, 1.2, cenZ - 0.8]} castShadow>
            <boxGeometry args={[0.6, 2.4, 1.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[cenX + 1.5 - 0.31, 1.2, cenZ - 0.8]}>
            <boxGeometry args={[0.02, 2.2, 1.0]} />
            <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[cenX + 1.5, 1.2, cenZ + 0.8]} castShadow>
            <boxGeometry args={[0.6, 2.4, 1.2]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[cenX + 1.5 - 0.31, 1.2, cenZ + 0.8]}>
            <boxGeometry args={[0.02, 2.2, 1.0]} />
            <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.8} />
          </mesh>

          {/* Overhead cable tray */}
          <mesh position={[cenX, 3.8, cenZ]}>
            <boxGeometry args={[width3D * 0.9, 0.05, 0.2]} />
            <meshStandardMaterial color="#475569" metalness={0.9} />
          </mesh>
          <mesh position={[cenX - width3D / 3, 2.5, cenZ]}>
            <cylinderGeometry args={[0.08, 0.08, 2.5, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          <mesh position={[cenX + width3D / 3, 2.5, cenZ]}>
            <cylinderGeometry args={[0.08, 0.08, 2.5, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
        </group>
      );
    case 'COMMUNICATIONS ROOM':
      return (
        <group>
          {/* Comm console desk */}
          <mesh position={[cenX, 0.45, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[2.5, 0.9, 0.8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Signal wave monitor */}
          <mesh position={[cenX, 1.15, cenZ + depth3D / 4 - 0.1]}>
            <boxGeometry args={[0.9, 0.5, 0.05]} />
            <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.8} />
          </mesh>
          {/* Radio equipment rack */}
          <mesh position={[cenX - width3D / 3, 1.0, cenZ - depth3D / 3]} castShadow>
            <boxGeometry args={[0.8, 2.0, 0.8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          {/* Small indoor transceiver dish */}
          <mesh position={[cenX + width3D / 3, 1.2, cenZ - depth3D / 4]} rotation={[0, -Math.PI / 4, 0.2]} castShadow>
            <cylinderGeometry args={[0.5, 0.05, 0.1, 16]} />
            <meshStandardMaterial color="#64748b" metalness={0.9} />
          </mesh>
          <mesh position={[cenX + width3D / 3, 0.6, cenZ - depth3D / 4]}>
            <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
        </group>
      );
    case 'RESEARCH LAB':
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

          {/* Research Benches */}
          <mesh position={[cenX + width3D / 4, 0.45, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[1.8, 0.9, 0.9]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.3} />
          </mesh>
          {/* Microscope placeholder */}
          <mesh position={[cenX + width3D / 4, 1.1, cenZ - depth3D / 4]}>
            <cylinderGeometry args={[0.1, 0.15, 0.4, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          {/* Biosafety chemical cabinet */}
          <mesh position={[cenX - width3D / 3, 1.0, cenZ - depth3D / 3]} castShadow>
            <boxGeometry args={[0.8, 1.8, 0.8]} />
            <meshStandardMaterial color="#f1f5f9" metalness={0.7} roughness={0.1} />
          </mesh>
          {/* Yellow hazard warning decal */}
          <mesh position={[cenX - width3D / 3, 1.5, cenZ - depth3D / 3 + 0.41]}>
            <boxGeometry args={[0.4, 0.2, 0.02]} />
            <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    case 'MEDICAL LAB':
      return (
        <group>
          {/* Medical diagnostic beds */}
          <mesh position={[cenX - width3D / 4, 0.35, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[0.8, 0.7, 1.6]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          <mesh position={[cenX - width3D / 4, 0.75, cenZ - depth3D / 4]}>
            <boxGeometry args={[0.7, 0.1, 1.4]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} />
          </mesh>
          {/* Diagnostic screens next to beds */}
          <mesh position={[cenX - width3D / 4 - 0.5, 1.2, cenZ - depth3D / 4]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[0.35, 0.25, 0.05]} />
            <meshStandardMaterial color="#0f172a" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>

          <mesh position={[cenX + width3D / 4, 0.35, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.8, 0.7, 1.6]} />
            <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
          </mesh>
          <mesh position={[cenX + width3D / 4, 0.75, cenZ + depth3D / 4]}>
            <boxGeometry args={[0.7, 0.1, 1.4]} />
            <meshStandardMaterial color="#22c55e" roughness={0.8} />
          </mesh>
          <mesh position={[cenX + width3D / 4 - 0.5, 1.2, cenZ + depth3D / 4]} rotation={[0, 0.3, 0]}>
            <boxGeometry args={[0.35, 0.25, 0.05]} />
            <meshStandardMaterial color="#0f172a" emissive="#22c55e" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    case 'CAFETERIA':
      return (
        <group>
          {/* Dining tables and chairs */}
          <mesh position={[cenX - 1.2, 0.4, cenZ - 1.2]} castShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.8, 16]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.4} />
          </mesh>
          <mesh position={[cenX - 1.2 - 0.6, 0.2, cenZ - 1.2]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[cenX - 1.2 + 0.6, 0.2, cenZ - 1.2]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>

          <mesh position={[cenX + 1.2, 0.4, cenZ + 1.2]} castShadow>
            <cylinderGeometry args={[0.8, 0.8, 0.8, 16]} />
            <meshStandardMaterial color="#94a3b8" roughness={0.4} />
          </mesh>
          <mesh position={[cenX + 1.2 - 0.6, 0.2, cenZ + 1.2]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[cenX + 1.2 + 0.6, 0.2, cenZ + 1.2]} castShadow>
            <boxGeometry args={[0.3, 0.4, 0.3]} />
            <meshStandardMaterial color="#475569" />
          </mesh>

          {/* Vending machine */}
          <mesh position={[cenX - width3D / 3, 1.0, cenZ + depth3D / 3]} castShadow>
            <boxGeometry args={[0.8, 2.0, 0.8]} />
            <meshStandardMaterial color="#f43f5e" metalness={0.5} />
          </mesh>
          <mesh position={[cenX - width3D / 3 + 0.41, 1.2, cenZ + depth3D / 3]}>
            <boxGeometry args={[0.02, 0.6, 0.6]} />
            <meshStandardMaterial color="#020617" emissive="#38bdf8" emissiveIntensity={0.8} />
          </mesh>
        </group>
      );
    case 'ROOF ACCESS':
      return (
        <group>
          {/* Heavy airlock door frames */}
          <mesh position={[cenX, 1.5, cenZ - depth3D / 3]} castShadow>
            <boxGeometry args={[2.0, 3.0, 0.3]} />
            <meshStandardMaterial color="#475569" metalness={0.8} />
          </mesh>
          {/* Glass arch indicator */}
          <mesh position={[cenX, 3.1, cenZ - depth3D / 3]}>
            <boxGeometry args={[1.6, 0.2, 0.32]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.0} />
          </mesh>
          {/* Rooftop battery arrays */}
          <mesh position={[cenX + width3D / 4, 0.6, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[1.0, 1.2, 0.8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
        </group>
      );
    case 'ENGINEERING':
      return (
        <group>
          {/* Fluid pumps & Control cabinets */}
          <mesh position={[cenX - 1.0, 0.6, cenZ]} castShadow>
            <cylinderGeometry args={[0.5, 0.6, 1.2, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
          <mesh position={[cenX - 1.0, 1.2, cenZ]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.7, 0.12, 8, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
          <mesh position={[cenX + 1.0, 0.9, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[1.2, 1.8, 0.6]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
          </mesh>
          {/* Steam pipe valve */}
          <mesh position={[cenX - 1.0, 1.8, cenZ]}>
            <cylinderGeometry args={[0.08, 0.08, 1.2, 8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
        </group>
      );
    case 'MAINTENANCE':
      return (
        <group>
          {/* Workbench with tool panels */}
          <mesh position={[cenX, 0.45, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[2.2, 0.9, 0.8]} />
            <meshStandardMaterial color="#475569" roughness={0.5} />
          </mesh>
          <mesh position={[cenX - 0.8, 1.2, cenZ - depth3D / 4 + 0.1]}>
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial color="#b45309" metalness={0.9} />
          </mesh>
          {/* Spares cabinet */}
          <mesh position={[cenX + width3D / 3, 1.0, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.8, 2.0, 0.8]} />
            <meshStandardMaterial color="#334155" metalness={0.7} />
          </mesh>
          {/* Battery canisters on shelves */}
          <mesh position={[cenX - width3D / 3, 0.35, cenZ + depth3D / 4]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.6, 12]} />
            <meshStandardMaterial color="#eab308" metalness={0.8} />
          </mesh>
          <mesh position={[cenX - width3D / 3 + 0.3, 0.35, cenZ + depth3D / 4]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 0.6, 12]} />
            <meshStandardMaterial color="#eab308" metalness={0.8} />
          </mesh>
        </group>
      );
    case 'STORAGE':
      return (
        <group>
          {/* Cargo pallets & Crates */}
          <mesh position={[cenX - width3D / 4, 0.45, cenZ - depth3D / 4]} castShadow>
            <boxGeometry args={[1.2, 0.9, 1.2]} />
            <meshStandardMaterial color="#d97706" roughness={0.9} />
          </mesh>
          <mesh position={[cenX + width3D / 4, 0.35, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.8, 0.7, 0.8]} />
            <meshStandardMaterial color="#b45309" roughness={0.9} />
          </mesh>
          {/* Large crate stack */}
          <mesh position={[cenX + width3D / 4, 1.1, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {/* Industrial shelves */}
          <mesh position={[cenX - width3D / 4, 1.0, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[1.2, 2.0, 0.4]} />
            <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} wireframe />
          </mesh>
          {/* Crates on shelf */}
          <mesh position={[cenX - width3D / 4, 0.6, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.4]} />
            <meshStandardMaterial color="#b45309" roughness={0.9} />
          </mesh>
        </group>
      );
    case 'GENERATOR ROOM':
      return (
        <group>
          {/* Massive Central Fuel Generator Core */}
          <mesh position={[cenX, 1.8, cenZ]} castShadow>
            <cylinderGeometry args={[1.6, 2.0, 3.6, 24]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.15} />
          </mesh>
          {/* Copper pipe loops */}
          <mesh position={[cenX, 1.8, cenZ]}>
            <torusGeometry args={[1.8, 0.12, 12, 24]} />
            <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[cenX, 3.6, cenZ]}>
            <cylinderGeometry args={[1.2, 1.2, 0.3, 24]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
          {/* Steel safety rails */}
          <mesh position={[cenX - 2.2, 0.6, cenZ]}>
            <boxGeometry args={[0.08, 1.2, 3.0]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          <mesh position={[cenX + 2.2, 0.6, cenZ]}>
            <boxGeometry args={[0.08, 1.2, 3.0]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          {/* Overhead fuel pipelines */}
          <mesh position={[cenX, 4.2, cenZ]}>
            <cylinderGeometry args={[0.12, 0.12, width3D * 0.9, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.8} />
          </mesh>
        </group>
      );
    case 'REACTOR / POWER CORE':
      return (
        <group>
          {/* Massive restricted Core Chamber */}
          <mesh position={[cenX, 2.0, cenZ]} castShadow>
            <cylinderGeometry args={[1.4, 1.8, 4.0, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Core high energy radiation core glow */}
          <mesh position={[cenX, 2.0, cenZ]}>
            <cylinderGeometry args={[1.42, 1.42, 2.2, 16]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1.8} transparent opacity={0.65} />
          </mesh>
          {/* Overhead safety warning frame */}
          <mesh position={[cenX, 0.8, cenZ]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.2, 0.16, 8, 24]} />
            <meshStandardMaterial color="#eab308" metalness={0.8} />
          </mesh>
          {/* Safety caution sign board */}
          <mesh position={[cenX - 2.0, 1.2, cenZ]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[0.8, 0.5, 0.05]} />
            <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.6} />
          </mesh>
        </group>
      );
    case 'UTILITY ROOM':
      return (
        <group>
          {/* Cylindrical water treatment tubes */}
          <mesh position={[cenX - 0.8, 0.9, cenZ - depth3D / 4]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 1.8, 12]} />
            <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[cenX + 0.8, 0.9, cenZ - depth3D / 4]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 1.8, 12]} />
            <meshStandardMaterial color="#0284c7" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Connecting pipes */}
          <mesh position={[cenX - 0.8, 0.9, cenZ - depth3D / 4 + 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
          <mesh position={[cenX + 0.8, 0.9, cenZ - depth3D / 4 + 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
          </mesh>
          {/* Large air ventilation boxes */}
          <mesh position={[cenX, 1.2, cenZ + depth3D / 4]} castShadow>
            <boxGeometry args={[1.4, 1.4, 1.0]} />
            <meshStandardMaterial color="#475569" roughness={0.6} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
};

export default Facility;
