// middlewares/validation.middleware.js
import { validationResult } from 'express-validator';
import { ApiError } from './errorHandler.js';

/**
 * Middleware that intercepts the request after validation chains run,
 * compiling errors and passing them as an ApiError to the global handler.
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Return validation failures with a 400 Bad Request
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return next(new ApiError(400, 'Validation failed', formattedErrors));
  }
  next();
};
