// ─────────────────────────────────────────────
// ES6 Module Imports
// ─────────────────────────────────────────────
import { state, updateState, resetQuestionState} from './state/GameState.js?v=121';
import { Sounds, setMuted, isMuted } from './utils/sounds.js?v=121';
import { safeGet, safeSetDisplay, escapeHtml, hideConnectionChip, OPTION_COLORS, OPTION_ICONS } from './utils/dom.js?v=121';
import { startClientTimer, stopClientTimer, getRemainingTime } from './utils/timer.js?v=121';
import { QuestionRendererFactory } from './renderers/QuestionRenderer.js?v=121';
import { resolveGameModeRuntime } from './gameModes/runtime/index.js?v=121';

// Fetch and display server build time on home screen
fetch('/api/build-info')
  .then((r) => r.json())
  .then(({ buildTime }) => {
    const el = document.getElementById('build-time');
    if (el) el.textContent = `Build: ${buildTime}`;
  })
  .catch(() => {});

// ─────────────────────────────────────────────
// Socket.io connection
// The server serves socket.io client at /socket.io/socket.io.js
// ─────────────────────────────────────────────
const socket = io(window.location.origin);
const queryParams = new URLSearchParams(window.location.search);
const quizSlugFromUrl = queryParams.get('quiz');
const modeFromUrl     = queryParams.get('mode');
const gameModeFromUrl = queryParams.get('gameMode');
const hostUidFromUrl  = queryParams.get('hostUid');
const hostTokenFromUrl = queryParams.get('hostToken');
const hostLaunchCodeFromUrl = queryParams.get('hostLaunchCode');
const isAutoHostLaunch = !!(quizSlugFromUrl && modeFromUrl === 'host');

const resolvedGameModeRuntime = resolveGameModeRuntime(gameModeFromUrl);

function getGameModeRuntime() {
  const runtimeOverride = window.__QYAN_GAME_MODE_RUNTIME;
  if (runtimeOverride && typeof runtimeOverride === 'object') {
    return runtimeOverride;
  }
  return resolvedGameModeRuntime;
}

function callGameModeHook(hookName, payload = {}) {
  const runtime = getGameModeRuntime();
  if (!runtime) return undefined;
  const hook = runtime[hookName];
  if (typeof hook !== 'function') return undefined;
  try {
    return hook(payload);
  } catch (error) {
    console.error(`[game-mode-hook:${hookName}] failed`, error);
    return undefined;
  }
}

function inferGameModeIdFromQuestion(question) {
  if (!question || typeof question !== 'object') return null;

  if (question.type === 'xo_duel' || question.xo) return 'xo-duel';
  if (question.relay) return 'puzzle-relay';
  if (question.type === 'gear_machine' || question.gearMachine) return 'gear-machine';
  if (question.type === 'creator_studio' || question.creatorStudio) return 'creator-studio';

  return null;
}

function callFallbackGameModeHook(hookName, payload = {}) {
  const inferredModeId = inferGameModeIdFromQuestion(payload?.data?.question);
  if (!inferredModeId) return undefined;

  const runtime = resolveGameModeRuntime(inferredModeId);
  if (!runtime || typeof runtime !== 'object') return undefined;

  const hook = runtime[hookName];
  if (typeof hook !== 'function') return undefined;

  try {
    return hook(payload);
  } catch (error) {
    console.error(`[game-mode-fallback-hook:${hookName}] failed`, error);
    return undefined;
  }
}

function getHostAuthPayload() {
  return {
    hostLaunchCode: hostLaunchCodeFromUrl || null,
    hostUid: hostUidFromUrl || null,
    hostToken: hostTokenFromUrl || null,
  };
}

// Question-only mirror mode (for POP-Q debug button)
const questionOnlyMode = queryParams.get('questionOnly'); // 'host' or 'player'
const isQuestionOnly = !!questionOnlyMode;
const questionMirror = window.opener || null;

const PIN_MAX_LENGTH = 6;

// Global scroll/pinch blocker — prevents iOS rubber-band and page scroll
// during all gameplay views. Uses { passive: false } so preventDefault works.
document.addEventListener('touchmove', (e) => {
  if (!document.documentElement.classList.contains('gameplay-active')) return;
  // Allow scrolling inside elements that explicitly need it (e.g. tall leaderboards)
  let el = e.target;
  while (el && el !== document.body) {
    if (el.dataset && el.dataset.allowScroll) return; // opt-out with data-allow-scroll
    el = el.parentElement;
  }
  e.preventDefault();
}, { passive: false });

function normalizePin(value) {
  if (value === null || value === undefined) return '';
  const chars = String(value).trim();
  let normalized = '';
  for (const ch of chars) {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      normalized += ch;
    } else if (code >= 0x0660 && code <= 0x0669) {
      normalized += String(code - 0x0660);
    } else if (code >= 0x06F0 && code <= 0x06F9) {
      normalized += String(code - 0x06F0);
    } else if (code >= 0xFF10 && code <= 0xFF19) {
      normalized += String(code - 0xFF10);
    }
    if (normalized.length >= PIN_MAX_LENGTH) break;
  }
  return normalized;
}

// ─────────────────────────────────────────────
// Session Persistence (reconnect support)
// ─────────────────────────────────────────────
function getOrCreatePlayerId() {
  let id = localStorage.getItem('quizPlayerId');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('quizPlayerId', id);
  }
  return id;
}
const myPlayerId = getOrCreatePlayerId();

function saveGameSession(pin, nickname, avatar) {
  localStorage.setItem('quizSession', JSON.stringify({ pin, nickname, avatar, playerId: myPlayerId }));
}
function clearGameSession() {
  localStorage.removeItem('quizSession');
}

let rejoinAttempt = false; // true while an auto-rejoin is in flight

// ─────────────────────────────────────────────
// Predefined Avatar Set
// ─────────────────────────────────────────────
const AVATARS = ['🦁','🐯','🦊','🐼','🐨','🐸','🦄','🦖','🦜','🕺','🤖','👾','🎃','🧙','🦸','🐇','⚡','🔥','🎮','🏆'];

const hostQuizTitleEl = document.getElementById('host-quiz-title');
function setHostQuizTitle(text) {
  if (!hostQuizTitleEl) return;
  if (!text) {
    hostQuizTitleEl.style.display = 'none';
    hostQuizTitleEl.textContent = '';
    return;
  }
  hostQuizTitleEl.textContent = text;
  hostQuizTitleEl.style.display = 'block';
}

// If a quiz slug is in the URL, show ID immediately then fetch title
// Update both the home banner and the player-join banner
if (quizSlugFromUrl) {
  const el = document.getElementById('quiz-title-banner');
  const el2 = document.getElementById('join-quiz-title-banner');
  setHostQuizTitle(quizSlugFromUrl);
  const setText = (text) => {
    if (!isAutoHostLaunch && el)  { el.textContent = text; el.style.display = 'block'; }
    setHostQuizTitle(text.replace(/^📋\s*/, '').replace(/^🆔\s*/, ''));
    // intentionally not shown on player join screen
  };
  setText(`🆔 ${quizSlugFromUrl}`);
  fetch(`/api/quiz-info/${encodeURIComponent(quizSlugFromUrl)}`)
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (!data) return;
      const updatedAtRaw = data.updatedAt || null;
      const updatedAtDisplay = updatedAtRaw
        ? (isNaN(Date.parse(updatedAtRaw)) ? String(updatedAtRaw) : new Date(updatedAtRaw).toLocaleString())
        : 'unknown';
      console.log(`[quiz-info] title="${data.title || quizSlugFromUrl}" questions=${data.questionCount || 0} updatedAt=${updatedAtDisplay}`);
      // Store total question count for burger menu
      state.quizQuestionCount = data.questionCount || 0;
      const qcntLabel = document.getElementById('burger-qcount-of-label');
      if (qcntLabel) qcntLabel.textContent = '/ ' + state.quizQuestionCount;
      const qLimitInput = document.getElementById('input-question-limit');
      if (qLimitInput) qLimitInput.max = state.quizQuestionCount;
      setText(`📋 ${data.title}`);
      // Kick off media preloading for the host lobby
      if (data.mediaAssets && data.mediaAssets.length > 0) {
        preloadMediaAssets('host', data.title, data.questionCount, data.mediaAssets);
      } else {
        updatePreloadDiag('host', {
          quiz: data.title || quizSlugFromUrl,
          questions: String(data.questionCount || 0),
          mediaTotal: '0 assets',
          status: 'No media to preload',
        });
      }
    })
    .catch(() => {});
}

// ─────────────────────────────────────────────
// Media Preloader — loads images/videos/audio
// during lobby so gameplay is instant
// ─────────────────────────────────────────────
const _preloadCache = new Map(); // url -> Promise<void>

function updatePreloadDiag(prefix, fields) {
  const ids = {
    quiz: `diag-${prefix}-quiz`,
    questions: `diag-${prefix}-questions`,
    mediaTotal: `diag-${prefix}-media-total`,
    loaded: `diag-${prefix}-loaded`,
    failed: `diag-${prefix}-failed`,
    status: `diag-${prefix}-status`,
    bar: `diag-${prefix}-bar`,
    log: `diag-${prefix}-log`,
  };
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'bar') {
      const barEl = document.getElementById(ids.bar);
      if (barEl) barEl.style.width = value + '%';
      continue;
    }
    if (key === 'barClass') {
      const barEl = document.getElementById(ids.bar);
      if (barEl) barEl.className = 'preload-diag-bar ' + value;
      continue;
    }
    const el = document.getElementById(ids[key]);
    if (el) el.textContent = value;
  }
}

function addPreloadLog(prefix, text, cls = '') {
  const logEl = document.getElementById(`diag-${prefix}-log`);
  if (!logEl) return;
  const li = document.createElement('li');
  const timestamp = `[${new Date().toLocaleTimeString()}] `;
  if (cls) li.className = cls;

  // Check if text contains a URL — make it clickable
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (urlMatch) {
    const url = urlMatch[1];
    const before = text.slice(0, urlMatch.index);
    const after = text.slice(urlMatch.index + url.length);
    li.appendChild(document.createTextNode(timestamp + before));
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = url;
    a.style.cssText = 'color:inherit;text-decoration:underline;text-underline-offset:2px;';
    li.appendChild(a);
    if (after) li.appendChild(document.createTextNode(after));
  } else {
    li.textContent = timestamp + text;
  }
  logEl.appendChild(li);
  logEl.scrollTop = logEl.scrollHeight;
}

function preloadSingleAsset(asset) {
  const { type, url } = asset;
  if (_preloadCache.has(url)) return _preloadCache.get(url);

  const promise = new Promise((resolve, reject) => {
    const startTime = performance.now();

    // Use fetch first to get meaningful HTTP error info
    fetch(url, { mode: 'cors' })
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
        }
        // For images, also decode via Image to warm the browser cache
        if (type === 'image') {
          const img = new Image();
          img.onload = () => resolve({ url, type, ms: Math.round(performance.now() - startTime), size: 0 });
          img.onerror = () => resolve({ url, type, ms: Math.round(performance.now() - startTime), size: 0 }); // fetch succeeded so consider ok
          img.src = url;
        } else if (type === 'video') {
          const video = document.createElement('video');
          video.preload = 'auto';
          video.muted = true;
          video.oncanplaythrough = () => resolve({ url, type, ms: Math.round(performance.now() - startTime), size: 0 });
          video.onerror = () => resolve({ url, type, ms: Math.round(performance.now() - startTime), size: 0 });
          video.src = url;
        } else if (type === 'audio') {
          const audio = new Audio();
          audio.preload = 'auto';
          audio.oncanplaythrough = () => resolve({ url, type, ms: Math.round(performance.now() - startTime), size: 0 });
          audio.onerror = () => resolve({ url, type, ms: Math.round(performance.now() - startTime), size: 0 });
          audio.src = url;
        } else {
          resolve({ url, type, ms: Math.round(performance.now() - startTime), size: 0 });
        }
      })
      .catch(err => {
        // Network error or CORS — provide the real reason
        const reason = err.message || 'Network error';
        reject(new Error(`${reason.includes(url) ? reason : reason + ' — ' + url}`));
      });
  });
  _preloadCache.set(url, promise);
  return promise;
}

async function preloadMediaAssets(prefix, quizTitle, questionCount, mediaAssets) {
  const total = mediaAssets.length;
  let loaded = 0;
  let failed = 0;
  const overallStart = performance.now();

  updatePreloadDiag(prefix, {
    quiz: quizTitle || '—',
    questions: String(questionCount || 0),
    mediaTotal: `${total} asset${total !== 1 ? 's' : ''}`,
    loaded: `0 / ${total}`,
    failed: '0',
    status: 'Preloading…',
    bar: 0,
  });
  addPreloadLog(prefix, `Starting preload of ${total} media asset(s)`, 'info');

  // Load 3 at a time for efficiency
  const CONCURRENCY = 3;
  const queue = [...mediaAssets];

  async function processNext() {
    while (queue.length > 0) {
      const asset = queue.shift();
      const shortUrl = asset.url.length > 60 ? asset.url.slice(0, 57) + '…' : asset.url;
      try {
        const result = await preloadSingleAsset(asset);
        loaded++;
        addPreloadLog(prefix, `✓ Q${asset.index + 1} ${result.type} (${result.ms}ms)`, 'success');
      } catch (err) {
        failed++;
        addPreloadLog(prefix, `✗ Q${asset.index + 1} ${asset.type} — ${err.message}`, 'fail');
      }
      const pct = Math.round(((loaded + failed) / total) * 100);
      updatePreloadDiag(prefix, {
        loaded: `${loaded} / ${total}`,
        failed: String(failed),
        bar: pct,
        status: `${pct}% (${loaded + failed}/${total})`,
      });
    }
  }

  const workers = [];
  for (let i = 0; i < Math.min(CONCURRENCY, total); i++) {
    workers.push(processNext());
  }
  await Promise.all(workers);

  const elapsed = Math.round(performance.now() - overallStart);
  const barClass = failed > 0 ? 'has-errors' : 'complete';
  updatePreloadDiag(prefix, {
    status: `Done in ${elapsed}ms — ${loaded} ok, ${failed} failed`,
    bar: 100,
    barClass,
  });
  addPreloadLog(prefix, `Preload complete: ${loaded}/${total} in ${elapsed}ms`, failed > 0 ? 'fail' : 'success');
}

