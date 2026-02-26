import { Sounds } from '../../utils/sounds.js?v=121';

function normalizeAngle(value) {
  const n = Number(value || 0);
  return ((Math.round(n) % 360) + 360) % 360;
}

function formatAngle(value) {
  const n = Number(value || 0);
  return `${Math.round(n)}°`;
}

function ensureStyles() {
  if (document.getElementById('gear-machine-styles')) return;

  const style = document.createElement('style');
  style.id = 'gear-machine-styles';
  style.textContent = `
    .gear-machine-wrap {
      width: min(100%, 640px);
      margin: 0.45rem auto 0;
      padding: 0.85rem 0.9rem;
      border-radius: 16px;
      border: 1px solid rgba(148,163,184,0.35);
      background: rgba(15,23,42,0.72);
      color: #e2e8f0;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .gear-machine-title {
      text-align: center;
      font-weight: 900;
      font-size: 1.05rem;
      margin-bottom: 0.6rem;
      user-select: none;
      -webkit-user-select: none;
    }
    .gear-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: 0;
      margin-bottom: 0.8rem;
      padding: 0.45rem 0.2rem;
      min-height: 250px;
    }
    .gear-node {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      margin: -10px;
      z-index: 1;
      user-select: none;
      -webkit-user-select: none;
    }
    .gear-node.large { margin: -8px; }
    .gear-angle {
      font-size: 0.78rem;
      opacity: 0.86;
      font-weight: 700;
      line-height: 1;
    }
    .gear-wheel {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      border-radius: 999px;
      border: 4px solid rgba(148,163,184,0.5);
      box-shadow: inset 0 0 0 2px rgba(2,6,23,0.42), 0 0 0 1px rgba(148,163,184,0.3), 0 12px 26px rgba(2,6,23,0.35);
      transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
      background:
        radial-gradient(circle at 28% 24%, rgba(148,163,184,0.42), rgba(71,85,105,0.08) 36%, rgba(2,6,23,0.6) 100%),
        conic-gradient(from 0deg, rgba(30,41,59,0.9), rgba(51,65,85,0.88), rgba(30,41,59,0.92));
      cursor: grab;
      touch-action: none;
      user-select: none;
    }
    .gear-wheel:active { cursor: grabbing; }
    .gear-wheel.large { width: 124px; height: 124px; }
    .gear-wheel.small { width: 102px; height: 102px; }
    .gear-wheel .core {
      width: 28%;
      height: 28%;
      border-radius: 999px;
      background: rgba(2,6,23,0.7);
      border: 2px solid rgba(148,163,184,0.65);
    }
    .gear-wheel .marker {
      position: absolute;
      top: 10px;
      left: 50%;
      width: 12px;
      height: 12px;
      border-radius: 999px;
      transform: translateX(-50%);
      background: #f59e0b;
      box-shadow: 0 0 0 1px rgba(254,240,138,0.95), 0 0 12px rgba(245,158,11,0.65);
    }
    .gear-wheel.small .marker {
      width: 10px;
      height: 10px;
      top: 8px;
    }
    .gear-wheel.spinning {
      animation: gear-spin-from 1.8s linear infinite;
    }
    @keyframes gear-spin-from {
      from { transform: rotate(var(--start-angle, 0deg)); }
      to { transform: rotate(calc(var(--start-angle, 0deg) + 360deg)); }
    }
    .gear-machine-actions {
      display: flex;
      justify-content: center;
      margin-top: 0.3rem;
    }
    .gear-run-btn {
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      color: white;
      font-weight: 900;
      padding: 0.55rem 1.15rem;
      cursor: pointer;
      box-shadow: 0 10px 22px rgba(34,197,94,0.24);
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .gear-run-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .gear-machine-status {
      margin-top: 0.55rem;
      text-align: center;
      font-size: 0.86rem;
      opacity: 0.92;
      line-height: 1.35;
      min-height: 1.2rem;
    }
    @media (max-width: 640px) {
      .gear-grid {
        min-height: 220px;
      }
      .gear-node { margin: -12px; }
      .gear-node.large { margin: -10px; }
      .gear-wheel.large { width: 114px; height: 114px; }
      .gear-wheel.small { width: 92px; height: 92px; }
    }
    @media (max-width: 420px) {
      .gear-machine-wrap {
        padding: 0.72rem 0.62rem;
      }
      .gear-grid {
        min-height: 200px;
        padding: 0.35rem 0;
      }
      .gear-node { margin: -14px; }
      .gear-node.large { margin: -11px; }
      .gear-wheel.large { width: 104px; height: 104px; }
      .gear-wheel.small { width: 84px; height: 84px; }
      .gear-angle { font-size: 0.74rem; }
      .gear-run-btn { padding: 0.5rem 1rem; }
    }
    @media (max-width: 360px) {
      .gear-grid {
        min-height: 184px;
      }
      .gear-node { margin: -16px; }
      .gear-node.large { margin: -13px; }
      .gear-wheel.large { width: 96px; height: 96px; }
      .gear-wheel.small { width: 78px; height: 78px; }
      .gear-angle { font-size: 0.7rem; }
    }
  `;

  document.head.appendChild(style);
}

