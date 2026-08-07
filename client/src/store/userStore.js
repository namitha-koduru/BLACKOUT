// store/userStore.js
import { create } from 'zustand';

// Simple unique player ID generator
const generatePlayerId = () => {
  return 'p_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

const getStoredPlayerId = () => {
  let id = sessionStorage.getItem('mysterybox_player_id');
  if (!id) {
    id = generatePlayerId();
    sessionStorage.setItem('mysterybox_player_id', id);
  }
  return id;
};

export const useUserStore = create((set) => ({
  playerId: getStoredPlayerId(),
  name: localStorage.getItem('mysterybox_player_name') || '',
  avatar: localStorage.getItem('mysterybox_player_avatar') || '🎁',

  setProfile: (name, avatar) => {
    localStorage.setItem('mysterybox_player_name', name);
    localStorage.setItem('mysterybox_player_avatar', avatar);
    set({ name, avatar });
  },
}));
