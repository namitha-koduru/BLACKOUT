// game3d/Player3D.jsx
import React from 'react';
import { Html } from '@react-three/drei';

const ACCENT_COLORS = ['#22d3ee', '#f59e0b', '#8b5cf6', '#22c55e', '#ec4899', '#3b82f6', '#f43f5e', '#cbd5e1'];

const Player3D = ({ x, z, name, avatar, isAlive, playerIdx }) => {
  const safeIdx = playerIdx !== undefined && playerIdx >= 0 ? playerIdx : 0;
  const accentColor = ACCENT_COLORS[safeIdx % ACCENT_COLORS.length];

  return (
    <group position={[x, 0, z]}>
      {/* 3D CHARACTER TECHNICAL MESH */}
      {isAlive ? (
        <group position={[0, 0.7, 0]}>
          {/* BODY SUIT (CAPSULE) - BRIGHTER BLUE-GRAY */}
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.22, 0.95, 8, 16]} />
            <meshStandardMaterial color="#273449" metalness={0.4} roughness={0.4} />
          </mesh>

          {/* BACKPACK SYSTEM */}
          <mesh position={[0, 0.1, -0.18]} castShadow>
            <boxGeometry args={[0.22, 0.55, 0.18]} />
            <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.3} />
          </mesh>

          {/* BRIGHT GLOWING VISOR SCREEN */}
          <mesh position={[0, 0.35, 0.14]}>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={1.2}
            />
          </mesh>

          {/* COLORED SHOULDER BEACONS */}
          <mesh position={[-0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          <mesh position={[0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>

          {/* SMALL SOFT DOWN-LIGHT UNDER PLAYER */}
          <pointLight
            position={[0, -0.65, 0]}
            color={accentColor}
            intensity={1.8}
            distance={2.5}
            decay={2}
          />
        </group>
      ) : (
        /* DECEASED GHOST / SPECTATOR GHOST */
        <group position={[0, 0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial
              color="#cbd5e1"
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
          <span>{avatar}</span> <span className="text-[#f8fafc]">{name}</span>
        </div>
      </Html>
    </group>
  );
};

export default Player3D;
