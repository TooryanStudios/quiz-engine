'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const config = require('../config');
const { admin, getFirestore } = require('./firebaseAdmin');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const paymentsMode = process.env.PAYMENTS_MODE || 'mock';

let firestore = null;
function getDbSafe() {
  if (firestore) return firestore;
  try {
    firestore = getFirestore();
  } catch (_err) {
    firestore = null;
  }
  return firestore;
}

async function grantPackEntitlement(userId, packId, plan = 'subscription') {
  const db = getDbSafe();
  if (!db || !userId || !packId) return false;

  await db.collection('entitlements').doc(userId).set(
    {
      activePackIds: admin.firestore.FieldValue.arrayUnion(packId),
      plan,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return true;
}

async function revokePackEntitlement(userId, packId) {
  const db = getDbSafe();
  if (!db || !userId || !packId) return false;

  await db.collection('entitlements').doc(userId).set(
    {
      activePackIds: admin.firestore.FieldValue.arrayRemove(packId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return true;
}

// Recorded once at process startup — shown on the home screen
const BUILD_TIME = new Date().toLocaleString('en-GB', {
  year: 'numeric', month: 'short', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false, timeZoneName: 'short',
});

const QUIZ_DATA_URL =
  process.env.QUIZ_DATA_URL || `https://${config.DOMAIN}/api/quiz-data`;

// ─────────────────────────────────────────────
// Express + HTTP server
// ─────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint (used by Render.com)
app.get('/health', (_req, res) => {
  const firestoreReady = Boolean(getDbSafe());
  res.json({ status: 'ok', paymentsMode, firestoreReady });
});

// Build info endpoint — returns server start time for the home screen version badge
app.get('/api/build-info', (_req, res) => res.json({ buildTime: BUILD_TIME }));

// Stripe checkout session (subscription)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Stripe webhook — verifies signature and updates Firebase entitlements
app.post('/api/stripe/webhook', async (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(501).json({
      message: 'Stripe webhook is not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
    });
  }

  const signature = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
  } catch (err) {
    return res.status(400).json({ message: `Webhook signature error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.uid;
      const packId = session.metadata?.packId;

      await grantPackEntitlement(userId, packId, 'subscription');
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.uid;
      const packId = subscription.metadata?.packId;

      await revokePackEntitlement(userId, packId);
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Webhook handler failed' });
  }
});

app.use(express.json());

// Mock purchase endpoint for PoC mode (no real charge)
app.post('/api/payments/mock-purchase', async (req, res) => {
  try {
    const { uid, packId } = req.body || {};
    if (!uid || !packId) {
      return res.status(400).json({ message: 'uid and packId are required' });
    }

    const granted = await grantPackEntitlement(uid, packId, 'mock');
    if (!granted) {
      return res.status(503).json({
        message: 'Firestore is not ready. Create Firestore Database and configure Firebase Admin env vars first.',
      });
    }

    return res.json({
      success: true,
      mode: 'mock',
      message: 'Mock purchase completed. Access granted.',
      uid,
      packId,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Mock purchase failed' });
  }
});

// Stripe checkout session (subscription)
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  if (paymentsMode === 'mock') {
    try {
      const { uid, packId } = req.body || {};
      if (uid && packId) {
        const granted = await grantPackEntitlement(uid, packId, 'mock');
        if (!granted) {
          return res.status(503).json({
            message: 'Firestore is not ready. Create Firestore Database and configure Firebase Admin env vars first.',
          });
        }
      }

      return res.json({
        mode: 'mock',
        simulated: true,
        url: `https://${config.DOMAIN}/billing/success?mode=mock`,
        message: 'Mock mode enabled. No real payment was processed.',
      });
    } catch (err) {
      return res.status(500).json({ message: err.message || 'Mock checkout failed' });
    }
  }

  if (!stripe) {
    return res.status(501).json({
      message: 'Stripe is not configured. Set STRIPE_SECRET_KEY.',
    });
  }

  try {
    const { priceId, uid, packId } = req.body || {};
    if (!priceId) return res.status(400).json({ message: 'priceId is required' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `https://${config.DOMAIN}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${config.DOMAIN}/billing/cancel`,
      allow_promotion_codes: true,
      metadata: {
        uid: uid || '',
        packId: packId || '',
      },
    });

    return res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Stripe checkout failed' });
  }
});

// ─────────────────────────────────────────────
// Socket.io setup with CORS
// ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: config.CORS_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

// ─────────────────────────────────────────────
// Quiz Questions — Arabic, mixed types
//   single  → pick one option              (correctIndex)
//   multi   → pick ALL correct options     (correctIndices[])
//   match   → connect left→right pairs     (pairs[]{left,right})
//   order   → drag to correct sequence     (items[], correctOrder[])
// ─────────────────────────────────────────────
const DEFAULT_QUESTIONS = [
  // ── Single choice ──────────────────────────
  {
    type: 'single',
    text: 'ما هي عاصمة فرنسا؟',
    options: ['برلين', 'مدريد', 'باريس', 'روما'],
    correctIndex: 2,
    duration: 20,
  },
  {
    type: 'single',
    text: 'كم عدد الكواكب في المجموعة الشمسية؟',
    options: ['٧', '٨', '٩', '١٠'],
    correctIndex: 1,
    duration: 20,
  },
  {
    type: 'single',
    text: 'ما الرمز الكيميائي للذهب؟',
    options: ['Fe', 'Au', 'Ag', 'Cu'],
    correctIndex: 1,
    duration: 25,
  },
  {
    type: 'single',
    text: 'ما أكبر محيطات الأرض؟',
    options: ['الأطلسي', 'الهندي', 'القطبي الشمالي', 'الهادئ'],
    correctIndex: 3,
    duration: 20,
  },
  {
    type: 'single',
    text: 'أي لغة برمجة تُعرف بـ"لغة الإنترنت"؟',
    options: ['Python', 'Java', 'JavaScript', 'C++'],
    correctIndex: 2,
    duration: 20,
  },
  // ── Multi-select ───────────────────────────
  {
    type: 'multi',
    text: 'أي من هذه الحيوانات ثدييات؟\n(اختر كل الإجابات الصحيحة)',
    options: ['الدلفين', 'التمساح', 'الحوت', 'السلحفاة'],
    correctIndices: [0, 2],
    duration: 30,
  },
  {
    type: 'multi',
    text: 'أي من هذه الدول تقع في قارة أفريقيا؟\n(اختر كل الإجابات الصحيحة)',
    options: ['المغرب', 'البرازيل', 'نيجيريا', 'الأرجنتين'],
    correctIndices: [0, 2],
    duration: 30,
  },
  // ── Match / Connect ────────────────────────
  {
    type: 'match',
    text: 'طابق كل دولة بعاصمتها',
    pairs: [
      { left: 'فرنسا',    right: 'باريس'     },
      { left: 'اليابان',  right: 'طوكيو'     },
      { left: 'البرازيل', right: 'برازيليا'  },
      { left: 'مصر',      right: 'القاهرة'   },
    ],
    duration: 45,
  },
  {
    type: 'match',
    text: 'طابق كل مخترع باختراعه',
    pairs: [
      { left: 'الهاتف',            right: 'غراهام بيل'       },
      { left: 'المصباح الكهربائي', right: 'توماس إديسون'     },
      { left: 'الطائرة',           right: 'الأخوان رايت'     },
      { left: 'الراديو',           right: 'غوليلمو ماركوني'  },
    ],
    duration: 45,
  },
  // ── Order / Sort ───────────────────────────
  {
    type: 'order',
    text: 'رتب هذه الكواكب من الأقرب إلى الأبعد عن الشمس',
    // displayed scrambled; correctOrder = indices of items in the right sequence
    items: ['المريخ', 'عطارد', 'الزهرة', 'الأرض'],
    correctOrder: [1, 2, 3, 0], // عطارد، الزهرة، الأرض، المريخ
    duration: 40,
  },
  {
    type: 'order',
    text: 'رتب هذه الأحداث التاريخية من الأقدم إلى الأحدث',
    items: ['الثورة الفرنسية', 'اكتشاف أمريكا', 'الحرب العالمية الثانية', 'هبوط الإنسان على القمر'],
    correctOrder: [1, 0, 2, 3], // 1492، 1789، 1939-45، 1969
    duration: 40,
  },
];

let QUESTIONS = DEFAULT_QUESTIONS;

// Quiz data endpoint — used by remote fetch
app.get('/api/quiz-data', (_req, res) => res.json({ questions: QUESTIONS }));

// ─────────────────────────────────────────────
// Local IP detection + mode state
// ─────────────────────────────────────────────
function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

const localIp = getLocalIp();
let activeMode = 'global';

function getJoinBaseUrl(mode) {
  if (mode === 'local' && localIp) {
    return `http://${localIp}:${config.PORT}`;
  }
  return `https://${config.DOMAIN}`;
}

async function buildRoomModePayload(room) {
  let mode = room.mode || activeMode;
  if (mode === 'local' && !localIp) {
    mode = 'global';
    room.mode = 'global';
  }
  const joinUrl = `${getJoinBaseUrl(mode)}/?pin=${room.pin}`;
  let qrSvg = '';
  try {
    qrSvg = await QRCode.toString(joinUrl, {
      type: 'svg',
      margin: 1,
      width: 200,
    });
  } catch (err) {
    console.warn('[QR] Failed to generate SVG', err.message);
  }

  return {
    mode,
    joinUrl,
    qrSvg,
    localIp,
    localIpAvailable: Boolean(localIp),
    warning: localIp ? '' : 'No LAN IP detected. Defaulting to Global mode.',
  };
}

// ─────────────────────────────────────────────
// Hybrid data fetching
// ─────────────────────────────────────────────
function normalizeQuestionsPayload(data, quizSlug) {
  if (!data) return null;

  if (Array.isArray(data) && data.length > 0) {
    if (data[0]?.type) return data;
    if (data[0]?.questions) {
      const match = quizSlug ? data.find((q) => q.slug === quizSlug) : data[0];
      return Array.isArray(match?.questions) ? match.questions : null;
    }
  }

  if (Array.isArray(data.questions) && data.questions.length > 0) {
    if (data.questions[0]?.type) return data.questions;
    if (data.questions[0]?.questions) {
      const match = quizSlug ? data.questions.find((q) => q.slug === quizSlug) : data.questions[0];
      return Array.isArray(match?.questions) ? match.questions : null;
    }
  }

  if (Array.isArray(data.quizzes) && data.quizzes.length > 0) {
    const match = quizSlug ? data.quizzes.find((q) => q.slug === quizSlug) : data.quizzes[0];
    return Array.isArray(match?.questions) ? match.questions : null;
  }

  if (data.quiz && Array.isArray(data.quiz.questions)) {
    return data.quiz.questions;
  }

  return null;
}

async function getQuizData(quizSlug) {
  try {
    const url = new URL(QUIZ_DATA_URL);
    if (quizSlug) url.searchParams.set('slug', quizSlug);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const questions = normalizeQuestionsPayload(data, quizSlug);
    if (!Array.isArray(questions) || questions.length === 0) return null;
    return questions;
  } catch (err) {
    console.warn('[Quiz] Remote fetch failed, using local questions.', err.message);
    return null;
  }
}

async function refreshQuestions(quizSlug) {
  const remote = await getQuizData(quizSlug);
  if (remote) QUESTIONS = remote;
  else QUESTIONS = DEFAULT_QUESTIONS;
}

// Prefetch on startup (best-effort)
void refreshQuestions();

// ─────────────────────────────────────────────
// In-Memory Room State
// rooms: Map<pin, RoomObject>
// ─────────────────────────────────────────────
const rooms = new Map();

/**
 * Room structure:
 * {
 *   pin, hostSocketId, state, mode, questionIndex, questionTimer, questionStartTime,
 *   questionDuration, paused, pausedTimeRemaining,
 *   players: Map<socketId, { id, nickname, score, streak, maxStreak,
 *                            currentAnswer, answerTime }>
 * }
 */

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Generate a random N-digit PIN string that is not already in use. */
function generatePIN() {
  const len = config.GAME.PIN_LENGTH;
  let pin;
  do {
    pin = Math.floor(Math.random() * Math.pow(10, len))
      .toString()
      .padStart(len, '0');
  } while (rooms.has(pin));
  return pin;
}

/** Return a safe player list (array) suitable for broadcasting. */
function getPlayerList(room) {
  return Array.from(room.players.values()).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    score: p.score,
    streak: p.streak,
  }));
}