// Trigger preload for a player who joins (via quiz slug in the URL or room info)
function triggerPlayerPreload(quizSlug) {
  if (!quizSlug) return;
  fetch(`/api/quiz-info/${encodeURIComponent(quizSlug)}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      if (data.mediaAssets && data.mediaAssets.length > 0) {
        preloadMediaAssets('player', data.title, data.questionCount, data.mediaAssets);
      } else {
        updatePreloadDiag('player', {
          quiz: data.title || quizSlug,
          questions: String(data.questionCount || 0),
          mediaTotal: '0 assets',
          status: 'No media to preload',
        });
      }
    })
    .catch(() => {});
}

// ─────────────────────────────────────────────
// State is now imported from state/GameState.js
// ─────────────────────────────────────────────

const HOST_PLAYER_STAGE_VARIANTS = {
  neonArcade: {
    id: 'neonArcade',
    listClass: 'stage-neon-arcade',
    cardClass: 'card-neon-arcade',
  },
  quizArena: {
    id: 'quizArena',
    listClass: 'stage-quiz-arena',
    cardClass: 'card-quiz-arena',
  },
  partyConfetti: {
    id: 'partyConfetti',
    listClass: 'stage-party-confetti',
    cardClass: 'card-party-confetti',
  },
};
const HOST_PLAYER_MAX_SLOTS = 10;

const hostPlayerStageConfig = {
  enabled: true,
  activeVariants: ['neonArcade', 'quizArena', 'partyConfetti'],
  randomizePerSession: true,
  fallbackVariant: 'neonArcade',
};

const HOST_STAGE_STORAGE_KEY = 'qyanHostStageVariant';

function useHostPlayerStageVariant() {
  if (!hostPlayerStageConfig.enabled) return null;
  if (state.hostPlayerStageSelection && state.hostPlayerStageSelection !== 'auto') {
    return HOST_PLAYER_STAGE_VARIANTS[state.hostPlayerStageSelection] || null;
  }
  const available = hostPlayerStageConfig.activeVariants
    .map((id) => HOST_PLAYER_STAGE_VARIANTS[id])
    .filter(Boolean);
  if (!available.length) {
    return HOST_PLAYER_STAGE_VARIANTS[hostPlayerStageConfig.fallbackVariant] || null;
  }

  if (!hostPlayerStageConfig.randomizePerSession && state.hostPlayerStageVariant) {
    return state.hostPlayerStageVariant;
  }

  if (!state.hostPlayerStageVariant) {
    const randomIndex = Math.floor(Math.random() * available.length);
    state.hostPlayerStageVariant = available[randomIndex];
  }
  return state.hostPlayerStageVariant;
}

function renderHostPlayerStageCard(player, index, variant) {
  const cardVariantClass = variant?.cardClass || '';
  const animationDelay = Math.min(index, 8) * 70;
  const safeName = escapeHtml(player.nickname);
  const hostIcon = player.isHost ? '<span class="host-corner-icon" title="Host">👑</span>' : '';
  return `<li class="player-chip kickable player-stage-card ${cardVariantClass}${player.isHost ? ' is-host-player' : ''}" data-id="${player.id}" style="animation-delay:${animationDelay}ms">
            ${hostIcon}
            <span class="avatar-circle player-stage-avatar">${player.avatar || '🎮'}</span>
            <span class="player-stage-name">${safeName}</span>
            ${player.isHost ? '' : `<button class="btn-kick" data-id="${player.id}" title="Remove player" aria-label="Remove ${safeName}">✕</button>`}
          </li>`;
}

function renderHostPlayerStagePlaceholder(slotIndex) {
  return `<li class="player-chip player-stage-placeholder" data-slot="${slotIndex}" aria-hidden="true"></li>`;
}

function renderHostPlayerOverflowCard(extraCount) {
  return `<li class="player-chip player-stage-overflow" aria-label="${extraCount} more players">+${extraCount}</li>`;
}

function applyHostPlayerStageVariantClass(listEl, variant) {
  Object.values(HOST_PLAYER_STAGE_VARIANTS).forEach((entry) => {
    if (entry?.listClass) listEl.classList.remove(entry.listClass);
  });
  if (variant?.listClass) listEl.classList.add(variant.listClass);
}

function syncHostStageSelects(value) {
  ['host-stage-variant', 'host-stage-variant-join'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
  // sync custom preset buttons
  document.querySelectorAll('#anim-preset-menu .anim-preset-btn').forEach((btn) => {
    btn.classList.toggle('anim-preset-active', btn.dataset.value === value);
  });
}

function applyHostStageSelection(value, persist = true) {
  const selected = value || 'auto';
  state.hostPlayerStageSelection = selected;
  if (selected === 'auto') {
    state.hostPlayerStageVariant = null;
  } else {
    state.hostPlayerStageVariant = HOST_PLAYER_STAGE_VARIANTS[selected] || null;
  }
  syncHostStageSelects(selected);
  if (persist) {
    try {
      localStorage.setItem(HOST_STAGE_STORAGE_KEY, selected);
    } catch (_err) {}
  }
  rerenderHostPlayerStage();
}

function rerenderHostPlayerStage() {
  const listEl = document.getElementById('host-player-list');
  const countEl = document.getElementById('host-player-count');
  if (!listEl || !countEl) return;
  renderPlayerList(state.hostLobbyPlayers || [], listEl, countEl, true);
}

let scholarPreviewInterval = null;
let frozenTimeout = null;

const diagnoseState = {
  view: '-',
  role: '-',
  socket: 'connecting',
  event: 'boot',
  error: 'none',
};

function setDiagnoseField(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function updateDiagnose(partial = {}) {
  Object.assign(diagnoseState, partial);
  setDiagnoseField('diag-view', diagnoseState.view || '-');
  setDiagnoseField('diag-role', diagnoseState.role || state.role || '-');
  setDiagnoseField('diag-socket', diagnoseState.socket || '-');
  setDiagnoseField('diag-event', diagnoseState.event || '-');
  setDiagnoseField('diag-error', diagnoseState.error || 'none');
}

function markDiagEvent(name) {
  updateDiagnose({ event: name, role: state.role || '-' });
  pushJoinDebugLog(`event: ${name}`);
}

function getJoinDebugNodes() {
  return {
    modal: document.getElementById('join-debug-modal'),
    log: document.getElementById('join-debug-log'),
    pin: document.getElementById('join-debug-pin'),
    nick: document.getElementById('join-debug-nick'),
  };
}

function openJoinDebugDialog(pin, nickname) {
  const { modal, log, pin: pinEl, nick: nickEl } = getJoinDebugNodes();
  if (!modal || !log) return;
  if (pinEl) pinEl.textContent = `Room PIN: ${pin || '-'}`;
  if (nickEl) nickEl.textContent = `Nickname: ${nickname || '-'}`;
  log.textContent = '';
  modal.style.display = 'flex';
  pushJoinDebugLog('Join button clicked');
  pushJoinDebugLog(`socket.connected=${socket.connected}`);
}

function closeJoinDebugDialog() {
  const { modal } = getJoinDebugNodes();
  if (modal) modal.style.display = 'none';
}

function printJoinDebugDialog() {
  const { modal } = getJoinDebugNodes();
  if (!modal) return;
  const wasVisible = window.getComputedStyle(modal).display !== 'none';
  if (!wasVisible) modal.style.display = 'flex';

  document.body.classList.add('printing-join-debug');
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    document.body.classList.remove('printing-join-debug');
    if (!wasVisible) modal.style.display = 'none';
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 1200);
}

function pushJoinDebugLog(message) {
  const { log } = getJoinDebugNodes();
  if (!log) return;
  const stamp = new Date().toLocaleTimeString();
  log.textContent += `[${stamp}] ${message}\n`;
  log.scrollTop = log.scrollHeight;
}

const VIEW_PATH_MAP = {
  'view-home': '/',
  'view-player-join': '/player',
  'view-host-loading': '/start',
  'view-host-lobby': '/start',
  'view-player-lobby': '/player/lobby',
  'view-host-question': '/question',
  'view-player-question': '/question',
  'view-leaderboard': '/leaderboard',
  'view-game-over': '/game-over',
  'view-room-closed': '/room-closed',
};

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function getPathForView(viewId) {
  return VIEW_PATH_MAP[viewId] || null;
}

function getViewForPath(pathname) {
  const normalizedPath = normalizePathname(pathname);
  if (normalizedPath === '/lobby') return 'view-host-loading';
  const direct = Object.entries(VIEW_PATH_MAP).find(([, path]) => path === normalizedPath);
  return direct ? direct[0] : null;
}

function syncUrlForView(viewId, { replace = false } = {}) {
  if (!window.history || typeof window.history.pushState !== 'function') return;
  const targetPath = getPathForView(viewId);
  if (!targetPath) return;

  const currentPath = normalizePathname(window.location.pathname);
  if (currentPath === targetPath) return;

  const nextUrl = `${targetPath}${window.location.search}${window.location.hash}`;
  if (replace) {
    window.history.replaceState({ viewId }, '', nextUrl);
  } else {
    window.history.pushState({ viewId }, '', nextUrl);
  }
}

// ─────────────────────────────────────────────
// View Management
// Note: OPTION_COLORS, OPTION_ICONS, and escapeHtml are imported from utils/dom.js
// ─────────────────────────────────────────────
function normalizeViewDom() {
  try {
    const body = document.body;
    if (!body) return;

    // Keep views before overlays/diagnostics when possible.
    const anchor =
      document.getElementById('overlay-paused') ||
      document.getElementById('overlay-frozen') ||
      document.getElementById('diag-panel') ||
      document.querySelector('.qyan-attribution');

    document.querySelectorAll('.view').forEach((v) => {
      if (!v || !v.id) return;
      if (v.parentElement && v.parentElement !== body) {
        console.warn('normalizeViewDom: moving', v.id, 'out of', v.parentElement);
        if (anchor && anchor.parentElement === body) body.insertBefore(v, anchor);
        else body.appendChild(v);
      }
    });
  } catch (e) {
    console.warn('normalizeViewDom failed:', e);
  }
}

function showView(viewId, options = {}) {
  try {
    normalizeViewDom();

    const activeView = document.getElementById(viewId);
    if (!activeView) {
      if (window.__dbgLog) window.__dbgLog('showView: MISSING ' + viewId);
      const current = document.querySelector('.view.active');
      const fallbackId = current?.id || 'view-home';
      updateDiagnose({
        view: fallbackId,
        error: `Missing view id: ${viewId}`,
        event: 'showView:error',
        role: state.role || '-',
      });
      return;
    }

    document.querySelectorAll('.view').forEach((v) => {
      // Defensive: debug tools or previous crashes can leave inline styles
      // (e.g. display:none / fixed positioning) that override CSS.
      v.style.display = '';
      v.style.position = '';
      v.style.top = '';
      v.style.left = '';
      v.style.width = '';
      v.style.height = '';
      v.style.zIndex = '';
      v.style.background = '';
      v.style.overflowY = '';
      v.style.flexDirection = '';
      v.style.alignItems = '';
      v.style.justifyContent = '';
      v.style.transform = '';
      v.style.visibility = '';
      v.style.opacity = '';
      v.style.pointerEvents = '';
      v.classList.toggle('active', v.id === viewId);
    });

    // Fix attribution class name from .tooryan-attribution to .qyan-attribution
    const attribution = document.querySelector('.qyan-attribution');
    if (activeView && attribution && attribution.parentElement !== activeView) {
      activeView.appendChild(attribution);
    }
    updateDiagnose({ view: viewId, role: state.role || '-' });

    // Debug helper: keep the green outline in sync even if showView() is
    // called repeatedly with the same viewId (no MutationObserver event).
    if (window.__dbgLog) {
      try {
        document.querySelectorAll('.view').forEach((v) => {
          v.style.border = 'none';
          v.style.boxShadow = 'none';
        });
        const active = document.querySelector('.view.active');
        if (active) {
          active.style.border = '3px solid #0f0';
          active.style.boxShadow = 'inset 0 0 40px rgba(0,255,0,0.1)';
        }
      } catch (_e) {}
    }

    if (!options.skipUrlSync) {
      syncUrlForView(viewId, { replace: !!options.replaceHistory });
    }

    // Lock scroll/pinch during gameplay; release on safe views
    const SCROLL_FREE_VIEWS = new Set(['view-home', 'view-game-over', 'view-room-closed']);
    if (SCROLL_FREE_VIEWS.has(viewId)) {
      document.documentElement.classList.remove('gameplay-active');
      if (activeView) activeView.classList.remove('gameplay-scroll-locked');
    } else {
      document.documentElement.classList.add('gameplay-active');
      if (activeView) activeView.classList.add('gameplay-scroll-locked');
    }
  } catch (err) {
    console.error('showView failed:', err);
    if (window.__dbgLog) window.__dbgLog('showView CRASH: ' + err.message);
  }
}

window.addEventListener('popstate', () => {
  const pathView = getViewForPath(window.location.pathname);
  if (!pathView) return;

  if (pathView === 'view-player-join') {
    state.role = 'player';
  }

  if (pathView === 'view-host-loading' || pathView === 'view-host-lobby') {
    if (!state.hostCreatePending && !state.pin) {
      startHostLaunch(quizSlugFromUrl || null);
    } else {
      showView('view-host-loading', { skipUrlSync: true });
    }
    return;
  }

  showView(pathView, { skipUrlSync: true });
});

function startHostLaunch(quizSlug = null) {
  if (state.hostCreatePending) return;
  enableKeepAwake();
  state.role = 'host';
  state.hostCreatePending = true;
  state.hostCreateRetryCount = 0;
  showView('view-host-loading');
  setConnectionStatus('warn', 'Preparing host room…');

  const clearHostCreateTimeout = () => {
    if (state.hostCreateTimeoutId) {
      clearTimeout(state.hostCreateTimeoutId);
      state.hostCreateTimeoutId = null;
    }
  };

  const scheduleHostCreateTimeout = () => {
    clearHostCreateTimeout();
    state.hostCreateTimeoutId = setTimeout(() => {
      if (!state.hostCreatePending) return;

      if ((state.hostCreateRetryCount || 0) < 1) {
        state.hostCreateRetryCount = (state.hostCreateRetryCount || 0) + 1;
        setConnectionStatus('warn', 'Preparing host room… retrying');
        doHostCreate(true);
        return;
      }

      state.hostCreatePending = false;
      document.documentElement.classList.remove('autohost-launch');
      setConnectionStatus('error', 'Host room creation timed out');
      alert('تعذر إنشاء الغرفة الآن. حاول مرة أخرى.');
      showView('view-home');
    }, 12000);
  };

  const doHostCreate = (isRetry = false) => {
    socket.emit('host:create', {
      quizSlug: quizSlug || null,
      gameMode: gameModeFromUrl || null,
      isReconnect: !!isRetry,
    });
    scheduleHostCreateTimeout();
  };

  if (socket.connected) {
    doHostCreate();
  } else {
    socket.once('connect', doHostCreate);
    scheduleHostCreateTimeout();
  }
}

// ─────────────────────────────────────────────
// Player List Rendering
// ─────────────────────────────────────────────
function renderPlayerList(players, listEl, countEl, isHostLobby = false) {
  if (!listEl) return;
  const playersArr = Array.isArray(players) ? players : [];
  if (countEl) countEl.textContent = playersArr.length;
  
  const kickHint = document.getElementById('kick-hint');
  const waitingEl = isHostLobby ? document.getElementById('player-waiting-msg') : null;

  if (isHostLobby) {
    state.hostLobbyPlayers = [...playersArr];
    const stageVariant = useHostPlayerStageVariant();
    applyHostPlayerStageVariantClass(listEl, stageVariant);

    // Dynamic grid: <5 = 1 row, >=5 = 2 balanced rows
    const playerCount = playersArr.length;
    let totalSlots, cols;
    if (playerCount < 5) {
      // Single row: show exactly 5 slots
      totalSlots = 5;
      cols = 5;
    } else {
      // Two rows: pick total that fills evenly
      totalSlots = Math.min(Math.max(playerCount, 6), HOST_PLAYER_MAX_SLOTS);
      // Make totalSlots even so rows are balanced
      if (totalSlots % 2 !== 0) totalSlots++;
      totalSlots = Math.min(totalSlots, HOST_PLAYER_MAX_SLOTS);
      cols = Math.ceil(totalSlots / 2);
    }
    listEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const visiblePlayers = playersArr.length > totalSlots
      ? playersArr.slice(0, totalSlots - 1)
      : playersArr.slice(0, totalSlots);
    const overflowCount = Math.max(0, playersArr.length - totalSlots);

    const stageItems = [];
    for (let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
      if (slotIndex < visiblePlayers.length) {
        stageItems.push(renderHostPlayerStageCard(visiblePlayers[slotIndex], slotIndex, stageVariant));
      } else if (overflowCount > 0 && slotIndex === totalSlots - 1) {
        stageItems.push(renderHostPlayerOverflowCard(overflowCount));
      } else {
        stageItems.push(renderHostPlayerStagePlaceholder(slotIndex));
      }
    }

    // Host lobby: show kick buttons + placeholders
    listEl.innerHTML = stageItems.join('');
    // Attach kick listeners
    listEl.querySelectorAll('.btn-kick').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Sounds.click();
        socket.emit('host:kick', { playerId: btn.dataset.id });
      });
    });
    if (kickHint) kickHint.style.display = playersArr.length > 0 ? 'block' : 'none';
    if (waitingEl) {
      if (playersArr.length === 0) {
        waitingEl.style.display = 'block';
        waitingEl.style.color = 'var(--text-dim)';
        waitingEl.style.fontWeight = '400';
        waitingEl.textContent = 'يجب انضمام لاعب واحد على الأقل للبدء';
      } else if (gameModeFromUrl === 'xo-duel' && playersArr.length < 2) {
        waitingEl.style.display = 'block';
        waitingEl.style.color = '#f87171';
        waitingEl.style.fontWeight = '700';
        waitingEl.textContent = 'X O Duel يحتاج لاعبين متصلين على الأقل لبدء التحدي.';
      } else {
        waitingEl.style.display = 'none';
      }
    }
  } else {
    listEl.innerHTML = playersArr
      .map((p) => `<li class="player-chip"><span class="avatar-circle">${p.avatar || '🎮'}</span>${escapeHtml(p.nickname)}</li>`)
      .join('');
  }
}

// ─────────────────────────────────────────────
// Avatar Picker — Inline overlay (bypasses old modal)
// ─────────────────────────────────────────────
function openAvatarPicker(currentAvatar, onSelect) {
  // Remove any existing picker overlay
  const old = document.getElementById('avatar-inline-overlay');
  if (old) old.remove();

  // Overlay backdrop
  const overlay = document.createElement('div');
  overlay.id = 'avatar-inline-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '100000',
    padding: '16px',
    backdropFilter: 'blur(4px)',
  });

  // Compact dialog
  const dialog = document.createElement('div');
  Object.assign(dialog.style, {
    background: 'var(--surface, #1e1e2e)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '18px',
    padding: '14px',
    width: 'min(340px, 90vw)',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
  });

  AVATARS.forEach((emoji) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = emoji;
    const isCurrent = emoji === currentAvatar;
    Object.assign(btn.style, {
      fontSize: '1.6rem',
      padding: '0',
      margin: '0',
      border: isCurrent ? '2px solid #7c3aed' : '2px solid transparent',
      borderRadius: '12px',
      background: isCurrent ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)',
      cursor: 'pointer',
      touchAction: 'manipulation',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      aspectRatio: '1',
      boxSizing: 'border-box',
      transition: 'none',
      WebkitTapHighlightColor: 'transparent',
      minWidth: '0',
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      overlay.remove();
      onSelect(emoji);
    });

    dialog.appendChild(btn);
  });

  overlay.appendChild(dialog);

  // Tap backdrop to close (no selection)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

// Join form — avatar trigger
{
  const joinAvatarBtn = document.getElementById('join-avatar-btn');
  const joinAvatarDisplay = document.getElementById('join-avatar-display');

  // Sync initial display with state
  if (joinAvatarDisplay) joinAvatarDisplay.textContent = state.avatar || '🎮';

  function openJoinPicker() {
    openAvatarPicker(state.avatar, (emoji) => {
      state.avatar = emoji;
      if (joinAvatarDisplay) joinAvatarDisplay.textContent = emoji;
      const lbl = document.querySelector('#join-avatar-btn .avatar-trigger-label');
      if (lbl) lbl.textContent = 'Avatar selected ✓';
    });
  }

  if (joinAvatarBtn) {
    joinAvatarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openJoinPicker();
    });
  }

  if (joinAvatarDisplay) {
    joinAvatarDisplay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openJoinPicker();
    });
  }
}


// ─────────────────────────────────────────────
// Host Mode UI (Local / Global)
// ─────────────────────────────────────────────
function applyModeInfo(data) {
  if (!data) return;
  const { mode, joinUrl, qrSvg, localIp, localIpCandidates, localIpAvailable, warning } = data;

  const indicator = document.getElementById('mode-indicator');
  const warnEl    = document.getElementById('mode-warning');
  const localBtn  = document.getElementById('btn-mode-local');
  const globalBtn = document.getElementById('btn-mode-global');
  const urlEl     = document.getElementById('host-join-url');
  const qrWrap    = document.getElementById('host-qr-canvas');

  if (indicator) {
    indicator.textContent = mode === 'local' ? 'Local' : 'Global';
  }

  if (localBtn && globalBtn) {
    localBtn.classList.toggle('mode-active', mode === 'local');
    globalBtn.classList.toggle('mode-active', mode !== 'local');
    localBtn.disabled = !localIpAvailable;
  }

  if (warnEl) {
    if (!localIpAvailable && warning) {
      warnEl.textContent = warning;
      warnEl.style.display = 'block';
    } else {
      warnEl.textContent = '';
      warnEl.style.display = 'none';
    }
  }

  if (urlEl) {
    const ips = Array.isArray(localIpCandidates)
      ? localIpCandidates.map((entry) => entry.address).filter(Boolean)
      : [];
    const ipHint = mode === 'local' && ips.length > 1
      ? `\nDetected IPs: ${ips.join(', ')}`
      : '';
    urlEl.textContent = joinUrl
      ? `${joinUrl}${ipHint}`
      : (localIp ? `http://${localIp} (pending room)` : '—');
  }
  state.currentJoinUrl = joinUrl || '';
  renderHostQrCode({ joinUrl, qrSvg, qrWrap });

  // Populate share URL bar
  const shareInput = document.getElementById('share-url-input');
  if (shareInput && joinUrl) {
    shareInput.value = joinUrl;

    // Random Arabic share messages — picked fresh on every lobby load
    const _WA_MSGS = [
      '🚨 وين أنت؟! الكويز شغّال والكل يلعب الحين! 😱🔥 انضم سريع 👇',
      '🎮 دعوتك تلعب معي كويز تنافسي — هل تقدر تهزمني؟ 😏💥',
      '🧠 أذكى شخص في المجموعة يثبت نفسه الحين! 👆 انضم للكويز 👇',
      '⏳ عندك ثواني تنضم — الكويز ما ينتظر! 🎯🔥',
      '🎯 يلّا! الكويز بدأ وكلهم ينتظرونك 👀🔥\nانضم الحين قبل ما تتأخر 👇',
    ];
    const _TG_MSGS = [
      '🏆 تحدي الكويز شغّال! من يفوز يفوز — هل جاهز؟ 💪🧠',
      '🎯 انضم قبل ما تضيّع فرصتك! الكويز بدأ الحين 🚀',
      '🤔 سؤال: هل أنت أذكى من أصحابك؟ أثبت ذلك 👇🔥',
      '👀 كلهم داخلين الكويز إلا أنت! شنو تنتظر؟ ⚡',
      '⚡ تحدّي الكويز شغّال الحين! هل أنت من الأذكياء؟ 🧠💪\nانضم وأثبت نفسك 👇',
    ];
    const _TW_MSGS = [
      '🧠 كويز الحين شغّال وأنت بعد ما دخلت؟! 😅🔥 #كويز #تحدي',
      '🏆 من يجرؤ يلعب الكويز معي؟ 💪 #مسابقة #تحدي_الذكاء',
      '⚡ ثانية واحدة تغيّر ترتيبك — انضم الكويز الحين! 🎮 #كويز',
      '🎯 مش بس كويز — دا تحدي! هل عندك الشجاعة؟ 💥 #تحدي #كويز',
      '🔥 كويز تنافسي شغّال الحين — هل عندك الجرأة؟ 🧠🏆 #كويز #تحدي #مسابقة',
    ];
    const _pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const _waText = `${_pick(_WA_MSGS)}\n\n${joinUrl}\n\nQYan`;
    const _tgText = `${_pick(_TG_MSGS)}\n\n${joinUrl}\n\nQYan`;
    const _twText = `${_pick(_TW_MSGS)}\n\n${joinUrl}\n\nQYan`;

    const wa = document.getElementById('share-whatsapp');
    const tg = document.getElementById('share-telegram');
    const tw = document.getElementById('share-twitter');
    if (wa) wa.href = `https://wa.me/?text=${encodeURIComponent(_waText)}`;
    if (tg) tg.href = `https://t.me/share/url?text=${encodeURIComponent(_tgText)}`;
    if (tw) tw.href = `https://x.com/intent/tweet?text=${encodeURIComponent(_twText)}`;
  }
}

