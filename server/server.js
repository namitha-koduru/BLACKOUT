// server.js
// Entry point. Boots the HTTP server, attaches Socket.IO, and starts the game listeners.
// Run with: npm run dev (nodemon) or npm start (production)

import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { initSocket } from './socket/index.js';

const httpServer = http.createServer(app);
const io = initSocket(httpServer);

// Make io accessible from Express req handlers if a controller ever needs to
// emit directly (e.g. admin controller force-closing a room). Used sparingly —
// prefer keeping game logic socket-driven, not REST-driven.
app.set('io', io);

const start = async () => {
  httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] BLACKOUT API listening on port ${env.port} (${env.nodeEnv})`);
    // eslint-disable-next-line no-console
    console.log(`[server] Health check: http://localhost:${env.port}/api/health`);
  });
};

start();

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('[server] Unhandled rejection:', err);
  httpServer.close(() => process.exit(1));
});
