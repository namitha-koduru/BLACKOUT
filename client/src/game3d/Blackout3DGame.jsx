// game3d/Blackout3DGame.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useUserStore } from '../store/userStore.js';
import { useRoomStore } from '../store/roomStore.js';
import World from './World.jsx';
import Minimap3D from './Minimap3D.jsx';
import InteractionPrompt from './InteractionPrompt.jsx';
import RoleReveal from '../components/RoleReveal.jsx';
import GameStartCountdown from '../components/GameStartCountdown.jsx';
import MeetingScreen from '../components/MeetingScreen.jsx';
import EliminatedOverlay from '../components/EliminatedOverlay.jsx';
import SabotagePanel from '../components/SabotagePanel.jsx';
import InvestigationPanel from '../components/InvestigationPanel.jsx';
import CircuitRepair from '../components/CircuitRepair.jsx';
import FuseAlignment from '../components/FuseAlignment.jsx';
import SignalCalibration from '../components/SignalCalibration.jsx';
import PowerRouting from '../components/PowerRouting.jsx';
import SystemRestart from '../components/SystemRestart.jsx';
import TaskModal from '../components/TaskModal.jsx';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TASK_POSITIONS = {
  generator_calibration: { x: 220, y: 1110 },
  coolant_pressure: { x: 520, y: 1110 },
  camera_alignment: { x: 920, y: 190 },
  server_maintenance: { x: 1300, y: 460 },
  sample_analysis: { x: 920, y: 840 },
  comms_calibration: { x: 1300, y: 770 },
  water_purification: { x: 900, y: 1110 },
  air_filtration: { x: 980, y: 1110 },
  fuel_transfer: { x: 220, y: 750 },
  power_routing: { x: 220, y: 450 },
  access_reset: { x: 980, y: 190 },
  data_backup: { x: 1380, y: 460 },
  reactor_temp: { x: 620, y: 1110 },
  sensor_calibration: { x: 550, y: 800 },
  facility_inspection: { x: 940, y: 525 }
};

// Walkable rectangles for boundary check (duplicates server definitions)
const WALKABLE_AREAS = [
  // Rooms
  { name: 'CENTRAL ATRIUM', x: 800, y: 400, w: 280, h: 250, type: 'room' },
  { name: 'SECURITY', x: 800, y: 100, w: 250, h: 180, type: 'room' },
  { name: 'OFFICES', x: 450, y: 400, w: 250, h: 200, type: 'room' },
  { name: 'CONTROL CENTER', x: 1180, y: 100, w: 280, h: 200, type: 'room' },
  { name: 'SERVER ROOM', x: 1180, y: 380, w: 280, h: 220, type: 'room' },
  { name: 'COMMUNICATIONS ROOM', x: 1180, y: 680, w: 250, h: 180, type: 'room' },
  { name: 'RESEARCH LAB', x: 450, y: 700, w: 280, h: 220, type: 'room' },
  { name: 'MEDICAL LAB', x: 800, y: 750, w: 250, h: 180, type: 'room' },
  { name: 'CAFETERIA', x: 1180, y: 920, w: 280, h: 220, type: 'room' },
  { name: 'ROOF ACCESS', x: 450, y: 100, w: 250, h: 180, type: 'room' },
  { name: 'ENGINEERING', x: 100, y: 100, w: 250, h: 200, type: 'room' },
  { name: 'MAINTENANCE', x: 100, y: 380, w: 250, h: 200, type: 'room' },
  { name: 'STORAGE', x: 100, y: 680, w: 250, h: 250, type: 'room' },
  { name: 'GENERATOR ROOM', x: 100, y: 1000, w: 250, h: 220, type: 'room' },
  { name: 'REACTOR / POWER CORE', x: 450, y: 1000, w: 280, h: 220, type: 'room' },
  { name: 'UTILITY ROOM', x: 800, y: 1020, w: 250, h: 180, type: 'room' },

  // Hallways
  { name: 'HALLWAY_ROOF_OFFICES', x: 550, y: 280, w: 60, h: 120, type: 'hallway' },
  { name: 'HALLWAY_OFFICES_ATRIUM', x: 700, y: 480, w: 100, h: 60, type: 'hallway' },
  { name: 'HALLWAY_ATRIUM_SECURITY', x: 910, y: 280, w: 60, h: 120, type: 'hallway' },
  { name: 'HALLWAY_SECURITY_CONTROL', x: 1050, y: 160, w: 130, h: 60, type: 'hallway' },
  { name: 'HALLWAY_CONTROL_SERVER', x: 1290, y: 300, w: 60, h: 80, type: 'hallway' },
  { name: 'HALLWAY_ATRIUM_SERVER', x: 1080, y: 460, w: 100, h: 60, type: 'hallway' },
  { name: 'HALLWAY_SERVER_COMMS', x: 1290, y: 600, w: 60, h: 80, type: 'hallway' },
  { name: 'HALLWAY_ATRIUM_COMMS', x: 1080, y: 730, w: 100, h: 60, type: 'hallway' },
  { name: 'HALLWAY_COMMS_CAFETERIA', x: 1290, y: 860, w: 60, h: 60, type: 'hallway' },
  { name: 'HALLWAY_ATRIUM_MEDICAL', x: 900, y: 650, w: 60, h: 100, type: 'hallway' },
  { name: 'HALLWAY_MEDICAL_UTILITY', x: 900, y: 930, w: 60, h: 90, type: 'hallway' },
  { name: 'HALLWAY_ATRIUM_LAB', x: 700, y: 760, w: 100, h: 60, type: 'hallway' },
  { name: 'HALLWAY_LAB_REACTOR', x: 560, y: 920, w: 60, h: 80, type: 'hallway' },
  { name: 'HALLWAY_STAIRS', x: 350, y: 750, w: 100, h: 60, type: 'hallway' },
  { name: 'HALLWAY_ELEVATOR', x: 350, y: 450, w: 100, h: 60, type: 'hallway' },
  { name: 'HALLWAY_ENGINEERING_MAINTENANCE', x: 190, y: 300, w: 60, h: 80, type: 'hallway' },
  { name: 'HALLWAY_MAINTENANCE_STORAGE', x: 190, y: 580, w: 60, h: 100, type: 'hallway' },
  { name: 'HALLWAY_STORAGE_GENERATOR', x: 190, y: 930, w: 60, h: 70, type: 'hallway' },
  { name: 'HALLWAY_GENERATOR_REACTOR', x: 350, y: 1080, w: 100, h: 60, type: 'hallway' },
  { name: 'HALLWAY_REACTOR_UTILITY', x: 730, y: 1080, w: 70, h: 60, type: 'hallway' }
];