let hostQrRenderRequestId = 0;
function renderHostQrCode({ joinUrl, qrSvg, qrWrap }) {
  if (!qrWrap) return;

  const looksLikeSvg = typeof qrSvg === 'string' && qrSvg.includes('<svg');
  if (looksLikeSvg) {
    qrWrap.innerHTML = qrSvg;
    return;
  }

  if (!joinUrl) {
    qrWrap.innerHTML = '';
    return;
  }

  const currentRequestId = ++hostQrRenderRequestId;
  qrWrap.innerHTML = '<div style="font-size:0.78rem;opacity:0.75;padding:0.35rem 0.4rem;">Generating QR…</div>';

  fetch(`/api/qr-svg?url=${encodeURIComponent(joinUrl)}`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((svg) => {
      if (currentRequestId !== hostQrRenderRequestId) return;
      if (typeof svg !== 'string' || !svg.includes('<svg')) throw new Error('invalid SVG');
      qrWrap.innerHTML = svg;
    })
    .catch(() => {
      if (currentRequestId !== hostQrRenderRequestId) return;
      qrWrap.innerHTML = '<div style="font-size:0.78rem;opacity:0.75;padding:0.35rem 0.4rem;text-align:center;">QR unavailable الآن — شارك PIN يدويًا.</div>';
    });
}

function setConnectionStatus(kind, message) {
  let el = document.getElementById('connection-status-chip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'connection-status-chip';
    el.style.position = 'fixed';
    el.style.top = '12px';
    el.style.left = '12px';
    el.style.zIndex = '9999';
    el.style.padding = '6px 10px';
    el.style.borderRadius = '999px';
    el.style.fontSize = '12px';
    el.style.fontWeight = '700';
    el.style.backdropFilter = 'blur(6px)';
    el.style.border = '1px solid transparent';
    document.body.appendChild(el);
  }

  if (kind === 'ok') {
    el.style.background = 'rgba(16, 185, 129, 0.18)';
    el.style.color = '#86efac';
    el.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  } else if (kind === 'warn') {
    el.style.background = 'rgba(245, 158, 11, 0.18)';
    el.style.color = '#fcd34d';
    el.style.borderColor = 'rgba(245, 158, 11, 0.4)';
  } else {
    el.style.background = 'rgba(239, 68, 68, 0.18)';
    el.style.color = '#fca5a5';
    el.style.borderColor = 'rgba(239, 68, 68, 0.4)';
  }

  el.textContent = message;
  updateDiagnose({ socket: `${kind}: ${message}` });
}

setConnectionStatus('warn', 'Connecting to server…');

window.addEventListener('error', (event) => {
  const message = event?.error?.message || event?.message || 'Unknown runtime error';
  pushJoinDebugLog(`window error: ${message}`);
  updateDiagnose({ error: message, event: 'window:error' });
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason;
  const message = typeof reason === 'string'
    ? reason
    : (reason?.message || 'Unhandled promise rejection');
  pushJoinDebugLog(`promise rejection: ${message}`);
  updateDiagnose({ error: message, event: 'promise:rejection' });
});

// ─────────────────────────────────────────────
// Keep Screen Awake (Wake Lock API)
// ─────────────────────────────────────────────
let wakeLockSentinel = null;
let wakeLockEnabled = false;

async function requestScreenWakeLock() {
  if (!wakeLockEnabled) return;
  if (!('wakeLock' in navigator)) return;
  try {
    if (wakeLockSentinel) return;
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
      if (wakeLockEnabled && !document.hidden) {
        requestScreenWakeLock();
      }
    });
  } catch (_err) {
    // Unsupported / denied / non-secure context — ignore silently.
  }
}

function enableKeepAwake() {
  wakeLockEnabled = true;
  requestScreenWakeLock();
}

// ─────────────────────────────────────────────
// Game Start Countdown (3, 2, 1, GO!)
// ─────────────────────────────────────────────
let _countdownTimers = [];   // track setTimeout IDs so we can cancel on re-entry
let _countdownSafetyTimer = null;

function showStartCountdown() {
  const overlay = document.getElementById('overlay-countdown');
  const numberEl = document.getElementById('countdown-number');
  const labelEl = document.getElementById('countdown-label');
  const ringFill = document.getElementById('countdown-ring-fill');
  if (!overlay || !numberEl) return;

  // Clear any previous countdown timeouts (prevents double-animation on re-entry)
  _countdownTimers.forEach(id => clearTimeout(id));
  _countdownTimers = [];
  if (_countdownSafetyTimer) { clearTimeout(_countdownSafetyTimer); _countdownSafetyTimer = null; }

  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.classList.remove('countdown-fade-out');
  overlay.className = 'countdown-overlay'; // reset color class
  state.countdownDone = false;
  state.questionReady = false;

  // Pre-switch to question view behind the overlay so QR lobby is gone.
  // skipUrlSync avoids polluting browser history during the countdown.
  const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
  const targetView = isHostOnly ? 'view-host-question' : 'view-player-question';
  showView(targetView, { skipUrlSync: true });

  if (labelEl) labelEl.textContent = 'استعدّ!';
  // Reset ring
  if (ringFill) { ringFill.style.transition = 'none'; ringFill.style.strokeDashoffset = '553'; }

  const steps = [
    { text: '3', colorCls: 'cd-blue',   delay: 0 },
    { text: '2', colorCls: 'cd-violet', delay: 1000 },
    { text: '1', colorCls: 'cd-amber',  delay: 2000 },
    { text: 'يلّا!', colorCls: 'cd-go', delay: 3000 },
  ];

  steps.forEach(({ text, colorCls, delay }, i) => {
    _countdownTimers.push(setTimeout(() => {
      // Play a beep on each number; triumphant burst on GO
      if (i < 3) Sounds.countdownBeep(); else Sounds.countdownGo();

      numberEl.textContent = text;
      numberEl.className = 'countdown-number ' + colorCls;
      overlay.className = 'countdown-overlay ' + colorCls;
      // Re-trigger pop animation
      numberEl.style.animation = 'none';
      void numberEl.offsetWidth;
      numberEl.style.animation = '';

      // Trigger shockwave
      const wave = document.getElementById('countdown-shockwave');
      if (wave) {
        wave.className = 'countdown-shockwave ' + colorCls;
        wave.classList.remove('active');
        void wave.offsetWidth;
        wave.classList.add('active');
      }

      // Animate ring fill for this second (except GO step)
      if (ringFill && i < 3) {
        const circumference = 553; // 2 * PI * 88
        const target = circumference - (circumference * (i + 1) / 3);
        ringFill.style.transition = 'none';
        ringFill.style.strokeDashoffset = String(circumference - (circumference * i / 3));
        void ringFill.offsetWidth;
        ringFill.style.transition = 'stroke-dashoffset 0.9s linear';
        ringFill.style.strokeDashoffset = String(target);
      }

      if (colorCls === 'cd-go' && labelEl) {
        labelEl.textContent = '';
        // Ring fully filled
        if (ringFill) {
          ringFill.style.transition = 'stroke-dashoffset 0.4s ease-out';
          ringFill.style.strokeDashoffset = '0';
        }
      }
    }, delay));
  });

  // Mark countdown finished after GO! animation.
  // Force BOTH flags true so GO always lasts exactly 1 second — no waiting
  // for questionReady. The question is rendered in the background and will
  // be visible the moment the overlay fades out.
  _countdownTimers.push(setTimeout(() => {
    state.countdownDone = true;
    state.questionReady = true;
    revealQuestionIfReady();
  }, 4000));

  // Cancel the 8s safety net — it's no longer needed since we force reveal at 4s.
  // (Safety timer is still set below as a last-resort fallback.)
  _countdownSafetyTimer = setTimeout(() => {
    forceHideCountdownOverlay();
  }, 8000);
}

/** Immediately hide the countdown overlay (safety net / cleanup). */
function forceHideCountdownOverlay() {
  const overlay = document.getElementById('overlay-countdown');
  if (overlay && overlay.style.display !== 'none') {
    overlay.style.display = 'none';
    overlay.classList.remove('countdown-fade-out');
    overlay.style.opacity = '';
  }
  // Ensure flags allow the question to proceed even if timing was off
  state.countdownDone = true;
  state.questionReady = true;
  _countdownTimers.forEach(id => clearTimeout(id));
  _countdownTimers = [];
  if (_countdownSafetyTimer) { clearTimeout(_countdownSafetyTimer); _countdownSafetyTimer = null; }
  // Start deferred timer if the overlay was force-dismissed
  if (state._pendingTimerFn) {
    state._pendingTimerFn();
    state._pendingTimerFn = null;
  }
}

// ── Coordinated reveal: wait for BOTH countdown + question data ──────
function revealQuestionIfReady() {
  if (!state.countdownDone || !state.questionReady) return;

  const overlay = document.getElementById('overlay-countdown');
  if (!overlay || overlay.style.display === 'none') return;

  // Cancel the safety timer — normal reveal succeeded
  if (_countdownSafetyTimer) { clearTimeout(_countdownSafetyTimer); _countdownSafetyTimer = null; }

  // Fade out the countdown overlay
  overlay.classList.add('countdown-fade-out');

  // Trigger the question entrance animation
  const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
  const layoutId = isHostOnly ? 'host-question-layout' : 'player-question-layout';
  const layout = document.getElementById(layoutId);
  if (layout) {
    layout.classList.remove('question-enter');
    void layout.offsetWidth;
    layout.classList.add('question-enter');
  }

  // Start the deferred question timer (held back during countdown)
  if (state._pendingTimerFn) {
    state._pendingTimerFn();
    state._pendingTimerFn = null;
  }

  // Fully hide overlay after transition ends
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('countdown-fade-out');
    overlay.style.opacity = '';
  }, 400);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    requestScreenWakeLock();
  }
});

// ─────────────────────────────────────────────
// Final Question Dramatic Overlay
// ─────────────────────────────────────────────
function showFinalQuestionOverlay() {
  const overlay = document.getElementById('overlay-final-question');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';
  overlay.classList.remove('final-q-fade-out');

  // Re-trigger all animations
  const content = overlay.querySelector('.final-q-content');
  if (content) {
    content.style.animation = 'none';
    void content.offsetWidth;
    content.style.animation = '';
  }

  Sounds.start(); // reuse the game-start sound for drama
}

function dismissFinalQuestionOverlay() {
  const overlay = document.getElementById('overlay-final-question');
  if (!overlay || overlay.style.display === 'none') return;
  overlay.classList.add('final-q-fade-out');
  setTimeout(() => {
    overlay.style.display = 'none';
    overlay.classList.remove('final-q-fade-out');
    overlay.style.opacity = '';
  }, 500);
}

