/**
 * timer.js
 * Client-side timer visualization
 */

import { Sounds } from './sounds.js';

let timerInterval = null;
let timerEndTime = 0;

/**
 * Start client-side countdown timer
 */
export function startClientTimer(duration, countEl, ringEl) {
  stopClientTimer();
  
  timerEndTime = Date.now() + duration * 1000;
  
  const update = () => {
    const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
    
    if (countEl) countEl.textContent = remaining;
    
    if (ringEl) {
      const progress = (remaining / duration) * 100;
      ringEl.style.setProperty('--progress', progress);
      
      if (remaining <= 5) {
        ringEl.classList.add('timer-urgent');
      } else {
        ringEl.classList.remove('timer-urgent');
      }
    }
    
    // Sound effects
    if (remaining <= 10 && remaining > 0) {
      if (remaining <= 5) {
        Sounds.urgentTick();
      } else {
        Sounds.tick();
      }
    }
    
    if (remaining === 0) {
      stopClientTimer();
    }
  };
  
  update();
  timerInterval = setInterval(update, 1000);
}

/**
 * Stop the timer
 */
export function stopClientTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

/**
 * Get remaining time in seconds
 */
export function getRemainingTime() {
  if (!timerEndTime) return 0;
  return Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
}
