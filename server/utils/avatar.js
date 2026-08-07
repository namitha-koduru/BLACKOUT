// utils/avatar.js
/**
 * Generates an SVG avatar URL using the DiceBear API.
 * @param {string} seed String to seed the avatar (typically username)
 * @returns {string} Fully qualified avatar URL
 */
export const generateAvatarUrl = (seed) => {
  const cleanSeed = encodeURIComponent(seed.trim().toLowerCase());
  // Using the popular and visual-friendly 'bottts' or 'adventurer' style
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanSeed}`;
};
