// services/user.service.js
import User from '../models/user.model.js';
import Statistics from '../models/statistics.model.js';
import { generateAvatarUrl } from '../utils/avatar.js';
import { ApiError } from '../middlewares/errorHandler.js';

/**
 * Registers a new user. Creates default statistics and handles avatar generation.
 * @param {string} username Username
 * @param {string} email Email address
 * @param {string} password Raw password
 * @returns {Promise<object>} The registered User document (without password)
 */
export const registerUser = async (username, email, password) => {
  // Check for existing username or email
  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { username: new RegExp(`^${username}$`, 'i') },
    ],
  });

  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? 'Email' : 'Username';
    throw new ApiError(409, `${field} is already registered`);
  }

  // Generate avatar URL from seed username
  const avatar = generateAvatarUrl(username);

  // Create user and associated statistics document sequentially
  const newUser = await User.create({
    username,
    email,
    password,
    avatar,
  });

  const newStats = await Statistics.create({
    user: newUser._id,
  });

  newUser.statistics = newStats._id;
  await newUser.save();

  // Refetch user to populate statistics
  return User.findById(newUser._id).populate('statistics');
};

/**
 * Validates a user's credentials and returns the User document.
 * @param {string} email Email address
 * @param {string} password Raw password
 * @returns {Promise<object>} Authenticated User document
 */
export const loginUser = async (email, password) => {
  // Fetch user including the password field
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password')
    .populate('statistics');

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // Remove password from returned object
  const userObj = user.toObject();
  delete userObj.password;

  return user;
};

/**
 * Retrieves a user profile with statistics and achievements.
 * @param {string} userId User ID
 * @returns {Promise<object>} Populated user document
 */
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId)
    .populate('statistics')
    .populate('achievements');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

/**
 * Updates a user's avatar.
 * @param {string} userId User ID
 * @param {string} avatarUrl New avatar URL
 * @returns {Promise<object>} Updated User document
 */
export const updateAvatar = async (userId, avatarUrl) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { avatar: avatarUrl },
    { new: true, runValidators: true }
  ).populate('statistics');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

/**
 * Registers a new active refresh token on the user.
 */
export const addRefreshToken = async (userId, token, expiresAt) => {
  await User.findByIdAndUpdate(userId, {
    $push: { refreshTokens: { token, expiresAt } },
  });
};

/**
 * Replaces an old refresh token with a new rotated token.
 */
export const rotateRefreshToken = async (userId, oldToken, newToken, expiresAt) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  // Filter out the old token and any expired tokens (cleanup step)
  const now = new Date();
  user.refreshTokens = user.refreshTokens.filter(
    (rt) => rt.token !== oldToken && rt.expiresAt > now
  );

  // Add the new rotated token
  user.refreshTokens.push({ token: newToken, expiresAt });
  await user.save();
};

/**
 * Revokes a specific refresh token (used on logout).
 */
export const revokeRefreshToken = async (userId, token) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token } },
  });
};

/**
 * Revokes all refresh tokens for a user (force-logout from all sessions).
 */
export const revokeAllRefreshTokens = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] },
  });
};