// ─────────────────────────────────────────────
// Question Rendering — dispatcher
// ─────────────────────────────────────────────
function renderQuestion(data, isHost) {
  clearScholarPreviewInterval();
  stopClientTimer();
  state.hasAnswered       = false;
  state.myAnswerIndex     = -1;
  state.questionIndex     = data.questionIndex;
  state.totalQuestions    = data.total;
  state.questionDuration  = data.duration;
  state.questionStartTime = Date.now();
  state.currentQuestionType = data.question.type;
  state.questionPlayers = data.players || [];
  state.roleAbilityUsed = false;
  setFrozenState(false);

  if (isHost) {
    renderHostQuestion(data);
  } else {
    renderPlayerQuestion(data);
  }

  // Coordinate with countdown overlay for first question
  if (state.countdownDone === false || state.questionReady === false) {
    // Question arrived BEFORE countdown ended — pre-render into the hidden view.
    // The countdown will reveal it when it finishes.
    state.questionReady = true;
    revealQuestionIfReady();
  } else {
    // Either: question arrived AFTER we force-revealed at t=4000ms (rare, slow server)
    // OR subsequent question — play entrance animation directly.
    const layoutId = isHost ? 'host-question-layout' : 'player-question-layout';
    const layout = document.getElementById(layoutId);
    if (layout) {
      layout.classList.remove('question-enter');
      void layout.offsetWidth;
      layout.classList.add('question-enter');
    }
  }
}

// ── Shared: inject media element into a question-text-box ──────────────
function renderQuestionMedia(media, textElemId) {
  const textEl = document.getElementById(textElemId);
  if (!textEl) return;
  const box = textEl.parentElement;
  const existing = box.querySelector('.question-media');
  if (existing) existing.remove();
  if (!media || !media.url || media.type === 'none') return;
  let el;
  if (media.type === 'video') {
    el = document.createElement('video');
    el.src = media.url;
    el.controls = true;
    el.autoplay = true;
    el.muted = true;
    el.loop = false;
    el.playsInline = true;
  } else {
    el = document.createElement('img');
    el.src = media.url;
    el.alt = '';
    el.onerror = function() {
      this.onerror = null;
      this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160' viewBox='0 0 320 160'%3E%3Crect width='320' height='160' fill='%231e293b'/%3E%3Ctext x='50%25' y='44%25' font-family='sans-serif' font-size='28' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%96%BC%EF%B8%8F%3C/text%3E%3Ctext x='50%25' y='68%25' font-family='sans-serif' font-size='12' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E";
      this.style.opacity = '0.5';
    };
  }
  el.className = 'question-media';
  box.appendChild(el);
}

// ── Clear media from both host and player question boxes ──────────────
function clearQuestionMedia() {
  ['host-question-text', 'player-question-text'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const box = el.parentElement;
    const m = box && box.querySelector('.question-media');
    if (m) m.remove();
  });
}

// ── Host view: shows question + non-interactive options/items ──────────
// Note: Helper functions (safeGet, safeSetDisplay, hideConnectionChip, etc.) 
// are now imported from utils/dom.js
function renderHostQuestion(data) {
  try {
    console.log('[v54] renderHostQuestion', JSON.stringify({type: data&&data.question&&data.question.type, qi: data&&data.questionIndex}).substring(0,80));
    if (window.__dbgLog) window.__dbgLog('renderHostQ: ' + (data&&data.question ? data.question.type : 'NO-DATA'));
    if (!data || !data.question) {
      console.error('renderHostQuestion: Missing data', data);
      if (window.__dbgLog) window.__dbgLog('ERR: Missing question data');
      return;
    }
    
    hideConnectionChip();
    updateInGameRoomPin();
    const q = data.question;
    const hProg = safeGet('host-q-progress');
    const hText = safeGet('host-question-text');
    const hAns = safeGet('host-answer-counter');
    
    if (hProg) hProg.textContent = `Q ${(data.questionIndex || 0) + 1} / ${data.total || '?'}`;
    if (hText) hText.textContent = q.text || 'Question text missing';
    renderQuestionMedia(q.media || null, 'host-question-text');
    if (hAns) hAns.textContent = '0 / 0 answered';

    const pauseBtn = safeGet('btn-pause-resume');
    if (pauseBtn) {
      pauseBtn.textContent = '⏸️ Pause';
      pauseBtn.dataset.paused = 'false';
    }

    const grid = safeGet('host-options-grid');
    const hostBossPanel = safeGet('host-boss-panel');
    if (hostBossPanel) hostBossPanel.style.display = 'none';

    // Use the new modular renderer system for host view
    if (!grid) {
      if (window.__dbgLog) window.__dbgLog('ERR: host-options-grid missing');
    } else {
      QuestionRendererFactory.render(q, true, null);
    }

    const capturedHostQI = data.questionIndex;
    const hostTimerFn = () => {
      startClientTimer(data.duration,
        safeGet('host-timer-count'),
        safeGet('host-timer-ring'),
        () => {
          // ── Host safety net: force end if server didn't send question:end ──
          setTimeout(() => {
            if (state.questionIndex === capturedHostQI && !state.isPaused) {
              socket.emit('host:force_end_question');
            }
          }, 3000);
        });
    };
    // Defer timer until countdown overlay fades (first question)
    if (state.countdownDone === false) {
      state._pendingTimerFn = hostTimerFn;
    } else {
      hostTimerFn();
    }

    showView('view-host-question');
    if (window.__dbgLog) window.__dbgLog('renderHost: DONE (' + q.type + ')');
  } catch (err) {
    console.error('renderHostQuestion failed:', err);
    if (window.__dbgLog) window.__dbgLog('CRASH: renderHost: ' + err.message);
    showView('view-host-question');
  }
}

// ── Player view: interactive answer UI per question type ───────────────
function renderPlayerQuestion(data) {
  try {
    if (!data || !data.question) {
      if (window.__dbgLog) window.__dbgLog('ERR: renderPlayer missing data');
      return;
    }
    
    hideConnectionChip();
    updateInGameRoomPin();
    markDiagEvent('render:player_question');
    const q = data.question;
    const qProg = safeGet('player-q-progress');
    if (qProg) qProg.textContent = `Q ${(data.questionIndex || 0) + 1} / ${data.total || '?'}`;
    const qText = safeGet('player-question-text');
    if (qText) qText.textContent = q.text || 'Question text missing';

    renderQuestionMedia(q.media || null, 'player-question-text');

    const ansMsg = safeGet('player-answered-msg');
    if (ansMsg) ansMsg.textContent = '';

    // Streak badge
    const streakBadge = safeGet('player-streak-badge');
    if (streakBadge) {
      if (state.myStreak >= 2) {
        const sCount = safeGet('player-streak-count');
        if (sCount) sCount.textContent = state.myStreak;
        streakBadge.style.display = 'inline-flex';
      } else {
        streakBadge.style.display = 'none';
      }
    }

    // Reset all type containers
    safeSetDisplay('player-options-grid', '');
    safeSetDisplay('player-type-container', 'none');
    safeSetDisplay('player-boss-panel', 'none');
    safeSetDisplay('player-match-container', 'none');
    safeSetDisplay('player-order-container', 'none');
    
    const submitBtn = safeGet('btn-submit-answer');
    if (submitBtn) {
      submitBtn.style.display = 'none';
      submitBtn.disabled      = false;
      submitBtn.textContent   = '✔ تأكيد الإجابة';
    }

    renderRolePanel(data.players || state.questionPlayers || []);

    // Use the new modular renderer system
    QuestionRendererFactory.render(q, false, submitAnswer);

    const capturedQI = state.questionIndex;
    const playerTimerFn = () => {
      startClientTimer(data.duration,
        safeGet('player-timer-count'),
        safeGet('player-timer-ring'),
        () => {
          // ── Time's up — auto-submit if player hasn't answered ──
          if (!state.hasAnswered) {
            const answer = QuestionRendererFactory.getAnswer();
            if (answer) {
              submitAnswer(answer);
            } else {
              // No answer at all — emit timed-out empty answer
              state.hasAnswered = true;
              socket.emit('player:answer', {
                questionIndex: state.questionIndex,
                answer: { timedOut: true }
              });
            }
          }
          const ansMsg = safeGet('player-answered-msg');
          if (ansMsg) ansMsg.textContent = '⏰ انتهى الوقت!';
          // Host safety net: if question:end doesn't arrive, force it
          if (state.role === 'host') {
            setTimeout(() => {
              if (state.questionIndex === capturedQI && !state.isPaused) {
                socket.emit('host:force_end_question');
              }
            }, 5000);
          }
        });
    };
    // Defer timer until countdown overlay fades (first question)
    if (state.countdownDone === false) {
      state._pendingTimerFn = playerTimerFn;
    } else {
      playerTimerFn();
    }

    // Show host controls if host is playing as player (solo mode)
    const phc = safeGet('player-host-controls');
    if (phc) {
      phc.style.display = (state.role === 'host' && state.hostIsPlayer) ? 'flex' : 'none';
    }

    showView('view-player-question');
    if (window.__dbgLog) window.__dbgLog('renderPlayer: DONE (' + q.type + ')');
  } catch (err) {
    console.error('renderPlayerQuestion failed:', err);
    updateDiagnose({ error: err?.message || 'renderPlayerQuestion failed', event: 'render:player_question:error' });
    if (window.__dbgLog) window.__dbgLog('CRASH: renderPlayer: ' + err.message);
    showView('view-player-question');
    const ansMsg = safeGet('player-answered-msg');
    if (ansMsg) ansMsg.textContent = 'تعذر تحميل السؤال بالكامل. راجع لوحة Diagnose.';
  }
}

// ─────────────────────────────────────────────
// Note: All question type renderers have been moved to modular ES6 files
// in public/js/renderers/. They are now accessed via QuestionRendererFactory.
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Submit Answer (Player)
// ─────────────────────────────────────────────
function submitAnswer(answer) {
  if (state.hasAnswered || state.isFrozen) return;
  state.hasAnswered  = true;

  socket.emit('player:answer', { questionIndex: state.questionIndex, answer });

  QuestionRendererFactory.onAnswerSubmitted(answer);

  document.getElementById('player-answered-msg').textContent =
    '✅ تم إرسال إجابتك! انتظر الآخرين…';
}

// ─────────────────────────────────────────────
// Question Result Screen
// ─────────────────────────────────────────────
function showQuestionResult(data) {
  stopClientTimer();
  document.getElementById('overlay-paused').style.display = 'none';

  const labelEl    = document.getElementById('result-correct-label');
  const answerEl   = document.getElementById('result-correct-answer');
  const pairsEl    = document.getElementById('result-pairs-list');
  const resultMsg  = document.getElementById('result-player-score-msg');
  const streakMsg  = document.getElementById('result-streak-msg');
  let bossStatusText = '';

  // Reset
  pairsEl.style.display  = 'none';
  answerEl.style.display = '';

  const type = data.questionType;

  if (type === 'boss' || data.boss) {
    labelEl.textContent  = '⚔�? Boss Battle Result';
    answerEl.textContent = `${data.correctOption || ''}`;

    if (data.boss) {
      bossStatusText = data.boss.defeated
        ? `💥 ${data.boss.name} defeated!`
        : `🛡�? ${data.boss.name} survived with ${data.boss.remainingHp}/${data.boss.maxHp} HP`;
      resultMsg.textContent = `${bossStatusText} • Team Damage: ${data.boss.totalDamage}`;
      resultMsg.className = `result-score-msg ${data.boss.defeated ? 'correct' : 'incorrect'}`;
    }
  } else if (Array.isArray(data.correctPairs)) {
    labelEl.textContent        = '✅ التطابق الصحيح';
    answerEl.style.display     = 'none';
    pairsEl.style.display      = 'block';
    pairsEl.innerHTML = (data.correctPairs || []).map(p =>
      `<li class="result-pair">
        <span dir="auto">${escapeHtml(p.left)}</span>
        <span class="pair-arrow">→</span>
        <span dir="auto">${escapeHtml(p.right)}</span>
      </li>`
    ).join('');
  } else if (Array.isArray(data.correctOrder) && Array.isArray(data.items)) {
    labelEl.textContent    = '✅ الترتيب الصحيح';
    answerEl.style.display = 'none';
    pairsEl.style.display  = 'block';
    pairsEl.innerHTML = (data.correctOrder || []).map((itemIdx, pos) =>
      `<li class="result-pair">
        <span class="result-order-rank">${pos + 1}</span>
        <span dir="auto">${escapeHtml((data.items || [])[itemIdx] || '')}</span>
      </li>`
    ).join('');
  } else if (Array.isArray(data.acceptedAnswers)) {
    labelEl.textContent  = '✅ الإجابات المقبولة';
    answerEl.textContent = (data.acceptedAnswers || []).join('، ');
  } else if (Array.isArray(data.correctIndices)) {
    labelEl.textContent  = '✅ الإجابات الصحيحة';
    answerEl.textContent = (data.correctOptions || []).join('، ');

    const grid = document.getElementById('player-options-grid');
    grid.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      btn.classList.remove('multi-selected');
      if ((data.correctIndices || []).includes(i)) {
        btn.classList.add('reveal-correct');
      } else {
        btn.classList.add('reveal-wrong');
      }
    });
  } else {
    labelEl.textContent   = '✅ الإجابة الصحيحة';
    answerEl.textContent  = data.correctOption;

    // Animate options grid
    const grid = document.getElementById('player-options-grid');
    grid.querySelectorAll('.option-btn').forEach((btn, i) => {
      btn.disabled = true;
      btn.classList.remove('multi-selected');
      if (i === data.correctIndex) {
        btn.classList.remove('dimmed', 'selected');
        btn.classList.add('reveal-correct');
      } else {
        btn.classList.remove('selected');
        btn.classList.add('reveal-wrong');
      }
    });

  }

  // Score / streak message for player
  const myRound = (data.roundScores || []).find(r => r.id === socket.id);
  if (state.role === 'player' && myRound) {
    state.myStreak = myRound.streak;
    state.myScore  = myRound.totalScore;
    updatePlayerScoreUI();

    if (myRound.isCorrect) {
      Sounds.correct();
      resultMsg.textContent = `+${myRound.roundScore} pts 🎉`;
      resultMsg.className   = 'result-score-msg correct';
      streakMsg.textContent = myRound.streak >= 2 ? `🔥 ${myRound.streak} على التوالي!` : '';
      if (bossStatusText) {
        streakMsg.textContent = `${streakMsg.textContent ? `${streakMsg.textContent} • ` : ''}${bossStatusText}`;
      }
    } else if (myRound.roundScore > 0) {
      // Partial credit (match / order but not 100%)
      Sounds.correct();
      resultMsg.textContent = `+${myRound.roundScore} pts (جزئي)`;
      resultMsg.className   = 'result-score-msg correct';
      streakMsg.textContent = bossStatusText;
    } else {
      Sounds.wrong();
      resultMsg.textContent = 'إجابة خاطئة. ٠ نقطة.';
      resultMsg.className   = 'result-score-msg incorrect';
      streakMsg.textContent = bossStatusText;
    }

    if (myRound.penalty > 0) {
      resultMsg.textContent = `${resultMsg.textContent} (−${myRound.penalty} penalty)`;
    }

    if (data.boss?.teamBonus) {
      streakMsg.textContent = `${streakMsg.textContent ? `${streakMsg.textContent} • ` : ''}�? Team bonus +${data.boss.teamBonus}`;
    }
  } else {
    resultMsg.textContent = '';
    streakMsg.textContent = bossStatusText;
  }

  setTimeout(() => showView('view-question-result'), 400);
}

// ─────────────────────────────────────────────
// Leaderboard Screen
// ─────────────────────────────────────────────
function showLeaderboard(data, isFinal) {
  const titleEl = document.getElementById('lb-title');
  const hintEl  = document.getElementById('lb-next-hint');

  titleEl.textContent = isFinal ? '🎉 Final Results' : '�?� Leaderboard';
  hintEl.textContent  = isFinal ? '' : 'Next question coming up…';
  hintEl.style.display = isFinal ? 'none' : 'block';

  // Clear previous question's media so it doesn't show behind the next question hint
  clearQuestionMedia();

  const listEl = document.getElementById('leaderboard-list');
  listEl.innerHTML = data.leaderboard
    .map(
      (entry, i) =>
        `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}" style="animation-delay:${i * 0.07}s">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-nickname">${escapeHtml(entry.nickname)}${entry.streak >= 2 ? ` <span class="lb-streak">🔥${entry.streak}</span>` : ''}</span>
          <span class="lb-score">${entry.totalScore} pts</span>
        </li>`
    )
    .join('');

  showView('view-leaderboard');
}

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────
function showError(elId, message) {
  const el = document.getElementById(elId);
  if (el) {
    el.textContent = message;
    setTimeout(() => { el.textContent = ''; }, 4000);
  }
}

