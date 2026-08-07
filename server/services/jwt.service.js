// services/jwt.service.js
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Generates a short-lived access token for API requests.
 * @param {object} user User document
 * @returns {string} Signed JWT
 */
export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, username: user.username },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

/**
 * Generates a long-lived refresh token for authentication persistence.
 * @param {object} user User document
 * @returns {string} Signed JWT
 */
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpiresIn }
  );
};

/**
 * Verifies an access token.
 * @param {string} token Signed JWT access token
 * @returns {object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwtSecret);
};

/**
 * Verifies a refresh token.
 * @param {string} token Signed JWT refresh token
 * @returns {object} Decoded payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwtRefreshSecret);
};
