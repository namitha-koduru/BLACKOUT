// game3d/OtherPlayer3D.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const ACCENT_COLORS = ['#06b6d4', '#f59e0b', '#8b5cf6', '#10b981', '#f1f5f9', '#ec4899', '#3b82f6'];

const OtherPlayer3D = ({ name, avatar, targetX, targetZ, isDisconnected, isAlive, playerIdx }) => {
  const meshRef = useRef();
  
  // Local mutable positions to interpolate smoothly
  const currentPos = useRef({ x: targetX, z: targetZ });

  const accentColor = ACCENT_COLORS[playerIdx % ACCENT_COLORS.length];

  useFrame((state, delta) => {
    // Smooth linear interpolation (lerp) towards server target coordinates
    currentPos.current.x += (targetX - currentPos.current.x) * 0.15;
    currentPos.current.z += (targetZ - currentPos.current.z) * 0.15;

    if (meshRef.current) {
      meshRef.current.position.set(currentPos.current.x, 0, currentPos.current.z);
    }
  });

  return (
    <group ref={meshRef} position={[targetX, 0, targetZ]}>
      {/* 3D CHARACTER TECHNICAL MESH */}
      {isAlive ? (
        <group position={[0, 0.7, 0]}>
          {/* BODY SUIT (CAPSULE) */}
          <mesh castShadow receiveShadow>
            <capsuleGeometry args={[0.22, 0.95, 8, 16]} />
            <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.5} />
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
              color={isDisconnected ? '#b91c1c' : '#475569'}
              emissive={isDisconnected ? '#ef4444' : '#000'}
              emissiveIntensity={isDisconnected ? 0.8 : 0}
            />
          </mesh>

          {/* ACCENT STRIPES */}
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
              color="#475569"
              transparent={true}
              opacity={0.25}
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
        <div className="px-2 py-0.5 bg-slate-950/80 border border-white/10 rounded text-[9px] font-bold font-mono text-white select-none whitespace-nowrap shadow-md uppercase tracking-wider">
          <span>{avatar}</span> <span className="text-slate-300">{name}</span>
        </div>
      </Html>
    </group>
  );
};

export default OtherPlayer3D;
