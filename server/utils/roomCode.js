const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a random alphanumeric code of specified length.
 * @param {number} length Length of room code
 * @returns {string} Room code
 */
export const generateRoomCode = (length = 6) => {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
};