function hideDefaultQuestionWidgets() {
  const playerGrid = document.getElementById('player-options-grid');
  if (playerGrid) {
    playerGrid.style.display = 'block';
    playerGrid.style.width = '100%';
  }

  const hostGrid = document.getElementById('host-options-grid');
  if (hostGrid) {
    hostGrid.style.display = 'block';
    hostGrid.style.width = '100%';
  }

  ['player-type-container', 'player-match-container', 'player-order-container', 'player-boss-panel'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  const submitBtn = document.getElementById('btn-submit-answer');
  if (submitBtn) submitBtn.style.display = 'none';
}

function ensureSocketHooks(socket, state) {
  if (state.__gearSocketHooksBound) return;
  state.__gearSocketHooksBound = true;

  socket.on('gear:test_result', (payload = {}) => {
    const statusEl = document.getElementById('gear-machine-status');
    if (!statusEl) return;

    const runBtn = document.getElementById('gear-run-btn');
    if (runBtn) runBtn.disabled = false;

    document.querySelectorAll('.gear-wheel').forEach((el) => el.classList.remove('spinning'));

    if (payload.ok) {
      Sounds.fanfare();
      statusEl.textContent = payload.winnerId === socket.id
        ? `🏆 أنت الفائز! أنهيت الآلة أولاً.`
        : `🏁 الفائز: ${payload.winnerNickname || 'Player'}`;
      return;
    }

    Sounds.wrong();
    statusEl.textContent = payload.message || '❌ التروس غير متطابقة بعد. حاول مجددًا.';
  });
}

function renderSpectatorView({ data }) {
  const grid = document.getElementById('host-options-grid');
  if (!grid) return;

  const machine = data?.question?.gearMachine || {};
  const gears = Array.isArray(machine.gears) ? machine.gears : [];

  grid.innerHTML = `
    <div class="gear-machine-wrap">
      <div class="gear-machine-title">⚙️ Gear Machine</div>
      <div class="gear-grid">
        ${gears.map((gear) => `
          <div class="gear-node ${gear.size || 'small'}">
            <div class="gear-wheel ${gear.size || 'small'}" style="transform:rotate(0deg)"><span class="marker"></span><span class="core"></span></div>
            <div style="font-size:0.76rem;opacity:0.85;">Gear ${gear.id}</div>
          </div>
        `).join('')}
      </div>
      <div class="gear-machine-status">${machine.phase === 'finished' ? `🏁 Winner: ${machine.winnerNickname || 'Player'}` : 'Waiting for players to solve the machine…'}</div>
    </div>
  `;
}

function renderPlayerView({ data, state, socket }) {
  const playerGrid = document.getElementById('player-options-grid');
  if (!playerGrid) return;
  playerGrid.style.display = 'block';
  playerGrid.style.width = '100%';

  const machine = data?.question?.gearMachine || {};
  const gears = Array.isArray(machine.gears) ? machine.gears : [];
  if (!gears.length) {
    playerGrid.innerHTML = '<div class="gear-machine-wrap"><div class="gear-machine-status">⚠️ لم يتم تحميل بيانات التروس. حدّث الصفحة أو أعد بدء الجولة.</div></div>';
    return;
  }
  const machineKey = `${machine.startedAt || 0}:${gears.length}`;

  if (state.__gearMachineKey !== machineKey) {
    state.__gearMachineKey = machineKey;
    state.__gearAngles = gears.map(() => 0);
  }

  const angles = Array.isArray(state.__gearAngles) ? state.__gearAngles : gears.map(() => 0);
  state.__gearAngles = angles;
  if (!state.__gearLastTickAt) state.__gearLastTickAt = 0;

  playerGrid.innerHTML = `
    <div class="gear-machine-wrap">
      <div class="gear-machine-title">⚙️ رتّب التروس ثم شغّل الآلة</div>
      <div class="gear-grid">
        ${gears.map((gear, index) => `
          <div class="gear-node ${gear.size || 'small'}" data-gear-node="${index}">
            <div class="gear-wheel ${gear.size || 'small'}" data-gear-wheel="${index}" style="transform:rotate(${Number(angles[index] || 0)}deg)"><span class="marker"></span><span class="core"></span></div>
            <div class="gear-angle">${formatAngle(angles[index] || 0)}</div>
          </div>
        `).join('')}
      </div>
      <div class="gear-machine-actions">
        <button type="button" id="gear-run-btn" class="gear-run-btn" ${machine.phase === 'finished' ? 'disabled' : ''}>▶️ تشغيل الآلة</button>
      </div>
      <div id="gear-machine-status" class="gear-machine-status">${machine.phase === 'finished'
        ? (machine.winnerId === socket.id ? '🏆 أنت الفائز!' : `🏁 الفائز: ${machine.winnerNickname || 'Player'}`)
        : 'لفّ التروس ثم اضغط تشغيل — أول لاعب يرسل ترتيب صحيح يفوز.'}</div>
    </div>
  `;

  gears.forEach((gear, index) => {
    const wheelEl = playerGrid.querySelector(`[data-gear-wheel="${index}"]`);
    const nodeEl = playerGrid.querySelector(`[data-gear-node="${index}"]`);
    const angleLabel = nodeEl ? nodeEl.querySelector('.gear-angle') : null;

    const refreshAngle = () => {
      const rawAngle = Number(state.__gearAngles[index] || 0);
      if (wheelEl) wheelEl.style.transform = `rotate(${rawAngle}deg)`;
      if (angleLabel) angleLabel.textContent = formatAngle(rawAngle);
    };

    if (wheelEl) {
      const dragState = {
        active: false,
        pointerId: null,
        lastDeg: 0,
      };

      const pointerDeg = (event) => {
        const rect = wheelEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = event.clientX - cx;
        const dy = event.clientY - cy;
        return Math.atan2(dy, dx) * (180 / Math.PI);
      };

      const onPointerMove = (event) => {
        if (!dragState.active || event.pointerId !== dragState.pointerId) return;
        if (machine.phase === 'finished') return;

        const currentDeg = pointerDeg(event);
        let delta = currentDeg - dragState.lastDeg;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        dragState.lastDeg = currentDeg;
        state.__gearAngles[index] = Number(state.__gearAngles[index] || 0) + delta;
        refreshAngle();

        const now = Date.now();
        if (Math.abs(delta) >= 0.8 && now - Number(state.__gearLastTickAt || 0) > 45) {
          state.__gearLastTickAt = now;
          if (typeof Sounds.gearTick === 'function') Sounds.gearTick();
        }
      };

      const onPointerStop = (event) => {
        if (event.pointerId !== dragState.pointerId) return;
        dragState.active = false;
        dragState.pointerId = null;
        try { wheelEl.releasePointerCapture(event.pointerId); } catch (_) {}
      };

      wheelEl.addEventListener('pointerdown', (event) => {
        if (machine.phase === 'finished') return;
        event.preventDefault();
        dragState.active = true;
        dragState.pointerId = event.pointerId;
        dragState.lastDeg = pointerDeg(event);
        try { wheelEl.setPointerCapture(event.pointerId); } catch (_) {}
      });
      wheelEl.addEventListener('mousedown', (event) => event.preventDefault());
      wheelEl.addEventListener('touchstart', (event) => event.preventDefault(), { passive: false });
      wheelEl.addEventListener('pointermove', onPointerMove);
      wheelEl.addEventListener('pointerup', onPointerStop);
      wheelEl.addEventListener('pointercancel', onPointerStop);
      wheelEl.addEventListener('lostpointercapture', () => {
        dragState.active = false;
        dragState.pointerId = null;
      });
    }
  });

  const runBtn = document.getElementById('gear-run-btn');
  if (runBtn) {
    runBtn.addEventListener('pointerup', () => {
      if (machine.phase === 'finished') return;
      if (runBtn.disabled) return;
      runBtn.disabled = true;
      document.querySelectorAll('.gear-wheel').forEach((el, idx) => {
        const currentAngle = Number(state.__gearAngles?.[idx] || 0);
        el.style.setProperty('--start-angle', `${currentAngle}deg`);
        el.classList.add('spinning');
      });
      if (typeof Sounds.gearSpinStart === 'function') Sounds.gearSpinStart();
      else Sounds.start();
      socket.emit('player:answer', {
        questionIndex: data.questionIndex,
        answer: {
          action: 'test',
          angles: [...state.__gearAngles].map((angle) => normalizeAngle(angle)),
        },
      });
    });
  }
}

export const gearMachineRuntime = {
  id: 'gear-machine',

  onGameQuestion({ data, state, socket, showView }) {
    ensureStyles();
    ensureSocketHooks(socket, state);

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');

    const hostModeBadge = document.getElementById('host-q-difficulty');
    if (hostModeBadge) hostModeBadge.textContent = 'GEAR MACHINE';
    const playerModeBadge = document.getElementById('player-q-difficulty');
    if (playerModeBadge) playerModeBadge.textContent = 'GEAR MACHINE';

    const hostText = document.getElementById('host-question-text');
    if (hostText) hostText.textContent = 'Gear Machine';
    const playerText = document.getElementById('player-question-text');
    if (playerText) playerText.textContent = 'Gear Machine';

    hideDefaultQuestionWidgets();

    if (isHostOnly) {
      renderSpectatorView({ data });
      return true;
    }

    renderPlayerView({ data, state, socket });
    return true;
  },

  onQuestionEnd() {
    return true;
  },

  onLeaderboard() {
    return true;
  },
};