function updatePlayerScoreUI() {
  const scoreEl = document.getElementById('player-score-count');
  if (scoreEl) scoreEl.textContent = String(state.myScore || 0);
}

function roleDisplayName(role) {
  if (role === 'scholar') return '📘 Scholar';
  if (role === 'shield') return '🛡�? Shield';
  if (role === 'saboteur') return '�?��? Saboteur';
  return 'Player';
}

function difficultyDisplay(preset) {
  if (preset === 'easy') return '🟢 Easy';
  if (preset === 'hard') return '🔴 Hard';
  return '🟡 Classic';
}

function difficultyTag(preset) {
  if (preset === 'easy') return 'Easy';
  if (preset === 'hard') return 'Hard';
  return 'Classic';
}

function updateDifficultyDisplay() {
  const display = difficultyDisplay(state.currentDifficulty);
  const tag = difficultyTag(state.currentDifficulty);
  
  // Update lobby displays
  const hostLobbyDiff = document.getElementById('host-lobby-difficulty');
  if (hostLobbyDiff) hostLobbyDiff.textContent = display;
  
  const playerLobbyDiff = document.getElementById('player-lobby-difficulty');
  if (playerLobbyDiff) playerLobbyDiff.textContent = display;
  
  // Update question headers
  const hostQDiff = document.getElementById('host-q-difficulty');
  if (hostQDiff) hostQDiff.textContent = tag;
  
  const playerQDiff = document.getElementById('player-q-difficulty');
  if (playerQDiff) playerQDiff.textContent = tag;
}

function updateInGameRoomPin(pinValue = state.pin) {
  const displayPin = pinValue ? String(pinValue) : '------';
  const hostBadge = document.getElementById('host-q-room-pin');
  if (hostBadge) hostBadge.textContent = `PIN: ${displayPin}`;
  const playerBadge = document.getElementById('player-q-room-pin');
  if (playerBadge) playerBadge.textContent = `PIN: ${displayPin}`;
}

function setFrozenState(active, message) {
  state.isFrozen = active;
  const overlay = document.getElementById('overlay-frozen');
  const msgEl = document.getElementById('frozen-msg');
  if (msgEl && message) msgEl.textContent = message;
  overlay.style.display = active ? 'flex' : 'none';
}

function clearScholarPreviewInterval() {
  if (scholarPreviewInterval) {
    clearInterval(scholarPreviewInterval);
    scholarPreviewInterval = null;
  }
}

function showScholarPreview(data) {
  clearScholarPreviewInterval();
  const q = data.question;
  let left = Number(data.previewSeconds) || 3;

  state.currentQuestionType = q.type;
  document.getElementById('player-q-progress').textContent =
    `Q ${data.questionIndex + 1} / ${data.total}`;
  document.getElementById('player-question-text').textContent = q.text;
  document.getElementById('player-options-grid').style.display = 'none';
  document.getElementById('player-type-container').style.display = 'none';
  document.getElementById('player-match-container').style.display = 'none';
  document.getElementById('player-order-container').style.display = 'none';
  document.getElementById('player-boss-panel').style.display = 'none';
  document.getElementById('btn-submit-answer').style.display = 'none';
  document.getElementById('player-answered-msg').textContent = `📘 Scholar preview: answers open in ${left}s`;
  showView('view-player-question');

  scholarPreviewInterval = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      clearScholarPreviewInterval();
      return;
    }
    document.getElementById('player-answered-msg').textContent = `📘 Scholar preview: answers open in ${left}s`;
  }, 1000);
}

function renderRolePanel(players = []) {
  const badge = document.getElementById('player-role-badge');
  const panel = document.getElementById('player-role-panel');
  const title = document.getElementById('player-role-panel-title');
  const hint = document.getElementById('player-role-hint');
  const select = document.getElementById('role-target-select');
  const actionBtn = document.getElementById('btn-role-action');

  if (!badge || !panel || !title || !hint || !select || !actionBtn) return;

  if (!state.myRole) {
    badge.style.display = 'none';
    panel.style.display = 'none';
    return;
  }

  badge.style.display = 'inline-flex';
  badge.textContent = roleDisplayName(state.myRole);

  const targets = players.filter((p) => p.id !== socket.id);

  if (state.myRole === 'scholar') {
    panel.style.display = 'block';
    title.textContent = 'Scholar passive ability';
    hint.textContent = `You see each question ${state.roleInfo?.scholarPreviewSeconds || 3}s early.`;
    select.style.display = 'none';
    actionBtn.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  select.style.display = '';
  actionBtn.style.display = '';
  actionBtn.disabled = state.roleAbilityUsed || targets.length === 0;

  if (state.myRole === 'shield') {
    title.textContent = 'Shield ability';
    hint.textContent = `Protect one teammate from -${state.roleInfo?.wrongPenalty || 80} penalty this question.`;
  } else {
    title.textContent = 'Saboteur ability';
    hint.textContent = `Freeze one player for ${state.roleInfo?.saboteurFreezeSeconds || 2}s.`;
  }

  select.innerHTML = targets
    .map((p) => `<option value="${p.id}">${escapeHtml(p.nickname)}</option>`)
    .join('');
}

// ─────────────────────────────────────────────
// UI Event Listeners
// ─────────────────────────────────────────────

// Home — Become Host
document.getElementById('btn-become-host').addEventListener('click', () => {
  Sounds.click();
  startHostLaunch(quizSlugFromUrl || null);
});

// Home — Become Player
document.getElementById('btn-become-player').addEventListener('click', () => {
  enableKeepAwake();
  Sounds.click();
  state.role = 'player';
  showView('view-player-join');
});

// Player Join — Back button removed (players cannot navigate back to home)

const closeJoinDebugBtn = document.getElementById('btn-close-join-debug');
if (closeJoinDebugBtn) {
  closeJoinDebugBtn.addEventListener('click', () => {
    closeJoinDebugDialog();
  });
}
const printJoinDebugBtn = document.getElementById('btn-print-join-debug');
if (printJoinDebugBtn) {
  printJoinDebugBtn.addEventListener('click', () => {
    printJoinDebugDialog();
  });
}

const pinInputEl = document.getElementById('input-pin');
if (pinInputEl) {
  pinInputEl.addEventListener('input', () => {
    const normalized = normalizePin(pinInputEl.value);
    if (pinInputEl.value !== normalized) {
      pinInputEl.value = normalized;
    }
  });
}

// Player Join — Submit form
let joinTimeoutId = null;
document.getElementById('form-join').addEventListener('submit', (e) => {
  e.preventDefault();
  enableKeepAwake();
  const pinInput = document.getElementById('input-pin');
  const pin = normalizePin(pinInput ? pinInput.value : '');
  if (pinInput) pinInput.value = pin;
  const nickname = document.getElementById('input-nickname').value.trim();
  if (window.__dbgLog) window.__dbgLog('join click pin=' + pin + ' nick=' + nickname);
  openJoinDebugDialog(pin, nickname);
  markDiagEvent('ui:join_submit');
  if (!pin || !nickname) {
    pushJoinDebugLog('Blocked: PIN or nickname is missing');
    updateDiagnose({ error: 'PIN or nickname missing', event: 'ui:join_submit:invalid' });
    return;
  }
  Sounds.click();
  state.pin = pin;
  state.nickname = nickname;

  // Visual feedback: disable join button and show joining state
  const joinBtn = e.target.querySelector('button[type="submit"]');
  if (joinBtn) { joinBtn.disabled = true; joinBtn.textContent = 'Joining…'; }

  pushJoinDebugLog(`emit player:join pin=${pin} nickname=${nickname} connected=${socket.connected}`);
  setConnectionStatus('warn', 'Joining room…');

  // Timeout failsafe: if no response in 10 seconds, show error
  clearTimeout(joinTimeoutId);
  joinTimeoutId = setTimeout(() => {
    if (window.__dbgLog) window.__dbgLog('join TIMEOUT 10s');
    pushJoinDebugLog('⚠�? TIMEOUT: No room:joined received after 10 seconds');
    showError('join-error', '⚠�? Timeout joining room. Check your connection and try again.');
    setConnectionStatus('error', 'Join timeout');
    if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = 'Join Game'; }
  }, 10000);

  socket.emit('player:join', { pin, nickname, avatar: state.avatar, playerId: myPlayerId });
});

// Player Lobby — Edit Profile toggle
document.getElementById('btn-edit-profile').addEventListener('click', () => {
  const panel = document.getElementById('edit-profile-panel');
  panel.classList.toggle('open');
});

// Player Lobby — Save profile (nickname change)
document.getElementById('btn-save-profile').addEventListener('click', () => {
  const newNick = document.getElementById('edit-nickname-input').value.trim();
  const errEl = document.getElementById('edit-profile-error');
  if (!newNick) {
    if (errEl) errEl.textContent = 'Nickname cannot be empty.';
    return;
  }
  if (errEl) errEl.textContent = '';
  Sounds.click();
  socket.emit('player:update_profile', { nickname: newNick, avatar: state.avatar });
});

// Host Lobby — Back button
const hostMenuBtn = document.getElementById('btn-back-from-host-lobby');
const hostHomeMenu = document.getElementById('host-home-menu');
const shareUrlSection = document.getElementById('share-url-section');
const shareMenuBtn    = document.getElementById('btn-share-menu');
const shareActions    = document.getElementById('share-actions');

function setShareOpen(isOpen) {
  if (shareActions) shareActions.classList.toggle('share-open', !!isOpen);
  if (shareMenuBtn)  shareMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

if (shareMenuBtn) {
  shareMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setShareOpen(!shareActions?.classList.contains('share-open'));
  });
}

document.addEventListener('click', (e) => {
  if (!shareActions?.classList.contains('share-open')) return;
  if (shareActions.contains(e.target) || shareMenuBtn?.contains(e.target)) return;
  setShareOpen(false);
});

// Close share dropup when any share link/button inside is clicked
if (shareActions) {
  shareActions.addEventListener('click', (e) => {
    const link = e.target.closest('.share-social-btn, .share-icon-btn');
    if (link) {
      setTimeout(() => setShareOpen(false), 150);
    }
  });
}

const hostMenuHostBtn = document.getElementById('btn-home-menu-host');
const hostMenuPlayerBtn = document.getElementById('btn-home-menu-player');

// Host Lobby — Refresh PIN button
const refreshPinBtn = document.getElementById('btn-refresh-pin');
if (refreshPinBtn) {
  refreshPinBtn.addEventListener('click', () => {
    Sounds.click();
    socket.emit('host:refresh_pin');
  });
}

function closeHostHomeMenu() {
  if (hostHomeMenu) hostHomeMenu.style.display = 'none';
}

function resetHostRoomConnection() {
  socket.disconnect();
  socket.connect();
  state.pin = null;
  state.hostCreatePending = false;
}

if (hostMenuBtn) {
  hostMenuBtn.addEventListener('click', (e) => {
    Sounds.click();
    e.stopPropagation();
    if (!hostHomeMenu) return;
    hostHomeMenu.style.display = hostHomeMenu.style.display === 'none' ? 'flex' : 'none';
  });
}

if (hostMenuHostBtn) {
  hostMenuHostBtn.addEventListener('click', () => {
    closeHostHomeMenu();
    resetHostRoomConnection();
    startHostLaunch(quizSlugFromUrl || null);
  });
}

if (hostMenuPlayerBtn) {
  hostMenuPlayerBtn.addEventListener('click', () => {
    closeHostHomeMenu();
    resetHostRoomConnection();
    state.role = 'player';
    showView('view-player-join');
  });
}

const hostStageVariantSelect = document.getElementById('host-stage-variant');
if (hostStageVariantSelect) {
  hostStageVariantSelect.addEventListener('change', () => {
    applyHostStageSelection(hostStageVariantSelect.value || 'auto');
  });
}

const hostStageVariantJoinSelect = document.getElementById('host-stage-variant-join');
if (hostStageVariantJoinSelect) {
  hostStageVariantJoinSelect.addEventListener('change', () => {
    applyHostStageSelection(hostStageVariantJoinSelect.value || 'auto');
  });
}

try {
  const storedStageSelection = localStorage.getItem(HOST_STAGE_STORAGE_KEY) || 'auto';
  applyHostStageSelection(storedStageSelection, false);
} catch (_err) {
  applyHostStageSelection('auto', false);
}

document.addEventListener('click', (e) => {
  if (!hostHomeMenu || hostHomeMenu.style.display === 'none') return;
  if (hostHomeMenu.contains(e.target) || hostMenuBtn?.contains(e.target)) return;
  closeHostHomeMenu();
});

// Theme toggle
const THEME_KEY = 'qyanTheme';
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const iconMoon = document.getElementById('icon-theme-moon');
const iconSun  = document.getElementById('icon-theme-sun');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const isLight = theme === 'light';
  if (iconMoon) iconMoon.style.display = isLight ? 'none' : '';
  if (iconSun)  iconSun.style.display  = isLight ? '' : 'none';
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
}

// Theme label update
function updateThemeLabel() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const lbl = document.getElementById('theme-toggle-label');
  if (lbl) lbl.textContent = isLight ? 'Switch to Dark' : 'Switch to Light';
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
    updateThemeLabel();
  });
}

applyTheme('dark');
updateThemeLabel();

// Animation preset icon menu
const btnAnimPreset  = document.getElementById('btn-anim-preset');
const animPresetMenu = document.getElementById('anim-preset-menu');

function closeAnimPresetMenu() {
  // Anim preset is now embedded in burger — close the burger instead
  closeHostHomeMenu();
}

if (btnAnimPreset && animPresetMenu) {
  btnAnimPreset.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = animPresetMenu.style.display !== 'none';
    if (isOpen) { closeAnimPresetMenu(); }
    else {
      animPresetMenu.style.display = 'flex';
      btnAnimPreset.setAttribute('aria-expanded', 'true');
    }
  });

  animPresetMenu.querySelectorAll('.anim-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyHostStageSelection(btn.dataset.value || 'auto');
      closeAnimPresetMenu();
    });
  });
}

// Anim preset buttons (now inline in burger menu — no external toggle needed)
document.addEventListener('click', (e) => {
  // Kept for compat — anim-preset is embedded so no external dismiss needed
});

// Host Lobby — mode toggle
document.getElementById('btn-mode-local').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:mode:set', { mode: 'local' });
});

document.getElementById('btn-mode-global').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:mode:set', { mode: 'global' });
});

