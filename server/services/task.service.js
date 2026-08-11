// services/task.service.js
import { createEvidence } from './evidence.service.js';

export const TASK_TYPES = {
  generator_calibration: { id: 'generator_calibration', name: 'Generator Calibration', room: 'GENERATOR ROOM', gameType: 'slider' },
  coolant_pressure: { id: 'coolant_pressure', name: 'Coolant Pressure', room: 'REACTOR / ENGINEERING', gameType: 'valve' },
  camera_alignment: { id: 'camera_alignment', name: 'Camera Alignment', room: 'SECURITY', gameType: 'camera' },
  server_maintenance: { id: 'server_maintenance', name: 'Server Maintenance', room: 'SERVER ROOM', gameType: 'wires' },
  sample_analysis: { id: 'sample_analysis', name: 'Medical Sample Analysis', room: 'MEDICAL LAB', gameType: 'sample' },
  comms_calibration: { id: 'comms_calibration', name: 'Communication Calibration', room: 'COMMUNICATIONS ROOM', gameType: 'slider' },
  water_purification: { id: 'water_purification', name: 'Water Purification', room: 'REACTOR / ENGINEERING', gameType: 'valve' },
  air_filtration: { id: 'air_filtration', name: 'Air Filtration', room: 'REACTOR / ENGINEERING', gameType: 'slider' },
  fuel_transfer: { id: 'fuel_transfer', name: 'Fuel Transfer', room: 'STORAGE', gameType: 'slider' },
  power_routing: { id: 'power_routing', name: 'Power Routing', room: 'ELECTRICAL ROOM', gameType: 'wires' },
  access_reset: { id: 'access_reset', name: 'Security Access Reset', room: 'SECURITY', gameType: 'code' },
  data_backup: { id: 'data_backup', name: 'Data Backup', room: 'SERVER ROOM', gameType: 'code' },
  reactor_temp: { id: 'reactor_temp', name: 'Reactor Temperature', room: 'REACTOR / ENGINEERING', gameType: 'slider' },
  sensor_calibration: { id: 'sensor_calibration', name: 'Sensor Calibration', room: 'LABORATORY', gameType: 'slider' },
  facility_inspection: { id: 'facility_inspection', name: 'Facility Inspection', room: 'CENTRAL HUB', gameType: 'code' }
};

export const TASK_POSITIONS = {
  generator_calibration: { x: 920, y: 350 },
  coolant_pressure: { x: 920, y: 720 },
  camera_alignment: { x: 500, y: 100 },
  server_maintenance: { x: 280, y: 100 },
  sample_analysis: { x: 550, y: 920 },
  comms_calibration: { x: 500, y: 720 },
  water_purification: { x: 980, y: 720 },
  air_filtration: { x: 980, y: 680 },
  fuel_transfer: { x: 180, y: 720 },
  power_routing: { x: 280, y: 910 },
  access_reset: { x: 580, y: 100 },
  data_backup: { x: 180, y: 100 },
  reactor_temp: { x: 900, y: 680 },
  sensor_calibration: { x: 280, y: 350 },
  facility_inspection: { x: 600, y: 400 }
};

/**
 * Assigns 4-5 random tasks to each Crew player at game start.
 * @param {object} room
 */
export const assignTasks = (room) => {
  if (!room || !room.game) return;

  room.game.playerTasks = {};
  room.game.globalTaskProgress = 0;

  const taskKeys = Object.keys(TASK_TYPES);

  // Assign tasks to all players
  room.players.forEach((p) => {
    const gp = room.game.players[p.id];
    if (!gp) return;

    if (gp.team === 'crew') {
      // Pick 4-5 random distinct tasks
      const numTasks = Math.floor(Math.random() * 2) + 4; // 4 or 5 tasks
      const shuffled = [...taskKeys].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, numTasks);

      room.game.playerTasks[p.id] = chosen.map((taskId) => {
        const spec = TASK_TYPES[taskId];
        return {
          taskId,
          name: spec.name,
          roomId: spec.room,
          gameType: spec.gameType,
          status: 'NOT_STARTED', // NOT_STARTED, IN_PROGRESS, COMPLETED
          progress: 0,
          assignedAt: Date.now(),
          startedAt: null,
          completedAt: null,
        };
      });
    } else {
      // Imposter/Saboteur receives no real tasks
      room.game.playerTasks[p.id] = [];
    }
  });
};

/**
 * Returns a player's task list.
 */
export const getPlayerTasks = (room, playerId) => {
  if (!room || !room.game || !room.game.playerTasks) return [];
  return room.game.playerTasks[playerId] || [];
};

