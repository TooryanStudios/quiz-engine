import { Sounds } from '../../utils/sounds.js?v=121';

function normalizeAngle(value) {
  const n = Number(value || 0);
  return ((Math.round(n) % 360) + 360) % 360;
}

function ensureStyles() {
  if (document.getElementById('gear-machine-styles')) return;

  const style = document.createElement('style');
  style.id = 'gear-machine-styles';
  style.textContent = `
    .gear-machine-wrap {
      max-width: 560px;
      margin: 0.45rem auto 0;
      padding: 0.85rem 0.9rem;
      border-radius: 16px;
      border: 1px solid rgba(148,163,184,0.35);
      background: rgba(15,23,42,0.72);
      color: #e2e8f0;
    }
    .gear-machine-title {
      text-align: center;
      font-weight: 900;
      font-size: 1.05rem;
      margin-bottom: 0.6rem;
    }
    .gear-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
      margin-bottom: 0.8rem;
    }
    .gear-card {
      border: 1px solid rgba(148,163,184,0.3);
      border-radius: 14px;
      padding: 0.55rem;
      background: rgba(2,6,23,0.36);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.45rem;
    }
    .gear-wheel {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      border: 4px solid rgba(148,163,184,0.5);
      box-shadow: inset 0 0 0 2px rgba(2,6,23,0.42), 0 0 0 1px rgba(148,163,184,0.3);
      transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
      background: radial-gradient(circle at 35% 35%, rgba(148,163,184,0.25), rgba(15,23,42,0.65));
    }
    .gear-wheel.large { width: 86px; height: 86px; }
    .gear-wheel.small { width: 64px; height: 64px; }
    .gear-wheel .core {
      width: 28%;
      height: 28%;
      border-radius: 999px;
      background: rgba(2,6,23,0.7);
      border: 2px solid rgba(148,163,184,0.65);
    }
    .gear-wheel.spinning {
      animation: gear-spin 0.9s linear infinite;
    }
    @keyframes gear-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .gear-controls {
      display: flex;
      gap: 0.4rem;
    }
    .gear-btn {
      border: 1px solid rgba(148,163,184,0.45);
      border-radius: 999px;
      background: rgba(30,41,59,0.78);
      color: #e2e8f0;
      padding: 0.24rem 0.6rem;
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;
    }
    .gear-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
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
  `;

  document.head.appendChild(style);
}

function hideDefaultQuestionWidgets() {
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
          <div class="gear-card">
            <div class="gear-wheel ${gear.size || 'small'}" style="transform:rotate(${normalizeAngle(gear.targetAngle || 0)}deg)"><span class="core"></span></div>
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

  const machine = data?.question?.gearMachine || {};
  const gears = Array.isArray(machine.gears) ? machine.gears : [];
  const machineKey = `${machine.startedAt || 0}:${gears.length}`;

  if (state.__gearMachineKey !== machineKey) {
    state.__gearMachineKey = machineKey;
    state.__gearAngles = gears.map(() => 0);
  }

  const angles = Array.isArray(state.__gearAngles) ? state.__gearAngles : gears.map(() => 0);
  state.__gearAngles = angles;

  playerGrid.innerHTML = `
    <div class="gear-machine-wrap">
      <div class="gear-machine-title">⚙️ رتّب التروس ثم شغّل الآلة</div>
      <div class="gear-grid">
        ${gears.map((gear, index) => `
          <div class="gear-card" data-gear-card="${index}">
            <div class="gear-wheel ${gear.size || 'small'}" data-gear-wheel="${index}" style="transform:rotate(${normalizeAngle(angles[index] || 0)}deg)"><span class="core"></span></div>
            <div class="gear-controls">
              <button type="button" class="gear-btn" data-gear-rot-left="${index}">↺</button>
              <button type="button" class="gear-btn" data-gear-rot-right="${index}">↻</button>
            </div>
            <div style="font-size:0.74rem;opacity:0.82;">زاوية: <span data-gear-angle="${index}">${normalizeAngle(angles[index] || 0)}°</span></div>
          </div>
        `).join('')}
      </div>
      <div class="gear-machine-actions">
        <button type="button" id="gear-run-btn" class="gear-run-btn" ${machine.phase === 'finished' ? 'disabled' : ''}>▶️ تشغيل الآلة</button>
      </div>
      <div id="gear-machine-status" class="gear-machine-status">${machine.phase === 'finished'
        ? (machine.winnerId === socket.id ? '🏆 أنت الفائز!' : `🏁 الفائز: ${machine.winnerNickname || 'Player'}`)
        : 'لفّ التروس (صغير/كبير) ثم اضغط تشغيل للتحقق.'}</div>
    </div>
  `;

  gears.forEach((gear, index) => {
    const step = Number(gear.step || 30);
    const leftBtn = playerGrid.querySelector(`[data-gear-rot-left="${index}"]`);
    const rightBtn = playerGrid.querySelector(`[data-gear-rot-right="${index}"]`);
    const wheelEl = playerGrid.querySelector(`[data-gear-wheel="${index}"]`);
    const angleLabel = playerGrid.querySelector(`[data-gear-angle="${index}"]`);

    const refreshAngle = () => {
      const normalized = normalizeAngle(state.__gearAngles[index] || 0);
      state.__gearAngles[index] = normalized;
      if (wheelEl) wheelEl.style.transform = `rotate(${normalized}deg)`;
      if (angleLabel) angleLabel.textContent = `${normalized}°`;
    };

    if (leftBtn) {
      leftBtn.addEventListener('click', () => {
        if (machine.phase === 'finished') return;
        state.__gearAngles[index] = normalizeAngle((state.__gearAngles[index] || 0) - step);
        Sounds.click();
        refreshAngle();
      });
    }

    if (rightBtn) {
      rightBtn.addEventListener('click', () => {
        if (machine.phase === 'finished') return;
        state.__gearAngles[index] = normalizeAngle((state.__gearAngles[index] || 0) + step);
        Sounds.click();
        refreshAngle();
      });
    }
  });

  const runBtn = document.getElementById('gear-run-btn');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (machine.phase === 'finished') return;
      runBtn.disabled = true;
      document.querySelectorAll('.gear-wheel').forEach((el) => el.classList.add('spinning'));
      Sounds.start();
      socket.emit('player:answer', {
        questionIndex: data.questionIndex,
        answer: {
          action: 'test',
          angles: [...state.__gearAngles],
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
