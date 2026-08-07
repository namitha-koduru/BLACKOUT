// middlewares/auth.middleware.js
import User from '../models/user.model.js';
import { verifyAccessToken } from '../services/jwt.service.js';
import { asyncHandler, ApiError } from './errorHandler.js';

/**
 * Route protection middleware. Ensures request has a valid Bearer JWT.
 * Attaches the authenticated User model instance to req.user.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Read Bearer token from authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Access denied: No token provided');
  }

  try {
    // Verify token
    const decoded = verifyAccessToken(token);

    // Fetch user and check if account exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'Authentication failed: User no longer exists');
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid authentication token');
    }
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Authentication token expired');
    }
    throw err;
  }
});

/**
 * Role authorization restriction.
 * @param {...string} roles Allowed roles (e.g. 'admin')
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(403, 'Forbidden: You do not have permission to perform this action')
      );
    }

    next();
  };
};
