// store/userStore.js
import { create } from 'zustand';

// Simple unique player ID generator
const generatePlayerId = () => {
  return 'p_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

const getStoredPlayerId = () => {
  let id = sessionStorage.getItem('blackout_player_id');
  if (!id) {
    id = generatePlayerId();
    sessionStorage.setItem('blackout_player_id', id);
  }
  return id;
};

export const useUserStore = create((set) => ({
  playerId: getStoredPlayerId(),
  name: localStorage.getItem('blackout_player_name') || '',
  avatar: localStorage.getItem('blackout_player_avatar') || '👤',

  setProfile: (name, avatar) => {
    localStorage.setItem('blackout_player_name', name);
    localStorage.setItem('blackout_player_avatar', avatar);
    set({ name, avatar });
  },
}));