/** Build a leaderboard payload for game:over. */
function buildLeaderboard(room) {
  return Array.from(room.players.values())
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      totalScore: p.score,
      streak: p.streak,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}

/** Find the room owned by a given host socket. */
function findHostRoom(hostSocketId) {
  return Array.from(rooms.values()).find((r) => r.hostSocketId === hostSocketId) || null;
}

/**
 * Binary score (single / multi): full points or zero.
 * Streak bonus: +100 per consecutive correct (max +500 for 5+)
 */
function calculateScore(timeTakenSec, isCorrect, streak, duration) {
  if (!isCorrect) return 0;
  const total = duration || config.GAME.QUESTION_DURATION_SEC;
  const ratio = Math.min(timeTakenSec, total) / total;
  const base = Math.round(1000 * (1 - ratio * 0.5));
  const streakBonus = Math.min(streak, 5) * 100;
  return base + streakBonus;
}

/**
 * Partial-credit score (match / order): fraction [0..1] of correct items.
 * Streak bonus only applied when fraction === 1 (fully correct).
 */
function calculatePartialScore(timeTakenSec, fraction, streak, duration) {
  if (fraction <= 0) return 0;
  const total = duration || config.GAME.QUESTION_DURATION_SEC;
  const ratio = Math.min(timeTakenSec, total) / total;
  const base = Math.round(1000 * (1 - ratio * 0.5) * fraction);
  const streakBonus = fraction === 1 ? Math.min(streak, 5) * 100 : 0;
  return base + streakBonus;
}

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────