// Host Lobby — Share copy button
document.getElementById('btn-share-copy')?.addEventListener('click', async () => {
  const url = state.currentJoinUrl;
  if (!url) return;
  Sounds.click();
  const btn = document.getElementById('btn-share-copy');
  try {
    await navigator.clipboard.writeText(url);
    btn.title = 'Copied!';
    btn.classList.add('copied');
    // Show toast
    showCopyToast('تم نسخ الرابط ✅');
    setTimeout(() => {
      btn.title = 'Copy link';
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    prompt('Copy this link:', url);
  }
});

function showCopyToast(msg) {
  let toast = document.getElementById('copy-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.className = 'copy-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.remove('show');
  void toast.offsetWidth; // reflow
  toast.classList.add('show');
  clearTimeout(toast._tid);
  toast._tid = setTimeout(() => toast.classList.remove('show'), 2500);
}

// Host-as-Player toggle
const chkHostAsPlayer = document.getElementById('chk-host-as-player');
const hostPlayerForm  = document.getElementById('host-player-form');
const hostAsPlayerSection = document.getElementById('host-as-player-section');

// ── Host "Join as Player" dialog ──
let _hostJoinAvatar = state.avatar || '🎮';

function openHostJoinDialog() {
  const old = document.getElementById('host-join-dialog-overlay');
  if (old) old.remove();

  _hostJoinAvatar = state.avatar || '🎮';

  const overlay = document.createElement('div');
  overlay.id = 'host-join-dialog-overlay';
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: '100000', padding: '16px', backdropFilter: 'blur(4px)',
  });

  const dialog = document.createElement('div');
  Object.assign(dialog.style, {
    background: 'var(--surface, #1e1e2e)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px', padding: '24px', width: 'min(360px, 90vw)',
    display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box',
  });

  // Title
  const title = document.createElement('h3');
  title.textContent = 'Join as Player';
  Object.assign(title.style, {
    margin: '0', fontSize: '1.1rem', fontWeight: '700',
    color: 'var(--text, #e2e8f0)', textAlign: 'center',
  });
  dialog.appendChild(title);

  // Avatar picker row
  const avatarRow = document.createElement('div');
  Object.assign(avatarRow.style, {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
  });
  const avatarBtn = document.createElement('button');
  avatarBtn.type = 'button';
  avatarBtn.textContent = _hostJoinAvatar;
  Object.assign(avatarBtn.style, {
    fontSize: '2.2rem', width: '56px', height: '56px', borderRadius: '50%',
    border: '2px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.1)',
    cursor: 'pointer', touchAction: 'manipulation', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  });
  avatarBtn.addEventListener('click', () => {
    openAvatarPicker(_hostJoinAvatar, (emoji) => {
      _hostJoinAvatar = emoji;
      avatarBtn.textContent = emoji;
    });
  });
  const avatarHint = document.createElement('span');
  avatarHint.textContent = 'Tap to change avatar';
  Object.assign(avatarHint.style, { fontSize: '0.8rem', color: 'var(--text-dim, #94a3b8)' });
  avatarRow.appendChild(avatarBtn);
  avatarRow.appendChild(avatarHint);
  dialog.appendChild(avatarRow);

  // Nickname input
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 20;
  input.placeholder = 'Your nickname…';
  Object.assign(input.style, {
    padding: '12px 14px', fontSize: '1rem', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
    color: 'var(--text, #e2e8f0)', outline: 'none', width: '100%', boxSizing: 'border-box',
  });
  dialog.appendChild(input);

  // Error line
  const errorEl = document.createElement('p');
  Object.assign(errorEl.style, {
    margin: '0', fontSize: '0.82rem', color: '#ef4444', textAlign: 'center', minHeight: '1.2em',
  });
  dialog.appendChild(errorEl);

  // Buttons row
  const btns = document.createElement('div');
  Object.assign(btns.style, { display: 'flex', gap: '10px' });

  const joinBtn = document.createElement('button');
  joinBtn.textContent = '✅ Join Game';
  Object.assign(joinBtn.style, {
    flex: '1', padding: '12px', fontSize: '0.95rem', fontWeight: '700',
    borderRadius: '12px', border: 'none', background: '#7c3aed', color: '#fff',
    cursor: 'pointer', touchAction: 'manipulation',
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  Object.assign(cancelBtn.style, {
    padding: '12px 18px', fontSize: '0.95rem', fontWeight: '600',
    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
    background: 'transparent', color: 'var(--text-dim, #94a3b8)',
    cursor: 'pointer', touchAction: 'manipulation',
  });

  joinBtn.addEventListener('click', () => {
    const nickname = input.value.trim();
    if (!nickname) { errorEl.textContent = '⚠️ Please enter a nickname.'; return; }
    Sounds.click();
    state.avatar = _hostJoinAvatar;
    socket.emit('host:join_as_player', { nickname, avatar: _hostJoinAvatar });
    overlay.remove();
  });

  cancelBtn.addEventListener('click', () => {
    overlay.remove();
    if (chkHostAsPlayer) chkHostAsPlayer.checked = false;
  });

  // Enter key submits
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); joinBtn.click(); }
  });

  btns.appendChild(joinBtn);
  btns.appendChild(cancelBtn);
  dialog.appendChild(btns);

  overlay.appendChild(dialog);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); if (chkHostAsPlayer) chkHostAsPlayer.checked = false; }
  });
  document.body.appendChild(overlay);

  // Auto-focus nickname
  setTimeout(() => input.focus(), 100);
}

function closeHostJoinDialog() {
  const ov = document.getElementById('host-join-dialog-overlay');
  if (ov) ov.remove();
}

if (chkHostAsPlayer) {
  chkHostAsPlayer.addEventListener('change', () => {
    if (chkHostAsPlayer.checked) {
      if (!state.hostIsPlayer) openHostJoinDialog();
    } else {
      closeHostJoinDialog();
      if (state.hostIsPlayer) socket.emit('host:join_as_player', { nickname: '' });
    }
  });
}

// Host Start Game
function getSessionOptions() {
  const randomize = document.getElementById('chk-randomize-questions')?.checked ?? false;
  const limitInput = document.getElementById('input-question-limit');
  const limitVal = limitInput ? parseInt(limitInput.value, 10) : NaN;
  const questionLimit = (!isNaN(limitVal) && limitVal > 0) ? limitVal : null;
  return { sessionRandomize: randomize, sessionQuestionLimit: questionLimit };
}

document.getElementById('btn-start-game').addEventListener('click', () => {
  const btn = document.getElementById('btn-start-game');
  btn.disabled = true;
  btn.textContent = '⏳ جاري التحضير...';
  // Disable solo button to prevent double-click confusion
  if (soloPlayBtn) soloPlayBtn.disabled = true;
  enableKeepAwake();
  Sounds.click();
  socket.emit('host:start', { ...getSessionOptions(), ...getHostAuthPayload() });
});

// Solo Play — auto-join as player, then start once confirmed
const soloPlayBtn = document.getElementById('btn-solo-play');
if (soloPlayBtn) {
  soloPlayBtn.addEventListener('click', () => {
    Sounds.click();
    soloPlayBtn.disabled = true;
    soloPlayBtn.textContent = '⏳ جاري التحضير...';
    // Disable start game button to prevent double-click confusion
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) startBtn.disabled = true;

    // Generate a solo nickname
    const soloNick = 'لاعب';
    const soloAvatar = state.avatar || '🎮';

    // Listen for join confirmation, then auto-start
    const onJoined = ({ joined }) => {
      if (joined) {
        enableKeepAwake();
        socket.emit('host:start', { ...getSessionOptions(), ...getHostAuthPayload() });
      } else {
        soloPlayBtn.disabled = false;
        soloPlayBtn.textContent = '🎯 العب بنفسي';
        // Re-enable start game button on failure
        const startBtn = document.getElementById('btn-start-game');
        if (startBtn) startBtn.disabled = false;
      }
      socket.off('host:joined_as_player', onJoined);
    };
    socket.on('host:joined_as_player', onJoined);

    socket.emit('host:join_as_player', { nickname: soloNick, avatar: soloAvatar });
  });
}

/** Update solo button visibility based on player count */
function updateSoloButtonVisibility(players) {
  if (!soloPlayBtn) return;
  const realCount = players.filter(p => !p.isHost).length;
  if (realCount > 0) {
    soloPlayBtn.classList.add('hidden');
  } else {
    soloPlayBtn.classList.remove('hidden');
    soloPlayBtn.disabled = false;
    soloPlayBtn.textContent = '🎯 العب بنفسي';
  }
}

document.getElementById('btn-copy-join-url').addEventListener('click', async () => {
  Sounds.click();
  const btn = document.getElementById('btn-copy-join-url');
  const url = state.currentJoinUrl;
  if (!url) {
    btn.textContent = '⚠�? No URL yet';
    setTimeout(() => { btn.textContent = '📋 Copy Join URL'; }, 1400);
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = '✅ Copied!';
  } catch (_err) {
    const temp = document.createElement('textarea');
    temp.value = url;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    btn.textContent = '✅ Copied!';
  }
  setTimeout(() => { btn.textContent = '📋 Copy Join URL'; }, 1400);
});

// Host Pause / Resume
document.getElementById('btn-pause-resume').addEventListener('click', () => {
  const btn = document.getElementById('btn-pause-resume');
  if (btn.dataset.paused === 'true') {
    socket.emit('host:resume');
  } else {
    socket.emit('host:pause');
  }
});

// Pause overlay resume (host only)
document.getElementById('btn-overlay-resume').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  socket.emit('host:resume');
});

// Host Skip question
document.getElementById('btn-skip').addEventListener('click', () => {
  Sounds.click();
  socket.emit('host:skip');
});

document.getElementById('btn-end-game').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  socket.emit('host:end');
});

// ── Host-as-player controls (solo mode) ──
document.getElementById('btn-player-pause-resume').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  const btn = document.getElementById('btn-player-pause-resume');
  if (btn.dataset.paused === 'true') {
    socket.emit('host:resume');
  } else {
    socket.emit('host:pause');
  }
});

document.getElementById('btn-player-end-game').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  socket.emit('host:end');
});

// Submit answer (multi / match / order / type)
document.getElementById('btn-submit-answer').addEventListener('click', () => {
  if (state.hasAnswered || state.isFrozen) return;
  Sounds.click();
  
  // Use the renderer factory to get the answer in the correct format
  const answer = QuestionRendererFactory.getAnswer();
  if (answer) {
    submitAnswer(answer);
  }
});

document.getElementById('btn-role-action').addEventListener('click', () => {
  if (state.isFrozen || state.roleAbilityUsed) return;
  const targetId = document.getElementById('role-target-select').value;
  if (!targetId) return;

  if (state.myRole === 'shield') {
    socket.emit('role:shield', { targetId });
  } else if (state.myRole === 'saboteur') {
    socket.emit('role:saboteur', { targetId });
  }

  state.roleAbilityUsed = true;
  renderRolePanel(state.questionPlayers || []);
});

// Mute toggle
document.getElementById('btn-mute').addEventListener('click', () => {
  setMuted(!isMuted());
  document.getElementById('btn-mute').textContent = isMuted() ? '🔇' : '🔊';
});

// Play Again button — go back to the start with the same query params (host re-launches, player sees join screen)
document.getElementById('btn-play-again').addEventListener('click', () => {
  window.location.href = '/' + window.location.search;
});

document.getElementById('btn-start-new-session').addEventListener('click', () => {
  if (state.role !== 'host') return;
  Sounds.click();
  socket.emit('host:new-session');
});

// Back to Home from Room Closed
document.getElementById('btn-home-from-closed').addEventListener('click', () => {
  location.reload();
});

// ─────────────────────────────────────────────
// Socket.io Event Handlers
// ─────────────────────────────────────────────

/** HOST: Room created successfully */
socket.on('room:created', ({ pin, reclaimed, ...modeInfo }) => {
  if (state.hostCreateTimeoutId) {
    clearTimeout(state.hostCreateTimeoutId);
    state.hostCreateTimeoutId = null;
  }
  state.hostCreateRetryCount = 0;
  state.hostCreatePending = false;
  state.pin = pin;
  updateInGameRoomPin(pin);

  if (reclaimed) {
    // Mid-game host reconnect — room was preserved with the same PIN.
    // If we're on the generic loading screen, move to the lobby.
    // If we're in-game, stay on the current view but update the PIN.
    setConnectionStatus('ok', 'Reconnected ✓');
    const hostPinEl = document.getElementById('host-pin');
    if (hostPinEl) hostPinEl.textContent = pin;
    applyModeInfo(modeInfo);
    
    // Safety check: if host was stuck in the "Preparing..." screen, they must see the lobby.
    const currentView = document.querySelector('.view-active');
    if (!currentView || currentView.id === 'view-host-loading' || currentView.id === 'view-host-launch') {
      showView('view-host-lobby');
    }
    return;
  }

  document.documentElement.classList.remove('autohost-launch');
  if (state.hostPlayerStageSelection === 'auto') state.hostPlayerStageVariant = null;
  state.hostLobbyPlayers = [];
  const hostPinEl = document.getElementById('host-pin');
  if (hostPinEl) hostPinEl.textContent = pin;
  document.getElementById('host-player-count').textContent = '0';
  document.getElementById('host-player-list').innerHTML = '';

  // Enable refresh button for fresh room
  const refreshBtn = document.getElementById('btn-refresh-pin');
  if (refreshBtn) refreshBtn.disabled = false;

  applyModeInfo(modeInfo);
  showView('view-host-lobby');
});

/** HOST: PIN refreshed successfully */
socket.on('room:pin_refreshed', ({ pin, ...modeInfo }) => {
  state.pin = pin;
  updateInGameRoomPin(pin);
  document.getElementById('host-pin').textContent = pin;
  applyModeInfo(modeInfo);

  // Animate the button
  const refreshBtn = document.getElementById('btn-refresh-pin');
  if (refreshBtn) {
    refreshBtn.classList.add('spin');
    setTimeout(() => refreshBtn.classList.remove('spin'), 500);
  }
});

/** HOST: Mode updated (local/global) */
socket.on('room:mode', (modeInfo) => {
  applyModeInfo(modeInfo);
});

// Track whether this is the initial connect or a mid-session reconnect
let _socketWasConnected = false;

socket.on('connect', () => {
  markDiagEvent('socket:connect');
  pushJoinDebugLog('socket connected');
  setConnectionStatus('ok', 'Server connected');

  if (_socketWasConnected) {
    // ── Mid-session reconnect ── socket got a new ID; re-attach to the room
    pushJoinDebugLog('mid-session reconnect detected; re-attaching to room');

    // Player: emit player:rejoin using the saved session
    const savedSession = localStorage.getItem('quizSession');
    if (savedSession && !rejoinAttempt) {
      try {
        const { pin, playerId } = JSON.parse(savedSession);
        const normalizedPin = normalizePin(pin);
        if (normalizedPin && playerId) {
          rejoinAttempt = true;
          setConnectionStatus('warn', 'Reconnecting to game…');
          socket.emit('player:rejoin', { pin: normalizedPin, playerId });
        }
      } catch (_) {}
    }

    // Host: re-emit host:create so the server reclaims the room with the new socket ID
    // (uses the 20-second grace-period reclaim logic on the server)
    if (state.role === 'host' && state.pin) {
      socket.emit('host:create', {
        quizSlug: quizSlugFromUrl || null,
        gameMode: gameModeFromUrl || null,
        isReconnect: true, // tells server to force-reclaim even if old socket still alive
      });
    }
  }

  _socketWasConnected = true;
});

socket.on('connect_error', () => {
  markDiagEvent('socket:connect_error');
  pushJoinDebugLog('socket connect_error');
  setConnectionStatus('error', 'Cannot reach server. Check LAN / local mode IP.');
});

socket.on('disconnect', () => {
  markDiagEvent('socket:disconnect');
  pushJoinDebugLog('socket disconnected; reconnecting');
  setConnectionStatus('warn', 'Connection lost. Reconnecting…');
});

/** PLAYER: Successfully joined the room */
socket.on('room:joined', (data) => {
  // Clear join timeout
  clearTimeout(joinTimeoutId);
  if (window.__dbgLog) window.__dbgLog('room:joined received');

  // Re-enable join button in case user re-submits later
  const joinBtn = document.querySelector('#form-join button[type="submit"]');
  if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = 'Join Game'; }

  // Close the join debug dialog
  closeJoinDebugDialog();

  try {
    // Safe destructure inside try-catch (protects against null/undefined data)
    const pin = data?.pin;
    const nickname = data?.nickname;
    const avatar = data?.avatar;
    const players = data?.players;

    markDiagEvent('room:joined');
    pushJoinDebugLog(`room:joined success players=${Array.isArray(players) ? players.length : 0}`);
    state.pin = pin;
    state.nickname = nickname;
    state.avatar = avatar || '🎮';
    state.myScore = 0;
    updatePlayerScoreUI();
    
    const pinEl = document.getElementById('player-room-pin');
    if (pinEl) pinEl.textContent = pin;
    updateInGameRoomPin(pin);

    // Save session for potential reconnect
    saveGameSession(pin, nickname, avatar || '🎮');

    // Pre-fill edit form
    const editNickEl = document.getElementById('edit-nickname-input');
    if (editNickEl) editNickEl.value = nickname;

    // Wire lobby avatar trigger button
    const lobbyBtn = document.getElementById('lobby-avatar-btn');
    const lobbyDisplayEl = document.getElementById('lobby-avatar-display');
    if (lobbyDisplayEl) lobbyDisplayEl.textContent = state.avatar;
    if (lobbyBtn) {
      lobbyBtn.onclick = () => {
        openAvatarPicker(state.avatar, (a) => {
          state.avatar = a;
          if (lobbyDisplayEl) lobbyDisplayEl.textContent = a;
          socket.emit('player:update_profile', { nickname: state.nickname, avatar: a });
        });
      };
    }

    const listEl = document.getElementById('player-player-list');
    const countEl = document.getElementById('player-player-count');
    if (listEl && countEl) {
      renderPlayerList(players, listEl, countEl);
    }
    
    if (window.__dbgLog) window.__dbgLog('room:joined -> showView(view-player-lobby)');
    showView('view-player-lobby');

    // Trigger media preloading for the player
    const quizSlug = data?.quizSlug;
    if (quizSlug) triggerPlayerPreload(quizSlug);
  } catch (err) {
    console.error('Error in room:joined:', err);
    pushJoinDebugLog(`room:joined error: ${err?.message || err}`);
    updateDiagnose({ error: err?.message || 'room:joined failed', event: 'room:joined:error' });
    if (window.__dbgLog) window.__dbgLog('room:joined ERROR: ' + (err?.message || err));
    // Attempt fallback show even if updates fail
    showView('view-player-lobby');
  }
});

