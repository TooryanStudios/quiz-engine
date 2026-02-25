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

// Ensure UTF-8 encoding for all text responses
app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    res.set('Content-Type', 'application/json; charset=utf-8');
    return originalJson.call(this, data);
  };
  next();
});

// Serve static frontend files
// Prevent caching of HTML pages so users always get the latest version
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Content-Type', 'text/html; charset=utf-8');
  }
  next();
});
app.use(express.static(path.join(__dirname, '../public')));

const spaEntryFile = path.join(__dirname, '../public/index.html');
const clientRoutes = [
  '/player',
  '/start',
  '/lobby',
  '/player/lobby',
  '/question',
  '/leaderboard',
  '/game-over',
  '/room-closed',
];

app.get(clientRoutes, (_req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(spaEntryFile);
});

// Health check endpoint (used by Render.com)
app.get('/health', (_req, res) => {
  const db = getDbSafe();
  const firestoreReady = Boolean(db);
  res.json({ status: 'ok', paymentsMode, firestoreReady, firebaseProjectId: process.env.FIREBASE_PROJECT_ID || null });
});

// Build info endpoint — returns server start time for the home screen version badge
app.get('/api/build-info', (_req, res) => res.json({ buildTime: BUILD_TIME }));

// Diagnostic endpoint — test quiz loading
app.get('/api/quiz-diagnostic/:slug', async (req, res) => {
  const slug = req.params.slug;
  console.log(`[Diagnostic] Testing quiz load for slug="${slug}"`);
  
  const result = await getQuizData(slug);
  
  res.json({
    slug,
    success: result !== null,
    questionsCount: result?.questions?.length || 0,
    preset: result?.challengePreset || 'classic',
    message: result 
      ? `✓ Loaded ${result.questions.length} questions`
      : '✗ Quiz not found or failed to load'
  });
});

// Quiz info endpoint — returns title + question count only (lightweight)
// Also returns media URLs for preloading during lobby
app.get('/api/quiz-info/:slug', async (req, res) => {
  const slug = req.params.slug;
  try {
    const db = getDbSafe();
    if (db) {
      let data = null;
      // Try direct doc ID lookup first
      const docSnap = await db.collection('quizzes').doc(slug).get();
      if (docSnap.exists) {
        data = docSnap.data();
      } else {
        // Fall back to slug query
        const snap = await db.collection('quizzes').where('slug', '==', slug).limit(1).get();
        if (!snap.empty) data = snap.docs[0].data();
      }
      if (data) {
        const questions = data.questions || [];
        // Collect all media URLs for preloading
        const mediaAssets = [];
        questions.forEach((q, idx) => {
          if (q.media && q.media.type && q.media.type !== 'none' && q.media.url) {
            mediaAssets.push({ index: idx, type: q.media.type, url: q.media.url });
          }
        });
        return res.json({
          title: data.title || slug,
          questionCount: questions.length,
          mediaAssets,
        });
      }
    }
  } catch (err) {
    console.error('[quiz-info] Error:', err.message);
  }
  res.status(404).json({ error: 'Quiz not found' });
});

// Preview endpoint — view all quiz questions with answers (for testing/debugging)
app.get('/api/quiz-preview/:slug', async (req, res) => {
  const slug = req.params.slug;
  console.log(`[Preview] Loading full quiz for preview: slug="${slug}"`);
  
  const result = await getQuizData(slug);
  
  if (!result) {
    return res.status(404).json({
      error: 'Quiz not found',
      slug,
      suggestion: 'Check the slug and verify the quiz exists in Firestore'
    });
  }

  res.json({
    slug,
    preset: result.challengePreset || 'classic',
    totalQuestions: result.questions.length,
    questions: result.questions.map((q, idx) => ({
      index: idx + 1,
      type: q.type,
      text: q.text,
      ...(q.media && q.media.type && q.media.type !== 'none' && q.media.url ? { media: q.media } : {}),
      ...(q.type === 'single' || q.type === 'multi' || q.type === 'boss' ? {
        options: q.options,
        ...(q.type === 'single' && { correctAnswer: q.correctIndex ?? q.answer ?? q.answers }),
        ...(q.type === 'multi' && { correctAnswer: q.correctIndices ?? q.answers }),
      } : {}),
      ...(q.type === 'type' ? {
        acceptedAnswers: q.acceptedAnswers,
        inputPlaceholder: q.inputPlaceholder,
      } : {}),
      ...(q.type === 'match' ? {
        pairs: q.pairs,
      } : {}),
      ...(q.type === 'order' ? {
        items: q.items,
        correctOrder: q.correctOrder,
      } : {}),
      ...(q.type === 'boss' ? {
        boss: { name: q.bossName, hp: q.bossHp },
        correctAnswer: q.correctIndex ?? q.answer ?? q.answers,
      } : {}),
      duration: q.duration || config.GAME.QUESTION_DURATION_SEC,
    }))
  });
});

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
function isPrivateIpv4(ip) {
  if (!ip || typeof ip !== 'string') return false;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (!m) return false;
  const octet = Number(m[1]);
  return octet >= 16 && octet <= 31;
}

function getLocalIps() {
  const nets = os.networkInterfaces();
  const all = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      if (!isPrivateIpv4(net.address)) continue;
      all.push({ name, address: net.address });
    }
  }

  const rank = (name) => {
    const n = String(name).toLowerCase();
    if (/(wi-?fi|wlan|wireless|ethernet)/.test(n)) return 100;
    if (/(vethernet|virtual|vmware|hyper-v|docker|tailscale|vpn|loopback)/.test(n)) return 10;
    return 50;
  };

  all.sort((a, b) => rank(b.name) - rank(a.name));
  return all;
}

const localIpCandidates = getLocalIps();
const localIp = localIpCandidates[0]?.address || null;
let activeMode = 'global';

function normalizePublicBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const cleaned = rawUrl.trim().replace(/\/+$/, '');
  if (!cleaned) return null;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  return `https://${cleaned}`;
}

function resolveSocketPublicBaseUrl(socket) {
  const envBase = normalizePublicBaseUrl(process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL);
  if (envBase) return envBase;

  const forwardedProto = socket.handshake.headers['x-forwarded-proto'];
  const forwardedHost = socket.handshake.headers['x-forwarded-host'];
  if (forwardedHost) {
    const proto = typeof forwardedProto === 'string' && forwardedProto.length > 0
      ? forwardedProto.split(',')[0].trim()
      : 'https';
    const base = normalizePublicBaseUrl(`${proto}://${String(forwardedHost).split(',')[0].trim()}`);
    if (base) return base;
  }

  const origin = socket.handshake.headers.origin;
  const originBase = normalizePublicBaseUrl(origin);
  if (originBase) return originBase;

  const host = socket.handshake.headers.host;
  const hostBase = normalizePublicBaseUrl(host);
  if (hostBase) return hostBase;

  return normalizePublicBaseUrl(config.DOMAIN) || `https://${config.DOMAIN}`;
}

function getJoinBaseUrl(mode, room) {
  if (mode === 'local' && localIp) {
    return `http://${localIp}:${config.PORT}`;
  }
  return room.publicBaseUrl || normalizePublicBaseUrl(config.DOMAIN) || `https://${config.DOMAIN}`;
}

async function buildRoomModePayload(room) {
  let mode = room.mode || activeMode;
  if (mode === 'local' && !localIp) {
    mode = 'global';
    room.mode = 'global';
  }
  const joinUrl = `${getJoinBaseUrl(mode, room)}/player?pin=${room.pin}`;
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
    localIpCandidates,
    localIpAvailable: Boolean(localIp),
    warning: localIp
      ? (localIpCandidates.length > 1
        ? `Using LAN IP ${localIp}. If scan fails, use PIN manually or switch adapter.`
        : '')
      : 'No private LAN IP detected. Defaulting to Global mode.',
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
  console.log(`[Quiz] Attempting to load quiz: slug="${quizSlug}"`);
  
  // 1. Try Firestore first if a slug is given
  if (quizSlug) {
    try {
      const db = getDbSafe();
      if (db) {
        // 1a. Try direct document ID lookup first (fast)
        try {
          const docSnap = await db.collection('quizzes').doc(quizSlug).get();
          if (docSnap.exists) {
            const data = docSnap.data();
            if (Array.isArray(data.questions) && data.questions.length > 0) {
              console.log(`[Quiz] ✓ Loaded "${data.title}" by doc ID (${data.questions.length} Qs)`);
              return {
                title: data.title || null,
                questions: data.questions,
                challengePreset: data.challengePreset || 'classic',
                challengeSettings: data.challengeSettings || null,
              };
            }
          }
        } catch (_) { /* not a valid doc ID, fall through to slug query */ }

        // 1b. Fall back to slug query
        console.log(`[Quiz] Querying Firestore for slug="${quizSlug}"...`);
        const snap = await db.collection('quizzes')
          .where('slug', '==', quizSlug)
          .limit(1)
          .get();
        if (!snap.empty) {
          const data = snap.docs[0].data();
          if (Array.isArray(data.questions) && data.questions.length > 0) {
            console.log(`[Quiz] ✓ Loaded "${data.title}" (${data.questions.length} Qs) from Firestore`);
            return {
              title: data.title || null,
              questions: data.questions,
              challengePreset: data.challengePreset || 'classic',
              challengeSettings: data.challengeSettings || null,
            };
          } else {
            console.warn(`[Quiz] Firestore found document but no questions array`);
          }
        } else {
          console.warn(`[Quiz] Slug "${quizSlug}" not found in Firestore. (Check: is quiz published? Does slug match?)`);
        }
      } else {
        console.warn('[Quiz] Firestore database not available (check Firebase env vars)');
      }
    } catch (err) {
      console.error('[Quiz] Firestore fetch failed:', err.message);
    }
  } else {
    console.log('[Quiz] No slug provided, skipping Firestore lookup');
  }

  // If a specific quiz ID/slug was requested, do NOT fall back to generic HTTP data.
  // Returning null here ensures the host gets an explicit room:error instead of silently
  // starting a game with mock/demo questions.
  if (quizSlug) {
    console.warn('[Quiz] Explicit quiz requested but not found in Firestore; skipping HTTP fallback');
    return null;
  }

  // 2. Fall back to HTTP QUIZ_DATA_URL
  try {
    const url = new URL(QUIZ_DATA_URL);
    if (quizSlug) url.searchParams.set('slug', quizSlug);

    console.log(`[Quiz] Fetching from HTTP endpoint: ${url.toString()}`);
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const questions = normalizeQuestionsPayload(data, quizSlug);
    if (!Array.isArray(questions) || questions.length === 0) {
      console.warn('[Quiz] HTTP endpoint returned no valid questions');
      return null;
    }
    console.log(`[Quiz] ✓ Loaded ${questions.length} questions from HTTP endpoint`);
    return {
      questions,
      challengePreset: 'classic',
      challengeSettings: null,
    };
  } catch (err) {
    console.error('[Quiz] Remote fetch failed:', err.message);
    return null;
  }
}

async function refreshQuestions(quizSlug) {
  console.log(`[Quiz] Refreshing questions for slug="${quizSlug}"`);
  const remote = await getQuizData(quizSlug);
  const questions = remote?.questions || DEFAULT_QUESTIONS;
  const challengeSettings = resolveChallengeSettings(remote);
  // Also keep global QUESTIONS in sync for legacy callers
  QUESTIONS = questions;
  console.log(`[Quiz] Loaded ${questions.length} questions (preset: ${remote?.challengePreset || 'classic'})`);
  return {
    questions,
    challengePreset: remote?.challengePreset || 'classic',
    challengeSettings,
    randomizeQuestions: remote?.randomizeQuestions === true,
  };
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
 *                            currentAnswer, answerTime }>,
 *   kickedPlayers: Set<nicknameLowercase>  — prevents kicked players from auto-rejoining
 *   pendingJoinRequests: Map<socketId, { socketId, nickname, avatar, pin }>
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

