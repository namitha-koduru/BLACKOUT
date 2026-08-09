// game3d/OtherPlayer3D.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

const ACCENT_COLORS = ['#22d3ee', '#f59e0b', '#8b5cf6', '#22c55e', '#ec4899', '#3b82f6', '#f43f5e', '#cbd5e1'];

const OtherPlayer3D = ({ name, avatar, targetX, targetZ, isDisconnected, isAlive, playerIdx }) => {
  const meshRef = useRef();
  
  // Local mutable positions to interpolate smoothly
  const currentPos = useRef({ x: targetX, z: targetZ });

  const safeIdx = playerIdx !== undefined && playerIdx >= 0 ? playerIdx : 0;
  const accentColor = ACCENT_COLORS[safeIdx % ACCENT_COLORS.length];

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
              color={isDisconnected ? '#f43f5e' : '#22d3ee'}
              emissive={isDisconnected ? '#ef4444' : '#22d3ee'}
              emissiveIntensity={isDisconnected ? 1.5 : 0.8}
            />
          </mesh>

          {/* COLORED STRIPES */}
          <mesh position={[-0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
          <mesh position={[0.23, 0.25, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>

          {/* SMALL SOFT DOWN-LIGHT UNDER OTHER PLAYER */}
          <pointLight
            position={[0, -0.65, 0]}
            color={accentColor}
            intensity={1.5}
            distance={2.5}
            decay={2}
          />
        </group>
      ) : (
        /* DECEASED SPECTATOR GHOST */
        <group position={[0, 0.5, 0]}>
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial
              color="#94a3b8"
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
          <span>{avatar}</span> <span className="text-[#cbd5e1]">{name}</span>
        </div>
      </Html>
    </group>
  );
};

export default OtherPlayer3D;
