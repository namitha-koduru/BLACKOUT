// utils/sound.js
import { useSettingsStore } from '../store/settingsStore.js';

let audioCtx = null;
let musicIntervalId = null;
let musicOscillators = [];

// Lazily initialize or retrieve the AudioContext (browsers block autoplay until interaction)
const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

/**
 * Procedurally synthesizes a sound effect using oscillators and envelopes.
 * @param {string} type - Sound effect type
 */
export const playSound = (type) => {
  const volume = useSettingsStore.getState().soundVolume;
  if (volume <= 0) return; // Muted

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Master Gain Node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume, now);
    masterGain.connect(ctx.destination);

    switch (type) {
      case 'join': {
        // Warm chime chord
        const freqs = [329.63, 392.00, 523.25, 659.25]; // E4, G4, C5, E5
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.05 + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6 + idx * 0.1);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 1.2);
        });
        break;
      }
      case 'ready': {
        // Bright high-pitched ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'countdown_tick': {
        // Quick short low beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, now); // C4
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'countdown_start': {
        // High-pitched longer start beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'trade_request': {
        // Double-tone chime
        [587.33, 783.99].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.1);
          
          gain.gain.setValueAtTime(0, now + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.3);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.5);
        });
        break;
      }
      case 'trade_accepted': {
        // Happy ascending chord sweep
        const scale = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major arpeggio
        scale.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);
          
          gain.gain.setValueAtTime(0, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.4);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 1.0);
        });
        break;
      }
      case 'trade_rejected': {
        // Low disappointed buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(146.83, now); // D3
        osc.frequency.linearRampToValueAtTime(110.00, now + 0.35); // A2
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        
        // Low pass filter to make it softer
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      case 'card_played': {
        // Laser sweep sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'box_shake': {
        // Soft repeat rattle
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(80 + Math.random() * 40, now + i * 0.1);
          
          gain.gain.setValueAtTime(0.12, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.08);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.3);
        }
        break;
      }
      case 'box_open': {
        // Chime sweep up
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
        
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'coin_gain': {
        // High rapid clinks
        [987.77, 1174.66, 1318.51, 1567.98].forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          
          gain.gain.setValueAtTime(0, now + idx * 0.04);
          gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.04 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.15);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 0.3);
        });
        break;
      }
      case 'bomb_explosion': {
        // Low pitch distortion sweep + noise rumble
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(20, now + 0.7);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(150, now);
        filter.frequency.linearRampToValueAtTime(50, now + 0.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + 0.9);
        break;
      }
      case 'leaderboard': {
        // Soft positive major chord
        [261.63, 329.63, 392.00, 493.88].forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);
          
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 1.0);
        });
        break;
      }
      case 'winner': {
        // Triumphal victory melody
        const melody = [
          { f: 523.25, d: 0.15 }, // C5
          { f: 659.25, d: 0.15 }, // E5
          { f: 783.99, d: 0.15 }, // G5
          { f: 1046.50, d: 0.4 }, // C6
        ];
        let runningTime = now;
        melody.forEach((note) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(note.f, runningTime);
          
          gain.gain.setValueAtTime(0, runningTime);
          gain.gain.linearRampToValueAtTime(0.2, runningTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, runningTime + note.d);
          
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(runningTime + note.d + 0.1);
          runningTime += note.d - 0.02;
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sound] Procedural audio synthesis failed:', err.message);
  }
};

/**
 * Loops background music arpeggio programmatically.
 */
export const startBackgroundMusic = () => {
  if (musicIntervalId) return;

  const playNote = (freq, time, volume, duration) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + duration + 0.1);
      
      musicOscillators.push({ osc, gain });
    } catch (err) {
      // Ignored
    }
  };

  let step = 0;
  const progression = [
    [196.00, 246.94, 293.66, 392.00], // G major arpeggio
    [220.00, 261.63, 329.63, 440.00], // A minor arpeggio
    [174.61, 220.00, 261.63, 349.23], // F major arpeggio
    [196.00, 246.94, 293.66, 392.00], // G major arpeggio
  ];

  const scheduler = () => {
    const isMusicOn = useSettingsStore.getState().musicOn;
    const volume = useSettingsStore.getState().soundVolume;

    if (!isMusicOn || volume <= 0) {
      // Keep running but don't play notes, or mute
      return;
    }

    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const chordIndex = Math.floor(step / 4) % progression.length;
      const noteIndex = step % 4;
      const freq = progression[chordIndex][noteIndex];

      // Play soft ambient background note (very low volume relative to sound fx)
      playNote(freq, now, volume * 0.02, 0.8);
      step += 1;
    } catch (err) {
      // Ignored
    }
  };

  // Schedule first note
  scheduler();
  musicIntervalId = setInterval(scheduler, 500);
};

/**
 * Stops background music.
 */
export const stopBackgroundMusic = () => {
  if (musicIntervalId) {
    clearInterval(musicIntervalId);
    musicIntervalId = null;
  }
  
  // Stop any lingering oscillators
  musicOscillators.forEach((item) => {
    try {
      item.osc.stop();
    } catch (err) {
      // Ignored
    }
  });
  musicOscillators = [];
};
