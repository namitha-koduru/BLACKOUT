// game3d/World.jsx
import React from 'react';
import Facility from './Facility.jsx';
import Player3D from './Player3D.jsx';
import OtherPlayer3D from './OtherPlayer3D.jsx';
import CameraController from './CameraController.jsx';
import Lighting from './Lighting.jsx';
import { useRoomStore } from '../store/roomStore.js';
import { useUserStore } from '../store/userStore.js';

export const SCALE = 0.08; // scale factor to translate 2D coordinate values to 3D meters

const World = ({ posX, posY, activeRepairSession, nearSystem, nearTerminal, onInteract, settings }) => {
  const room = useRoomStore((state) => state.room);
  const playerId = useUserStore((state) => state.playerId);
  const playerPositions = useRoomStore((state) => state.playerPositions);

  if (!room || !room.game) return null;

  // Sync door lockdown states
  const lockedDoors = Object.keys(room.game?.sabotages?.lockedDoors || {})
    .filter((k) => room.game.sabotages.lockedDoors[k] > Date.now());

  return (
    <>
      {/* 3D LIGHTING & ALARM STATES */}
      <Lighting settings={settings} />

      {/* SUBTLE FACILITY FOG */}
      {settings.effects && <fogExp2 attach="fog" color="#101827" density={0.035} />}

      {/* 3D FACILITY LAYOUT (FLOORS, WALLS, DOORS, SYSTEMS) */}
      <Facility lockedDoors={lockedDoors} />

      {/* OTHER PLAYERS IN ROOM */}
      {Object.keys(playerPositions).map((pId) => {
        if (pId === playerId) return null;
        const pos = playerPositions[pId];
        const pData = room.players.find((p) => p.id === pId);
        if (!pData || !pos) return null;

        // Obtain visual accent color from player list idx
        const playerIdx = room.players.findIndex((p) => p.id === pId);
        
        return (
          <OtherPlayer3D
            key={pId}
            name={pData.name}
            avatar={pData.avatar}
            targetX={pos.x * SCALE}
            targetZ={pos.y * SCALE}
            isDisconnected={!pos.connected}
            isAlive={room.game?.players?.[pId]?.isAlive !== false}
            playerIdx={playerIdx}
          />
        );
      })}

      {/* LOCAL CONTROLLABLE PLAYER */}
      {(() => {
        const myData = room.players.find((p) => p.id === playerId);
        const myGameData = room.game?.players?.[playerId];
        if (!myData) return null;

        const playerIdx = room.players.findIndex((p) => p.id === playerId);

        return (
          <Player3D
            x={posX * SCALE}
            z={posY * SCALE}
            name={myData.name}
            avatar={myData.avatar}
            isAlive={myGameData?.isAlive !== false}
            playerIdx={playerIdx}
          />
        );
      })()}

      {/* CAMERA FOLLOWING RIG */}
      <CameraController
        targetX={posX * SCALE}
        targetZ={posY * SCALE}
        activeRepairSession={activeRepairSession}
        nearSystem={nearSystem}
        nearTerminal={nearTerminal}
      />
    </>
  );
};

export default World;
