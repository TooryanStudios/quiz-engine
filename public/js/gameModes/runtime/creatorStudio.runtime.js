import { Sounds } from '../../utils/sounds.js?v=121';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ensureStyles() {
  if (document.getElementById('creator-studio-styles')) return;

  const style = document.createElement('style');
  style.id = 'creator-studio-styles';
  style.textContent = `
    .cs-wrap {
      width: min(100%, 720px);
      margin: 0.45rem auto 0;
      padding: 0.85rem 0.9rem;
      border-radius: 16px;
      border: 1px solid rgba(148,163,184,0.32);
      background: rgba(15,23,42,0.74);
      color: #e2e8f0;
    }
    .cs-head {
      text-align: center;
      margin-bottom: 0.55rem;
    }
    .cs-title {
      font-size: 1.02rem;
      font-weight: 900;
    }
    .cs-sub {
      margin-top: 0.28rem;
      font-size: 0.83rem;
      opacity: 0.88;
      line-height: 1.35;
    }
    .cs-stage {
      border: 1px solid rgba(148,163,184,0.3);
      border-radius: 14px;
      background: rgba(2,6,23,0.34);
      padding: 0.65rem;
      margin-top: 0.55rem;
    }
    .cs-canvas {
      width: 100%;
      height: min(58vw, 290px);
      min-height: 230px;
      background: rgba(15,23,42,0.84);
      border: 1px dashed rgba(56,189,248,0.45);
      border-radius: 12px;
      touch-action: none;
      display: block;
      cursor: crosshair;
    }
    .cs-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 0.62rem;
    }
    .cs-btn {
      border: 1px solid rgba(148,163,184,0.45);
      border-radius: 10px;
      background: rgba(30,41,59,0.78);
      color: #e2e8f0;
      padding: 0.5rem 0.8rem;
      font-size: 0.84rem;
      font-weight: 800;
      cursor: pointer;
    }
    .cs-btn.primary {
      border-color: rgba(34,197,94,0.45);
      background: rgba(34,197,94,0.2);
      color: #bbf7d0;
    }
    .cs-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .cs-status {
      margin-top: 0.56rem;
      text-align: center;
      font-size: 0.84rem;
      min-height: 1.2rem;
      opacity: 0.92;
    }
    .cs-rating-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 0.4rem;
      margin-top: 0.62rem;
    }
    .cs-rate-btn {
      border: 1px solid rgba(148,163,184,0.38);
      border-radius: 10px;
      background: rgba(30,41,59,0.74);
      color: #e2e8f0;
      padding: 0.45rem 0;
      font-size: 0.84rem;
      font-weight: 800;
      cursor: pointer;
    }
    .cs-arrange-board {
      position: relative;
      width: 100%;
      height: min(58vw, 300px);
      min-height: 240px;
      border: 1px dashed rgba(34,211,238,0.45);
      border-radius: 12px;
      background: linear-gradient(165deg, rgba(15,23,42,0.9), rgba(2,6,23,0.86));
      overflow: hidden;
      touch-action: none;
    }
    .cs-arrange-chip {
      position: absolute;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(148,163,184,0.36);
      border-radius: 999px;
      background: rgba(51,65,85,0.84);
      color: #f8fafc;
      padding: 0.35rem 0.62rem;
      font-size: 0.8rem;
      font-weight: 800;
      user-select: none;
      cursor: grab;
      box-shadow: 0 8px 16px rgba(2,6,23,0.28);
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cs-scoreboard {
      margin-top: 0.6rem;
      display: grid;
      gap: 0.35rem;
    }
    .cs-score-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.83rem;
      border: 1px solid rgba(148,163,184,0.22);
      border-radius: 10px;
      background: rgba(30,41,59,0.45);
      padding: 0.36rem 0.5rem;
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

function drawStrokeSet(canvas, strokes) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;

  (strokes || []).forEach((stroke) => {
    const points = Array.isArray(stroke?.points) ? stroke.points : [];
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x * width, points[0].y * height);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x * width, points[i].y * height);
    }
    ctx.stroke();
  });
}

function renderSubmissionPreview(previewEl, submission) {
  if (!previewEl) return;
  if (!submission || typeof submission !== 'object') {
    previewEl.innerHTML = '<div class="cs-status">No submission captured.</div>';
    return;
  }

  if (submission.kind === 'arrange') {
    const layout = Array.isArray(submission.layout) ? submission.layout : [];
    previewEl.innerHTML = `
      <div class="cs-arrange-board">
        ${layout.map((item) => `
          <div class="cs-arrange-chip" style="left:${clamp(Number(item.x || 50), 0, 100)}%;top:${clamp(Number(item.y || 50), 0, 100)}%;cursor:default;">${String(item.text || '')}</div>
        `).join('')}
      </div>
    `;
    return;
  }

  previewEl.innerHTML = '<canvas id="cs-preview-canvas" class="cs-canvas" style="cursor:default;"></canvas>';
  const canvas = previewEl.querySelector('#cs-preview-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width || 320));
  canvas.height = Math.max(230, Math.floor(rect.height || 230));
  drawStrokeSet(canvas, submission.strokes || []);
}

function renderScoreboardHTML(scoreboard) {
  const entries = Array.isArray(scoreboard) ? scoreboard : [];
  if (!entries.length) return '';
  return `
    <div class="cs-scoreboard">
      ${entries.map((entry) => `
        <div class="cs-score-item">
          <span>${String(entry.nickname || 'Player')}</span>
          <strong>${Number(entry.score || 0).toFixed(1)}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

function ensureSocketHooks(socket, state) {
  if (state.__creatorStudioHooksBound) return;
  state.__creatorStudioHooksBound = true;

  socket.on('creator:rating_update', (payload = {}) => {
    const status = document.getElementById('cs-rating-status');
    if (!status) return;
    const rated = Number(payload.ratedCount || 0);
    const total = Number(payload.eligibleRaters || 0);
    const avg = Number(payload.averageRating || 0);
    status.textContent = `Ratings: ${rated}/${total} • Avg ${avg.toFixed(2)}`;
  });

  socket.on('creator:submission_saved', () => {
    const status = document.getElementById('cs-create-status');
    if (status) status.textContent = '✅ Submission saved. Waiting for rating phase…';
  });
}

function renderCreatePhase({ container, data, state, socket, studio, isCreator }) {
  const roundKey = `${studio.round}:${studio.creatorId || 'none'}`;
  if (state.__creatorRoundKey !== roundKey) {
    state.__creatorRoundKey = roundKey;
    state.__creatorSubmitted = false;
    state.__creatorRatingSubmitted = false;
    state.__creatorDrawStrokes = [];
    state.__creatorArrangeLayout = Array.isArray(studio?.prompt?.elements)
      ? studio.prompt.elements.map((text, index) => ({
          text,
          x: 18 + ((index % 3) * 30),
          y: 25 + (Math.floor(index / 3) * 25),
        }))
      : [];
  }

  const promptText = String(studio?.prompt?.text || 'Create something');
  const creatorName = studio?.creatorNickname || 'Creator';
  const kind = studio?.prompt?.kind || 'draw';

  if (!isCreator) {
    container.innerHTML = `
      <div class="cs-wrap">
        <div class="cs-head">
          <div class="cs-title">🎨 ${creatorName} is creating now</div>
          <div class="cs-sub">Prompt: ${promptText}</div>
        </div>
        <div class="cs-stage">
          <div class="cs-status">Waiting for the creator to submit (or timer to end)…</div>
        </div>
        ${renderScoreboardHTML(studio?.scoreboard)}
      </div>
    `;
    return;
  }

  if (kind === 'arrange') {
    container.innerHTML = `
      <div class="cs-wrap">
        <div class="cs-head">
          <div class="cs-title">🧩 Arrange Creator Mode</div>
          <div class="cs-sub">Prompt: ${promptText}</div>
        </div>
        <div class="cs-stage">
          <div id="cs-arrange-board" class="cs-arrange-board"></div>
          <div class="cs-actions">
            <button type="button" id="cs-reset-arrange" class="cs-btn">↺ Reset</button>
            <button type="button" id="cs-submit-create" class="cs-btn primary" ${state.__creatorSubmitted ? 'disabled' : ''}>✅ Submit</button>
          </div>
          <div id="cs-create-status" class="cs-status">Move elements to make the nicest composition.</div>
        </div>
      </div>
    `;

    const board = container.querySelector('#cs-arrange-board');
    if (!board) return;

    const rerender = () => {
      board.innerHTML = '';
      state.__creatorArrangeLayout.forEach((item, index) => {
        const chip = document.createElement('div');
        chip.className = 'cs-arrange-chip';
        chip.textContent = String(item.text || '');
        chip.style.left = `${clamp(Number(item.x || 50), 0, 100)}%`;
        chip.style.top = `${clamp(Number(item.y || 50), 0, 100)}%`;
        board.appendChild(chip);

        const dragState = { active: false, pointerId: null };

        const onPointerMove = (event) => {
          if (!dragState.active || event.pointerId !== dragState.pointerId) return;
          const rect = board.getBoundingClientRect();
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          state.__creatorArrangeLayout[index].x = clamp(x, 5, 95);
          state.__creatorArrangeLayout[index].y = clamp(y, 8, 92);
          chip.style.left = `${state.__creatorArrangeLayout[index].x}%`;
          chip.style.top = `${state.__creatorArrangeLayout[index].y}%`;
        };

        const onPointerUp = (event) => {
          if (event.pointerId !== dragState.pointerId) return;
          dragState.active = false;
          dragState.pointerId = null;
          try { chip.releasePointerCapture(event.pointerId); } catch (_) {}
        };

        chip.addEventListener('pointerdown', (event) => {
          if (state.__creatorSubmitted) return;
          dragState.active = true;
          dragState.pointerId = event.pointerId;
          try { chip.setPointerCapture(event.pointerId); } catch (_) {}
          event.preventDefault();
        });
        chip.addEventListener('pointermove', onPointerMove);
        chip.addEventListener('pointerup', onPointerUp);
        chip.addEventListener('pointercancel', onPointerUp);
      });
    };

    rerender();

    const resetBtn = container.querySelector('#cs-reset-arrange');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.__creatorArrangeLayout = (studio.prompt.elements || []).map((text, index) => ({
          text,
          x: 18 + ((index % 3) * 30),
          y: 25 + (Math.floor(index / 3) * 25),
        }));
        rerender();
      });
    }

    const submitBtn = container.querySelector('#cs-submit-create');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (state.__creatorSubmitted) return;
        state.__creatorSubmitted = true;
        submitBtn.disabled = true;
        Sounds.start();
        socket.emit('player:answer', {
          questionIndex: data.questionIndex,
          answer: {
            action: 'submit_creation',
            creation: {
              kind: 'arrange',
              layout: state.__creatorArrangeLayout.map((item) => ({ text: item.text, x: item.x, y: item.y })),
            },
          },
        });
      });
    }

    return;
  }

  container.innerHTML = `
    <div class="cs-wrap">
      <div class="cs-head">
        <div class="cs-title">🖌️ Draw Creator Mode</div>
        <div class="cs-sub">Prompt: ${promptText}</div>
      </div>
      <div class="cs-stage">
        <canvas id="cs-draw-canvas" class="cs-canvas"></canvas>
        <div class="cs-actions">
          <button type="button" id="cs-clear-draw" class="cs-btn">🧽 Clear</button>
          <button type="button" id="cs-submit-create" class="cs-btn primary" ${state.__creatorSubmitted ? 'disabled' : ''}>✅ Submit</button>
        </div>
        <div id="cs-create-status" class="cs-status">Draw your idea clearly. Audience will rate from 1 to 10.</div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#cs-draw-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(rect.width || 320));
  canvas.height = Math.max(230, Math.floor(rect.height || 230));
  drawStrokeSet(canvas, state.__creatorDrawStrokes || []);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3;

  const drawState = { active: false, pointerId: null };

  const toPoint = (event) => {
    const box = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - box.left) / box.width, 0, 1),
      y: clamp((event.clientY - box.top) / box.height, 0, 1),
    };
  };

  const onPointerMove = (event) => {
    if (!drawState.active || event.pointerId !== drawState.pointerId || state.__creatorSubmitted) return;
    const point = toPoint(event);
    const strokes = state.__creatorDrawStrokes || [];
    const activeStroke = strokes[strokes.length - 1];
    if (!activeStroke) return;
    activeStroke.points.push(point);
    drawStrokeSet(canvas, strokes);
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== drawState.pointerId) return;
    drawState.active = false;
    drawState.pointerId = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
  };

  canvas.addEventListener('pointerdown', (event) => {
    if (state.__creatorSubmitted) return;
    drawState.active = true;
    drawState.pointerId = event.pointerId;
    const point = toPoint(event);
    if (!Array.isArray(state.__creatorDrawStrokes)) state.__creatorDrawStrokes = [];
    state.__creatorDrawStrokes.push({ points: [point] });
    try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  const clearBtn = container.querySelector('#cs-clear-draw');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.__creatorDrawStrokes = [];
      drawStrokeSet(canvas, []);
      Sounds.click();
    });
  }

  const submitBtn = container.querySelector('#cs-submit-create');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (state.__creatorSubmitted) return;
      state.__creatorSubmitted = true;
      submitBtn.disabled = true;
      Sounds.start();
      socket.emit('player:answer', {
        questionIndex: data.questionIndex,
        answer: {
          action: 'submit_creation',
          creation: {
            kind: 'draw',
            strokes: Array.isArray(state.__creatorDrawStrokes) ? state.__creatorDrawStrokes : [],
          },
        },
      });
    });
  }
}

