// game3d/Facility.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SCALE } from './World.jsx';
import { useRoomStore } from '../store/roomStore.js';
import * as THREE from 'three';

// 2D Facility Layout Walkable Rectangles from server bounds
const WALKABLE_AREAS = [
  // Rooms
  { name: 'CENTRAL HUB', x: 450, y: 300, w: 300, h: 250, type: 'room', color: '#10131e' },
  { name: 'SECURITY', x: 450, y: 50, w: 300, h: 150, type: 'room', color: '#11151e' },
  { name: 'LAB', x: 100, y: 300, w: 250, h: 250, type: 'room', color: '#121921' },
  { name: 'GENERATOR', x: 850, y: 300, w: 250, h: 250, type: 'room', color: '#1b1212' },
  { name: 'COMMUNICATIONS', x: 450, y: 650, w: 300, h: 150, type: 'room', color: '#131922' },
  { name: 'MEDICAL', x: 450, y: 850, w: 300, h: 120, type: 'room', color: '#0f1b1b' },
  { name: 'STORAGE', x: 100, y: 650, w: 250, h: 150, type: 'room', color: '#181814' },
  { name: 'CONTROL ROOM', x: 850, y: 50, w: 250, h: 150, type: 'room', color: '#151b15' },
  { name: 'EXIT', x: 850, y: 650, w: 250, h: 150, type: 'room', color: '#0d1512' },

  // Hallways/Passages
  { name: 'HALLWAY_HUB_SECURITY', x: 575, y: 200, w: 50, h: 100, type: 'hallway', color: '#090b10' },
  { name: 'HALLWAY_HUB_LAB', x: 350, y: 400, w: 100, h: 50, type: 'hallway', color: '#090b10' },
  { name: 'HALLWAY_HUB_GENERATOR', x: 750, y: 400, w: 100, h: 50, type: 'hallway', color: '#090b10' },
  { name: 'HALLWAY_HUB_COMMS', x: 575, y: 550, w: 50, h: 100, type: 'hallway', color: '#090b10' },
  { name: 'HALLWAY_COMMS_MEDICAL', x: 575, y: 800, w: 50, h: 50, type: 'hallway', color: '#090b10' },
  { name: 'HALLWAY_LAB_STORAGE', x: 200, y: 550, w: 50, h: 100, type: 'hallway', color: '#090b10' },
  { name: 'HALLWAY_SECURITY_CONTROL', x: 750, y: 100, w: 100, h: 50, type: 'hallway', color: '#090b10' },
  { name: 'HALLWAY_GENERATOR_EXIT', x: 950, y: 550, w: 50, h: 100, type: 'hallway', color: '#090b10' }
];

// Interactive System Consoles
const SYSTEM_CONSOLES = [
  { id: 'generator', name: 'Generator', room: 'GENERATOR', x: 975, y: 425 },
  { id: 'communications', name: 'Communications', room: 'COMMUNICATIONS', x: 600, y: 725 },
  { id: 'security', name: 'Security', room: 'SECURITY', x: 600, y: 125 },
  { id: 'medical', name: 'Medical', room: 'MEDICAL', x: 600, y: 910 },
  { id: 'control', name: 'Control System', room: 'CONTROL ROOM', x: 975, y: 125 }
];

const DoorGate3D = ({ name, x, y, w, h, isLocked }) => {
  const leftRef = useRef();
  const rightRef = useRef();

  useFrame((state) => {
    // Basic automatic sliding animation based on player proximity triggers
    // In our simplified setup, if the door is locked it remains shut.
    if (isLocked) {
      if (leftRef.current) leftRef.current.position.x = 0;
      if (rightRef.current) rightRef.current.position.x = 0;
    } else {
      // Check distance of camera/player model to slide open
      // We will read the player positions from store
      const stateStore = useRoomStore.getState();
      const mePos = stateStore.room?.game?.players?.[stateStore.socket?.id]?.position;
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
      if (leftRef.current) {
        leftRef.current.position.x = -slideDist;
      }
      if (rightRef.current) {
        rightRef.current.position.x = slideDist;
      }
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
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[w * SCALE * 0.5, 1.25, 0]}>
        <boxGeometry args={[0.2, 2.5, 0.4]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[w * SCALE, 0.2, 0.4]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* LEFT SLIDING LEAF */}
      <mesh ref={leftRef} position={[-w * SCALE * 0.25, 1.1, 0]}>
        <boxGeometry args={[w * SCALE * 0.5, 2.2, 0.08]} />
        <meshStandardMaterial
          color={isLocked ? '#822' : '#4a5568'}
          metalness={0.8}
          roughness={0.2}
          emissive={isLocked ? '#b11' : '#000'}
          emissiveIntensity={isLocked ? 0.35 : 0}
        />
      </mesh>
      {/* RIGHT SLIDING LEAF */}
      <mesh ref={rightRef} position={[w * SCALE * 0.25, 1.1, 0]}>
        <boxGeometry args={[w * SCALE * 0.5, 2.2, 0.08]} />
        <meshStandardMaterial
          color={isLocked ? '#822' : '#4a5568'}
          metalness={0.8}
          roughness={0.2}
          emissive={isLocked ? '#b11' : '#000'}
          emissiveIntensity={isLocked ? 0.35 : 0}
        />
      </mesh>

      {/* LOCKDOWN INDICATOR */}
      {isLocked && (
        <mesh position={[0, 2.2, 0.1]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
    </group>
  );
};

const Console3D = ({ consoleData, systemState }) => {
  const cenX = consoleData.x * SCALE;
  const cenZ = consoleData.y * SCALE;
  
  // Decide terminal visual color indicators from system health status
  let indicatorColor = '#10b981'; // Green (Online)
  if (systemState) {
    if (systemState.status === 'DAMAGED') indicatorColor = '#f59e0b'; // Amber
    else if (systemState.status === 'CRITICAL') indicatorColor = '#f97316'; // Orange
    else if (systemState.status === 'OFFLINE') indicatorColor = '#ef4444'; // Red
  }

  return (
    <group position={[cenX, 0, cenZ]}>
      {/* BASE PILLAR */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.6, 1.1, 0.6]} />
        <meshStandardMaterial color="#1a202c" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* SLANTED CONSOLE SLAB */}
      <mesh position={[0, 1.05, 0.15]} rotation={[Math.PI / 6, 0, 0]}>
        <boxGeometry args={[0.8, 0.2, 0.5]} />
        <meshStandardMaterial color="#2d3748" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* GLOWING HOLOGRAPHIC SCREEN PANEL */}
      <mesh position={[0, 1.25, 0.1]}>
        <planeGeometry args={[0.6, 0.45]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive={indicatorColor}
          emissiveIntensity={0.85}
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
            {/* WALKABLE FLOOR SLAB */}
            <mesh position={[cenX, -0.05, cenZ]}>
              <boxGeometry args={[width3D, 0.1, depth3D]} />
              <meshStandardMaterial
                color={area.color}
                roughness={0.7}
                metalness={area.type === 'hallway' ? 0.3 : 0.5}
              />
            </mesh>

            {/* DECORATIVE BOUNDARY WALL BORDER FRAME */}
            <mesh position={[cenX, 1.5, cenZ]}>
              <boxGeometry args={[width3D, 3.0, depth3D]} />
              <meshStandardMaterial
                color="#0c0d14"
                roughness={0.9}
                metalness={0.1}
                wireframe={true} // Holographic frame outline style
              />
            </mesh>
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