/** BOTH: Someone joined — update player list */
socket.on('room:player_joined', ({ players }) => {
  try {
    if (state.role === 'host') {
      const listEl = document.getElementById('host-player-list');
      const countEl = document.getElementById('host-player-count');
      if (listEl && countEl) {
        renderPlayerList(players, listEl, countEl, true);
      }
      const startBtn = document.getElementById('btn-start-game');
      if (startBtn) startBtn.disabled = players.length === 0;

      // Disable refresh once real players are in
      const realCount = players.filter(p => !p.isHost).length;
      const refreshBtn = document.getElementById('btn-refresh-pin');
      if (refreshBtn) refreshBtn.disabled = realCount > 0;

      // Show/hide solo button
      updateSoloButtonVisibility(players);
    } else {
      const listEl = document.getElementById('player-player-list');
      const countEl = document.getElementById('player-player-count');
      if (listEl && countEl) {
        renderPlayerList(players, listEl, countEl);
      }
    }
  } catch (err) {
    console.error('Error in room:player_joined:', err);
  }
});

/** PLAYER: Rejoined a game in progress after disconnection */
socket.on('room:rejoined', ({ pin, nickname, avatar, players, score, streak, roomState, role, questionData, leaderboard }) => {
  try {
    markDiagEvent('room:rejoined');
    rejoinAttempt = false;

    state.pin = pin;
    state.nickname = nickname;
    state.avatar = avatar || '🎮';
    state.role = 'player';
    state.myScore = score || 0;
    state.myStreak = streak || 0;
    updatePlayerScoreUI();
    updateInGameRoomPin(pin);

    if (role === 'scholar') state.myRole = 'scholar';
    else if (role === 'shield') state.myRole = 'shield';
    else if (role === 'saboteur') state.myRole = 'saboteur';
    else state.myRole = null;

    const listEl = document.getElementById('player-player-list');
    const countEl = document.getElementById('player-player-count');
    if (listEl && countEl && Array.isArray(players)) {
      renderPlayerList(players, listEl, countEl);
    }

    setConnectionStatus('ok', 'Reconnected ✓');

    // Populate edit profile panel (same as room:joined)
    const editNickElRejoin = document.getElementById('edit-nickname-input');
    if (editNickElRejoin) editNickElRejoin.value = nickname;
    const lobbyBtnRejoin = document.getElementById('lobby-avatar-btn');
    const lobbyDisplayElRejoin = document.getElementById('lobby-avatar-display');
    if (lobbyDisplayElRejoin) lobbyDisplayElRejoin.textContent = state.avatar;
    if (lobbyBtnRejoin) {
      lobbyBtnRejoin.onclick = () => {
        openAvatarPicker(state.avatar, (a) => {
          state.avatar = a;
          if (lobbyDisplayElRejoin) lobbyDisplayElRejoin.textContent = a;
          socket.emit('player:update_profile', { nickname: state.nickname, avatar: a });
        });
      };
    }

    if (roomState === 'lobby') {
      showView('view-player-lobby');
    } else if ((roomState === 'question' || roomState === 'question-pending') && questionData) {
      const resumedQuestionPayload = {
        questionIndex: questionData.questionIndex,
        total: questionData.total,
        question: questionData.question,
        duration: questionData.timeRemaining, // start client timer at remaining time, not full duration
        players: questionData.players,
      };

      let handledByMode = callGameModeHook('onGameQuestion', {
        data: resumedQuestionPayload,
        state,
        socket,
        renderQuestion,
        showView,
      });

      if (handledByMode !== true) {
        handledByMode = callFallbackGameModeHook('onGameQuestion', {
          data: resumedQuestionPayload,
          state,
          socket,
          renderQuestion,
          showView,
        });
      }

      if (handledByMode !== true) {
        renderQuestion(resumedQuestionPayload, false);
      }

      // Sync questionStartTime so any elapsed-time logic is correct
      state.questionStartTime = Date.now() - (questionData.duration - questionData.timeRemaining) * 1000;
      state.questionDuration  = questionData.duration; // restore correct total for scoring context
      const ansMsg = document.getElementById('player-answered-msg');
      if (questionData.hasAnswered && ansMsg) {
        state.hasAnswered = true;
        ansMsg.textContent = '✅ تم إرسال إجابتك! انتظر الآخرين…';
      }
    } else if (roomState === 'finished' && leaderboard) {
      // Populate podium immediately (no ceremony delay on rejoin)
      const fullList = document.getElementById('final-leaderboard-list');
      if (fullList) {
        fullList.innerHTML = leaderboard.map((entry, i) =>
          `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}" style="animation-delay:${i * 0.07}s">
            <span class="lb-rank">${i + 1}</span>
            <span class="lb-nickname">${escapeHtml(entry.nickname)}</span>
            <span class="lb-score">${entry.totalScore} pts</span>
          </li>`
        ).join('');
      }
      
      const fillSlotRejoin = (slotId, avatarId, nameId, scoreId, entry) => {
        if (!entry) {
          const el = document.getElementById(slotId);
          if (el) el.style.display = 'none';
          return;
        }
        const av = document.getElementById(avatarId);
        const nm = document.getElementById(nameId);
        const sc = document.getElementById(scoreId);
        if (av) av.textContent = entry.avatar || '🎮';
        if (nm) nm.textContent = escapeHtml(entry.nickname);
        if (sc) sc.textContent = `${entry.totalScore} pts`;
      };
      
      fillSlotRejoin('podium-slot-1', 'podium-avatar-1', 'podium-name-1', 'podium-score-1', leaderboard[0]);
      fillSlotRejoin('podium-slot-2', 'podium-avatar-2', 'podium-name-2', 'podium-score-2', leaderboard[1]);
      fillSlotRejoin('podium-slot-3', 'podium-avatar-3', 'podium-name-3', 'podium-score-3', leaderboard[2]);
      
      ['podium-slot-1', 'podium-slot-2', 'podium-slot-3'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none') {
          el.style.opacity = '1';
          el.classList.add('podium-revealed');
        }
      });
      
      const resPanel = document.getElementById('podium-full-results');
      if (resPanel) resPanel.classList.add('podium-results-visible');
      
      const newSessBtn = document.getElementById('btn-start-new-session');
      if (newSessBtn) newSessBtn.style.display = 'none';
      
      clearGameSession();
      showView('view-game-over');
    } else {
      // Fallback: show the player lobby
      showView('view-player-lobby');
    }
  } catch (err) {
    console.error('Error in room:rejoined:', err);
    updateDiagnose({ error: err?.message || 'room:rejoined failed', event: 'room:rejoined:error' });
    showView('view-player-lobby'); // Safe fallback
  }
});

/** PLAYER: Server could not find the session to rejoin */
socket.on('room:rejoin_failed', ({ message }) => {
  rejoinAttempt = false;
  clearGameSession();
  setConnectionStatus('ok', 'Server connected');
  showView('view-home');
});

/** HOST: Server confirmed host joined as player */
socket.on('host:joined_as_player', ({ joined, nickname, avatar }) => {
  state.hostIsPlayer = !!joined;
  closeHostJoinDialog();
  const statusEl = document.getElementById('host-as-player-status');
  const chk = document.getElementById('chk-host-as-player');
  const hostAsPlayerBlock = document.getElementById('host-as-player-section');
  if (joined) {
    if (statusEl) statusEl.textContent = `\u2705 Playing as "${nickname}"`;
    if (chk) chk.checked = true;
    if (hostAsPlayerBlock) hostAsPlayerBlock.classList.add('join-enabled');
  } else {
    if (statusEl) statusEl.textContent = '';
    if (chk) chk.checked = false;
    if (hostAsPlayerBlock) hostAsPlayerBlock.classList.remove('join-enabled');
  }
});

/** BOTH: Error from server */
socket.on('room:error', ({ message, code }) => {
  clearTimeout(joinTimeoutId);
  if (state.hostCreateTimeoutId) {
    clearTimeout(state.hostCreateTimeoutId);
    state.hostCreateTimeoutId = null;
  }
  pushJoinDebugLog(`room:error ${message}${code ? ` (code: ${code})` : ''}`);
  if (window.__dbgLog) window.__dbgLog('room:error: ' + message);

  // Re-enable join button
  const joinBtn = document.querySelector('#form-join button[type="submit"]');
  if (joinBtn) { joinBtn.disabled = false; joinBtn.textContent = 'Join Game'; }

  if (state.role === 'host') {
    state.hostCreateRetryCount = 0;
    state.hostCreatePending = false;
    document.documentElement.classList.remove('autohost-launch');
    // Reset start button if it was in loading state
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = '🚀 ابدأ اللعبة';
    }

    if (code === 'XO_DUEL_NOT_ENOUGH_PLAYERS') {
      const waitingEl = document.getElementById('player-waiting-msg');
      if (waitingEl) {
        waitingEl.style.display = 'block';
        waitingEl.style.color = '#f87171';
        waitingEl.style.fontWeight = '700';
        waitingEl.textContent = message;
      }
      return;
    }
  }
  const editPanel = document.getElementById('edit-profile-panel');
  if (state.role === 'player' && editPanel && editPanel.classList.contains('open')) {
    const errEl = document.getElementById('edit-profile-error');
    if (errEl) errEl.textContent = `⚠�? ${message}`;
  } else if (state.role === 'player') {
    showError('join-error', `⚠�? ${message}`);
  } else {
    alert(`Server error: ${message}`);
  }
});

/** PLAYER: Server confirmed profile update */
socket.on('room:profile_updated', ({ nickname, avatar }) => {
  state.nickname = nickname;
  state.avatar = avatar;

  // Update edit form
  const editNickEl = document.getElementById('edit-nickname-input');
  if (editNickEl) editNickEl.value = nickname;

  // Update lobby avatar trigger display
  const lobbyDisplayEl = document.getElementById('lobby-avatar-display');
  if (lobbyDisplayEl) lobbyDisplayEl.textContent = avatar;

  // Clear errors and close panel
  const errEl = document.getElementById('edit-profile-error');
  if (errEl) errEl.textContent = '';
  const panel = document.getElementById('edit-profile-panel');
  if (panel) panel.classList.remove('open');
});

