// store/settingsStore.js
import { create } from 'zustand';

export const useSettingsStore = create((set) => ({
  soundVolume: Number(localStorage.getItem('blackout_setting_volume') ?? '0.5'),
  musicOn: localStorage.getItem('blackout_setting_music') === 'true',
  animationSpeed: localStorage.getItem('blackout_setting_speed') || 'normal', // 'slow' | 'normal' | 'fast'
  theme: localStorage.getItem('blackout_setting_theme') || 'classic', // 'classic' | 'neon'
  showTimer: (localStorage.getItem('blackout_setting_show_timer') ?? 'true') === 'true',

  setSoundVolume: (volume) => {
    localStorage.setItem('blackout_setting_volume', String(volume));
    set({ soundVolume: volume });
  },

  setMusicOn: (isOn) => {
    localStorage.setItem('blackout_setting_music', String(isOn));
    set({ musicOn: isOn });
  },

  setAnimationSpeed: (speed) => {
    localStorage.setItem('blackout_setting_speed', speed);
    set({ animationSpeed: speed });
  },

  setTheme: (theme) => {
    localStorage.setItem('blackout_setting_theme', theme);
    set({ theme });
    
    // Apply theme class to body
    const body = document.body;
    body.classList.remove('theme-party', 'theme-neon', 'theme-classic');
    body.classList.add(`theme-${theme}`);
  },

  setShowTimer: (show) => {
    localStorage.setItem('blackout_setting_show_timer', String(show));
    set({ showTimer: show });
  },
}));
