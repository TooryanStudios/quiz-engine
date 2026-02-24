/**
 * sounds.js
 * Synthesized sound engine using Web Audio API
 */

let audioCtx = null;
let muted = false;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, type, duration, volume = 0.25, delay = 0) {
  if (muted) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
}

export const Sounds = {
  click: () => playTone(600, 'sine', 0.06, 0.15),
  
  tick: () => playTone(880, 'square', 0.04, 0.1),
  
  urgentTick: () => playTone(1100, 'square', 0.05, 0.18),
  
  correct: () => {
    playTone(523, 'sine', 0.1, 0.35);
    playTone(659, 'sine', 0.1, 0.35, 0.11);
    playTone(784, 'sine', 0.18, 0.35, 0.22);
  },
  
  wrong: () => {
    playTone(220, 'sawtooth', 0.15, 0.3);
    playTone(160, 'sawtooth', 0.15, 0.3, 0.14);
  },
  
  start: () => {
    [440, 554, 659, 880].forEach((f, i) => 
      playTone(f, 'sine', 0.12, 0.3, i * 0.1)
    );
  },
  
  fanfare: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) => 
      playTone(f, 'sine', 0.22, 0.4, i * 0.09)
    );
  },
  
  pause: () => playTone(300, 'sine', 0.2, 0.2),
  
  resume: () => {
    playTone(440, 'sine', 0.1, 0.2);
    playTone(550, 'sine', 0.1, 0.2, 0.1);
  },
};

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}