/** BOTH: Game is starting */
socket.on('game:start', ({ totalQuestions }) => {
  const handledByMode = callGameModeHook('onGameStart', {
    totalQuestions,
    state,
    socket,
    showView,
  });
  if (handledByMode === true) return;

  markDiagEvent('game:start');
  pushJoinDebugLog(`game:start totalQuestions=${totalQuestions}`);
  state.totalQuestions = totalQuestions;
  state.myStreak = 0;
  state.myScore = 0;
  updatePlayerScoreUI();

  // Both host and players start the countdown simultaneously on game:start
  Sounds.start();
  showStartCountdown();

  // Preload all question images so they appear instantly during the game
  if (quizSlugFromUrl) {
    fetch(`/api/quiz-preview/${encodeURIComponent(quizSlugFromUrl)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data || !Array.isArray(data.questions)) return;
        data.questions.forEach((q) => {
          if (q.media && q.media.url && q.media.type === 'image') {
            const img = new Image();
            img.src = q.media.url;
          }
        });
      })
      .catch(() => {});
  }
});

socket.on('game:roles', (data) => {
  state.roleInfo = {
    scholarPreviewSeconds: data.scholarPreviewSeconds || 3,
    saboteurFreezeSeconds: data.saboteurFreezeSeconds || 2,
    wrongPenalty: data.wrongPenalty || 80,
  };
  state.currentDifficulty = data.challengePreset || 'classic';
  updateDifficultyDisplay();

  const roles = data.roles || {};
  if (roles.scholarId === socket.id) state.myRole = 'scholar';
  else if (roles.shieldId === socket.id) state.myRole = 'shield';
  else if (roles.saboteurId === socket.id) state.myRole = 'saboteur';
  else state.myRole = null;
});

socket.on('game:question_preview', (data) => {
  if (state.role !== 'player') return;
  showScholarPreview(data);
});

/** BOTH: Final question alert — dramatic overlay before last Q */
socket.on('game:final_question', () => {
  showFinalQuestionOverlay();
});

/** BOTH: New question */
socket.on('game:question', (data) => {
  try {
    let handledByMode = callGameModeHook('onGameQuestion', {
      data,
      state,
      socket,
      renderQuestion,
      showView,
    });

    if (handledByMode !== true) {
      handledByMode = callFallbackGameModeHook('onGameQuestion', {
        data,
        state,
        socket,
        renderQuestion,
        showView,
      });
    }

    if (handledByMode === true) return;

    markDiagEvent('game:question');
    pushJoinDebugLog(`game:question index=${data?.questionIndex} type=${data?.question?.type}`);
    state.isPaused = false;
    const pauseOverlay = document.getElementById('overlay-paused');
    if (pauseOverlay) pauseOverlay.style.display = 'none';

    // Dismiss final-question overlay if still showing
    dismissFinalQuestionOverlay();

    // If host is also playing, show the player (interactive) question view
    console.log('[v54] game:question fired, state.role=' + state.role + ', hostIsPlayer=' + state.hostIsPlayer + ', qi=' + data.questionIndex); if (window.__dbgLog) window.__dbgLog('game:Q role=' + state.role + ' qi=' + data.questionIndex);
    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    renderQuestion(data, isHostOnly);
  } catch (err) {
    console.error('Error in game:question:', err);
    pushJoinDebugLog(`game:question error: ${err?.message || err}`);
    updateDiagnose({ error: err?.message || 'game:question failed', event: 'game:question:error' });
  }
});

socket.on('role:shield_applied', ({ from }) => {
  if (state.role !== 'player') return;
  const msg = document.getElementById('player-answered-msg');
  if (msg) msg.textContent = `🛡�? ${from} protected you from penalty this round.`;
});

socket.on('role:frozen', ({ durationMs, from }) => {
  if (state.role !== 'player') return;
  clearTimeout(frozenTimeout);
  setFrozenState(true, `�?��? ${from} froze your screen for ${Math.ceil((durationMs || 2000) / 1000)}s`);
  frozenTimeout = setTimeout(() => {
    setFrozenState(false);
  }, durationMs || 2000);
});

/** HOST: Game paused */
socket.on('game:paused', () => {
  state.isPaused = true;
  stopClientTimer();
  Sounds.pause();
  const btn = document.getElementById('btn-pause-resume');
  if (btn) { btn.textContent = '▶�? Resume'; btn.dataset.paused = 'true'; }
  // Also update player-view pause button (solo mode)
  const pbtn = document.getElementById('btn-player-pause-resume');
  if (pbtn) { pbtn.textContent = '▶️ استئناف'; pbtn.dataset.paused = 'true'; }
  const overlay = document.getElementById('overlay-paused');
  const overlayBtn = document.getElementById('btn-overlay-resume');
  if (state.role === 'host') {
    overlay.style.display = 'none';
    overlayBtn.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
    overlayBtn.style.display = 'none';
  }
});

/** BOTH: Game resumed */
socket.on('game:resumed', ({ timeRemaining }) => {
  state.isPaused = false;
  Sounds.resume();
  document.getElementById('overlay-paused').style.display = 'none';
  document.getElementById('btn-overlay-resume').style.display = 'none';
  const btn = document.getElementById('btn-pause-resume');
  if (btn) { btn.textContent = '�?��? Pause'; btn.dataset.paused = 'false'; }
  // Also update player-view pause button (solo mode)
  const pbtn2 = document.getElementById('btn-player-pause-resume');
  if (pbtn2) { pbtn2.textContent = '⏸️ إيقاف'; pbtn2.dataset.paused = 'false'; }
  // Restart client timer with remaining seconds
  state.questionStartTime = Date.now() - ((state.questionDuration - timeRemaining) * 1000);
  const isHost = state.role === 'host';
  const resumedQI = state.questionIndex;
  startClientTimer(
    timeRemaining,
    document.getElementById(isHost ? 'host-timer-count' : 'player-timer-count'),
    document.getElementById(isHost ? 'host-timer-ring' : 'player-timer-ring'),
    () => {
      if (!isHost || state.hostIsPlayer) {
        if (!state.hasAnswered) {
          const answer = QuestionRendererFactory.getAnswer();
          if (answer) {
            submitAnswer(answer);
          } else {
            state.hasAnswered = true;
            socket.emit('player:answer', {
              questionIndex: state.questionIndex,
              answer: { timedOut: true }
            });
          }
        }
        const ansMsg = document.getElementById('player-answered-msg');
        if (ansMsg) ansMsg.textContent = ' انتهى الوقت!';
      }
      if (state.role === 'host') {
        setTimeout(() => {
          if (state.questionIndex === resumedQI && !state.isPaused) {
            socket.emit('host:force_end_question');
          }
        }, isHost ? 3000 : 5000);
      }
    }
  );
});

/** HOST: Live answer count update */
socket.on('question:answer_update', ({ answered, total }) => {
  const el = document.getElementById('host-answer-counter');
  if (el) el.textContent = `${answered} / ${total} answered`;
});

/** PLAYER: Server acknowledged answer */
socket.on('answer:received', () => {
  // UI already updated in submitAnswer()
});

/** BOTH: Question ended — show correct answer */
socket.on('question:end', (data) => {
  const handledByMode = callGameModeHook('onQuestionEnd', {
    data,
    state,
    socket,
    showQuestionResult,
    showView,
  });
  if (handledByMode === true) return;

  showQuestionResult(data);
});

/** BOTH: Leaderboard between questions */
socket.on('game:leaderboard', (data) => {
  const handledByMode = callGameModeHook('onLeaderboard', {
    data,
    state,
    socket,
    showLeaderboard,
    showView,
  });
  if (handledByMode === true) return;

  // Server already waits 2s after question:end before sending this — no extra delay needed
  showLeaderboard(data, false);
});

/** BOTH: Game over — Podium Ceremony */
socket.on('game:over', (data) => {
  const handledByMode = callGameModeHook('onGameOver', {
    data,
    state,
    socket,
    showView,
  });
  if (handledByMode === true) return;

  clearGameSession();
  clearScholarPreviewInterval();
  stopClientTimer();
  setFrozenState(false);
  document.getElementById('overlay-paused').style.display = 'none';

  const lb = data.leaderboard || [];
  const newSessionBtn = document.getElementById('btn-start-new-session');
  newSessionBtn.style.display = state.role === 'host' ? 'block' : 'none';

  // Populate full leaderboard list
  document.getElementById('final-leaderboard-list').innerHTML = lb
    .map((entry, i) =>
      `<li class="lb-entry ${entry.id === socket.id ? 'lb-mine' : ''}" style="animation-delay:${i * 0.07}s">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-nickname">${escapeHtml(entry.nickname)}</span>
        <span class="lb-score">${entry.totalScore} pts</span>
      </li>`
    ).join('');

  // Populate winner-announcement (hidden; kept for rejoin compat)
  const winnerWrap = document.getElementById('winner-announcement');
  const winnerNameEl = document.getElementById('winner-name');
  const winnerScoreEl = document.getElementById('winner-score');
  const w1 = lb[0];
  if (w1) {
    winnerNameEl.textContent = `👑 ${w1.nickname}`;
    winnerScoreEl.textContent = `${w1.totalScore} pts`;
    winnerWrap.style.display = 'none'; // podium replaces this
  }

  // Helper: fill a podium slot
  function fillSlot(slotId, avatarId, nameId, scoreId, entry) {
    if (!entry) {
      document.getElementById(slotId).style.display = 'none';
      return;
    }
    document.getElementById(avatarId).textContent = entry.avatar || '🎮';
    document.getElementById(nameId).textContent   = escapeHtml(entry.nickname);
    document.getElementById(scoreId).textContent  = `${entry.totalScore} pts`;
  }

  fillSlot('podium-slot-1', 'podium-avatar-1', 'podium-name-1', 'podium-score-1', lb[0]);
  fillSlot('podium-slot-2', 'podium-avatar-2', 'podium-name-2', 'podium-score-2', lb[1]);
  fillSlot('podium-slot-3', 'podium-avatar-3', 'podium-name-3', 'podium-score-3', lb[2]);

  // Reset visual state
  ['podium-slot-1', 'podium-slot-2', 'podium-slot-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('podium-revealed'); el.style.opacity = '0'; el.style.display = ''; }
  });
  const fullResults = document.getElementById('podium-full-results');
  fullResults.classList.remove('podium-results-visible');

  showView('view-game-over');
  Sounds.fanfare();

  // ── Sequential reveal: 3rd → 2nd → 1st ──
  const REVEAL_INTERVAL = 1700;

  // 3rd place (right pillar, shortest)
  setTimeout(() => {
    const el = document.getElementById('podium-slot-3');
    if (el && lb[2]) el.classList.add('podium-revealed');
  }, 600);

  // 2nd place (left pillar, medium)
  setTimeout(() => {
    const el = document.getElementById('podium-slot-2');
    if (el && lb[1]) el.classList.add('podium-revealed');
  }, 600 + REVEAL_INTERVAL);

  // 1st place (center pillar, tallest) — full celebration
  setTimeout(() => {
    const el = document.getElementById('podium-slot-1');
    if (el && lb[0]) el.classList.add('podium-revealed');
    Sounds.fanfare();
    if (typeof confetti === 'function') {
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.45 } });
      setTimeout(() => confetti({ particleCount: 90, angle: 55, spread: 60, origin: { x: 0 } }), 350);
      setTimeout(() => confetti({ particleCount: 90, angle: 125, spread: 60, origin: { x: 1 } }), 650);
      setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.3 }, colors: ['#facc15','#fb923c','#34d399'] }), 1100);
    }
  }, 600 + REVEAL_INTERVAL * 2);

  // Full results fade in after the ceremony
  setTimeout(() => {
    fullResults.classList.add('podium-results-visible');
  }, 600 + REVEAL_INTERVAL * 2 + 1400);
});

socket.on('room:reset', ({ players, modeInfo }) => {
  clearScholarPreviewInterval();
  stopClientTimer();
  setFrozenState(false);
  state.isPaused = false;
  state.questionIndex = 0;
  state.totalQuestions = 0;
  state.myStreak = 0;
  state.myScore = 0;
  state.hostIsPlayer = false;
  updatePlayerScoreUI();
  document.getElementById('overlay-paused').style.display = 'none';
  // Reset the host-as-player UI for the fresh session
  const chkReset = document.getElementById('chk-host-as-player');
  if (chkReset) chkReset.checked = false;
  const formReset = document.getElementById('host-player-form');
  if (formReset) formReset.style.display = 'none';
  const hostAsPlayerBlockReset = document.getElementById('host-as-player-section');
  if (hostAsPlayerBlockReset) hostAsPlayerBlockReset.classList.remove('join-enabled');
  const statusReset = document.getElementById('host-as-player-status');
  if (statusReset) statusReset.textContent = '';

  if (state.role === 'host') {
    if (modeInfo) applyModeInfo(modeInfo);
    const listEl = document.getElementById('host-player-list');
    const countEl = document.getElementById('host-player-count');
    if (listEl && countEl) {
      renderPlayerList(players || [], listEl, countEl, true);
    }
    const startBtn = document.getElementById('btn-start-game');
    if (startBtn) startBtn.disabled = !(players && players.length > 0);
    showView('view-host-lobby');
  } else {
    const listEl = document.getElementById('player-player-list');
    const countEl = document.getElementById('player-player-count');
    if (listEl && countEl) {
      renderPlayerList(players || [], listEl, countEl);
    }
    showView('view-player-lobby');
  }
});

/** PLAYER: Kicked by host */
socket.on('room:kicked', ({ message }) => {
  // Snapshot connection info before clearing session (clearGameSession only wipes localStorage)
  const savedPin      = state.pin;
  const savedNickname = state.nickname;
  const savedAvatar   = state.avatar || '🎮';

  clearGameSession();
  stopClientTimer();

  const titleEl   = document.getElementById('room-closed-title');
  const msgEl     = document.getElementById('room-closed-msg');
  const rejoinBtn = document.getElementById('btn-rejoin-request');

  if (titleEl)  titleEl.textContent  = '👟 You Were Removed';
  if (msgEl)    msgEl.textContent    = message;

  if (rejoinBtn && savedPin && savedNickname) {
    rejoinBtn.textContent = 'Request to Rejoin';
    rejoinBtn.disabled    = false;
    rejoinBtn.style.display = '';
    rejoinBtn.onclick = () => {
      rejoinBtn.disabled    = true;
      rejoinBtn.textContent = 'Sending request…';
      socket.emit('player:join', { pin: savedPin, nickname: savedNickname, avatar: savedAvatar });
    };
  }

  showView('view-room-closed');
});

/** PLAYER: Kicked player's rejoin request is pending host approval */
socket.on('room:join_pending', ({ message }) => {
  const titleEl   = document.getElementById('room-closed-title');
  const msgEl     = document.getElementById('room-closed-msg');
  const rejoinBtn = document.getElementById('btn-rejoin-request');

  if (titleEl)  titleEl.textContent  = '⏳ Waiting for Approval';
  if (msgEl)    msgEl.textContent    = message;
  if (rejoinBtn) {
    rejoinBtn.disabled    = true;
    rejoinBtn.textContent = 'Request Sent…';
  }
  showView('view-room-closed');
});

/** PLAYER: Host rejected the rejoin request */
socket.on('room:join_rejected', ({ message }) => {
  const titleEl   = document.getElementById('room-closed-title');
  const msgEl     = document.getElementById('room-closed-msg');
  const rejoinBtn = document.getElementById('btn-rejoin-request');

  if (titleEl)  titleEl.textContent  = '🚫 Request Declined';
  if (msgEl)    msgEl.textContent    = message;
  if (rejoinBtn) rejoinBtn.style.display = 'none';
  showView('view-room-closed');
});

/** HOST: A player requested to join (rejoin or late join) */
socket.on('host:join_request', ({ socketId, nickname, avatar }) => {
  function resolveJoinRequestPanel() {
    const lobbyBanner = document.getElementById('join-request-banner');
    const lobbyList = document.getElementById('join-request-list');
    const hostLobbyView = document.getElementById('view-host-lobby');
    const hostLobbyVisible = !!(hostLobbyView && hostLobbyView.classList.contains('view-active'));

    if (lobbyBanner && lobbyList && hostLobbyVisible) {
      return { banner: lobbyBanner, list: lobbyList };
    }

    let liveBanner = document.getElementById('join-request-live-banner');
    let liveList = document.getElementById('join-request-live-list');

    if (!liveBanner || !liveList) {
      liveBanner = document.createElement('div');
      liveBanner.id = 'join-request-live-banner';
      liveBanner.style.cssText = 'position:fixed;top:10px;right:10px;z-index:10020;display:none;max-width:min(92vw,360px);background:rgba(15,23,42,0.96);border:1px solid rgba(148,163,184,0.35);border-radius:12px;padding:10px;box-shadow:0 12px 30px rgba(0,0,0,0.35);';
      liveBanner.innerHTML = '<div style="font-weight:800;font-size:0.82rem;margin-bottom:6px;">⏳ Join Requests</div><div id="join-request-live-list" style="display:flex;flex-direction:column;gap:6px;"></div>';
      document.body.appendChild(liveBanner);
      liveList = liveBanner.querySelector('#join-request-live-list');
    }

    return { banner: liveBanner, list: liveList };
  }

  const { banner, list } = resolveJoinRequestPanel();
  if (!banner || !list) return;

  // Avoid duplicate cards
  if (list.querySelector(`[data-socket-id="${socketId}"]`)) return;

  const card = document.createElement('div');
  card.className = 'join-request-card';
  card.dataset.socketId = socketId;
  card.style.cssText = 'display:flex;align-items:center;gap:8px;background:rgba(30,41,59,0.72);border:1px solid rgba(148,163,184,0.28);border-radius:10px;padding:7px;';

  const safeAvatar = String(avatar || '🎮').slice(0, 8);
  const safeName   = String(nickname || '').replace(/</g, '&lt;');

  card.innerHTML = `
    <span class="join-request-avatar" style="font-size:1.1rem;">${safeAvatar}</span>
    <span class="join-request-name" style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeName}</span>
    <div class="join-request-actions" style="display:flex;gap:5px;">
      <button class="btn-jr-accept" style="border:1px solid rgba(34,197,94,0.45);background:rgba(34,197,94,0.15);color:#86efac;border-radius:8px;padding:5px 8px;cursor:pointer;">✓ Accept</button>
      <button class="btn-jr-reject" style="border:1px solid rgba(239,68,68,0.45);background:rgba(239,68,68,0.15);color:#fca5a5;border-radius:8px;padding:5px 8px;cursor:pointer;">✗ Reject</button>
    </div>`;

  card.querySelector('.btn-jr-accept').addEventListener('click', () => {
    socket.emit('host:approve_join', { socketId });
    card.remove();
    if (!list.hasChildNodes()) banner.style.display = 'none';
  });

  card.querySelector('.btn-jr-reject').addEventListener('click', () => {
    socket.emit('host:reject_join', { socketId });
    card.remove();
    if (!list.hasChildNodes()) banner.style.display = 'none';
  });

  list.appendChild(card);
  banner.style.display = '';
});

/** PLAYER: Host disconnected */
socket.on('room:closed', ({ message }) => {
  clearGameSession();
  stopClientTimer();
  document.getElementById('room-closed-msg').textContent = message;
  showView('view-room-closed');
});

// ─────────────────────────────────────────────
// QR Auto-fill: runs LAST so state & showView are fully declared
// If URL has ?pin=XXXXXX (from QR scan), skip home and go straight
// to the player join view with PIN pre-filled.
// If URL has ?quiz=... (from the host's share QR), skip home too —
// the QR is only shared with players, so the host choice is irrelevant.
// If URL has ?quiz=...&mode=host, skip home and go directly to host mode
// ─────────────────────────────────────────────
(function () {
  const params = new URLSearchParams(window.location.search);
  const pinFromUrlRaw = params.get('pin');
  const pinFromUrl = normalizePin(pinFromUrlRaw);
  const pathView = getViewForPath(window.location.pathname);
  const scanFallbackBanner = document.getElementById('scan-fallback-banner');

  // Question-only mode: hide diagnostics/debug UI and wait for mirrored questions
  if (isQuestionOnly) {
    document.body.classList.add('question-only');
    const diag = document.getElementById('diag-panel');
    if (diag) diag.style.display = 'none';
    const dbg = document.getElementById('inline-dbg');
    if (dbg) dbg.style.display = 'none';

    if (questionMirror) {
      questionMirror.addEventListener('message', (ev) => {
        const msg = ev?.data;
        if (!msg || !msg.type) return;
        if (questionOnlyMode === 'host' && msg.type === 'hostQuestion') {
          try { renderHostQuestion(msg.payload); } catch (_e) {}
        }
        if (questionOnlyMode === 'player' && msg.type === 'playerQuestion') {
          try { renderPlayerQuestion(msg.payload); } catch (_e) {}
        }
      });
    }

    // Show the locked view immediately (content will update via mirror)
    showView(questionOnlyMode === 'host' ? 'view-host-question' : 'view-player-question');
    return;
  }

  if (scanFallbackBanner) {
    scanFallbackBanner.style.display = 'block';
  }

  if (pinFromUrl) {
    state.role = 'player';
    document.getElementById('input-pin').value = pinFromUrl;
    if (scanFallbackBanner) scanFallbackBanner.style.display = 'none';
    showView('view-player-join', { replaceHistory: true });
  } else if (pathView === 'view-player-join') {
    state.role = 'player';
    if (scanFallbackBanner) scanFallbackBanner.style.display = 'none';
    showView('view-player-join', { replaceHistory: true });
  } else if (pathView === 'view-host-loading' || pathView === 'view-host-lobby') {
    startHostLaunch(quizSlugFromUrl || null);
  } else if (pathView && pathView !== 'view-home') {
    showView(pathView, { replaceHistory: true });
  } else if (isAutoHostLaunch) {
    // Clicked Play from admin — go directly to branded loading, then host lobby
    startHostLaunch(quizSlugFromUrl);
  } else if (quizSlugFromUrl) {
    // Came from a quiz QR code — host is already set up, go straight to player join
    state.role = 'player';
    if (scanFallbackBanner) {
      scanFallbackBanner.style.display = 'none';
    }
    showView('view-player-join', { replaceHistory: true });
  } else {
    // Check for a saved game session and try to reconnect
    const savedSession = localStorage.getItem('quizSession');
    if (savedSession) {
      try {
        const { pin, playerId: savedPlayerId } = JSON.parse(savedSession);
        const normalizedSavedPin = normalizePin(pin);
        if (normalizedSavedPin && savedPlayerId) {
          rejoinAttempt = true;
          state.role = 'player';
          state.pin = normalizedSavedPin;
          setConnectionStatus('warn', 'Reconnecting to game…');
          const attemptRejoin = () => {
            socket.emit('player:rejoin', { pin: normalizedSavedPin, playerId: savedPlayerId });
          };
          if (socket.connected) {
            attemptRejoin();
          } else {
            socket.once('connect', attemptRejoin);
          }
          return; // wait for room:rejoined or room:rejoin_failed
        }
      } catch (_e) {
        clearGameSession();
      }
    }
  }
})();

if (!document.querySelector('.view.active')) {
  showView('view-home');
  updateDiagnose({ event: 'startup:view_recovered', error: 'Recovered from empty active view' });
}

//  v54 debug surface 
window._qState = state;
window._renderHostQuestion = renderHostQuestion;
window._renderPlayerQuestion = renderPlayerQuestion;
window._showView = showView;
console.log('[game.js v56] Debug surface ready: window._qState, window._renderHostQuestion');