/** Broadcast the current question to all sockets in a room. */
function sendQuestion(room) {
  const q = QUESTIONS[room.questionIndex];
  const duration = q.duration || config.GAME.QUESTION_DURATION_SEC;
  room.currentQuestionMeta = null;

  // Build the client-safe question payload (never send answer keys)
  const questionPayload = { type: q.type, text: q.text };

  if (q.type === 'single' || q.type === 'multi') {
    questionPayload.options = q.options;

  } else if (q.type === 'match') {
    // Shuffle right items; store shuffle map so endQuestion can score
    const n = q.pairs.length;
    const rightOrder = Array.from({ length: n }, (_, i) => i); // rightOrder[displayIdx] = originalPairIdx
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rightOrder[i], rightOrder[j]] = [rightOrder[j], rightOrder[i]];
    }
    room.currentQuestionMeta = { rightOrder };
    questionPayload.lefts  = q.pairs.map(p => p.left);
    questionPayload.rights = rightOrder.map(i => q.pairs[i].right); // shuffled

  } else if (q.type === 'order') {
    questionPayload.items = q.items; // displayed in stored (scrambled) order
  }

  io.to(room.pin).emit('game:question', {
    questionIndex: room.questionIndex,
    total: QUESTIONS.length,
    question: questionPayload,
    duration,
  });

  room.questionStartTime = Date.now();
  room.questionDuration  = duration;
  room.state  = 'question';
  room.paused = false;
  room.pausedTimeRemaining = 0;

  room.questionTimer = setTimeout(() => {
    endQuestion(room);
  }, duration * 1000);
}

