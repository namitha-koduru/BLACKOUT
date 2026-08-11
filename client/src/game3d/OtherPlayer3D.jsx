// game3d/OtherPlayer3D.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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

const OtherPlayer3D = ({ name, avatar, targetX, targetZ, isDisconnected, isAlive, playerIdx }) => {
  const meshRef = useRef();
  const currentPos = useRef({ x: targetX, z: targetZ });

  const safeIdx = playerIdx !== undefined && playerIdx >= 0 ? playerIdx : 0;
  const accentColor = ACCENT_COLORS[safeIdx % ACCENT_COLORS.length];

  useFrame((state, delta) => {
    currentPos.current.x += (targetX - currentPos.current.x) * 0.15;
    currentPos.current.z += (targetZ - currentPos.current.z) * 0.15;

    if (meshRef.current) {
      const floorY = getFloorHeight(currentPos.current.x, currentPos.current.z);
      meshRef.current.position.set(currentPos.current.x, floorY, currentPos.current.z);
    }
  });

  return (
    <group ref={meshRef} position={[targetX, getFloorHeight(targetX, targetZ), targetZ]}>
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
              color={isDisconnected ? '#f43f5e' : '#0f172a'}
              emissive={isDisconnected ? '#ef4444' : '#22d3ee'}
              emissiveIntensity={isDisconnected ? 1.8 : 1.2}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>

          {/* COLORED STRIPES */}
          <mesh position={[-0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>

          {/* SMALL SOFT DOWN-LIGHT UNDER OTHER PLAYER */}
          <pointLight
            position={[0, -0.65, 0]}
            color={accentColor}
            intensity={1.8}
            distance={3.0}
            decay={2}
          />
        </group>
      ) : (
        /* DECEASED SPECTATOR GHOST */
        <group position={[0, 0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial
              color={accentColor}
              transparent={true}
              opacity={0.35}
              wireframe={true}
            />
          </mesh>
        </group>
      )}

      {/* DISCONNECTED OR HAZARD BADGE */}
      {isDisconnected && isAlive && (
        <Html position={[0, 2.1, 0]} center distanceFactor={8}>
          <div className="px-1.5 py-0.2 bg-red-900 border border-red-500 text-[8px] font-bold text-white rounded uppercase animate-pulse font-mono">
            LINK OFFLINE
          </div>
        </Html>
      )}

      {/* RESPONSIVE HOLOGRAPHIC NAMEPLATE LABEL */}
      <Html position={[0, 1.8, 0]} center distanceFactor={8}>
        <div className="px-2 py-0.5 bg-[#172235]/90 border border-white/10 rounded text-[9px] font-bold font-mono text-white select-none whitespace-nowrap shadow-md uppercase tracking-wider">
          <span>{avatar}</span> <span style={{ color: accentColor }}>{name}</span>
        </div>
      </Html>
    </group>
  );
};

export default OtherPlayer3D;
