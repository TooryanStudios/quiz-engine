function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureEffectsStyles() {
  if (document.getElementById('qyan-effects-styles')) return;

  const style = document.createElement('style');
  style.id = 'qyan-effects-styles';
  style.textContent = `
    @keyframes qyan-screen-shake-x {
      0% { transform: translateX(0); }
      12% { transform: translateX(calc(var(--qyan-shake-distance, 10px) * -1)); }
      24% { transform: translateX(var(--qyan-shake-distance, 10px)); }
      36% { transform: translateX(calc(var(--qyan-shake-distance, 10px) * -0.75)); }
      48% { transform: translateX(calc(var(--qyan-shake-distance, 10px) * 0.75)); }
      60% { transform: translateX(calc(var(--qyan-shake-distance, 10px) * -0.5)); }
      72% { transform: translateX(calc(var(--qyan-shake-distance, 10px) * 0.5)); }
      84% { transform: translateX(calc(var(--qyan-shake-distance, 10px) * -0.25)); }
      100% { transform: translateX(0); }
    }

    @keyframes qyan-screen-shake-y {
      0% { transform: translateY(0); }
      12% { transform: translateY(calc(var(--qyan-shake-distance, 10px) * -1)); }
      24% { transform: translateY(var(--qyan-shake-distance, 10px)); }
      36% { transform: translateY(calc(var(--qyan-shake-distance, 10px) * -0.75)); }
      48% { transform: translateY(calc(var(--qyan-shake-distance, 10px) * 0.75)); }
      60% { transform: translateY(calc(var(--qyan-shake-distance, 10px) * -0.5)); }
      72% { transform: translateY(calc(var(--qyan-shake-distance, 10px) * 0.5)); }
      84% { transform: translateY(calc(var(--qyan-shake-distance, 10px) * -0.25)); }
      100% { transform: translateY(0); }
    }

    @keyframes qyan-screen-shake-both {
      0% { transform: translate(0, 0); }
      12% { transform: translate(calc(var(--qyan-shake-distance, 10px) * -1), calc(var(--qyan-shake-distance, 10px) * 0.35)); }
      24% { transform: translate(var(--qyan-shake-distance, 10px), calc(var(--qyan-shake-distance, 10px) * -0.35)); }
      36% { transform: translate(calc(var(--qyan-shake-distance, 10px) * -0.75), calc(var(--qyan-shake-distance, 10px) * -0.25)); }
      48% { transform: translate(calc(var(--qyan-shake-distance, 10px) * 0.75), calc(var(--qyan-shake-distance, 10px) * 0.25)); }
      60% { transform: translate(calc(var(--qyan-shake-distance, 10px) * -0.5), calc(var(--qyan-shake-distance, 10px) * 0.2)); }
      72% { transform: translate(calc(var(--qyan-shake-distance, 10px) * 0.5), calc(var(--qyan-shake-distance, 10px) * -0.2)); }
      84% { transform: translate(calc(var(--qyan-shake-distance, 10px) * -0.25), calc(var(--qyan-shake-distance, 10px) * 0.1)); }
      100% { transform: translate(0, 0); }
    }

    .qyan-shake-screen-x {
      animation: qyan-screen-shake-x var(--qyan-shake-duration, 500ms) cubic-bezier(0.35, 0.07, 0.19, 0.97);
      transform: translateZ(0);
      backface-visibility: hidden;
      will-change: transform;
    }

    .qyan-shake-screen-y {
      animation: qyan-screen-shake-y var(--qyan-shake-duration, 500ms) cubic-bezier(0.35, 0.07, 0.19, 0.97);
      transform: translateZ(0);
      backface-visibility: hidden;
      will-change: transform;
    }

    .qyan-shake-screen-both {
      animation: qyan-screen-shake-both var(--qyan-shake-duration, 500ms) cubic-bezier(0.35, 0.07, 0.19, 0.97);
      transform: translateZ(0);
      backface-visibility: hidden;
      will-change: transform;
    }
  `;

  document.head.appendChild(style);
}

function resolveShakeClass(axis) {
  if (axis === 'x') return 'qyan-shake-screen-x';
  if (axis === 'y') return 'qyan-shake-screen-y';
  return 'qyan-shake-screen-both';
}

function getShakeTarget(options = {}) {
  if (options.target && options.target.nodeType === 1) {
    return options.target;
  }
  return document.body;
}

export function triggerScreenShake(options = {}) {
  if (typeof document === 'undefined') return;

  ensureEffectsStyles();

  const target = getShakeTarget(options);
  if (!target) return;

  const durationMs = clamp(Number(options.durationMs || 520), 120, 2000);
  const distancePx = clamp(Number(options.distancePx || 10), 2, 28);
  const axis = ['x', 'y', 'both'].includes(options.axis) ? options.axis : 'both';

  const shakeClass = resolveShakeClass(axis);

  target.style.setProperty('--qyan-shake-duration', `${durationMs}ms`);
  target.style.setProperty('--qyan-shake-distance', `${distancePx}px`);

  target.classList.remove('qyan-shake-screen-x', 'qyan-shake-screen-y', 'qyan-shake-screen-both');
  void target.offsetWidth;
  target.classList.add(shakeClass);

  if (target.__qyanShakeTimer) {
    clearTimeout(target.__qyanShakeTimer);
  }

  target.__qyanShakeTimer = setTimeout(() => {
    target.classList.remove(shakeClass);
  }, durationMs + 30);
}

if (typeof window !== 'undefined') {
  window.__qyanEffects = {
    ...(window.__qyanEffects || {}),
    triggerScreenShake,
  };
}