function normalizePin(value) {
  if (value === null || value === undefined) return '';
  const maxLength = Number(config.GAME.PIN_LENGTH) || 6;
  const raw = String(value).trim();
  let normalized = '';
  for (const ch of raw) {
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
    if (normalized.length >= maxLength) break;
  }
  return normalized;
}

/** Return a safe player list (array) suitable for broadcasting.
 *  Disconnected players are excluded — they may still be in the Map
 *  during a 30-second rejoin window.
 */
function getPlayerList(room) {
  return Array.from(room.players.values())
    .filter((p) => !p.disconnected)
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar || '🎮',
      score: p.score,
      streak: p.streak,
      isHost: !!p.isHostPlayer,
    }));
}

/** Build a leaderboard payload for game:over. */
function buildLeaderboard(room) {
  return Array.from(room.players.values())
    .map((p) => ({
      id: p.id,
      nickname: p.nickname,
      avatar: p.avatar || '🎮',
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

const ROLE_PREVIEW_MS = 3000;
const ROLE_FREEZE_MS = 2000;
const ROLE_WRONG_PENALTY = 80;
const BOSS_TEAM_BONUS = 300;

const CHALLENGE_PRESETS = {
  easy: {
    rolePreviewMs: 4500,
    roleFreezeMs: 1500,
    wrongPenalty: 40,
    bossTeamBonus: 450,
    bossDamageMin: 14,
    bossDamageMax: 38,
    bossDamageDecay: 0.45,
  },
  classic: {
    rolePreviewMs: ROLE_PREVIEW_MS,
    roleFreezeMs: ROLE_FREEZE_MS,
    wrongPenalty: ROLE_WRONG_PENALTY,
    bossTeamBonus: BOSS_TEAM_BONUS,
    bossDamageMin: 10,
    bossDamageMax: 30,
    bossDamageDecay: 0.55,
  },
  hard: {
    rolePreviewMs: 2000,
    roleFreezeMs: 3000,
    wrongPenalty: 140,
    bossTeamBonus: 180,
    bossDamageMin: 7,
    bossDamageMax: 24,
    bossDamageDecay: 0.72,
  },
};

function getPresetSettings(name) {
  if (name === 'easy' || name === 'hard' || name === 'classic') {
    return { ...CHALLENGE_PRESETS[name] };
  }
  return { ...CHALLENGE_PRESETS.classic };
}

function resolveChallengeSettings(quizData) {
  const presetName = quizData?.challengePreset;
  const base = getPresetSettings(presetName);
  return {
    ...base,
    ...(quizData?.challengeSettings || {}),
  };
}

function normalizeTypedText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function isTypedAnswerCorrect(answer, acceptedAnswers) {
  const submitted = normalizeTypedText(answer?.textAnswer);
  if (!submitted) return false;
  const acceptedSet = new Set((acceptedAnswers || []).map(normalizeTypedText).filter(Boolean));
  return acceptedSet.has(submitted);
}

function calculateBossDamage(timeTakenSec, duration, settings) {
  const total = duration || config.GAME.QUESTION_DURATION_SEC;
  const ratio = Math.min(timeTakenSec, total) / total;
  const minDamage = Number(settings?.bossDamageMin ?? 10);
  const maxDamage = Number(settings?.bossDamageMax ?? 30);
  const decay = Number(settings?.bossDamageDecay ?? 0.55);
  const spread = Math.max(0, maxDamage - minDamage);
  const value = maxDamage - spread * ratio * (1 + decay * 0.2);
  return Math.max(minDamage, Math.round(value));
}

function shuffleArray(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function assignAsymmetricRoles(room) {
  const ids = shuffleArray(Array.from(room.players.keys()));
  const roles = {
    scholarId: room.enableScholarRole ? (ids[0] || null) : null,
    shieldId: ids[1] || null,
    saboteurId: ids[2] || null,
  };
  room.roles = roles;
  return roles;
}

function getRoleForPlayer(room, playerId) {
  if (!room?.roles || !playerId) return null;
  if (room.roles.scholarId === playerId) return 'scholar';
  if (room.roles.shieldId === playerId) return 'shield';
  if (room.roles.saboteurId === playerId) return 'saboteur';
  return null;
}

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────

/** Broadcast the current question to all sockets in a room. */
function sendQuestion(room) {
  const q = room.questions[room.questionIndex];
  const duration = q.duration || config.GAME.QUESTION_DURATION_SEC;
  const challengeSettings = room.challengeSettings || CHALLENGE_PRESETS.classic;
  room.currentQuestionMeta = {
    shieldTargetId: null,
    shieldActivatedBy: null,
    saboteurUsedBy: null,
    rightOrder: null,
  };
  room.answerOpenAt = Date.now();

  // Build the client-safe question payload (never send answer keys)
  const questionPayload = { type: q.type, text: q.text };

  // Include media if set
  if (q.media && q.media.type && q.media.type !== 'none' && q.media.url) {
    questionPayload.media = q.media;
  }

  if (q.type === 'single' || q.type === 'multi') {
    questionPayload.options = q.options;

  } else if (q.type === 'type') {
    questionPayload.inputPlaceholder = q.inputPlaceholder || 'Type your answer';

  } else if (q.type === 'match') {
    // Shuffle right items; store shuffle map so endQuestion can score
    const n = q.pairs.length;
    const rightOrder = Array.from({ length: n }, (_, i) => i); // rightOrder[displayIdx] = originalPairIdx
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rightOrder[i], rightOrder[j]] = [rightOrder[j], rightOrder[i]];
    }
    room.currentQuestionMeta.rightOrder = rightOrder;
    questionPayload.lefts  = q.pairs.map(p => p.left);
    questionPayload.rights = rightOrder.map(i => q.pairs[i].right); // shuffled

  } else if (q.type === 'order') {
    questionPayload.items = q.items; // displayed in stored (scrambled) order

  } else if (q.type === 'boss') {
    const bossHp = Math.max(1, Number(q.bossHp) || 100);
    room.currentQuestionMeta.bossName = q.bossName || 'Tooryan Boss';
    room.currentQuestionMeta.bossMaxHp = bossHp;
    room.currentQuestionMeta.bossRemainingHp = bossHp;
    room.currentQuestionMeta.bossDefeated = false;
    room.currentQuestionMeta.totalDamage = 0;
    questionPayload.options = q.options;
    questionPayload.boss = {
      name: room.currentQuestionMeta.bossName,
      maxHp: room.currentQuestionMeta.bossMaxHp,
      remainingHp: room.currentQuestionMeta.bossRemainingHp,
    };
  }

  // Store client-safe payload so reconnecting players can receive the current question
  room.currentQuestionPayload = { ...questionPayload };

  const dispatchQuestion = () => {
    io.to(room.pin).emit('game:question', {
      questionIndex: room.questionIndex,
      total: room.questions.length,
      question: questionPayload,
      duration,
      players: getPlayerList(room),
    });

    room.questionStartTime = Date.now();
    room.questionDuration  = duration;
    room.state  = 'question';
    room.paused = false;
    room.pausedTimeRemaining = 0;
    room.answerOpenAt = Date.now();

    room.questionTimer = setTimeout(() => {
      endQuestion(room);
    }, duration * 1000);
  };

  clearTimeout(room.previewTimer);
  room.previewTimer = null;

  const scholarId = room.roles?.scholarId;
  const scholarSocket = scholarId ? io.sockets.sockets.get(scholarId) : null;

  if (scholarSocket) {
    room.state = 'question-pending';
    scholarSocket.emit('game:question_preview', {
      questionIndex: room.questionIndex,
      total: room.questions.length,
      question: questionPayload,
      previewSeconds: Math.floor((challengeSettings.rolePreviewMs || ROLE_PREVIEW_MS) / 1000),
      duration,
    });
    room.previewTimer = setTimeout(() => {
      if (room.state !== 'question-pending') return;
      dispatchQuestion();
    }, challengeSettings.rolePreviewMs || ROLE_PREVIEW_MS);
  } else {
    dispatchQuestion();
  }
}

/** End a question: reveal answer, compute scores, show leaderboard. */
function endQuestion(room) {
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }
  if (room.previewTimer) {
    clearTimeout(room.previewTimer);
    room.previewTimer = null;
  }

  room.state = 'leaderboard';

  const q        = room.questions[room.questionIndex];
  const duration = room.questionDuration || config.GAME.QUESTION_DURATION_SEC;
  const challengeSettings = room.challengeSettings || CHALLENGE_PRESETS.classic;

  // ── Compute per-player round scores ──────────────────────────────────
  const roundScores = [];

  room.players.forEach((player) => {
    const answer      = player.currentAnswer;
    const timeTaken   = player.answerTime;
    let   isCorrect   = false;
    let   roundScore  = 0;
    let   penalty     = 0;

    if (q.type === 'single') {
      isCorrect = answer && answer.answerIndex === q.correctIndex;
      if (isCorrect) { player.streak++; player.maxStreak = Math.max(player.maxStreak, player.streak); }
      else             player.streak = 0;
      roundScore = calculateScore(timeTaken, isCorrect, player.streak, duration);

    } else if (q.type === 'type') {
      isCorrect = isTypedAnswerCorrect(answer, q.acceptedAnswers);
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

    } else if (q.type === 'boss') {
      isCorrect = answer && answer.answerIndex === q.correctIndex;
      if (isCorrect) { player.streak++; player.maxStreak = Math.max(player.maxStreak, player.streak); }
      else             player.streak = 0;
      roundScore = calculateScore(timeTaken, isCorrect, player.streak, duration);

      if (isCorrect && room.currentQuestionMeta) {
        const damage = calculateBossDamage(timeTaken, duration, challengeSettings);
        room.currentQuestionMeta.totalDamage += damage;
      }
    }

    if (!isCorrect && roundScore === 0) {
      const shielded = room.currentQuestionMeta?.shieldTargetId === player.id;
      penalty = shielded ? 0 : Number(challengeSettings.wrongPenalty || ROLE_WRONG_PENALTY);
    }

    player.score = Math.max(0, player.score + roundScore - penalty);
    roundScores.push({
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar || '🎮',
      roundScore,
      penalty,
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

  if (q.type === 'boss' && room.currentQuestionMeta) {
    const remainingHp = Math.max(0, room.currentQuestionMeta.bossMaxHp - room.currentQuestionMeta.totalDamage);
    room.currentQuestionMeta.bossRemainingHp = remainingHp;
    room.currentQuestionMeta.bossDefeated = remainingHp <= 0;

    if (room.currentQuestionMeta.bossDefeated) {
      const teamBonus = Number(challengeSettings.bossTeamBonus || BOSS_TEAM_BONUS);
      roundScores.forEach((entry) => {
        const p = room.players.get(entry.id);
        if (!p) return;
        p.score += teamBonus;
        entry.roundScore += teamBonus;
        entry.totalScore = p.score;
      });
    }
  }

  roundScores.sort((a, b) => b.totalScore - a.totalScore);

  // ── Build correct-answer reveal payload ──────────────────────────────
  const correctReveal = { questionType: q.type, roundScores };

  if (q.type === 'single') {
    correctReveal.correctIndex  = q.correctIndex;
    correctReveal.correctOption = q.options[q.correctIndex];

  } else if (q.type === 'type') {
    correctReveal.acceptedAnswers = q.acceptedAnswers || [];

  } else if (q.type === 'multi') {
    correctReveal.correctIndices = q.correctIndices;
    correctReveal.correctOptions = q.correctIndices.map(i => q.options[i]);

  } else if (q.type === 'match') {
    correctReveal.correctPairs = q.pairs; // [{left, right}]

  } else if (q.type === 'order') {
    correctReveal.items        = q.items;
    correctReveal.correctOrder = q.correctOrder;

  } else if (q.type === 'boss') {
    correctReveal.correctIndex  = q.correctIndex;
    correctReveal.correctOption = q.options[q.correctIndex];
    correctReveal.boss = {
      name: room.currentQuestionMeta?.bossName || q.bossName || 'Tooryan Boss',
      maxHp: room.currentQuestionMeta?.bossMaxHp || Math.max(1, Number(q.bossHp) || 100),
      remainingHp: room.currentQuestionMeta?.bossRemainingHp || 0,
      totalDamage: room.currentQuestionMeta?.totalDamage || 0,
      teamBonus: room.currentQuestionMeta?.bossDefeated ? Number(challengeSettings.bossTeamBonus || BOSS_TEAM_BONUS) : 0,
      defeated: Boolean(room.currentQuestionMeta?.bossDefeated),
    };
  }

  io.to(room.pin).emit('question:end', correctReveal);

  // ── Advance to leaderboard / next question ────────────────────────────
  setTimeout(() => {
    const leaderboard     = roundScores;
    const isLastQuestion  = room.questionIndex >= room.questions.length - 1;

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
    const publicBaseUrl = resolveSocketPublicBaseUrl(socket);

    const room = {
      pin,
      hostSocketId: socket.id,
      players: new Map(),
      kickedPlayers: new Set(),
      pendingJoinRequests: new Map(),
      state: 'lobby',
      mode: activeMode,
      quizSlug: quizSlug || null,
      questions: DEFAULT_QUESTIONS,
      challengePreset: 'classic',
      challengeSettings: getPresetSettings('classic'),
      questionIndex: 0,
      questionTimer: null,
      questionStartTime: 0,
      questionDuration: config.GAME.QUESTION_DURATION_SEC,
      paused: false,
      pausedTimeRemaining: 0,
      previewTimer: null,
      answerOpenAt: 0,
      roles: null,
      publicBaseUrl,
    };

    rooms.set(pin, room);
    socket.join(pin);

    console.log(`[Room] Created: PIN=${pin} by host=${socket.id}`);
    const modePayload = await buildRoomModePayload(room);
    socket.emit('room:created', { pin, ...modePayload });
  });

  // ── HOST: Join the game as a player too ───────
  socket.on('host:join_as_player', ({ nickname, avatar }) => {
    const room = Array.from(rooms.values()).find((r) => r.hostSocketId === socket.id);
    if (!room) { socket.emit('room:error', { message: 'Room not found.' }); return; }
    if (room.state !== 'lobby') { socket.emit('room:error', { message: 'Can only join as player in lobby.' }); return; }

    // Remove previous host-player entry if they toggle off and back on
    if (room.hostIsPlayer) {
      room.players.delete(socket.id);
      room.hostIsPlayer = false;
      socket.data.pin = null;
      socket.emit('host:joined_as_player', { joined: false });
      io.to(room.pin).emit('room:player_joined', { players: getPlayerList(room) });
      return;
    }

    const nameTaken = Array.from(room.players.values()).some(
      (p) => p.nickname.toLowerCase() === (nickname || '').trim().toLowerCase()
    );
    if (nameTaken) { socket.emit('room:error', { message: 'That nickname is already taken.' }); return; }

    const player = {
      id: socket.id,
      playerId: null,
      nickname: (nickname || 'Host').trim(),
      avatar: typeof avatar === 'string' ? avatar.slice(0, 8) : '🎮',
      score: 0,
      streak: 0,
      maxStreak: 0,
      currentAnswer: null,
      answerTime: config.GAME.QUESTION_DURATION_SEC,
      disconnected: false,
      disconnectTimer: null,
      isHostPlayer: true,
    };
    room.players.set(socket.id, player);
    socket.data.pin = room.pin;   // enables player:answer to work
    room.hostIsPlayer = true;

    console.log(`[Room ${room.pin}] Host joined as player: ${player.nickname}`);
    socket.emit('host:joined_as_player', { joined: true, nickname: player.nickname, avatar: player.avatar });
    io.to(room.pin).emit('room:player_joined', { players: getPlayerList(room) });
  });

  // ── PLAYER: Join a room ──────────────────────
  socket.on('player:join', ({ pin, nickname, avatar, playerId }) => {
    const normalizedPin = normalizePin(pin);
    const cleanNickname = typeof nickname === 'string' ? nickname.trim() : '';
    const room = rooms.get(normalizedPin);

    if (!normalizedPin || !cleanNickname) {
      socket.emit('room:error', { message: 'Please enter a valid room PIN and nickname.' });
      return;
    }

    // Room not found
    if (!room) {
      socket.emit('room:error', { message: 'No room found with that PIN.' });
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
      (p) => p.nickname.toLowerCase() === cleanNickname.toLowerCase()
    );
    if (nameTaken) {
      socket.emit('room:error', { message: 'That nickname is already taken.' });
      return;
    }

    // Kicked player trying to rejoin — route to host approval queue
    if (room.kickedPlayers.has(cleanNickname.toLowerCase())) {
      room.pendingJoinRequests.set(socket.id, {
        socketId: socket.id,
        nickname: cleanNickname,
        avatar: typeof avatar === 'string' ? avatar.slice(0, 8) : '\uD83C\uDFAE',
        pin: normalizedPin,
      });
      socket.data.pin = normalizedPin;
      const hostSocket = io.sockets.sockets.get(room.hostSocketId);
      if (hostSocket) {
        hostSocket.emit('host:join_request', {
          socketId: socket.id,
          nickname: cleanNickname,
          avatar: typeof avatar === 'string' ? avatar.slice(0, 8) : '\uD83C\uDFAE',
        });
      }
      socket.emit('room:join_pending', {
        message: 'Your request has been sent. Waiting for the host to approve…',
      });
      return;
    }

    // Add player to room
    const player = {
      id: socket.id,
      playerId: typeof playerId === 'string' ? playerId.slice(0, 64) : null,
      nickname: cleanNickname,
      avatar: typeof avatar === 'string' ? avatar.slice(0, 8) : '🎮',
      score: 0,
      streak: 0,
      maxStreak: 0,
      currentAnswer: null,          // generic — set when player submits
      answerTime: config.GAME.QUESTION_DURATION_SEC,
      disconnected: false,
      disconnectTimer: null,
    };
    room.players.set(socket.id, player);
    socket.join(normalizedPin);

    // Tag the socket with its room PIN for disconnect cleanup
    socket.data.pin = normalizedPin;
    socket.data.isHost = false;

    console.log(`[Room ${normalizedPin}] Player joined: ${cleanNickname} (${socket.id})`);

    // Confirm to the joining player
    socket.emit('room:joined', {
      pin: normalizedPin,
      nickname: player.nickname,
      avatar: player.avatar,
      players: getPlayerList(room),
      quizSlug: room.quizSlug || null,
    });

    // Notify everyone in the room (including host) about the updated player list
    io.to(pin).emit('room:player_joined', {
      players: getPlayerList(room),
    });
  });

  // ── PLAYER: Update profile (nickname / avatar) ──
  socket.on('player:update_profile', ({ nickname, avatar }) => {
    const pin = socket.data.pin;
    if (!pin) return;
    const room = rooms.get(pin);
    if (!room || room.state !== 'lobby') return;
    const player = room.players.get(socket.id);
    if (!player) return;

    let changed = false;

    if (nickname && typeof nickname === 'string') {
      const newNick = nickname.trim().slice(0, 20);
      if (newNick && newNick !== player.nickname) {
        const taken = Array.from(room.players.values()).some(
          (p) => p.id !== socket.id && p.nickname.toLowerCase() === newNick.toLowerCase()
        );
        if (taken) {
          socket.emit('room:error', { message: 'That nickname is already taken.' });
          return;
        }
        player.nickname = newNick;
        changed = true;
      }
    }

    if (avatar && typeof avatar === 'string') {
      player.avatar = avatar.slice(0, 8);
      changed = true;
    }

    if (!changed) return;

    // Confirm to the player
    socket.emit('room:profile_updated', {
      nickname: player.nickname,
      avatar: player.avatar,
    });

    // Broadcast updated player list to everyone
    io.to(pin).emit('room:player_joined', { players: getPlayerList(room) });
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
    // If the only "player" is the host themselves, that's still valid
    // (room.hostIsPlayer=true means host socket is in room.players)

    if (room.state !== 'lobby') {
      socket.emit('room:error', { message: 'Game already started.' });
      return;
    }

    console.log(`[Room ${room.pin}] Game started by host ${socket.id}`);
    console.log(`[Room ${room.pin}] Quiz slug provided: "${room.quizSlug}"`);

    // Always refresh quiz data from the cloud before starting
    const quizData = await refreshQuestions(room.quizSlug);

    // If a specific quiz was requested but couldn't be loaded, abort
    if (room.quizSlug && quizData.questions === DEFAULT_QUESTIONS) {
      socket.emit('room:error', { message: `Could not load quiz "${room.quizSlug}" from the database. Check that the quiz ID is correct and Firestore is connected.` });
      return;
    }

    room.questions = quizData.randomizeQuestions
      ? shuffleArray([...quizData.questions])
      : quizData.questions;
    room.challengePreset = quizData.challengePreset || 'classic';
    room.challengeSettings = quizData.challengeSettings || getPresetSettings('classic');
    room.enableScholarRole = quizData.enableScholarRole === true; // disabled by default
    console.log(`[Room ${room.pin}] Loaded ${room.questions.length} questions from quiz data`);

    const roles = assignAsymmetricRoles(room);
    io.to(room.pin).emit('game:roles', {
      roles,
      players: getPlayerList(room),
      challengePreset: room.challengePreset,
      scholarPreviewSeconds: Math.floor((room.challengeSettings.rolePreviewMs || ROLE_PREVIEW_MS) / 1000),
      saboteurFreezeSeconds: Math.floor((room.challengeSettings.roleFreezeMs || ROLE_FREEZE_MS) / 1000),
      wrongPenalty: Number(room.challengeSettings.wrongPenalty || ROLE_WRONG_PENALTY),
    });

    // ── Update Metadata: totalSessions & totalPlayers ──
    const db = getDbSafe();
    if (db && room.quizSlug) {
      db.collection('quizzes').doc(room.quizSlug).update({
        totalSessions: admin.firestore.FieldValue.increment(1),
        totalPlayers: admin.firestore.FieldValue.increment(room.players.size),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(err => console.error(`[Metadata Error] Failed to update sessions: ${err.message}`));

      // Also log the individual session for Master Admin
      db.collection('game_sessions').add({
        quizId: room.quizSlug,
        pin: room.pin,
        playerCount: room.players.size,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        hostId: room.hostSocketId,
        questionsCount: room.questions.length,
      }).catch(err => console.error(`[Metadata Error] Failed to log session: ${err.message}`));
    }

    // Broadcast game start to everyone in the room
    io.to(room.pin).emit('game:start', {
      totalQuestions: room.questions.length,
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
    if (!room || (room.state !== 'question' && room.state !== 'question-pending' && !room.paused)) return;
    console.log(`[Room ${room.pin}] Question skipped by host.`);
    endQuestion(room);
  });

  // ── HOST: End game now and show final results ─
  socket.on('host:end', () => {
    const room = findHostRoom(socket.id);
    if (!room) return;
    if (room.state === 'finished' || room.state === 'lobby') return;

    clearTimeout(room.questionTimer);
    room.questionTimer = null;
    clearTimeout(room.previewTimer);
    room.previewTimer = null;
    room.paused = false;
    room.pausedTimeRemaining = 0;
    room.state = 'finished';

    const leaderboard = buildLeaderboard(room);
    console.log(`[Room ${room.pin}] Ended by host ${socket.id}.`);
    io.to(room.pin).emit('game:over', { leaderboard, endedByHost: true });
  });

  // ── HOST: Start a new session in same room ───
  socket.on('host:new-session', async () => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'finished') return;

    clearTimeout(room.questionTimer);
    room.questionTimer = null;
    room.state = 'lobby';
    room.questionIndex = 0;
    room.questionStartTime = 0;
    room.questionDuration = config.GAME.QUESTION_DURATION_SEC;
    room.paused = false;
    room.pausedTimeRemaining = 0;
    room.currentQuestionMeta = null;
    room.answerOpenAt = 0;
    room.roles = null;
    room.challengePreset = 'classic';
    room.challengeSettings = getPresetSettings('classic');

    // Remove the host-player entry so they can choose fresh for the next session
    if (room.hostIsPlayer) {
      room.players.delete(socket.id);
      room.hostIsPlayer = false;
      socket.data.pin = null;
    }

    room.players.forEach((player) => {
      player.score = 0;
      player.streak = 0;
      player.maxStreak = 0;
      player.currentAnswer = null;
      player.answerTime = config.GAME.QUESTION_DURATION_SEC;
    });

    const modeInfo = await buildRoomModePayload(room);
    console.log(`[Room ${room.pin}] New session started by host ${socket.id}.`);
    io.to(room.pin).emit('room:reset', {
      players: getPlayerList(room),
      modeInfo,
    });
  });

  // ── HOST: Kick a player from the lobby ───────
  socket.on('host:kick', ({ playerId }) => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'lobby') return;

    const player = room.players.get(playerId);
    if (!player) return;

    // Track kicked nickname so they cannot auto-rejoin
    room.kickedPlayers.add(player.nickname.toLowerCase());
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

  // ── HOST: Approve a kicked player's rejoin request ───────
  socket.on('host:approve_join', ({ socketId }) => {
    const room = findHostRoom(socket.id);
    if (!room || room.state !== 'lobby') return;

    const pending = room.pendingJoinRequests.get(socketId);
    if (!pending) return;

    room.pendingJoinRequests.delete(socketId);

    const player = {
      id: socketId,
      playerId: null,
      nickname: pending.nickname,
      avatar: pending.avatar,
      score: 0,
      streak: 0,
      maxStreak: 0,
      currentAnswer: null,
      answerTime: config.GAME.QUESTION_DURATION_SEC,
      disconnected: false,
      disconnectTimer: null,
    };
    room.players.set(socketId, player);

    const playerSocket = io.sockets.sockets.get(socketId);
    if (playerSocket) {
      playerSocket.join(room.pin);
      playerSocket.emit('room:joined', {
        pin: room.pin,
        nickname: player.nickname,
        avatar: player.avatar,
        players: getPlayerList(room),
        quizSlug: room.quizSlug || null,
      });
    }

    console.log(`[Room ${room.pin}] Approved rejoin for: ${pending.nickname}`);
    io.to(room.pin).emit('room:player_joined', { players: getPlayerList(room) });
  });

  // ── HOST: Reject a kicked player's rejoin request ────────
  socket.on('host:reject_join', ({ socketId }) => {
    const room = findHostRoom(socket.id);
    if (!room) return;

    const pending = room.pendingJoinRequests.get(socketId);
    if (!pending) return;

    room.pendingJoinRequests.delete(socketId);

    const playerSocket = io.sockets.sockets.get(socketId);
    if (playerSocket) {
      playerSocket.emit('room:join_rejected', {
        message: 'The host declined your request to rejoin.',
      });
    }

    console.log(`[Room ${room.pin}] Rejected rejoin for: ${pending.nickname}`);
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

    if (room.answerOpenAt && Date.now() < room.answerOpenAt) return;

    // Ignore if already answered
    if (player.currentAnswer !== null) return;

    const timeTakenSec = (Date.now() - room.questionStartTime) / 1000;
    player.currentAnswer = answer;
    player.answerTime    = timeTakenSec;

    socket.emit('answer:received', { answer });

    // Notify host with live counter (only connected players count)
    const connectedPlayers = Array.from(room.players.values()).filter(p => !p.disconnected);
    const answeredCount = connectedPlayers.filter(p => p.currentAnswer !== null).length;
    const hostSocket = io.sockets.sockets.get(room.hostSocketId);
    if (hostSocket) {
      hostSocket.emit('question:answer_update', { answered: answeredCount, total: connectedPlayers.length });
    }

    // Auto-end when every connected player has answered
    if (connectedPlayers.length > 0 && answeredCount === connectedPlayers.length) {
      endQuestion(room);
    }
  });

  socket.on('role:shield', ({ targetId }) => {
    const pin = socket.data.pin;
    if (!pin) return;
    const room = rooms.get(pin);
    if (!room || room.state !== 'question') return;

    const myRole = getRoleForPlayer(room, socket.id);
    if (myRole !== 'shield') return;
    if (room.currentQuestionMeta?.shieldActivatedBy) return;
    if (!targetId || targetId === socket.id || !room.players.has(targetId)) return;

    room.currentQuestionMeta.shieldActivatedBy = socket.id;
    room.currentQuestionMeta.shieldTargetId = targetId;

    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit('role:shield_applied', {
        from: room.players.get(socket.id)?.nickname || 'Shield',
      });
    }
  });

  socket.on('role:saboteur', ({ targetId }) => {
    const pin = socket.data.pin;
    if (!pin) return;
    const room = rooms.get(pin);
    if (!room || room.state !== 'question') return;

    const myRole = getRoleForPlayer(room, socket.id);
    if (myRole !== 'saboteur') return;
    if (room.currentQuestionMeta?.saboteurUsedBy) return;
    if (!targetId || targetId === socket.id || !room.players.has(targetId)) return;

    room.currentQuestionMeta.saboteurUsedBy = socket.id;

    const targetSocket = io.sockets.sockets.get(targetId);
    if (targetSocket) {
      targetSocket.emit('role:frozen', {
        durationMs: Number(room.challengeSettings?.roleFreezeMs || ROLE_FREEZE_MS),
        from: room.players.get(socket.id)?.nickname || 'Saboteur',
      });
    }
  });

  // ── PLAYER: Rejoin an in-progress game ───────
  socket.on('player:rejoin', ({ pin, playerId }) => {
    const normalizedPin = normalizePin(pin);
    const room = rooms.get(normalizedPin);
    if (!room) {
      socket.emit('room:rejoin_failed', { message: 'Game not found. It may have ended.' });
      return;
    }

    // Search for the player by stable playerId
    let oldSocketId = null;
    let existingPlayer = null;
    for (const [sid, p] of room.players) {
      if (p.playerId && p.playerId === playerId) {
        oldSocketId = sid;
        existingPlayer = p;
        break;
      }
    }

    if (!existingPlayer) {
      socket.emit('room:rejoin_failed', { message: 'Session not found. Please join manually.' });
      return;
    }

    // Cancel the expiry timer
    if (existingPlayer.disconnectTimer) {
      clearTimeout(existingPlayer.disconnectTimer);
      existingPlayer.disconnectTimer = null;
    }

    // Re-map to the new socket
    room.players.delete(oldSocketId);
    existingPlayer.id = socket.id;
    existingPlayer.disconnected = false;
    room.players.set(socket.id, existingPlayer);
    socket.join(normalizedPin);
    socket.data.pin = normalizedPin;
    socket.data.isHost = false;

    console.log(`[Room ${normalizedPin}] Player reconnected: ${existingPlayer.nickname} (${socket.id})`);

    const basePayload = {
      pin: normalizedPin,
      nickname: existingPlayer.nickname,
      avatar: existingPlayer.avatar,
      players: getPlayerList(room),
      score: existingPlayer.score,
      streak: existingPlayer.streak,
      roomState: room.state,
      role: getRoleForPlayer(room, socket.id),
    };

    if ((room.state === 'question' || room.state === 'question-pending') && room.currentQuestionPayload) {
      const elapsed = (Date.now() - room.questionStartTime) / 1000;
      const timeRemaining = Math.max(1, room.questionDuration - elapsed);
      socket.emit('room:rejoined', {
        ...basePayload,
        questionData: {
          questionIndex: room.questionIndex,
          total: room.questions.length,
          question: room.currentQuestionPayload,
          duration: room.questionDuration,
          timeRemaining,
          players: getPlayerList(room),
          hasAnswered: existingPlayer.currentAnswer !== null,
        },
      });
    } else if (room.state === 'finished') {
      socket.emit('room:rejoined', { ...basePayload, leaderboard: buildLeaderboard(room) });
    } else {
      socket.emit('room:rejoined', basePayload);
    }

    // Notify everyone of the updated (restored) player list
    io.to(pin).emit('room:player_joined', { players: getPlayerList(room) });
  });

  // ── DISCONNECT ───────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] Socket disconnected: ${socket.id}`);
    const pin = socket.data.pin;

    if (pin) {
      const room = rooms.get(pin);
      if (room) {
        const player = room.players.get(socket.id);
        if (room.state === 'lobby' || !player) {
          // Remove from pending requests if they were a kicked player waiting
          room.pendingJoinRequests.delete(socket.id);
          // In lobby: remove immediately and notify
          room.players.delete(socket.id);
          io.to(pin).emit('room:player_joined', { players: getPlayerList(room) });
        } else {
          // Mid-game: soft-disconnect — keep them in the Map for 30 s so they can rejoin
          player.disconnected = true;
          player.disconnectTimer = setTimeout(() => {
            if (room.players.get(socket.id) === player && player.disconnected) {
              room.players.delete(socket.id);
              console.log(`[Room ${pin}] Reconnect window expired: ${player.nickname}`);
              io.to(pin).emit('room:player_joined', { players: getPlayerList(room) });
              // If all remaining connected players have answered, end the question now
              if (room.state === 'question') {
                const connected = Array.from(room.players.values()).filter(p => !p.disconnected);
                const answered = connected.filter(p => p.currentAnswer !== null);
                if (connected.length > 0 && answered.length === connected.length) {
                  endQuestion(room);
                }
              }
            }
          }, 30000);
          // Update player list (disconnected players are hidden by getPlayerList)
          io.to(pin).emit('room:player_joined', { players: getPlayerList(room) });
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
      if (hostedRoom.previewTimer) clearTimeout(hostedRoom.previewTimer);

      if (hostedRoom.state && hostedRoom.state !== 'lobby') {
        hostedRoom.state = 'finished';
        const leaderboard = buildLeaderboard(hostedRoom);
        io.to(hostedRoom.pin).emit('game:over', { leaderboard });
      } else {
        io.to(hostedRoom.pin).emit('room:closed', {
          message: 'The host has disconnected. The game has ended.',
        });
      }

      // Notify any pending rejoin requests that the room is gone
      for (const [pendingSocketId] of hostedRoom.pendingJoinRequests) {
        const pendingSocket = io.sockets.sockets.get(pendingSocketId);
        if (pendingSocket) {
          pendingSocket.emit('room:closed', {
            message: 'The host has disconnected. The game has ended.',
          });
        }
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