/** End a question: reveal answer, compute scores, show leaderboard. */
function endQuestion(room) {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }

  room.state = 'leaderboard';

  const q        = QUESTIONS[room.questionIndex];
  const duration = room.questionDuration || config.GAME.QUESTION_DURATION_SEC;

  // ── Compute per-player round scores ──────────────────────────────────
  const roundScores = [];

  room.players.forEach((player) => {
    const answer      = player.currentAnswer;
    const timeTaken   = player.answerTime;
    let   isCorrect   = false;
    let   roundScore  = 0;

    if (q.type === 'single') {
      isCorrect = answer && answer.answerIndex === q.correctIndex;
      if (isCorrect) { player.streak++; player.maxStreak = Math.max(player.maxStreak, player.streak); }
      else             player.streak = 0;
      roundScore = calculateScore(timeTaken, isCorrect, player.streak, duration);

    } else if (q.type === 'multi') {
      const submitted = [...(answer?.answerIndices || [])].sort((a, b) => a - b);
      const correct   = [...q.correctIndices].sort((a, b) => a - b);
      isCorrect = submitted.length === correct.length && submitted.every((v, i) => v === correct[i]);
      if (isCorrect) { player.streak++; player.maxStreak = Math.max(player.maxStreak, player.streak); }
      else             player.streak = 0;
      roundScore = calculateScore(timeTaken, isCorrect, player.streak, duration);

    } else if (q.type === 'match') {
      const submitted  = answer?.matches || [];
      const rightOrder = room.currentQuestionMeta?.rightOrder || [];
      let   correct    = 0;
      for (let i = 0; i < q.pairs.length; i++) {
        if (submitted[i] !== undefined && rightOrder[submitted[i]] === i) correct++;
      }
      const fraction  = correct / q.pairs.length;
      isCorrect       = fraction === 1;
      if (isCorrect) { player.streak++; player.maxStreak = Math.max(player.maxStreak, player.streak); }
      else             player.streak = 0;
      roundScore = calculatePartialScore(timeTaken, fraction, player.streak, duration);

    } else if (q.type === 'order') {
      const submitted = answer?.order || [];
      let   correct   = 0;
      q.correctOrder.forEach((itemIdx, pos) => {
        if (submitted[pos] === itemIdx) correct++;
      });
      const fraction  = correct / q.items.length;
      isCorrect       = fraction === 1;
      if (isCorrect) { player.streak++; player.maxStreak = Math.max(player.maxStreak, player.streak); }
      else             player.streak = 0;
      roundScore = calculatePartialScore(timeTaken, fraction, player.streak, duration);
    }

    player.score += roundScore;
    roundScores.push({
      id: player.id,
      nickname: player.nickname,
      roundScore,
      totalScore: player.score,
      isCorrect,
      streak: player.streak,
    });

    // Reset for next question
    player.currentAnswer = null;
    player.answerTime    = duration;
  });

  // Sort highest score first
  roundScores.sort((a, b) => b.totalScore - a.totalScore);

  // ── Build correct-answer reveal payload ──────────────────────────────
  const correctReveal = { questionType: q.type, roundScores };

  if (q.type === 'single') {
    correctReveal.correctIndex  = q.correctIndex;
    correctReveal.correctOption = q.options[q.correctIndex];

  } else if (q.type === 'multi') {
    correctReveal.correctIndices = q.correctIndices;
    correctReveal.correctOptions = q.correctIndices.map(i => q.options[i]);

  } else if (q.type === 'match') {
    correctReveal.correctPairs = q.pairs; // [{left, right}]

  } else if (q.type === 'order') {
    correctReveal.items        = q.items;
    correctReveal.correctOrder = q.correctOrder;
  }

  io.to(room.pin).emit('question:end', correctReveal);

  // ── Advance to leaderboard / next question ────────────────────────────
  setTimeout(() => {
    const leaderboard     = roundScores;
    const isLastQuestion  = room.questionIndex >= QUESTIONS.length - 1;

    if (isLastQuestion) {
      room.state = 'finished';
      io.to(room.pin).emit('game:over', { leaderboard });
    } else {
      io.to(room.pin).emit('game:leaderboard', { leaderboard, isFinal: false });
      setTimeout(() => {
        room.questionIndex++;
        sendQuestion(room);
      }, config.GAME.LEADERBOARD_DURATION_MS);
    }
  }, 2000);
}

