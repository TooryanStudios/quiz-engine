import { Sounds } from '../../utils/sounds.js?v=122';

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
    .cs-turn-legend {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.4rem;
      margin-bottom: 0.55rem;
    }
    .cs-turn-pill {
      border-radius: 999px;
      border: 1px solid rgba(148,163,184,0.3);
      background: rgba(30,41,59,0.45);
      color: #cbd5e1;
      padding: 0.3rem 0.55rem;
      font-size: 0.77rem;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
    }
    .cs-turn-pill.is-active {
      border-color: rgba(34,197,94,0.48);
      background: rgba(34,197,94,0.18);
      color: #bbf7d0;
      animation: cs-active-pulse 1.5s ease-in-out infinite;
    }
    .cs-turn-pill.is-me {
      border-color: rgba(56,189,248,0.52);
      color: #bae6fd;
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
      aspect-ratio: 4 / 3;
      max-height: 60vh;
      background: rgba(15,23,42,0.84);
      border: 1px dashed rgba(56,189,248,0.45);
      border-radius: 12px;
      touch-action: none;
      display: block;
      cursor: crosshair;
      object-fit: contain;
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
      aspect-ratio: 4 / 3;
      max-height: 60vh;
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
      animation: cs-pop-in 0.38s ease both;
    }
    .cs-result-card {
      border: 1px solid rgba(56,189,248,0.35);
      border-radius: 14px;
      background: linear-gradient(165deg, rgba(15,23,42,0.82), rgba(30,41,59,0.78));
      padding: 0.62rem 0.7rem;
      text-align: center;
      animation: cs-pop-in 0.45s ease-out both;
    }
    .cs-result-score {
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: 0.03em;
      margin: 0.2rem 0 0.35rem;
      color: #f8fafc;
      text-shadow: 0 0 14px rgba(56,189,248,0.3);
    }
    .cs-result-funny {
      font-size: 0.84rem;
      font-weight: 800;
      line-height: 1.35;
      color: #e2e8f0;
    }
    .cs-result-burst {
      display: flex;
      justify-content: center;
      gap: 0.32rem;
      margin-bottom: 0.22rem;
      font-size: 1rem;
    }
    .cs-result-burst span {
      display: inline-block;
      animation: cs-bounce-funny 1.1s ease-in-out infinite;
    }
    .cs-result-burst span:nth-child(2) { animation-delay: 0.12s; }
    .cs-result-burst span:nth-child(3) { animation-delay: 0.24s; }
    .cs-result-burst span:nth-child(4) { animation-delay: 0.36s; }
    .cs-result-card.is-epic {
      border-color: rgba(34,197,94,0.45);
      box-shadow: 0 0 18px rgba(34,197,94,0.25);
    }
    .cs-result-card.is-funny {
      border-color: rgba(244,114,182,0.48);
      box-shadow: 0 0 18px rgba(244,114,182,0.22);
    }
    .cs-turn-overlay {
      position: fixed;
      inset: 0;
      z-index: 1200;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
    }
    .cs-turn-overlay.is-showing { opacity: 1; }
    .cs-turn-overlay-msg {
      border-radius: 16px;
      border: 1px solid rgba(56,189,248,0.45);
      background: linear-gradient(135deg, rgba(15,23,42,0.88), rgba(30,41,59,0.84));
      color: #f8fafc;
      font-size: clamp(1.1rem, 3.8vw, 1.85rem);
      font-weight: 900;
      letter-spacing: 0.015em;
      text-align: center;
      min-width: min(92vw, 380px);
      padding: 0.8rem 1.2rem;
      box-shadow: 0 12px 28px rgba(2,6,23,0.45);
      animation: cs-turn-pop 1.65s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes cs-active-pulse {
      0%, 100% { transform: translateY(0); box-shadow: 0 0 0 rgba(34,197,94,0); }
      50% { transform: translateY(-1px); box-shadow: 0 0 16px rgba(34,197,94,0.22); }
    }
    @keyframes cs-pop-in {
      0% { transform: translateY(10px) scale(0.96); opacity: 0; }
      100% { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes cs-bounce-funny {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      40% { transform: translateY(-5px) rotate(-8deg); }
      70% { transform: translateY(-2px) rotate(6deg); }
    }
    @keyframes cs-turn-pop {
      0% { transform: translateY(16px) scale(0.93); opacity: 0; filter: blur(8px); }
      24% { transform: translateY(0) scale(1.02); opacity: 1; filter: blur(0); }
      74% { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
      100% { transform: translateY(-8px) scale(0.98); opacity: 0; filter: blur(6px); }
    }
  `;

  document.head.appendChild(style);
}

function showTurnOverlay(message) {
  let overlay = document.getElementById('cs-turn-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'cs-turn-overlay';
    overlay.className = 'cs-turn-overlay';
    overlay.innerHTML = '<div class="cs-turn-overlay-msg" id="cs-turn-overlay-msg"></div>';
    document.body.appendChild(overlay);
  }

  const msg = document.getElementById('cs-turn-overlay-msg');
  if (msg) msg.textContent = String(message || 'استوديو المبدع');

  overlay.classList.remove('is-showing');
  void overlay.offsetWidth;
  overlay.classList.add('is-showing');

  window.setTimeout(() => {
    overlay.classList.remove('is-showing');
  }, 1650);
}

function renderTurnLegendHTML(players, activePlayerId, currentSocketId) {
  const entries = Array.isArray(players) ? players : [];
  if (!entries.length) return '';
  return `
    <div class="cs-turn-legend">
      ${entries.map((player) => {
        const isActive = player.id === activePlayerId;
        const isMe = player.id === currentSocketId;
        return `<div class="cs-turn-pill ${isActive ? 'is-active' : ''} ${isMe ? 'is-me' : ''}">${isActive ? '🎯 ' : ''}${String(player.nickname || 'Player')}</div>`;
      }).join('')}
    </div>
  `;
}

function getResultFlavor(avg) {
  if (avg >= 8.5) {
    return {
      className: 'is-epic',
      burst: ['🔥', '🏆', '✨', '🚀'],
      text: 'تحفة فنية! الجمهور اشتعل حماسًا 🔥',
    };
  }
  if (avg >= 6.5) {
    return {
      className: '',
      burst: ['👏', '🌟', '🎉', '💫'],
      text: 'جولة ممتازة! شغل رهيب 👏',
    };
  }
  if (avg >= 4) {
    return {
      className: 'is-funny',
      burst: ['😅', '🎭', '🤣', '✨'],
      text: 'فوضى ممتعة! روح إبداعية مرحة جدًا 😄',
    };
  }
  return {
    className: 'is-funny',
    burst: ['🤣', '🌀', '🎪', '🙌'],
    text: 'طاقة ميمز مفعّلة! الجولة كوميدية جدًا 😂',
  };
}

function handlePhaseTransitionFX({ studio, state, isCreator }) {
  const phase = String(studio?.phase || 'create');
  const creatorId = studio?.creatorId || 'none';
  const phaseKey = `${studio?.round || 0}:${phase}:${creatorId}`;
  if (state.__creatorPhaseFxKey === phaseKey) return;
  state.__creatorPhaseFxKey = phaseKey;

  if (phase === 'create') {
    if (isCreator) {
      showTurnOverlay('🎯 دورك الآن! ابدأ الإبداع');
      if (typeof Sounds.xoTurn === 'function') Sounds.xoTurn();
      else if (typeof Sounds.start === 'function') Sounds.start();
    } else {
      showTurnOverlay(`🎨 ${studio?.creatorNickname || 'Creator'} يلعب الآن`);
      if (typeof Sounds.xoRoundStart === 'function') Sounds.xoRoundStart();
    }
    return;
  }

  if (phase === 'rating') {
    showTurnOverlay(isCreator ? '⭐ الجمهور يقيم عملك الآن' : '⭐ دورك للتقييم الآن');
    if (typeof Sounds.tick === 'function') Sounds.tick();
    return;
  }

  const avg = Number(studio?.averageRating || 0);
  showTurnOverlay('🏁 نتيجة الجولة وصلت!');
  if (avg >= 7 && typeof Sounds.fanfare === 'function') Sounds.fanfare();
  else if (avg >= 5 && typeof Sounds.correct === 'function') Sounds.correct();
  else if (typeof Sounds.wrong === 'function') Sounds.wrong();
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
    previewEl.innerHTML = '<div class="cs-status">لا يوجد إبداع محفوظ في هذه الجولة.</div>';
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
  canvas.width = rect.width || 320;
  canvas.height = rect.height || 240;
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
    status.textContent = `التقييمات: ${rated}/${total} • المتوسط ${avg.toFixed(2)}`;
  });

  socket.on('creator:submission_saved', () => {
    const status = document.getElementById('cs-create-status');
    if (status) status.textContent = '✅ Submission saved. Waiting for rating phase…';
  });

  socket.on('creator:sync_creation', (payload) => {
    if (payload?.creation?.strokes) {
      state.__creatorDrawStrokes = payload.creation.strokes;
      const canvas = document.getElementById('cs-preview-canvas');
      if (canvas) {
        drawStrokeSet(canvas, state.__creatorDrawStrokes);
      }
    }
  });
}

function renderCreatePhase({ container, data, state, socket, studio, isCreator, players }) {
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

  const promptText = String(studio?.prompt?.text || 'ابتكر شيئًا مميزًا');
  const creatorName = studio?.creatorNickname || 'Creator';
  const kind = studio?.prompt?.kind || 'draw';

  if (!isCreator) {
    container.innerHTML = `
      <div class="cs-wrap">
        ${renderTurnLegendHTML(players, studio?.creatorId, socket.id)}
        <div class="cs-head">
          <div class="cs-title">🎨 الآن دور ${creatorName}</div>
          <div class="cs-sub">المهمة: ${promptText}</div>
        </div>
        <div class="cs-stage">
          ${kind === 'draw' ? '<canvas id="cs-preview-canvas" class="cs-canvas" style="cursor:default;"></canvas>' : '<div class="cs-status">بانتظار إرسال الإبداع (أو انتهاء الوقت)…</div>'}
        </div>
        ${renderScoreboardHTML(studio?.scoreboard)}
      </div>
    `;
    
    if (kind === 'draw') {
      const canvas = container.querySelector('#cs-preview-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 320;
        canvas.height = rect.height || 240;
        drawStrokeSet(canvas, state.__creatorDrawStrokes || []);
      }
    }
    return;
  }

  if (kind === 'arrange') {
    container.innerHTML = `
      <div class="cs-wrap">
        ${renderTurnLegendHTML(players, studio?.creatorId, socket.id)}
        <div class="cs-head">
          <div class="cs-title">🧩 وضع ترتيب العناصر</div>
          <div class="cs-sub">المهمة: ${promptText}</div>
        </div>
        <div class="cs-stage">
          <div id="cs-arrange-board" class="cs-arrange-board"></div>
          <div class="cs-actions">
            <button type="button" id="cs-reset-arrange" class="cs-btn">↺ إعادة ضبط</button>
            <button type="button" id="cs-submit-create" class="cs-btn primary" ${state.__creatorSubmitted ? 'disabled' : ''}>✅ إرسال</button>
          </div>
          <div id="cs-create-status" class="cs-status">حرّك العناصر لصنع أفضل تكوين بصري.</div>
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
      ${renderTurnLegendHTML(players, studio?.creatorId, socket.id)}
      <div class="cs-head">
        <div class="cs-title">🖌️ وضع الرسم الإبداعي</div>
        <div class="cs-sub">المهمة: ${promptText}</div>
      </div>
      <div class="cs-stage">
        <canvas id="cs-draw-canvas" class="cs-canvas"></canvas>
        <div class="cs-actions">
          <button type="button" id="cs-clear-draw" class="cs-btn">🧽 مسح</button>
          <button type="button" id="cs-submit-create" class="cs-btn primary" ${state.__creatorSubmitted ? 'disabled' : ''}>✅ إرسال</button>
        </div>
        <div id="cs-create-status" class="cs-status">ارسم فكرتك بوضوح. الجمهور سيقيّم من 1 إلى 10.</div>
      </div>
    </div>
  `;

  const canvas = container.querySelector('#cs-draw-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width || 320;
  canvas.height = rect.height || 240;
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

  const syncDrawing = () => {
    if (state.__creatorSubmitted) return;
    socket.emit('player:answer', {
      questionIndex: data.questionIndex,
      answer: {
        action: 'sync_creation',
        creation: {
          kind: 'draw',
          strokes: Array.isArray(state.__creatorDrawStrokes) ? state.__creatorDrawStrokes : [],
        },
      },
    });
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== drawState.pointerId) return;
    drawState.active = false;
    drawState.pointerId = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    syncDrawing();
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
      syncDrawing();
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

function renderRatingPhase({ container, data, state, socket, studio, isCreator, players }) {
  const creatorName = studio?.creatorNickname || 'Creator';

  container.innerHTML = `
    <div class="cs-wrap">
      ${renderTurnLegendHTML(players, studio?.creatorId, socket.id)}
      <div class="cs-head">
        <div class="cs-title">⭐ قيّم ${creatorName}</div>
        <div class="cs-sub">امنح تقييمًا عادلًا من 1 إلى 10</div>
      </div>
      <div class="cs-stage">
        <div id="cs-submission-preview"></div>
        ${isCreator ? '' : `
          <div class="cs-rating-grid">
            ${Array.from({ length: 10 }, (_, i) => i + 1).map((n) => `<button class="cs-rate-btn" data-rate="${n}" ${state.__creatorRatingSubmitted ? 'disabled' : ''}>${n}</button>`).join('')}
          </div>
        `}
        <div id="cs-rating-status" class="cs-status">التقييمات: ${Number(studio.ratedCount || 0)}/${Number(studio.eligibleRaters || 0)} • المتوسط ${(Number(studio.averageRating || 0)).toFixed(2)}</div>
      </div>
      ${renderScoreboardHTML(studio?.scoreboard)}
    </div>
  `;

  const preview = container.querySelector('#cs-submission-preview');
  renderSubmissionPreview(preview, studio?.submission || null);

  if (isCreator) {
    const status = container.querySelector('#cs-rating-status');
    if (status) status.textContent = 'الجمهور يقيّم إبداعك الآن…';
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
      if (status) status.textContent = `✅ تم إرسال تقييمك (${rating}) بنجاح.`;
    });
  });
}

function renderResultPhase({ container, studio, players, currentSocketId }) {
  const avg = Number(studio?.averageRating || 0);
  const creatorName = studio?.creatorNickname || 'Creator';
  const flavor = getResultFlavor(avg);

  container.innerHTML = `
    <div class="cs-wrap">
      ${renderTurnLegendHTML(players, studio?.creatorId, currentSocketId)}
      <div class="cs-head">
        <div class="cs-title">🏁 نتيجة الجولة</div>
        <div class="cs-sub">${creatorName} • متوسط التقييم: <strong>${avg.toFixed(2)}</strong>/10</div>
      </div>
      <div class="cs-stage">
        <div class="cs-result-card ${flavor.className}">
          <div class="cs-result-burst">${flavor.burst.map((emoji) => `<span>${emoji}</span>`).join('')}</div>
          <div class="cs-result-score">${avg.toFixed(2)} / 10</div>
          <div class="cs-result-funny">${flavor.text}</div>
        </div>
        <div id="cs-submission-preview"></div>
        <div class="cs-status">أفضل التقييمات: ${Array.isArray(studio?.ratings) && studio.ratings.length ? studio.ratings.map((r) => `${r.nickname} ${r.rating}`).join(' • ') : 'لا توجد تقييمات في هذه الجولة.'}</div>
      </div>
      ${renderScoreboardHTML(studio?.scoreboard)}
    </div>
  `;

  const preview = container.querySelector('#cs-submission-preview');
  renderSubmissionPreview(preview, studio?.submission || null);
}

export const creatorStudioRuntime = {
  id: 'creator-studio',

  onGameQuestion({ data, state, socket, showView, renderQuestion }) {
    ensureStyles();
    ensureSocketHooks(socket, state);

    const studio = data?.question?.creatorStudio;
    if (!studio) return false;

    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    
    if (typeof renderQuestion === 'function') {
      renderQuestion(data, isHostOnly);
    }
    
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');

    const hostModeBadge = document.getElementById('host-q-difficulty');
    if (hostModeBadge) hostModeBadge.textContent = 'استوديو المبدع';
    const playerModeBadge = document.getElementById('player-q-difficulty');
    if (playerModeBadge) playerModeBadge.textContent = 'استوديو المبدع';

    const hostText = document.getElementById('host-question-text');
    if (hostText) hostText.textContent = 'استوديو المبدع';
    const playerText = document.getElementById('player-question-text');
    if (playerText) playerText.textContent = 'استوديو المبدع';

    hideDefaultQuestionWidgets();

    const container = document.getElementById(isHostOnly ? 'host-options-grid' : 'player-options-grid');
    if (!container) return true;

    const isCreator = socket.id === studio.creatorId;
    const players = Array.isArray(data?.players) ? data.players : [];

    handlePhaseTransitionFX({ studio, state, isCreator });

    if (studio.phase === 'create') {
      renderCreatePhase({ container, data, state, socket, studio, isCreator, players });
      return true;
    }

    if (studio.phase === 'rating') {
      renderRatingPhase({ container, data, state, socket, studio, isCreator, players });
      return true;
    }

    renderResultPhase({ container, studio, players, currentSocketId: socket.id });
    return true;
  },

  onQuestionEnd() {
    return true;
  },

  onLeaderboard() {
    return true;
  },
};