function renderRatingPhase({ container, data, state, socket, studio, isCreator }) {
  const creatorName = studio?.creatorNickname || 'Creator';

  container.innerHTML = `
    <div class="cs-wrap">
      <div class="cs-head">
        <div class="cs-title">⭐ Rate ${creatorName}</div>
        <div class="cs-sub">Give a fair score from 1 to 10</div>
      </div>
      <div class="cs-stage">
        <div id="cs-submission-preview"></div>
        ${isCreator ? '' : `
          <div class="cs-rating-grid">
            ${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<button class="cs-rate-btn" data-rate="${n}" ${state.__creatorRatingSubmitted ? 'disabled' : ''}>${n}</button>`).join('')}
          </div>
        `}
        <div id="cs-rating-status" class="cs-status">Ratings: ${Number(studio.ratedCount || 0)}/${Number(studio.eligibleRaters || 0)} • Avg ${(Number(studio.averageRating || 0)).toFixed(2)}</div>
      </div>
      ${renderScoreboardHTML(studio?.scoreboard)}
    </div>
  `;

  const preview = container.querySelector('#cs-submission-preview');
  renderSubmissionPreview(preview, studio?.submission || null);

  if (isCreator) {
    const status = container.querySelector('#cs-rating-status');
    if (status) status.textContent = 'Audience is rating your creation…';
    return;
  }

  container.querySelectorAll('[data-rate]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.__creatorRatingSubmitted) return;
      const rating = Number(btn.getAttribute('data-rate') || 0);
      state.__creatorRatingSubmitted = true;
      Sounds.click();
      container.querySelectorAll('[data-rate]').forEach((el) => {
        el.setAttribute('disabled', 'disabled');
      });
      socket.emit('player:answer', {
        questionIndex: data.questionIndex,
        answer: {
          action: 'rate',
          rating,
        },
      });
      const status = container.querySelector('#cs-rating-status');
      if (status) status.textContent = `✅ Your rating (${rating}) has been submitted.`;
    });
  });
}

function renderResultPhase({ container, studio }) {
  const avg = Number(studio?.averageRating || 0);
  const creatorName = studio?.creatorNickname || 'Creator';

  container.innerHTML = `
    <div class="cs-wrap">
      <div class="cs-head">
        <div class="cs-title">🏁 Round Result</div>
        <div class="cs-sub">${creatorName} • Average Rating: <strong>${avg.toFixed(2)}</strong>/10</div>
      </div>
      <div class="cs-stage">
        <div id="cs-submission-preview"></div>
        <div class="cs-status">Top ratings: ${Array.isArray(studio?.ratings) && studio.ratings.length ? studio.ratings.map((r) => `${r.nickname} ${r.rating}`).join(' • ') : 'No ratings this round.'}</div>
      </div>
      ${renderScoreboardHTML(studio?.scoreboard)}
    </div>
  `;

  const preview = container.querySelector('#cs-submission-preview');
  renderSubmissionPreview(preview, studio?.submission || null);
}

export const creatorStudioRuntime = {
  id: 'creator-studio',

  onGameQuestion({ data, state, socket, showView }) {
    ensureStyles();
    ensureSocketHooks(socket, state);

    const studio = data?.question?.creatorStudio;
    if (!studio) return false;

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');

    const hostModeBadge = document.getElementById('host-q-difficulty');
    if (hostModeBadge) hostModeBadge.textContent = 'CREATOR STUDIO';
    const playerModeBadge = document.getElementById('player-q-difficulty');
    if (playerModeBadge) playerModeBadge.textContent = 'CREATOR STUDIO';

    const hostText = document.getElementById('host-question-text');
    if (hostText) hostText.textContent = 'Creator Studio';
    const playerText = document.getElementById('player-question-text');
    if (playerText) playerText.textContent = 'Creator Studio';

    hideDefaultQuestionWidgets();

    const container = document.getElementById(isHostOnly ? 'host-options-grid' : 'player-options-grid');
    if (!container) return true;

    const isCreator = socket.id === studio.creatorId;

    if (studio.phase === 'create') {
      renderCreatePhase({ container, data, state, socket, studio, isCreator });
      return true;
    }

    if (studio.phase === 'rating') {
      renderRatingPhase({ container, data, state, socket, studio, isCreator });
      return true;
    }

    renderResultPhase({ container, studio });
    return true;
  },

  onQuestionEnd() {
    return true;
  },

  onLeaderboard() {
    return true;
  },
};
