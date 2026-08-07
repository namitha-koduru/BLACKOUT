// app.js
// Express app configuration — separated from server.js (which owns the HTTP
// server + Socket.IO binding) so the app can be imported directly in tests
// without opening real sockets/ports.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';

import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// --- Security & parsing middleware ---------------------------------------
app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' })); // small limit — this app has no file uploads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(mongoSanitize()); // strips $ and . operators from req.body/query/params → prevents Mongo operator injection
app.use(xssClean()); // sanitizes user input to strip malicious HTML/JS

if (!env.isProd) {
  app.use(morgan('dev'));
}

// Global API rate limiter.
const globalLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

// --- Routes -----------------------------------------------------------
app.use('/api/health', healthRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
