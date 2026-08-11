// game3d/Player3D.jsx
import React from 'react';
import { Html } from '@react-three/drei';
import { getFloorHeight } from './Facility.jsx';

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

const Player3D = ({ x, z, name, avatar, isAlive, playerIdx }) => {
  const safeIdx = playerIdx !== undefined && playerIdx >= 0 ? playerIdx : 0;
  const accentColor = ACCENT_COLORS[safeIdx % ACCENT_COLORS.length];
  const floorY = getFloorHeight(x, z);

  return (
    <group position={[x, floorY, z]}>
      {/* 3D CHARACTER TECHNICAL MESH */}
      {isAlive ? (
        <group position={[0, 0.7, 0]}>
          {/* BODY SUIT (CAPSULE) - MAIN ACCENT COLOR */}
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.22, 0.95, 8, 16]} />
            <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.2} />
          </mesh>

          {/* BACKPACK SYSTEM - SOLID STEEL GRID */}
          <mesh position={[0, 0.1, -0.18]} castShadow>
            <boxGeometry args={[0.22, 0.55, 0.18]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
          </mesh>

          {/* BRIGHT GLOWING VISOR SCREEN */}
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

          {/* COLORED SHOULDER BEACONS */}
          <mesh position={[-0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* SMALL SOFT DOWN-LIGHT UNDER PLAYER */}
          <pointLight
            position={[0, -0.65, 0]}
            color={accentColor}
            intensity={2.2}
            distance={3.0}
            decay={2}
          />
        </group>
      ) : (
        /* DECEASED GHOST / SPECTATOR GHOST */
        <group position={[0, 0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial
              color={accentColor}
              transparent={true}
              opacity={0.45}
              wireframe={true}
            />
          </mesh>
        </group>
      )}

      {/* GLOWING PERSONAL ACCENT BASE RING */}
      {isAlive && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color={accentColor} side={2} />
        </mesh>
      )}

      {/* RESPONSIVE HOLOGRAPHIC NAMEPLATE LABEL */}
      <Html position={[0, 1.8, 0]} center distanceFactor={8}>
        <div className="px-2 py-0.5 bg-[#172235]/95 border border-[#22d3ee]/40 rounded text-[9px] font-bold font-mono text-white select-none whitespace-nowrap shadow-md uppercase tracking-widest">
          <span>{avatar}</span> <span style={{ color: accentColor }}>{name}</span>
        </div>
      </Html>
    </group>
  );
};

export default Player3D;
