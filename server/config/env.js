// config/env.js
// Centralized, validated access to environment variables.
// Import this instead of using process.env directly throughout the codebase —
// it fails fast at boot if something critical is missing, rather than failing
// mysteriously mid-request later.

import dotenv from 'dotenv';

dotenv.config();

// No database or auth environment variables required for in-memory mode.


export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI || '',

  jwtSecret: process.env.JWT_SECRET || 'dev_only_insecure_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_only_insecure_refresh_secret',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 200,

  roomCodeLength: Number(process.env.ROOM_CODE_LENGTH) || 6,
  maxPlayersDefault: Number(process.env.MAX_PLAYERS_DEFAULT) || 12,
  minPlayersDefault: Number(process.env.MIN_PLAYERS_DEFAULT) || 3,

  isProd: (process.env.NODE_ENV || 'development') === 'production',
};