const SYSTEM_CONSOLES = [
  { id: 'generator', name: 'Generator', room: 'GENERATOR ROOM', x: 220, y: 1110 },
  { id: 'communications', name: 'Communications', room: 'COMMUNICATIONS ROOM', x: 1300, y: 770 },
  { id: 'security', name: 'Security', room: 'SECURITY', x: 920, y: 190 },
  { id: 'medical', name: 'Medical', room: 'MEDICAL LAB', x: 920, y: 840 },
  { id: 'control', name: 'Control System', room: 'CONTROL CENTER', x: 1320, y: 200 }
];

const isValidPosition = (x, y) => {
  return WALKABLE_AREAS.some(
    (area) => x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h
  );
};

// React Error Boundary for Three.js/WebGL Failures
class ThreeErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("WebGL 3D Context Crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#101827] text-center font-mono p-6">
          <div className="text-3xl text-red-500 animate-pulse">⚠️</div>
          <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">FACILITY INITIALIZATION ERROR</h2>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Something went wrong while loading the 3D facility. WebGL graphics context or rendering engine crashed.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Retry Link
            </button>
            <button
              onClick={this.props.onReturn}
              className="px-4 py-2.5 bg-[#22304a] hover:bg-[#2d3e5e] text-white rounded-xl text-xs font-bold transition-all uppercase"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const Blackout3DGame = () => {
  const playerId = useUserStore((state) => state.playerId);
  const room = useRoomStore((state) => state.room);
  const timer = useRoomStore((state) => state.timer);
  const myRoleInfo = useRoomStore((state) => state.myRoleInfo);
  const returnToLobby = useRoomStore((state) => state.returnToLobby);
  const sendChatMessage = useRoomStore((state) => state.sendChatMessage);
  const sendPlayerMove = useRoomStore((state) => state.sendPlayerMove);
  const sendPlayerStopped = useRoomStore((state) => state.sendPlayerStopped);
  const setOnMovementError = useRoomStore((state) => state.setOnMovementError);
  const startRepair = useRoomStore((state) => state.startRepair);
  const completeRepair = useRoomStore((state) => state.completeRepair);
  const failRepair = useRoomStore((state) => state.failRepair);
  const discoverTerminalEvidence = useRoomStore((state) => state.discoverTerminalEvidence);
  const callEmergencyMeeting = useRoomStore((state) => state.callEmergencyMeeting);

  const startTask = useRoomStore((state) => state.startTask);
  const completeTask = useRoomStore((state) => state.completeTask);
  const killAttempt = useRoomStore((state) => state.killAttempt);
  const reportBody = useRoomStore((state) => state.reportBody);
  const killCooldownEnd = useRoomStore((state) => state.killCooldownEnd);

  // Position States
  const [posX, setPosX] = useState(600);
  const [posY, setPosY] = useState(425);
  const [currentRoom, setCurrentRoom] = useState('CENTRAL ATRIUM');

  // Level transition alert UI states
  const [alertRoom, setAlertRoom] = useState('CENTRAL ATRIUM');
  const [alertLevel, setAlertLevel] = useState(1);
  const [showLevelAlert, setShowLevelAlert] = useState(false);

  // Input states
  const activeKeys = useRef({});
  const lastEmitTime = useRef(0);
  const wasMoving = useRef(false);

  // Focus managers
  const [nearSystem, setNearSystem] = useState(null);
  const [nearTerminal, setNearTerminal] = useState(null);
  const [nearTask, setNearTask] = useState(null);
  const [nearBody, setNearBody] = useState(null);
  const [nearKillTarget, setNearKillTarget] = useState(null);
  const [activeRepairSession, setActiveRepairSession] = useState(null);
  const [activeTaskSession, setActiveTaskSession] = useState(null);
  const [sabPanelOpen, setSabPanelOpen] = useState(false);
  const [investigateOpen, setInvestigateOpen] = useState(false);
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const [fakeTasks, setFakeTasks] = useState([]);

  // UI settings
  const [graphicsSettings, setGraphicsSettings] = useState({
    shadows: true,
    effects: true,
    particles: true
  });

  const isHost = room?.hostId === playerId;
  const currentPhase = room?.game?.phase || 'countdown';
  const myPlayerAlive = room?.game?.players?.[playerId]?.isAlive === true;
  const myRoleName = myRoleInfo?.role || 'Crew';
  const myTeamName = myRoleInfo?.team || 'crew';
  const isSaboteurTeam = myTeamName.toLowerCase() === 'saboteur';

  // Check WebGL availability
  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    };
    setWebGLAvailable(checkWebGL());
  }, []);

  // Level alert calculator helper
  const getRoomLevel = (roomName) => {
    const lowerRooms = [
      'ENGINEERING', 'MAINTENANCE', 'STORAGE',
      'GENERATOR ROOM', 'REACTOR / POWER CORE', 'UTILITY ROOM'
    ];
    return lowerRooms.includes(roomName) ? 2 : 1;
  };

  // Trigger level/sector alert when entering rooms
  useEffect(() => {
    if (currentRoom) {
      const lvl = getRoomLevel(currentRoom);
      setAlertRoom(currentRoom);
      setAlertLevel(lvl);
      setShowLevelAlert(true);
      const t = setTimeout(() => {
        setShowLevelAlert(false);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [currentRoom]);

  // Handle spawn position update on game start
  useEffect(() => {
    if (room?.game?.players?.[playerId]?.position) {
      const pos = room.game.players[playerId].position;
      setPosX(pos.x);
      setPosY(pos.y);
    }
  }, [room?.game?.players, playerId]);

  // Rollback error handles
  useEffect(() => {
    setOnMovementError((rollbackX, rollbackY) => {
      setPosX(rollbackX);
      setPosY(rollbackY);
      toast.error('Mainframe speed violation: rollbacked position.');
    });
    return () => setOnMovementError(null);
  }, [setOnMovementError]);

  // Keyboard Event bindings
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        activeKeys.current[key] = true;
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        activeKeys.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Imposter fake tasks generator
  useEffect(() => {
    if (isSaboteurTeam && fakeTasks.length === 0) {
      const keys = Object.keys(TASK_POSITIONS);
      const shuffled = [...keys].sort(() => Math.random() - 0.5).slice(0, 4);
      setFakeTasks(shuffled.map(k => ({
        taskId: k,
        name: k.split('_').join(' ').toUpperCase(),
        roomId: k === 'generator_calibration' ? 'GENERATOR ROOM' : k === 'coolant_pressure' ? 'REACTOR / ENGINEERING' : k === 'camera_alignment' ? 'SECURITY' : 'FACILITY',
        status: 'NOT_STARTED'
      })));
    }
  }, [isSaboteurTeam, fakeTasks]);

  // Proximity trigger interaction keybinds
  useEffect(() => {
    const handleKeyDown = async (e) => {
      if (document.activeElement.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      
      // E: Repair System OR Start Task
      if (key === 'e' && currentPhase === 'exploration' && myPlayerAlive) {
        if (nearSystem && !activeRepairSession) {
          const res = await startRepair(room.roomCode, playerId, nearSystem.id);
          if (res.success) {
            setActiveRepairSession({
              systemId: nearSystem.id,
              systemName: nearSystem.name,
              session: res.session,
              gameType: res.gameType || 1
            });
          } else {
            toast.error(res.message || 'Terminal connection failed.');
          }
          return;
        }

        if (nearTask && !activeTaskSession) {
          if (isSaboteurTeam) {
            toast.error('ACCESS DENIED: SYSTEM AUTHORIZATION FAILURE', { icon: '🚫' });
            return;
          }
          const res = await startTask(room.roomCode, playerId, nearTask.taskId);
          if (res.success) {
            setActiveTaskSession(res.task);
          } else {
            toast.error(res.message || 'Task terminal access failed.');
          }
          return;
        }
      }

      // I: Investigate Database Logs
      if (key === 'i' && nearTerminal && currentPhase === 'exploration' && myPlayerAlive) {
        try {
          const res = await discoverTerminalEvidence(room.roomCode, playerId, nearTerminal.id);
          if (res.success) {
            toast.success(`Log decrypted: ${res.evidence.description.substring(0, 45)}...`, { icon: '🔍' });
          } else {
            toast.error(res.message || 'Evidence database firewall block.');
          }
        } catch (err) {
          toast.error('Decryption script failed.');
        }
      }

      // R: Report Body
      if (key === 'r' && nearBody && currentPhase === 'exploration' && myPlayerAlive) {
        try {
          const res = await reportBody(room.roomCode, playerId, nearBody.id);
          if (res.success) {
            toast.success('Body reported. Initiating emergency sirens!');
          } else {
            toast.error(res.message || 'Body report rejected.');
          }
        } catch (err) {
          toast.error('Transmitter fault.');
        }
      }

      // F: Kill Target
      if (key === 'f' && nearKillTarget && currentPhase === 'exploration' && myPlayerAlive && isSaboteurTeam) {
        try {
          const res = await killAttempt(room.roomCode, playerId, nearKillTarget.id);
          if (res.success) {
            toast.success('Signature terminated.');
          } else {
            toast.error(res.message || 'Kill sequence rejected.');
          }
        } catch (err) {
          toast.error('Laser actuator failed.');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nearSystem, nearTerminal, nearTask, nearBody, nearKillTarget, activeRepairSession, activeTaskSession, room, playerId, currentPhase, myPlayerAlive, isSaboteurTeam, startRepair, discoverTerminalEvidence, startTask, reportBody, killAttempt]);

  // Movement Frame Tick Loop
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const tick = (time) => {
      const delta = time - lastTime;
      lastTime = time;

      let dx = 0;
      let dy = 0;

      if (currentPhase === 'exploration' && myPlayerAlive && !activeRepairSession && !activeTaskSession) {
        if (activeKeys.current['w'] || activeKeys.current['arrowup']) dy -= 1;
        if (activeKeys.current['s'] || activeKeys.current['arrowdown']) dy += 1;
        if (activeKeys.current['a'] || activeKeys.current['arrowleft']) dx -= 1;
        if (activeKeys.current['d'] || activeKeys.current['arrowright']) dx += 1;
      }

      if (dx !== 0 || dy !== 0) {
        if (dx !== 0 && dy !== 0) {
          dx *= 0.7071;
          dy *= 0.7071;
        }

        const speed = 0.18;
        const nextX = Math.round(posX + dx * speed * delta);
        const nextY = Math.round(posY + dy * speed * delta);

        let isLockedDoor = false;
        const targetArea = WALKABLE_AREAS.find(
          (area) => nextX >= area.x && nextX <= area.x + area.w && nextY >= area.y && nextY <= area.y + area.h
        );
        if (targetArea && targetArea.type === 'hallway') {
          const lockVal = room?.game?.sabotages?.lockedDoors?.[targetArea.name];
          if (lockVal && Date.now() < lockVal) {
            isLockedDoor = true;
          }
        }

        if (isValidPosition(nextX, nextY) && !isLockedDoor) {
          setPosX(nextX);
          setPosY(nextY);
          wasMoving.current = true;

          if (targetArea && targetArea.type === 'room' && targetArea.name !== currentRoom) {
            setCurrentRoom(targetArea.name);
          }

          const now = Date.now();
          if (now - lastEmitTime.current >= 50) {
            sendPlayerMove(room.roomCode, playerId, nextX, nextY);
            lastEmitTime.current = now;
          }
        }
      } else if (wasMoving.current) {
        wasMoving.current = false;
        sendPlayerStopped(room.roomCode, playerId, posX, posY);
      }

      // Systems Diagnostic
      let nearestSys = null;
      let nearestTerm = null;
      let minDistance = 90;

      SYSTEM_CONSOLES.forEach((sys) => {
        const dist = Math.hypot(posX - sys.x, posY - sys.y);
        if (dist < minDistance) {
          nearestTerm = { id: sys.id, name: sys.name };
          
          const sysState = room?.game?.systems?.[sys.id];
          if (sysState && sysState.health < 100) {
            nearestSys = { id: sys.id, name: sys.name, health: sysState.health, x: sys.x, y: sys.y };
          }
        }
      });

      setNearSystem(nearestSys);
      setNearTerminal(nearestTerm);

      // 1. Task Proximity checks
      let nearestTask = null;
      let minTaskDist = 80;
      if (myPlayerAlive) {
        if (isSaboteurTeam) {
          Object.keys(TASK_POSITIONS).forEach((tId) => {
            const pos = TASK_POSITIONS[tId];
            const dist = Math.hypot(posX - pos.x, posY - pos.y);
            if (dist < minTaskDist) {
              nearestTask = { taskId: tId, name: tId.split('_').join(' ').toUpperCase(), fake: true };
              minTaskDist = dist;
            }
          });
        } else {
          const myTasks = room?.game?.playerTasks?.[playerId] || [];
          myTasks.forEach((t) => {
            if (t.status !== 'COMPLETED') {
              const pos = TASK_POSITIONS[t.taskId];
              if (pos) {
                const dist = Math.hypot(posX - pos.x, posY - pos.y);
                if (dist < minTaskDist) {
                  nearestTask = t;
                  minTaskDist = dist;
                }
              }
            }
          });
        }
      }
      setNearTask(nearestTask);

      // 2. Dead body Proximity checks
      let nearestBody = null;
      let minBodyDist = 80;
      if (myPlayerAlive) {
        const bodies = room?.game?.bodies || [];
        bodies.forEach((b) => {
          const dist = Math.hypot(posX - b.position.x, posY - b.position.y);
          if (dist < minBodyDist) {
            nearestBody = b;
            minBodyDist = dist;
          }
        });
      }
      setNearBody(nearestBody);

      // 3. Kill targets Proximity checks
      let nearestKillTarget = null;
      let minKillDist = 80;
      if (isSaboteurTeam && myPlayerAlive) {
        const playerPositions = useRoomStore.getState().playerPositions;
        room.players.forEach((p) => {
          if (p.id !== playerId) {
            const gp = room.game?.players?.[p.id];
            const pos = playerPositions?.[p.id];
            if (gp?.isAlive && gp?.team === 'crew' && pos) {
              const dist = Math.hypot(posX - pos.x, posY - pos.y);
              if (dist < minKillDist) {
                nearestKillTarget = p;
                minKillDist = dist;
              }
            }
          }
        });
      }
      setNearKillTarget(nearestKillTarget);

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [posX, posY, currentPhase, myPlayerAlive, activeRepairSession, activeTaskSession, room, currentRoom, playerId, sendPlayerMove, sendPlayerStopped, isSaboteurTeam]);

  // Mini-game repair handlers
  const handleMiniGameComplete = async () => {
    if (!activeRepairSession) return;
    const ok = await completeRepair(room.roomCode, playerId, activeRepairSession.systemId, activeRepairSession.session);
    if (ok) {
      toast.success('Integrity restored!');
      setActiveRepairSession(null);
    }
  };

  const handleMiniGameFail = () => {
    if (activeRepairSession) {
      failRepair(room.roomCode, playerId, activeRepairSession.systemId);
      setActiveRepairSession(null);
    }
  };

  const handleReturnToLobby = () => {
    returnToLobby(room.roomCode, playerId);
  };

  // Safe checks for rendering
  if (!room || !room.game) {
    return (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs uppercase tracking-widest text-[#22d3ee] bg-[#101827]">
        <span className="animate-pulse">Accessing facility mainframe...</span>
      </div>
    );
  }

  if (!webGLAvailable) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#101827] text-center font-mono p-6">
        <div className="text-3xl text-red-500 animate-pulse">⚠️</div>
        <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">3D GRAPHICS UNAVAILABLE</h2>
        <p className="text-xs text-[#cbd5e1] max-w-sm leading-relaxed">
          Your browser or device cannot initialize the WebGL 3D facility stage. Please enable hardware acceleration.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  const isBlackoutActive = room.game?.blackoutActive === true;

  const renderMiniGame = () => {
    if (!activeRepairSession) return null;
    const gType = activeRepairSession.gameType;

    switch (gType) {
      case 1:
        return <CircuitRepair onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 2:
        return <FuseAlignment onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 3:
        return <SignalCalibration onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 4:
        return <PowerRouting onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      case 5:
        return <SystemRestart onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
      default:
        return <CircuitRepair onComplete={handleMiniGameComplete} onCancel={handleMiniGameFail} />;
    }
  };

  const globalProgress = room.game?.globalTaskProgress || 0;
  const myTasks = room.game?.playerTasks?.[playerId] || [];

  return (
    <div className="relative h-screen w-screen bg-[#101827] overflow-hidden select-none font-mono">
      
      {/* 3D CANVAS PORTAL */}
      <div className="absolute inset-0 z-0">
        <ThreeErrorBoundary onReturn={handleReturnToLobby}>
          <Canvas camera={{ fov: 45, position: [0, 5, 8] }} shadows>
            <World
              posX={posX}
              posY={posY}
              activeRepairSession={activeRepairSession}
              nearSystem={nearSystem}
              nearTerminal={nearTerminal}
              settings={graphicsSettings}
            />
          </Canvas>
        </ThreeErrorBoundary>
      </div>

      {/* SECTOR / LEVEL TRANSITION ALERT UI */}
      <AnimatePresence>
        {showLevelAlert && (
          <motion.div
            initial={{ opacity: 0, x: -100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="absolute top-1/4 left-8 z-30 pointer-events-none flex flex-col gap-1 select-none"
          >
            {/* Sci-Fi Warning Header */}
            <div className="flex items-center gap-2">
              <div className="h-[2px] w-6 bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black text-cyan-400 tracking-[0.25em] uppercase font-mono animate-pulse">
                SYSTEM DECK DETECTED
              </span>
            </div>

            {/* Main Sector Title Card */}
            <div className="relative overflow-hidden bg-slate-950/85 border-y-2 border-l-4 border-cyan-400/80 px-6 py-4 backdrop-blur-md shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              {/* Scanline pattern overlay inside card */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-25" />
              {/* Diagonal warning hazard corner */}
              <div className="absolute top-0 right-0 h-full w-2 bg-[repeating-linear-gradient(-45deg,#22d3ee,#22d3ee_4px,#0f172a_4px,#0f172a_8px)]" />

              <div className="flex flex-col text-left">
                <span className="text-[11px] text-cyan-500/70 font-mono tracking-widest uppercase">
                  LEVEL 0{alertLevel} : {alertLevel === 1 ? 'SURFACE DECK' : 'DEEP RESEARCH SUB-LEVEL'}
                </span>
                <span className="text-2xl font-black text-white tracking-wide mt-1 uppercase font-mono drop-shadow-[0_2px_8px_rgba(255,255,255,0.25)]">
                  {alertRoom}
                </span>
              </div>
            </div>

            {/* Status Footer */}
            <div className="flex items-center gap-3 text-[8px] font-mono text-cyan-500/60 uppercase tracking-widest pl-1 mt-0.5">
              <span>GPS SYNCED</span>
              <span>•</span>
              <span className="text-emerald-400 animate-pulse">ONLINE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCREEN SCANLINES DECORATOR */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] z-20 opacity-30"></div>

      {/* POWER BLACKOUT DARK OVERLAY */}
      {isBlackoutActive && (
        <div className="absolute inset-0 bg-red-950/40 pointer-events-none mix-blend-color-burn z-10 transition-all duration-1000 animate-pulse" />
      )}

      {/* GLOBAL CREW TASKS PROGRESS BAR */}
      {currentPhase === 'exploration' && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-80 bg-[#172235]/95 border border-[#22d3ee]/35 rounded-xl p-2.5 backdrop-blur shadow-md flex flex-col items-center pointer-events-auto">
          <div className="flex justify-between w-full text-[9px] font-black uppercase text-slate-400 tracking-wider">
            <span>Crew Tasks Completed</span>
            <span className="text-[#22d3ee] font-extrabold">{globalProgress}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 border border-white/5 rounded-full overflow-hidden mt-1.5">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500" style={{ width: `${globalProgress}%` }} />
          </div>
        </div>
      )}

      {/* TRANSPARENT HUD OVERLAY PANELS */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 pointer-events-none">
        
        {/* Top Panel: Header HUD */}
        <div className="flex justify-between items-start w-full">
          {/* Header left */}
          <div className="bg-[#172235]/90 border border-[#22d3ee]/35 p-3 rounded-xl text-left pointer-events-auto flex items-center gap-3 shadow-md shadow-cyan-950/20">
            <div className={`w-2.5 h-2.5 rounded-full ${isBlackoutActive ? 'bg-[#ef4444] animate-ping' : 'bg-[#22d3ee]'}`} />
            <div>
              <div className="text-[10px] text-[#f8fafc] font-black tracking-widest uppercase">FACILITY MAIN DIVISION</div>
              <div className="text-[8px] text-[#cbd5e1]">SECTOR: <span className="text-[#22d3ee] font-bold">{currentRoom}</span></div>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <div className="text-[7px] text-[#cbd5e1] uppercase">Phase</div>
              <div className="text-[9px] text-[#22d3ee] font-extrabold">{currentPhase.replace('_', ' ')}</div>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <div className="text-[7px] text-[#cbd5e1] uppercase">Timer</div>
              <div className="text-[10px] font-black text-[#f59e0b]">{String(timer).padStart(2, '0')}s</div>
            </div>
          </div>

          {/* Roster right */}
          <div className="bg-[#172235]/90 border border-[#22304a]/50 p-3 rounded-xl pointer-events-auto max-h-[140px] overflow-y-auto flex flex-col gap-1 w-48 shadow-md">
            <div className="text-[8px] text-[#94a3b8] border-b border-white/5 pb-1 mb-1 font-black uppercase text-left">
              Personnel Connected ({room.players.length})
            </div>
            {room.players.map((p) => {
              const pState = room.game?.players?.[p.id];
              const isDisconnected = !p.connected;
              const isMe = p.id === playerId;
              
              return (
                <div key={p.id} className="flex justify-between items-center text-[8px] leading-relaxed">
                  <span className="text-[#cbd5e1] truncate max-w-[80px] text-left">
                    {p.avatar} {p.name} {isMe && '(You)'}
                  </span>
                  <span>
                    {isDisconnected ? (
                      <span className="text-[#ef4444] font-bold uppercase text-[7px] animate-pulse">Offline</span>
                    ) : pState?.isAlive === false ? (
                      <span className="text-[#cbd5e1]/40 uppercase text-[7px]">☠ Deceased</span>
                    ) : (
                      <span className="text-[#22c55e] font-bold text-[7px]">Online</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PERSONAL TASK LIST / DECEPTION CHECKLIST */}
        {currentPhase === 'exploration' && myPlayerAlive && (
          <div className="absolute top-24 left-4 z-20 w-60 bg-[#172235]/95 border border-[#22d3ee]/25 rounded-xl p-3 backdrop-blur shadow-md text-left max-h-56 overflow-y-auto pointer-events-auto">
            {isSaboteurTeam ? (
              <>
                <div className="text-[10px] font-black text-red-400 border-b border-red-500/20 pb-1.5 mb-2 uppercase tracking-widest">
                  🔴 Fake Tasks (Deception)
                </div>
                <div className="flex flex-col gap-2">
                  {fakeTasks.map((t) => (
                    <div key={t.taskId} className="flex flex-col text-[9px] font-mono leading-tight">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{t.name}</span>
                        <span className="text-slate-500 uppercase text-[8px]">PRETEND</span>
                      </div>
                      <span className="text-[8px] text-slate-500 uppercase">{t.roomId}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] font-black text-[#22d3ee] border-b border-cyan-500/20 pb-1.5 mb-2 uppercase tracking-widest">
                  🛰️ Assigned Tasks
                </div>
                <div className="flex flex-col gap-2">
                  {myTasks.map((t) => (
                    <div key={t.taskId} className="flex flex-col text-[9px] font-mono leading-tight">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${t.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                          {t.name}
                        </span>
                        <span className={t.status === 'COMPLETED' ? 'text-emerald-400 font-bold' : t.status === 'IN_PROGRESS' ? 'text-yellow-500' : 'text-slate-500'}>
                          {t.status === 'COMPLETED' ? '✓ DONE' : t.status === 'IN_PROGRESS' ? 'WORKING' : 'PENDING'}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-500 uppercase">{t.roomId}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Proximity Action Prompts / Touch Control HUD */}
        {currentPhase === 'exploration' && (
          <div className="self-center flex flex-col items-center gap-1.5 pointer-events-auto">
            {nearSystem && (
              <InteractionPrompt label={nearSystem.name} actionName="REPAIR" />
            )}
            {nearTerminal && !nearSystem && (
              <InteractionPrompt label={nearTerminal.name} actionName="QUERY LOG" />
            )}
            {nearTask && !nearSystem && (
              <InteractionPrompt label={nearTask.name} actionName="START TASK" />
            )}
            {nearBody && (
              <InteractionPrompt label={`DECEASED: ${room.players.find(p => p.id === nearBody.victimId)?.name || 'Worker'}`} actionName="REPORT BODY [R]" />
            )}

            {/* TOUCH/CLICK TRIGGER FOR MOBILE */}
            <div className="flex gap-2 mt-2">
              {nearTask && !activeTaskSession && (
                <button
                  onClick={async () => {
                    if (isSaboteurTeam) {
                      toast.error('ACCESS DENIED: SYSTEM AUTHORIZATION FAILURE', { icon: '🚫' });
                      return;
                    }
                    const res = await startTask(room.roomCode, playerId, nearTask.taskId);
                    if (res.success) {
                      setActiveTaskSession(res.task);
                    } else {
                      toast.error(res.message || 'Task terminal access failed.');
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 border border-cyan-400/30 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow"
                >
                  🛰️ Start Task
                </button>
              )}

              {nearBody && (
                <button
                  onClick={async () => {
                    const res = await reportBody(room.roomCode, playerId, nearBody.id);
                    if (res.success) {
                      toast.success('Body reported!');
                    } else {
                      toast.error(res.message || 'Transmitter block.');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 border border-red-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow animate-pulse"
                >
                  ☠️ Report Body
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bottom Section */}
        <div className="flex justify-between items-end w-full">
          {/* Left panel: Minimap and system health */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            <div className="bg-[#172235]/90 border border-[#22304a]/50 p-3 rounded-xl w-48 text-left shadow-md">
              <div className="text-[8px] text-[#94a3b8] border-b border-white/5 pb-1 mb-1 font-black uppercase">
                Systems Diagnostics
              </div>
              {Object.keys(room.game.systems).map((sId) => {
                const sys = room.game.systems[sId];
                return (
                  <div key={sId} className="flex justify-between items-center text-[8px] mt-1 leading-relaxed">
                    <span className="text-[#cbd5e1] uppercase">{sId}</span>
                    <span className={sys.health === 0 ? 'text-[#ef4444] font-black animate-pulse' : sys.health <= 40 ? 'text-[#f59e0b] font-bold' : 'text-[#22d3ee]'}>
                      {sys.health}%
                    </span>
                  </div>
                );
              })}
            </div>
            <Minimap3D posX={posX} posY={posY} />
          </div>

          {/* Center chat channel (standard feed) */}
          <div className="bg-[#172235]/90 border border-[#22304a]/50 rounded-xl w-[320px] h-36 flex flex-col overflow-hidden pointer-events-auto self-end shadow-md">
            <div className="border-b border-white/5 px-2 py-1.5 text-[8px] text-[#94a3b8] text-left font-black uppercase tracking-widest">
              comms feed
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 max-h-24">
              {room.chat.slice(-8).map((msg, i) => {
                const isSystem = msg.senderId === 'system';
                const isMe = msg.senderId === playerId;
                return (
                  <div key={i} className="text-left text-[9px] leading-snug">
                    {!isSystem && (
                      <span className={`font-bold mr-1 ${isMe ? 'text-[#22d3ee]' : 'text-[#cbd5e1]'}`}>
                        {msg.senderName}:
                      </span>
                    )}
                    <span className={isSystem ? 'text-[#f59e0b] italic text-[8px]' : 'text-[#f8fafc]'}>
                      {msg.text}
                    </span>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const text = e.target.elements.chatInput.value;
                if (text?.trim()) {
                  sendChatMessage(room.roomCode, playerId, text.trim());
                  e.target.reset();
                }
              }}
              className="border-t border-white/5 p-1.5 flex bg-black/40"
            >
              <input
                name="chatInput"
                type="text"
                disabled={room.game.communicationsDisabled}
                placeholder={room.game.communicationsDisabled ? '📡 INTERFERENCE LOGGED' : 'Broadcast to sector...'}
                className="flex-1 bg-black/50 border border-white/5 px-2 py-1 text-[9px] text-[#f8fafc] focus:outline-none focus:border-[#22d3ee] disabled:text-red-500/40"
              />
              <button type="submit" disabled={room.game.communicationsDisabled} className="bg-[#22d3ee] hover:bg-cyan-500 text-slate-950 px-3 py-1 rounded text-[9px] font-black uppercase disabled:bg-slate-900 disabled:text-slate-600">
                Send
              </button>
            </form>
          </div>

          {/* Right Panel: Abilities, Meetings, settings */}
          <div className="flex flex-col gap-2 w-44 pointer-events-auto">
            {currentPhase === 'exploration' && myPlayerAlive && (
              <>
                {/* SABOTAGE / KILL ABILITIES FOR SABOTEURS */}
                {isSaboteurTeam ? (
                  <div className="flex flex-col gap-1.5 p-2 bg-[#2e1515]/80 border border-red-500/20 rounded-xl">
                    {/* KILL BUTTON */}
                    {(() => {
                      const now = Date.now();
                      const cooldownRemaining = Math.max(0, Math.ceil((killCooldownEnd - now) / 1000));
                      const canKillNow = cooldownRemaining === 0 && nearKillTarget;

                      return (
                        <button
                          disabled={!canKillNow}
                          onClick={async () => {
                            const res = await killAttempt(room.roomCode, playerId, nearKillTarget.id);
                            if (res.success) {
                              toast.success('Target eliminated!');
                            } else {
                              toast.error(res.message || 'Kill request blocked.');
                            }
                          }}
                          className={`w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow transition-all ${
                            canKillNow
                              ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse border border-red-500'
                              : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          💀 Kill {cooldownRemaining > 0 ? `(${cooldownRemaining}s)` : 'Ready'}
                        </button>
                      );
                    })()}

                    {/* SABOTAGE TRIGGER */}
                    <button
                      onClick={() => setSabPanelOpen(!sabPanelOpen)}
                      className={`w-full py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow transition-all ${
                        sabPanelOpen
                          ? 'bg-[#ef4444] text-[#f8fafc] border-red-400'
                          : 'bg-red-950/20 border-red-500/20 text-[#ef4444]'
                      }`}
                    >
                      ⚠️ Sabotage
                    </button>
                  </div>
                ) : (
                  /* EMERGENCY MEETING FOR CREW */
                  <button
                    onClick={() => {
                      callEmergencyMeeting(room.roomCode, playerId);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-[#22d3ee] to-[#8b5cf6] border border-cyan-500/20 text-white hover:scale-[1.01] rounded-xl text-[9px] font-black uppercase tracking-widest shadow"
                  >
                    📢 Call Meeting
                  </button>
                )}

                {/* INVESTIGATE MODAL BTN */}
                <button
                  onClick={() => setInvestigateOpen(true)}
                  className="w-full py-2 bg-[#22304a] border border-white/10 text-[#cbd5e1] hover:bg-[#2d3e5e] rounded-xl text-[9px] font-black uppercase tracking-wider shadow"
                >
                  🔍 Query Logs
                </button>
              </>
            )}

            {/* Graphics quality triggers */}
            <div className="bg-[#172235]/90 border border-white/5 p-2 rounded-xl text-left text-[8px] flex flex-col gap-1.5">
              <div className="font-black text-[#94a3b8] uppercase border-b border-white/5 pb-1 mb-1">
                Visual Options
              </div>
              <div className="flex justify-between">
                <span>Shadows</span>
                <button
                  onClick={() => setGraphicsSettings((prev) => ({ ...prev, shadows: !prev.shadows }))}
                  className={`px-1.5 rounded font-bold ${graphicsSettings.shadows ? 'bg-[#22d3ee] text-slate-950' : 'bg-slate-800 text-slate-500'}`}
                >
                  {graphicsSettings.shadows ? 'ON' : 'OFF'}
                </button>
              </div>
              <div className="flex justify-between">
                <span>Effects</span>
                <button
                  onClick={() => setGraphicsSettings((prev) => ({ ...prev, effects: !prev.effects }))}
                  className={`px-1.5 rounded font-bold ${graphicsSettings.effects ? 'bg-[#22d3ee] text-slate-950' : 'bg-slate-800 text-slate-500'}`}
                >
                  {graphicsSettings.effects ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Return to Lobby host button */}
            {isHost && (
              <button
                onClick={handleReturnToLobby}
                className="w-full py-2 bg-red-950/20 border border-red-500/20 text-[#ef4444] hover:bg-red-950/45 rounded-xl text-[9px] font-bold uppercase tracking-wide"
              >
                Return to Lobby
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODALS & OVERLAYS */}
      <AnimatePresence>
        {/* Sabotage panel modal overlay */}
        {sabPanelOpen && isSaboteurTeam && currentPhase === 'exploration' && (
          <div className="absolute top-20 right-6 z-30">
            <SabotagePanel onClose={() => setSabPanelOpen(false)} />
          </div>
        )}

        {/* Investigation database logs overlay */}
        {investigateOpen && (
          <InvestigationPanel onClose={() => setInvestigateOpen(false)} />
        )}

        {/* Holographic repair panel mini-game */}
        {activeRepairSession && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-[#172235] border border-[#22d3ee]/40 p-5 rounded-2xl max-w-lg w-full flex flex-col items-center shadow-2xl">
              <h3 className="text-sm font-black text-[#22d3ee] mb-4 uppercase tracking-widest">
                RESTORATION UNIT: {activeRepairSession.systemName}
              </h3>
              {renderMiniGame()}
            </div>
          </div>
        )}

        {/* Holographic task panel mini-game */}
        {activeTaskSession && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-auto">
            <div className="bg-[#172235] border border-[#22d3ee]/40 p-5 rounded-2xl max-w-lg w-full flex flex-col items-center shadow-2xl">
              <TaskModal
                task={activeTaskSession}
                onComplete={async () => {
                  const res = await completeTask(room.roomCode, playerId, activeTaskSession.taskId);
                  if (res.success) {
                    setActiveTaskSession(null);
                  }
                }}
                onCancel={() => {
                  setActiveTaskSession(null);
                }}
              />
            </div>
          </div>
        )}

        {/* Role assignments reveals */}
        {currentPhase === 'role_assignment' && (
          <div className="absolute inset-0 bg-[#101827] z-50 flex items-center justify-center">
            <RoleReveal timer={timer} roleInfo={myRoleInfo} />
          </div>
        )}

        {/* Synchronized Match Countdown overlay */}
        {currentPhase === 'countdown' && (
          <div className="absolute inset-0 bg-[#101827]/85 backdrop-blur-sm z-50 flex items-center justify-center">
            <GameStartCountdown timer={timer} />
          </div>
        )}

        {/* Emergency Meeting discussion & voting phases */}
        {room.gameState === 'meeting' && (
          <div className="absolute inset-0 bg-[#101827]/95 backdrop-blur-md z-40">
            <MeetingScreen />
          </div>
        )}

        {/* Eliminated status display for ghost spectators */}
        {!myPlayerAlive && room.gameState !== 'meeting' && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
            <EliminatedOverlay role={myRoleName} />
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Blackout3DGame;
