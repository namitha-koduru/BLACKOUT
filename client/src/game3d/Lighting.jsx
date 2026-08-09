// game3d/Lighting.jsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRoomStore } from '../store/roomStore.js';

const Lighting = ({ settings }) => {
  const room = useRoomStore((state) => state.room);
  const redLightRef1 = useRef();
  const redLightRef2 = useRef();
  const cyanLightRef = useRef();

  if (!room || !room.game) return null;

  // Read alarm and sabotage states
  const systems = room.game.systems || {};
  const isBlackoutActive = room.game.blackoutActive === true;
  const isCommsOffline = room.game.communicationsDisabled === true;
  const isSecurityDegraded = room.game.securityDegraded === true;

  // Check if any system is at critical health (< 40%)
  const hasCriticalSystem = Object.values(systems).some((s) => s.health > 0 && s.health <= 40);
  const hasOfflineSystem = Object.values(systems).some((s) => s.health === 0);
  const isEmergency = hasCriticalSystem || hasOfflineSystem || isBlackoutActive;

  // Compute ambient properties
  let ambientColor = '#e2e8f0'; // Cool facility slate
  let ambientIntensity = 0.55;

  if (isBlackoutActive) {
    ambientColor = '#1a0505'; // Very dark reddish glow
    ambientIntensity = 0.08;
  } else if (isEmergency) {
    ambientColor = '#2d1515'; // Dim red facility hazard
    ambientIntensity = 0.25;
  } else if (isCommsOffline) {
    ambientColor = '#102030'; // Cyan/blue static
    ambientIntensity = 0.4;
  } else if (isSecurityDegraded) {
    ambientColor = '#2d2515'; // Amber static
    ambientIntensity = 0.35;
  }

  // Animation ticks for pulsing alarm lights
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    // Pulse red alarm lights
    if (isEmergency) {
      const pulse = Math.sin(elapsed * 5.0) * 1.5 + 1.5;
      if (redLightRef1.current) redLightRef1.current.intensity = pulse;
      if (redLightRef2.current) redLightRef2.current.intensity = pulse;
    } else {
      if (redLightRef1.current) redLightRef1.current.intensity = 0;
      if (redLightRef2.current) redLightRef2.current.intensity = 0;
    }

    // Flicker blue/cyan light during comms sabotage
    if (isCommsOffline) {
      const flicker = Math.random() > 0.15 ? 1.5 : 0.2;
      if (cyanLightRef.current) cyanLightRef.current.intensity = flicker;
    } else {
      if (cyanLightRef.current) cyanLightRef.current.intensity = 0;
    }
  });

  return (
    <>
      {/* GLOBAL AMBIENT LIGHT */}
      <ambientLight color={ambientColor} intensity={ambientIntensity} />

      {/* MAIN DIRECTIONAL SUNLIGHT (SHADOW CASTING) */}
      {!isBlackoutActive && (
        <directionalLight
          position={[10, 20, 10]}
          intensity={isEmergency ? 0.25 : 0.8}
          color={isSecurityDegraded ? '#fbbf24' : '#f8fafc'}
          castShadow={settings.shadows}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
      )}

      {/* RED EMERGENCY ALARM POINTLIGHTS */}
      <pointLight
        ref={redLightRef1}
        position={[25, 3.5, 20]}
        color="#ef4444"
        distance={25}
        intensity={0}
      />
      <pointLight
        ref={redLightRef2}
        position={[75, 3.5, 60]}
        color="#ef4444"
        distance={25}
        intensity={0}
      />

      {/* FLICKERING CYAN POINTLIGHT (COMMS STATION AREA) */}
      <pointLight
        ref={cyanLightRef}
        position={[48, 2.5, 58]}
        color="#06b6d4"
        distance={15}
        intensity={0}
      />
    </>
  );
};

export default Lighting;