/**
 * Validates and starts a task for a player.
 */
export const startTask = (room, playerId, taskId) => {
  if (!room || !room.game) throw new Error('Game not active');
  
  const gp = room.game.players[playerId];
  if (!gp || !gp.isAlive) throw new Error('Player not alive or not found');

  if (gp.team !== 'crew') {
    throw new Error('ACCESS DENIED');
  }

  const tasks = room.game.playerTasks[playerId] || [];
  const task = tasks.find((t) => t.taskId === taskId);
  if (!task) throw new Error('NO TASK ASSIGNED');

  if (task.status === 'COMPLETED') {
    throw new Error('Task already completed');
  }

  // Validate range to console
  const pos = TASK_POSITIONS[taskId];
  if (!pos) throw new Error('Task position undefined');

  const dist = Math.hypot(gp.position.x - pos.x, gp.position.y - pos.y);
  if (dist > 150) {
    throw new Error('Too far from task terminal');
  }

  task.status = 'IN_PROGRESS';
  task.startedAt = Date.now();
  return task;
};

/**
 * Authoritatively updates a task's progress.
 */
export const updateTaskProgress = (room, playerId, taskId, progress) => {
  if (!room || !room.game) throw new Error('Game not active');

  const gp = room.game.players[playerId];
  if (!gp || !gp.isAlive) throw new Error('Player not alive');
  if (gp.team !== 'crew') throw new Error('ACCESS DENIED');

  const tasks = room.game.playerTasks[playerId] || [];
  const task = tasks.find((t) => t.taskId === taskId);
  if (!task) throw new Error('NO TASK ASSIGNED');

  if (task.status === 'COMPLETED') return task;

  task.progress = Math.max(0, Math.min(100, progress));
  if (task.progress >= 100) {
    task.status = 'COMPLETED';
    task.completedAt = Date.now();
  }

  return task;
};

/**
 * Authoritatively completes a task.
 */
export const completeTask = (room, playerId, taskId, io) => {
  if (!room || !room.game) throw new Error('Game not active');

  const gp = room.game.players[playerId];
  if (!gp || !gp.isAlive) throw new Error('Player not alive');
  if (gp.team !== 'crew') throw new Error('ACCESS DENIED');

  const tasks = room.game.playerTasks[playerId] || [];
  const task = tasks.find((t) => t.taskId === taskId);
  if (!task) throw new Error('NO TASK ASSIGNED');

  if (task.status === 'COMPLETED') return { success: true, task };

  task.status = 'COMPLETED';
  task.progress = 100;
  task.completedAt = Date.now();

  // Recalculate global task progress
  room.game.globalTaskProgress = calculateGlobalTaskProgress(room);

  // Record evidence
  createEvidence(
    room,
    'SYSTEM_EVENT',
    task.roomId,
    playerId,
    taskId,
    `Task ${task.name} completed by ${gp.name || 'Player'}.`
  );

  // Check if Crew wins by completing all tasks
  checkTaskWin(room, io);

  return { success: true, task };
};

/**
 * Calculates global task progress as the percentage of completed tasks relative to total assigned tasks.
 */
export const calculateGlobalTaskProgress = (room) => {
  if (!room || !room.game || !room.game.playerTasks) return 0;

  let totalTasks = 0;
  let completedTasks = 0;

  Object.keys(room.game.playerTasks).forEach((pId) => {
    // Only count Crew members tasks
    const gp = room.game.players[pId];
    if (gp && gp.team === 'crew') {
      const list = room.game.playerTasks[pId];
      totalTasks += list.length;
      completedTasks += list.filter((t) => t.status === 'COMPLETED').length;
    }
  });

  if (totalTasks === 0) return 100;
  return Math.round((completedTasks / totalTasks) * 100);
};

/**
 * Checks if all assigned Crew tasks are completed and triggers game over.
 */
export const checkTaskWin = (room, io) => {
  if (!room || !room.game || room.game.gameOver) return;

  const progress = calculateGlobalTaskProgress(room);
  room.game.globalTaskProgress = progress;

  if (progress >= 100) {
    // Crew wins by task completion!
    import('./gameResult.service.js').then(({ checkWinConditions }) => {
      checkWinConditions(room, io);
    }).catch(err => {
      console.error('Error importing gameResult.service.js:', err);
    });
  }
};

/**
 * Resets task state for a room.
 */
export const resetTasks = (room) => {
  if (!room || !room.game) return;
  room.game.playerTasks = {};
  room.game.globalTaskProgress = 0;
};