// ─────────────────────────────────────────────
// Socket.io Event Handlers
// ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── HOST: Create a new room ──────────────────
  socket.on('host:create', async ({ quizSlug } = {}) => {
    const pin = generatePIN();

    const room = {
      pin,
      hostSocketId: socket.id,
      players: new Map(),
      state: 'lobby',
      mode: activeMode,
      quizSlug: quizSlug || null,
      questionIndex: 0,
      questionTimer: null,
      questionStartTime: 0,
      questionDuration: config.GAME.QUESTION_DURATION_SEC,
      paused: false,
      pausedTimeRemaining: 0,
    };

    rooms.set(pin, room);
    socket.join(pin);

    console.log(`[Room] Created: PIN=${pin} by host=${socket.id}`);
    const modePayload = await buildRoomModePayload(room);
    socket.emit('room:created', { pin, ...modePayload });
  });

  // ── PLAYER: Join a room ──────────────────────
  socket.on('player:join', ({ pin, nickname }) => {
    const room = rooms.get(pin);

    // Room not found
    if (!room) {
      socket.emit('room:error', { message: `No room found with PIN: ${pin}` });
      return;
    }

    // *** Late Joiner Handling ***
    // If the game has already started, reject the player.
    if (room.state !== 'lobby') {
      socket.emit('room:error', {
        message: 'Game already in progress. Please wait for the next round.',
      });
      return;
    }

    // Duplicate nickname check
    const nameTaken = Array.from(room.players.values()).some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (nameTaken) {
      socket.emit('room:error', { message: 'That nickname is already taken.' });
      return;
    }

    // Add player to room
    const player = {
      id: socket.id,
      nickname: nickname.trim(),
      score: 0,
      streak: 0,
      maxStreak: 0,
      currentAnswer: null,          // generic — set when player submits
      answerTime: config.GAME.QUESTION_DURATION_SEC,
    };
    room.players.set(socket.id, player);
    socket.join(pin);

    // Tag the socket with its room PIN for disconnect cleanup
    socket.data.pin = pin;
    socket.data.isHost = false;

    console.log(`[Room ${pin}] Player joined: ${nickname} (${socket.id})`);

    // Confirm to the joining player
    socket.emit('room:joined', {
      pin,
      nickname: player.nickname,
      players: getPlayerList(room),
    });

    // Notify everyone in the room (including host) about the updated player list
    io.to(pin).emit('room:player_joined', {
      players: getPlayerList(room),
    });
  });

  // ── HOST: Start the game ─────────────────────
  socket.on('host:start', async () => {
    // Find the room this host owns
    const room = Array.from(rooms.values()).find(
      (r) => r.hostSocketId === socket.id
    );

    if (!room) {
      socket.emit('room:error', { message: 'Room not found.' });
      return;
    }

    if (room.players.size === 0) {
      socket.emit('room:error', { message: 'Need at least one player to start.' });
      return;
    }

    if (room.state !== 'lobby') {
      socket.emit('room:error', { message: 'Game already started.' });
      return;
    }

    console.log(`[Room ${room.pin}] Game started by host ${socket.id}`);

    // Always refresh quiz data from the cloud before starting
    await refreshQuestions(room.quizSlug);

    // Broadcast game start to everyone in the room
    io.to(room.pin).emit('game:start', {
      totalQuestions: QUESTIONS.length,
    });

    // Small delay before first question (let clients animate into game view)
    setTimeout(() => {
      sendQuestion(room);
    }, 1500);
  });

  // ── HOST: Set connection mode (local/global) ─
  socket.on('host:mode:set', async ({ mode }) => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'lobby') return;

    if (mode === 'local' && !localIp) {
      room.mode = 'global';
    } else {
      room.mode = mode === 'local' ? 'local' : 'global';
    }

    activeMode = room.mode;

    const payload = await buildRoomModePayload(room);
    io.to(room.pin).emit('room:mode', payload);
  });

  // ── HOST: Pause the game ─────────────────────
  socket.on('host:pause', () => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'question' || room.paused) return;

    room.paused = true;
    const elapsed = Date.now() - room.questionStartTime;
    const durMs   = (room.questionDuration || config.GAME.QUESTION_DURATION_SEC) * 1000;
    room.pausedTimeRemaining = Math.max(0, durMs - elapsed);
    clearTimeout(room.questionTimer);
    room.questionTimer = null;

    console.log(`[Room ${room.pin}] Paused. ${Math.ceil(room.pausedTimeRemaining / 1000)}s remaining.`);
    io.to(room.pin).emit('game:paused', {
      timeRemaining: Math.ceil(room.pausedTimeRemaining / 1000),
    });
  });

  // ── HOST: Resume the game ────────────────────
  socket.on('host:resume', () => {
    const room = findHostRoom(socket.id);
    if (!room || !room.paused) return;

    room.paused = false;
    const durMs = (room.questionDuration || config.GAME.QUESTION_DURATION_SEC) * 1000;
    room.questionStartTime = Date.now() - (durMs - room.pausedTimeRemaining);
    room.questionTimer = setTimeout(() => endQuestion(room), room.pausedTimeRemaining);

    console.log(`[Room ${room.pin}] Resumed. ${Math.ceil(room.pausedTimeRemaining / 1000)}s remaining.`);
    io.to(room.pin).emit('game:resumed', {
      timeRemaining: Math.ceil(room.pausedTimeRemaining / 1000),
    });
  });

  // ── HOST: Skip current question ──────────────
  socket.on('host:skip', () => {
    const room = findHostRoom(socket.id);
    if (!room || (room.state !== 'question' && !room.paused)) return;
    console.log(`[Room ${room.pin}] Question skipped by host.`);
    endQuestion(room);
  });

  // ── HOST: Kick a player from the lobby ───────
  socket.on('host:kick', ({ playerId }) => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'lobby') return;

    const player = room.players.get(playerId);
    if (!player) return;

    room.players.delete(playerId);

    const playerSocket = io.sockets.sockets.get(playerId);
    if (playerSocket) {
      playerSocket.emit('room:kicked', {
        message: 'You were removed from the room by the host.',
      });
      playerSocket.leave(room.pin);
    }

    console.log(`[Room ${room.pin}] Kicked player: ${player.nickname}`);
    io.to(room.pin).emit('room:player_joined', { players: getPlayerList(room) });
  });

  // ── PLAYER: Submit an answer ─────────────────
  socket.on('player:answer', ({ questionIndex, answer }) => {
    const pin = socket.data.pin;
    if (!pin) return;

    const room = rooms.get(pin);
    if (!room || room.state !== 'question') return;

    if (questionIndex !== room.questionIndex) return;

    const player = room.players.get(socket.id);
    if (!player) return;

    // Ignore if already answered
    if (player.currentAnswer !== null) return;

    const timeTakenSec = (Date.now() - room.questionStartTime) / 1000;
    player.currentAnswer = answer;
    player.answerTime    = timeTakenSec;

    socket.emit('answer:received', { answer });

    // Notify host with live counter
    const answeredCount = Array.from(room.players.values()).filter(p => p.currentAnswer !== null).length;
    const hostSocket = io.sockets.sockets.get(room.hostSocketId);
    if (hostSocket) {
      hostSocket.emit('question:answer_update', { answered: answeredCount, total: room.players.size });
    }

    // Auto-end when everyone has answered
    if (answeredCount === room.players.size) {
      endQuestion(room);
    }
  });

  // ── DISCONNECT ───────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
    const pin = socket.data.pin;

    if (pin) {
      const room = rooms.get(pin);
      if (room) {
        room.players.delete(socket.id);

        if (room.state === 'lobby') {
          // Notify remaining players about updated list
          io.to(pin).emit('room:player_joined', {
            players: getPlayerList(room),
          });
        }
      }
      return;
    }

    // Host disconnected — find and destroy the room
    const hostedRoom = Array.from(rooms.values()).find(
      (r) => r.hostSocketId === socket.id
    );
    if (hostedRoom) {
      console.log(`[Room ${hostedRoom.pin}] Host disconnected. Closing room.`);
      if (hostedRoom.questionTimer) clearTimeout(hostedRoom.questionTimer);

      if (hostedRoom.state && hostedRoom.state !== 'lobby') {
        hostedRoom.state = 'finished';
        const leaderboard = buildLeaderboard(hostedRoom);
        io.to(hostedRoom.pin).emit('game:over', { leaderboard });
      } else {
        io.to(hostedRoom.pin).emit('room:closed', {
          message: 'The host has disconnected. The game has ended.',
        });
      }

      // Remove all sockets from the Socket.io room after a short delay
      setTimeout(() => {
        io.socketsLeave(hostedRoom.pin);
        rooms.delete(hostedRoom.pin);
      }, 500);
    }
  });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
httpServer.listen(config.PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║       Quiz Engine Server             ║
  ║  Listening on port ${config.PORT}           ║
  ║  Domain: ${config.DOMAIN}  ║
  ╚══════════════════════════════════════╝
  `);
});
