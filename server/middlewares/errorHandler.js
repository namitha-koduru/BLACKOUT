// middlewares/errorHandler.js
// Centralized error handling. Controllers/routes can just `throw` or call
// `next(err)` with a plain Error (optionally with a `.statusCode`), and this
// middleware turns it into a consistent JSON response.

import { env } from '../config/env.js';

// Wrap async route handlers so thrown errors / rejected promises reach
// errorHandler instead of crashing the process or hanging the request.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Centralized error response formatter

  if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
    ...(!env.isProd ? { stack: err.stack } : {}),
  });
};
