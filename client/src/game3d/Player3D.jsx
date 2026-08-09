// game3d/Player3D.jsx
import React from 'react';
import { Html } from '@react-three/drei';

const ACCENT_COLORS = ['#06b6d4', '#f59e0b', '#8b5cf6', '#10b981', '#f1f5f9', '#ec4899', '#3b82f6'];

const Player3D = ({ x, z, name, avatar, isAlive, playerIdx }) => {
  const accentColor = ACCENT_COLORS[playerIdx % ACCENT_COLORS.length];

  return (
    <group position={[x, 0, z]}>
      {/* 3D CHARACTER TECHNICAL MESH */}
      {isAlive ? (
        <group position={[0, 0.7, 0]}>
          {/* BODY SUIT (CAPSULE) */}
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.22, 0.95, 8, 16]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
          </mesh>

          {/* BACKPACK SYSTEM */}
          <mesh position={[0, 0.1, -0.18]} castShadow>
            <boxGeometry args={[0.22, 0.55, 0.18]} />
            <meshStandardMaterial color={accentColor} metalness={0.6} roughness={0.3} />
          </mesh>

          {/* GLOWING VISOR SCREEN */}
          <mesh position={[0, 0.35, 0.14]}>
            <sphereGeometry args={[0.13, 16, 16]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={0.65}
            />
          </mesh>

          {/* ACCENT STRIPES ON SHOULDERS */}
          <mesh position={[-0.23, 0.25, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          <mesh position={[0.23, 0.25, 0]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
        </group>
      ) : (
        /* DECEASED SPECTATOR GHOST / MARKER */
        <group position={[0, 0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial
              color="#64748b"
              transparent={true}
              opacity={0.4}
              wireframe={true}
            />
          </mesh>
        </group>
      )}

      {/* GLOWING PERSONAL BASE RING */}
      {isAlive && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.34, 32]} />
          <meshBasicMaterial color={accentColor} side={2} />
        </mesh>
      )}

      {/* RESPONSIVE HOLOGRAPHIC NAMEPLATE LABEL */}
      <Html position={[0, 1.8, 0]} center distanceFactor={8}>
        <div className="px-2 py-0.5 bg-slate-950/85 border border-cyan-500/30 rounded text-[9px] font-bold font-mono text-white select-none whitespace-nowrap shadow-md uppercase tracking-wider">
          <span>{avatar}</span> <span className="text-cyan-400">{name}</span>
        </div>
      </Html>
    </group>
  );
};

export default Player3D;
