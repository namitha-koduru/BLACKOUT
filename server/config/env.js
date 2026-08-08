// config/env.js
// Centralized, validated access to environment variables.
// Import this instead of using process.env directly throughout the codebase —
// it fails fast at boot if something critical is missing, rather than failing
// mysteriously mid-request later.

import dotenv from 'dotenv';

dotenv.config();

// No database or auth environment variables required for in-memory mode.


const clientUrlRaw = process.env.CLIENT_URL || 'http://localhost:5173';

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: clientUrlRaw.replace(/\/$/, ''),

  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 200,

  roomCodeLength: Number(process.env.ROOM_CODE_LENGTH) || 6,
  maxPlayersDefault: Number(process.env.MAX_PLAYERS_DEFAULT) || 12,
  minPlayersDefault: Number(process.env.MIN_PLAYERS_DEFAULT) || 2,

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};
