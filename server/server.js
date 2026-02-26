'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const QRCode = require('qrcode');
const config = require('../config');
const { admin, getFirestore } = require('./firebaseAdmin');
const { createQuestionTypeHandlers } = require('./questionTypes');
const { createGameModeRuntime } = require('./gameModes/runtime');

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

function normalizePriceTier(value) {
  if (value === 'starter' || value === 'pro') return value;
  return 'free';
}

function isPremiumPriceTier(value) {
  const tier = normalizePriceTier(value);
  return tier === 'starter' || tier === 'pro';
}

async function getQuizAccessMetadata(quizSlug) {
  if (!quizSlug) return { priceTier: 'free', ownerId: null, title: null };

  const db = getDbSafe();
  if (db) {
    try {
      const docSnap = await db.collection('quizzes').doc(quizSlug).get();
      if (docSnap.exists) {
        const data = docSnap.data() || {};
        return {
          priceTier: normalizePriceTier(data.priceTier),
          ownerId: typeof data.ownerId === 'string' ? data.ownerId : null,
          title: typeof data.title === 'string' ? data.title : null,
        };
      }
    } catch (_) {
      // Fall back to slug query
    }

    try {
      const snap = await db.collection('quizzes').where('slug', '==', quizSlug).limit(1).get();
      if (!snap.empty) {
        const data = snap.docs[0].data() || {};
        return {
          priceTier: normalizePriceTier(data.priceTier),
          ownerId: typeof data.ownerId === 'string' ? data.ownerId : null,
          title: typeof data.title === 'string' ? data.title : null,
        };
      }
    } catch (_) {
      // Fall through to REST fallback
    }
  }

  const restData = await getQuizDataFromRestApi(quizSlug);
  if (restData) {
    return {
      priceTier: normalizePriceTier(restData.priceTier),
      ownerId: typeof restData.ownerId === 'string' ? restData.ownerId : null,
      title: typeof restData.title === 'string' ? restData.title : null,
    };
  }

  return { priceTier: 'free', ownerId: null, title: null };
}

async function hasActiveEntitlement(userId) {
  if (!userId) return false;
  const db = getDbSafe();
  if (!db) return false;

  try {
    const snap = await db.collection('entitlements').doc(userId).get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
    const hasPlan = typeof data.plan === 'string' && data.plan.trim() !== '';
    const hasPacks = Array.isArray(data.activePackIds) && data.activePackIds.length > 0;
    return hasPlan || hasPacks;
  } catch (_err) {
    return false;
  }
}

const HOST_LAUNCH_CODE_TTL_MS = 5 * 60 * 1000;
const hostLaunchCodes = new Map();

function issueHostLaunchCode(uid) {
  if (!uid || typeof uid !== 'string') return null;
  const launchCode = crypto.randomBytes(18).toString('base64url');
  const expiresAt = Date.now() + HOST_LAUNCH_CODE_TTL_MS;
  hostLaunchCodes.set(launchCode, { uid, expiresAt });
  return launchCode;
}

function consumeHostLaunchCode(launchCode) {
  if (!launchCode || typeof launchCode !== 'string') return null;
  const record = hostLaunchCodes.get(launchCode);
  hostLaunchCodes.delete(launchCode);
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  return record.uid;
}

setInterval(() => {
  const now = Date.now();
  for (const [code, record] of hostLaunchCodes.entries()) {
    if (!record || now > record.expiresAt) {
      hostLaunchCodes.delete(code);
    }
  }
}, 60 * 1000).unref?.();

async function verifyHostPremiumLaunchAccess({ quizSlug, hostUid, hostToken, hostLaunchCode }) {
  const accessMeta = await getQuizAccessMetadata(quizSlug);
  if (!isPremiumPriceTier(accessMeta.priceTier)) {
    return { allowed: true, accessMeta };
  }

  let verifiedUid = null;

  if (hostLaunchCode) {
    verifiedUid = consumeHostLaunchCode(hostLaunchCode);
    if (!verifiedUid) {
      return {
        allowed: false,
        code: 'AUTH_REQUIRED',
        message: 'Launch code expired. Please relaunch from your dashboard.',
        accessMeta,
      };
    }
  } else {
    if (!hostUid || !hostToken) {
      return {
        allowed: false,
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'This quiz requires an active subscription.',
        accessMeta,
      };
    }

    try {
      const decoded = await admin.auth().verifyIdToken(hostToken);
      if (decoded.uid !== hostUid) {
        return {
          allowed: false,
          code: 'AUTH_REQUIRED',
          message: 'Authentication mismatch. Please relaunch from your dashboard.',
          accessMeta,
        };
      }
      verifiedUid = decoded.uid;
    } catch (_err) {
      return {
        allowed: false,
        code: 'AUTH_REQUIRED',
        message: 'Authentication expired. Please relaunch from your dashboard.',
        accessMeta,
      };
    }
  }

  const subscribed = await hasActiveEntitlement(verifiedUid);
  if (!subscribed) {
    return {
      allowed: false,
      code: 'SUBSCRIPTION_REQUIRED',
      message: 'This quiz requires an active subscription.',
      accessMeta,
    };
  }

  return { allowed: true, accessMeta };
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

// QR SVG endpoint — used as a resilient fallback when realtime payload misses qrSvg
app.get('/api/qr-svg', async (req, res) => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url : '';
  const joinUrl = rawUrl.trim();
  if (!joinUrl) {
    res.status(400).type('text/plain; charset=utf-8').send('Missing url query parameter');
    return;
  }

  try {
    const qrSvg = await QRCode.toString(joinUrl, {
      type: 'svg',
      margin: 1,
      width: 200,
    });
    res.set('Cache-Control', 'no-store');
    res.type('image/svg+xml; charset=utf-8').send(qrSvg);
  } catch (error) {
    console.warn('[QR] /api/qr-svg failed', error?.message || error);
    res.status(500).type('text/plain; charset=utf-8').send('Unable to generate QR');
  }
});

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
      let updatedAt = null;

      const getUpdatedAt = (obj) => {
        const raw = obj?.updatedAt ?? obj?.editedAt ?? obj?.updated_at ?? null;
        if (!raw) return null;
        if (typeof raw?.toDate === 'function') return raw.toDate().toISOString();
        if (typeof raw === 'string') return raw;
        return null;
      };

      // Try direct doc ID lookup first
      const docSnap = await db.collection('quizzes').doc(slug).get();
      if (docSnap.exists) {
        data = docSnap.data();
        updatedAt = getUpdatedAt(data);
      } else {
        // Fall back to slug query
        const snap = await db.collection('quizzes').where('slug', '==', slug).limit(1).get();
        if (!snap.empty) {
          data = snap.docs[0].data();
          updatedAt = getUpdatedAt(data);
        }
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
          updatedAt,
        });
      }
    }

    // Firestore REST fallback (local dev / project mismatch scenarios)
    // Uses FIREBASE_REST_API_KEY + FIREBASE_REST_PROJECT_ID env vars.
    const restData = await getQuizDataFromRestApi(slug);
    if (restData) {
      const questions = restData.questions || [];
      const mediaAssets = [];
      questions.forEach((q, idx) => {
        if (q.media && q.media.type && q.media.type !== 'none' && q.media.url) {
          mediaAssets.push({ index: idx, type: q.media.type, url: q.media.url });
        }
      });
      return res.json({
        title: restData.title || slug,
        questionCount: questions.length,
        mediaAssets,
        updatedAt: restData.updatedAt || null,
      });
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

app.options('/api/host-launch-code', (req, res) => {
  const origin = req.headers.origin;
  if (origin && config.CORS_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.sendStatus(204);
});

app.post('/api/host-launch-code', async (req, res) => {
  const origin = req.headers.origin;
  if (origin && config.CORS_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  const authHeader = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(authHeader));
  const idToken = match?.[1] || null;

  if (!idToken) {
    return res.status(401).json({ message: 'Missing Bearer token.' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const launchCode = issueHostLaunchCode(decoded.uid);
    if (!launchCode) {
      return res.status(500).json({ message: 'Failed to issue launch code.' });
    }

    return res.json({
      launchCode,
      expiresInSec: Math.floor(HOST_LAUNCH_CODE_TTL_MS / 1000),
    });
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
});

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
  // Keep WebSocket connections alive and detect dead sockets faster
  pingInterval: 25000,   // send ping every 25 s
  pingTimeout: 20000,    // disconnect if no pong within 20 s (mobile-safe)
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

// ── Firestore REST API helpers (no Admin SDK / service account needed) ──────
// Reads a single Firestore document via the public REST API using a client API
// key.  The Firestore security rules still apply, so only quizzes whose
// visibility is 'public' (or any other rule that allows unauthenticated reads)
// will succeed.  Configure via FIREBASE_REST_API_KEY + FIREBASE_REST_PROJECT_ID.

function _firestoreValueToJs(value) {
  if (!value) return null;
  if ('stringValue'  in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue'  in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue'    in value) return null;
  if ('arrayValue'   in value) return (value.arrayValue.values || []).map(_firestoreValueToJs);
  if ('mapValue'     in value) {
    const obj = {};
    for (const k of Object.keys(value.mapValue.fields || {})) {
      obj[k] = _firestoreValueToJs(value.mapValue.fields[k]);
    }
    return obj;
  }
  return null;
}

function _firestoreDocToJs(docData) {
  const obj = {};
  for (const k of Object.keys(docData.fields || {})) {
    obj[k] = _firestoreValueToJs(docData.fields[k]);
  }
  return obj;
}

async function getQuizDataFromRestApi(quizId) {
  // Configure via FIREBASE_REST_API_KEY + FIREBASE_REST_PROJECT_ID env vars on Render.
  // These must point to the qyan-om project (where the admin app saves quizzes).
  const apiKey    = process.env.FIREBASE_REST_API_KEY;
  const projectId = process.env.FIREBASE_REST_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/quizzes/${encodeURIComponent(quizId)}?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[Quiz REST] HTTP ${res.status} for quiz "${quizId}"`);
      return null;
    }
    const data = _firestoreDocToJs(await res.json());
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      console.log(`[Quiz REST] ✓ Loaded "${data.title}" (${data.questions.length} Qs) via Firestore REST`);
      return {
        title: data.title || null,
        ownerId: data.ownerId || null,
        priceTier: normalizePriceTier(data.priceTier),
        questions: data.questions,
        challengePreset: data.challengePreset || 'classic',
        challengeSettings: data.challengeSettings || null,
        randomizeQuestions: data.randomizeQuestions === true,
        updatedAt: data.updatedAt || null,
      };
    }
    console.warn(`[Quiz REST] Document found but no questions array for "${quizId}"`);
    return null;
  } catch (err) {
    console.error('[Quiz REST] Fetch failed:', err.message);
    return null;
  }
}
// ────────────────────────────────────────────────────────────────────────────

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

  // 1c. Firestore REST API fallback — works with just a client API key + project ID.
  //     Useful when the Admin SDK service account is for a different project.
  //     Only succeeds for quizzes with visibility=="public" (security rules apply).
  if (quizSlug) {
    const restData = await getQuizDataFromRestApi(quizSlug);
    if (restData) return restData;
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
  const remoteQuestions = Array.isArray(remote?.questions) ? remote.questions : DEFAULT_QUESTIONS;
  const questions = remoteQuestions.filter((q) => q?.type !== 'puzzle');
  if (remoteQuestions.length > 0 && questions.length !== remoteQuestions.length) {
    console.warn(`[Quiz] Filtered out ${remoteQuestions.length - questions.length} deprecated puzzle question(s).`);
  }
  if (questions.length === 0) {
    console.warn('[Quiz] No supported questions left after filtering; using fallback default questions.');
  }
  const finalQuestions = questions.length > 0 ? questions : DEFAULT_QUESTIONS;
  const challengeSettings = resolveChallengeSettings(remote);
  // Also keep global QUESTIONS in sync for legacy callers
  QUESTIONS = finalQuestions;
  console.log(`[Quiz] Loaded ${finalQuestions.length} questions (preset: ${remote?.challengePreset || 'classic'})`);
  return {
    questions: finalQuestions,
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
const pinAliases = new Map();

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
  const len = Number(config.GAME.PIN_LENGTH) || 6;
  let pin;
  do {
    if (len <= 1) {
      pin = String(Math.floor(Math.random() * 10));
    } else {
      const firstDigit = String(Math.floor(Math.random() * 9) + 1);
      const tailLength = len - 1;
      const tail = Math.floor(Math.random() * Math.pow(10, tailLength))
        .toString()
        .padStart(tailLength, '0');
      pin = `${firstDigit}${tail}`;
    }
  } while (rooms.has(pin) || pinAliases.has(pin));
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

function addPinAlias(fromPin, toPin, ttlMs = 120000) {
  if (!fromPin || !toPin || fromPin === toPin) return;
  pinAliases.set(fromPin, {
    targetPin: toPin,
    expiresAt: Date.now() + Math.max(5000, Number(ttlMs) || 120000),
  });
}

function resolveRoomByPin(value) {
  const normalizedPin = normalizePin(value);
  if (!normalizedPin) {
    return { normalizedPin: '', resolvedPin: '', room: null };
  }

  const maxLength = Number(config.GAME.PIN_LENGTH) || 6;
  const candidatePins = [];
  const pushCandidate = (pin) => {
    if (!pin) return;
    if (!candidatePins.includes(pin)) candidatePins.push(pin);
  };

  pushCandidate(normalizedPin);
  if (normalizedPin.length < maxLength) {
    pushCandidate(normalizedPin.padStart(maxLength, '0'));
  }

  const now = Date.now();
  for (const pin of [...candidatePins]) {
    const alias = pinAliases.get(pin);
    if (!alias) continue;
    if (alias.expiresAt <= now) {
      pinAliases.delete(pin);
      continue;
    }
    pushCandidate(alias.targetPin);
  }

  for (const pin of candidatePins) {
    const room = rooms.get(pin);
    if (room) {
      return { normalizedPin, resolvedPin: pin, room };
    }
  }

  return { normalizedPin, resolvedPin: '', room: null };
}

function clearPinAliasesForTargetPin(targetPin) {
  if (!targetPin) return;
  for (const [fromPin, alias] of pinAliases) {
    if (fromPin === targetPin || alias?.targetPin === targetPin) {
      pinAliases.delete(fromPin);
    }
  }
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

const QUESTION_TYPE_HANDLERS = createQuestionTypeHandlers({
  calculateScore,
  calculatePartialScore,
  isTypedAnswerCorrect,
  calculateBossDamage,
  BOSS_TEAM_BONUS,
});

function getQuestionTypeHandler(type) {
  return QUESTION_TYPE_HANDLERS[type] || QUESTION_TYPE_HANDLERS.single;
}

function callRoomGameModeHook(room, hookName, payload = {}) {
  if (!room || !hookName) return undefined;
  const runtime = room.gameModeRuntime;
  if (!runtime || typeof runtime !== 'object') return undefined;
  const hook = runtime[hookName];
  if (typeof hook !== 'function') return undefined;
  try {
    return hook(payload);
  } catch (error) {
    console.error(`[Room ${room.pin}] gameMode hook "${hookName}" failed:`, error?.message || error);
    return undefined;
  }
}

// ─────────────────────────────────────────────
// Game Flow
// ─────────────────────────────────────────────

/** Broadcast the current question to all sockets in a room. */
function sendQuestion(room, opts = {}) {
  // Guard: don't fire if the game was ended while quiz was loading
  if (!room || room.state === 'finished') return;
  const countdownExtraMs = opts.countdownExtraMs || 0;
  const q = room.questions[room.questionIndex];
  const duration = q.duration || config.GAME.QUESTION_DURATION_SEC;
  const challengeSettings = room.challengeSettings || CHALLENGE_PRESETS.classic;
  const typeHandler = getQuestionTypeHandler(q.type);
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
  Object.assign(questionPayload, typeHandler.buildQuestionPayload({ room, q, challengeSettings }));

  // Store client-safe payload so reconnecting players can receive the current question
  room.currentQuestionPayload = { ...questionPayload };

  const dispatchQuestion = () => {
    if (room.state === 'finished') return; // end-game clicked before question fired
    const playersPayload = getPlayerList(room);

    const dispatchDefault = () => {
      io.to(room.pin).emit('game:question', {
        questionIndex: room.questionIndex,
        total: room.questions.length,
        question: questionPayload,
        duration,
        players: playersPayload,
      });

      room.questionStartTime = Date.now();
      room.questionDuration  = duration;
      room.state  = 'question';
      room.paused = false;
      room.pausedTimeRemaining = 0;
      room.answerOpenAt = Date.now();

      room.questionTimer = setTimeout(() => {
        endQuestion(room);
      }, (duration * 1000) + countdownExtraMs);
    };

    const handledByMode = callRoomGameModeHook(room, 'onQuestionDispatch', {
      room,
      io,
      questionPayload,
      players: playersPayload,
      duration,
      countdownExtraMs,
      dispatchDefault,
    });

    if (handledByMode === true) return;
    dispatchDefault();
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
  const typeHandler = getQuestionTypeHandler(q.type);

  // ── Compute per-player round scores ──────────────────────────────────
  const roundScores = [];

  room.players.forEach((player) => {
    const answer      = player.currentAnswer;
    const timeTaken   = player.answerTime;
    const { isCorrect, roundScore } = typeHandler.evaluateAnswer({
      room,
      q,
      player,
      answer,
      timeTaken,
      duration,
      challengeSettings,
    });
    let   penalty     = 0;

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
  if (typeof typeHandler.applyPostRound === 'function') {
    typeHandler.applyPostRound({ room, q, roundScores, challengeSettings });
  }

  roundScores.sort((a, b) => b.totalScore - a.totalScore);

  // ── Build correct-answer reveal payload ──────────────────────────────
  const correctReveal = { questionType: q.type, roundScores };
  Object.assign(correctReveal, typeHandler.buildCorrectReveal({ room, q, challengeSettings }));

  const dispatchDefault = () => {
    io.to(room.pin).emit('question:end', correctReveal);

    // ── Advance to leaderboard / next question ────────────────────────────
    setTimeout(() => {
      const leaderboard     = roundScores;
      const isLastQuestion  = room.questionIndex >= room.questions.length - 1;

      if (isLastQuestion) {
        room.state = 'finished';
        const emitDefaultGameOver = () => {
          io.to(room.pin).emit('game:over', { leaderboard });
        };
        const handledGameOver = callRoomGameModeHook(room, 'onGameOver', {
          room,
          io,
          leaderboard,
          endedByHost: false,
          dispatchDefault: emitDefaultGameOver,
        });
        if (handledGameOver === true) return;
        emitDefaultGameOver();
      } else {
        io.to(room.pin).emit('game:leaderboard', { leaderboard, isFinal: false });
        setTimeout(() => {
          room.questionIndex++;

          // If the next question is the LAST one, send a dramatic alert first
          const isNextLast = room.questionIndex >= room.questions.length - 1;
          if (isNextLast) {
            io.to(room.pin).emit('game:final_question');
            // Delay the actual question to let the animation play
            setTimeout(() => {
              sendQuestion(room);
            }, 4500);
          } else {
            sendQuestion(room);
          }
        }, config.GAME.LEADERBOARD_DURATION_MS);
      }
    }, 2000);
  };

  const handledByMode = callRoomGameModeHook(room, 'onQuestionEnd', {
    room,
    io,
    q,
    roundScores,
    correctReveal,
    dispatchDefault,
  });

  if (handledByMode === true) return;
  dispatchDefault();
}

// ─────────────────────────────────────────────
// Socket.io Event Handlers
// ─────────────────────────────────────────────
io.on('connection', (socket) => {

  // ── HOST: Create a new room ──────────────────
  socket.on('host:create', async ({ quizSlug, gameMode, isReconnect } = {}) => {
    try {
    // Enforce single host per quiz — reject if an active room already exists for this slug.
    // Exception: if the previous host socket is gone (page refresh / network drop),
    // clean up the stale room and allow a fresh one.
    if (quizSlug) {
      const existing = Array.from(rooms.values()).find(
        (r) => r.quizSlug === quizSlug && r.state !== 'finished'
      );
      if (existing) {
        const oldSocket = io.sockets.sockets.get(existing.hostSocketId);
        // A room is reclaimable when:
        //   (a) old socket is gone,
        //   (b) room is in its host-disconnect grace period,
        //   (c) game hasn't started yet (lobby/starting), OR
        //   (d) client signals this is a reconnect (fast reconnect where old socket still lives)
        const isStale = !oldSocket || existing.hostDisconnected || isReconnect === true
                     || existing.state === 'lobby' || existing.state === 'starting';

        if (isStale) {
          // Clear any pending host-disconnect timer
          if (existing.hostDisconnectTimer) {
            clearTimeout(existing.hostDisconnectTimer);
            existing.hostDisconnectTimer = null;
          }

          // Force-close the orphaned old socket (fast-reconnect case: both sockets alive)
          if (oldSocket && oldSocket.id !== socket.id) {
            oldSocket.disconnect(true);
          }

          if (existing.hostDisconnected || isReconnect === true) {
            // ── HOST RECONNECT: same quiz, same PIN, room still alive ──
            // Restore the room in-place so all shared links remain valid.
            existing.hostDisconnected = false;
            existing.hostSocketId = socket.id;
            socket.join(existing.pin);
            socket.data.hostPin = existing.pin;
            console.log(`[Room ${existing.pin}] Host RECLAIMED room for quiz "${quizSlug}" — same PIN preserved.`);
            const modePayload = await buildRoomModePayload(existing);
            socket.emit('room:created', { pin: existing.pin, ...modePayload, reclaimed: true });
            return;
          }

          // Old host socket is fully gone (not in grace period) — delete stale room.
          console.log(`[Room ${existing.pin}] Stale room for quiz "${quizSlug}" replaced by reconnecting host.`);
          if (existing.questionTimer) clearTimeout(existing.questionTimer);
          if (existing.previewTimer) clearTimeout(existing.previewTimer);
          io.socketsLeave(existing.pin);
          clearPinAliasesForTargetPin(existing.pin);
          rooms.delete(existing.pin);
        } else {
          // Old host is still actively connected — genuine duplicate, reject.
          socket.emit('room:error', {
            message: 'هناك جلسة نشطة لهذا الكويز بالفعل. لا يمكن إنشاء جلسة أخرى.',
            code: 'DUPLICATE_HOST',
            existingPin: existing.pin,
          });
          return;
        }
      }
    }

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
      gameMode: gameMode || null,
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
      gameModeRuntime: createGameModeRuntime(gameMode || null),
    };

    rooms.set(pin, room);
    socket.join(pin);

    console.log(`[Room] Created: PIN=${pin} by host=${socket.id}`);
    const modePayload = await buildRoomModePayload(room);
    socket.emit('room:created', { pin, ...modePayload });

    // Preload quiz data in the background so host:start has near-zero Firestore latency
    if (quizSlug) {
      refreshQuestions(quizSlug)
        .then(data => { if (rooms.has(pin)) room.preloadedQuizData = data; })
        .catch(() => {});
    }
    } catch (error) {
      console.error('[host:create] failed:', error?.message || error);
      socket.emit('room:error', {
        message: 'تعذر إنشاء الغرفة حالياً. يرجى المحاولة مرة أخرى.',
        code: 'HOST_CREATE_FAILED',
      });
    }
  });

  // ── HOST: Refresh PIN (only when no players have joined) ────
  socket.on('host:refresh_pin', async () => {
    const room = findHostRoom(socket.id);
    if (!room) { socket.emit('room:error', { message: 'Room not found.' }); return; }
    if (room.state !== 'lobby') { socket.emit('room:error', { message: 'Can only refresh PIN in lobby.' }); return; }

    // Count real (non-host) players
    const realPlayers = Array.from(room.players.values()).filter(p => !p.isHostPlayer);
    if (realPlayers.length > 0) {
      socket.emit('room:error', { message: 'لا يمكن تغيير الرمز بعد انضمام لاعبين.', code: 'PLAYERS_PRESENT' });
      return;
    }

    const oldPin = room.pin;
    const newPin = generatePIN();

    // Move room in the Map
    clearPinAliasesForTargetPin(oldPin);
    rooms.delete(oldPin);
    room.pin = newPin;
    rooms.set(newPin, room);
    addPinAlias(oldPin, newPin);

    // Move host socket to new channel
    socket.leave(oldPin);
    socket.join(newPin);

    console.log(`[Room] PIN refreshed: ${oldPin} -> ${newPin} by host=${socket.id}`);
    const modePayload = await buildRoomModePayload(room);
    socket.emit('room:pin_refreshed', { pin: newPin, ...modePayload });
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
    const { normalizedPin, room } = resolveRoomByPin(pin);
    const cleanNickname = typeof nickname === 'string' ? nickname.trim() : '';

    if (!normalizedPin || !cleanNickname) {
      socket.emit('room:error', { message: 'Please enter a valid room PIN and nickname.' });
      return;
    }

    // Room not found
    if (!room) {
      socket.emit('room:error', { message: 'No room found with that PIN.' });
      return;
    }

    const joinAvatar = typeof avatar === 'string' ? avatar.slice(0, 8) : '🎮';

    function queueJoinRequest(message) {
      room.pendingJoinRequests.set(socket.id, {
        socketId: socket.id,
        playerId: typeof playerId === 'string' ? playerId.slice(0, 64) : null,
        nickname: cleanNickname,
        avatar: joinAvatar,
        pin: room.pin,
      });
      socket.data.pin = room.pin;

      const hostSocket = io.sockets.sockets.get(room.hostSocketId);
      if (hostSocket) {
        hostSocket.emit('host:join_request', {
          socketId: socket.id,
          nickname: cleanNickname,
          avatar: joinAvatar,
        });
      }

      socket.emit('room:join_pending', {
        message,
      });
    }

    // Finished rooms do not accept new players.
    if (room.state === 'finished') {
      socket.emit('room:error', {
        message: 'This game session has ended. Please wait for a new session.',
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
      queueJoinRequest('Your request has been sent. Waiting for the host to approve…');
      return;
    }

    // Late join while game is active — host approval required
    if (room.state !== 'lobby') {
      queueJoinRequest('Game is active. Waiting for host approval to join now…');
      return;
    }

    // Add player to room
    const player = {
      id: socket.id,
      playerId: typeof playerId === 'string' ? playerId.slice(0, 64) : null,
      nickname: cleanNickname,
      avatar: joinAvatar,
      score: 0,
      streak: 0,
      maxStreak: 0,
      currentAnswer: null,          // generic — set when player submits
      answerTime: config.GAME.QUESTION_DURATION_SEC,
      disconnected: false,
      disconnectTimer: null,
    };
    room.players.set(socket.id, player);
    socket.join(room.pin);

    // Tag the socket with its room PIN for disconnect cleanup
    socket.data.pin = room.pin;
    socket.data.isHost = false;

    console.log(`[Room ${room.pin}] Player joined: ${cleanNickname} (${socket.id})`);

    // Confirm to the joining player
    socket.emit('room:joined', {
      pin: room.pin,
      nickname: player.nickname,
      avatar: player.avatar,
      players: getPlayerList(room),
      quizSlug: room.quizSlug || null,
    });

    // Notify everyone in the room (including host) about the updated player list
    io.to(room.pin).emit('room:player_joined', {
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
  socket.on('host:start', async ({ sessionRandomize, sessionQuestionLimit, hostUid, hostToken, hostLaunchCode } = {}) => {
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
      if (room.state === 'starting' && !room.questionTimer && room.questionIndex === 0) {
        console.warn(`[Room ${room.pin}] Recovering stale "starting" state back to lobby before host:start.`);
        room.state = 'lobby';
      } else {
        socket.emit('room:error', { message: 'Game already started.', code: 'GAME_ALREADY_STARTED' });
        return;
      }
    }

    room.state = 'starting'; // prevent double-start during async quiz load

    try {

    const access = await verifyHostPremiumLaunchAccess({
      quizSlug: room.quizSlug,
      hostUid,
      hostToken,
      hostLaunchCode,
    });

    if (!access.allowed) {
      room.state = 'lobby';
      socket.emit('room:error', {
        message: access.message,
        code: access.code,
        priceTier: access.accessMeta?.priceTier || null,
      });
      return;
    }

    console.log(`[Room ${room.pin}] Game started by host ${socket.id}`);
    console.log(`[Room ${room.pin}] Quiz slug provided: "${room.quizSlug}"`);

    // Use preloaded quiz data if available (fetched at room creation), otherwise fetch now
    const quizData = room.preloadedQuizData || await refreshQuestions(room.quizSlug);
    room.preloadedQuizData = null; // clear cache after use

    // If a specific quiz was requested but couldn't be loaded, abort
    if (room.quizSlug && quizData.questions === DEFAULT_QUESTIONS) {
      room.state = 'lobby';
      socket.emit('room:error', { message: `Could not load quiz "${room.quizSlug}" from the database. Check that the quiz ID is correct and Firestore is connected.` });
      return;
    }

    const doRandomize = (sessionRandomize !== undefined && sessionRandomize !== null)
      ? sessionRandomize
      : quizData.randomizeQuestions;
    room.questions = doRandomize
      ? shuffleArray([...quizData.questions])
      : quizData.questions;

    // Apply session question limit (host can choose a subset of questions)
    const limitNum = sessionQuestionLimit ? parseInt(sessionQuestionLimit, 10) : NaN;
    if (!isNaN(limitNum) && limitNum > 0 && limitNum < room.questions.length) {
      room.questions = room.questions.slice(0, limitNum);
    }

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

    const dispatchDefault = () => {
      // Broadcast game start to everyone in the room
      io.to(room.pin).emit('game:start', {
        totalQuestions: room.questions.length,
      });

      // Send first question immediately — the clients' countdown overlay
      // gates the reveal so players get the full countdown experience.
      // The server timer is extended by 5s to account for the countdown.
      sendQuestion(room, { countdownExtraMs: 5000 });
    };

    const handledByMode = callRoomGameModeHook(room, 'onGameStart', {
      room,
      io,
      socket,
      quizData,
      sessionRandomize,
      sessionQuestionLimit,
      dispatchDefault,
    });

    if (handledByMode === true) return;
    dispatchDefault();
    } catch (error) {
      room.state = 'lobby';
      console.error(`[Room ${room.pin}] host:start failed:`, error?.message || error);
      socket.emit('room:error', {
        message: 'Failed to start game. Please try again.',
        code: 'HOST_START_FAILED',
      });
    }
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

  // ── HOST: Sync room state (authoritative recovery path) ─
  socket.on('host:sync_state', () => {
    const room = findHostRoom(socket.id);
    if (!room) {
      socket.emit('host:state_sync', { ok: false, code: 'ROOM_NOT_FOUND', message: 'Room not found.' });
      return;
    }

    const payload = {
      ok: true,
      pin: room.pin,
      roomState: room.state,
      hostIsPlayer: !!room.hostIsPlayer,
      players: getPlayerList(room),
      questionData: null,
      leaderboard: null,
    };

    if ((room.state === 'question' || room.state === 'question-pending') && room.currentQuestionPayload) {
      const elapsed = Math.max(0, (Date.now() - Number(room.questionStartTime || 0)) / 1000);
      const duration = Number(room.questionDuration || config.GAME.QUESTION_DURATION_SEC);
      payload.questionData = {
        questionIndex: Number(room.questionIndex || 0),
        total: Array.isArray(room.questions) ? room.questions.length : 0,
        question: room.currentQuestionPayload,
        duration,
        timeRemaining: Math.max(1, Math.ceil(duration - elapsed)),
        players: getPlayerList(room),
      };
    }

    if (room.state === 'leaderboard' || room.state === 'finished') {
      payload.leaderboard = buildLeaderboard(room);
    }

    socket.emit('host:state_sync', payload);
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

  // ── HOST: Force end question (client safety net when server timer missed) ──
  socket.on('host:force_end_question', () => {
    const room = findHostRoom(socket.id);
    if (!room) return;
    if (room.state !== 'question' && room.state !== 'question-pending') return;
    console.log(`[Room ${room.pin}] Force end question triggered by host client (timer safety net).`);
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
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
    const dispatchDefault = () => {
      io.to(room.pin).emit('game:over', { leaderboard, endedByHost: true });
    };

    const handledByMode = callRoomGameModeHook(room, 'onGameOver', {
      room,
      io,
      socket,
      leaderboard,
      endedByHost: true,
      dispatchDefault,
    });

    if (handledByMode === true) return;
    dispatchDefault();
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
    if (!room || room.state === 'finished') return;

    const pending = room.pendingJoinRequests.get(socketId);
    if (!pending) return;

    room.pendingJoinRequests.delete(socketId);

    const player = {
      id: socketId,
      playerId: pending.playerId || null,
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
      playerSocket.data.pin = room.pin;
      playerSocket.data.isHost = false;

      const basePayload = {
        pin: room.pin,
        nickname: player.nickname,
        avatar: player.avatar,
        players: getPlayerList(room),
        score: Number(player.score || 0),
        streak: Number(player.streak || 0),
        roomState: room.state,
        role: getRoleForPlayer(room, playerSocket.id),
      };

      if (room.state === 'lobby') {
        playerSocket.emit('room:joined', {
          pin: room.pin,
          nickname: player.nickname,
          avatar: player.avatar,
          players: getPlayerList(room),
          quizSlug: room.quizSlug || null,
        });
      } else if ((room.state === 'question' || room.state === 'question-pending') && room.currentQuestionPayload) {
        const elapsed = (Date.now() - room.questionStartTime) / 1000;
        const timeRemaining = Math.max(1, room.questionDuration - elapsed);
        playerSocket.emit('room:rejoined', {
          ...basePayload,
          questionData: {
            questionIndex: room.questionIndex,
            total: room.questions.length,
            question: room.currentQuestionPayload,
            duration: room.questionDuration,
            timeRemaining,
            players: getPlayerList(room),
            hasAnswered: player.currentAnswer !== null,
          },
        });
      } else if (room.state === 'finished') {
        playerSocket.emit('room:rejoined', { ...basePayload, leaderboard: buildLeaderboard(room) });
      } else {
        playerSocket.emit('room:rejoined', basePayload);
      }
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

    const dispatchDefault = () => {
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
    };

    const handledByMode = callRoomGameModeHook(room, 'onPlayerAnswer', {
      room,
      io,
      socket,
      player,
      questionIndex,
      answer,
      timeTakenSec,
      dispatchDefault,
    });

    if (handledByMode === true) return;
    dispatchDefault();
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
    const { room } = resolveRoomByPin(pin);
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
    socket.join(room.pin);
    socket.data.pin = room.pin;
    socket.data.isHost = false;

    console.log(`[Room ${room.pin}] Player reconnected: ${existingPlayer.nickname} (${socket.id})`);

    const basePayload = {
      pin: room.pin,
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
    io.to(room.pin).emit('room:player_joined', { players: getPlayerList(room) });
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

    // Host disconnected — give a 20-second grace period before destroying the room.
    // This mirrors the 30s grace players already get, and critically preserves the
    // room PIN so that shared join links remain valid through brief network drops.
    const hostedRoom = Array.from(rooms.values()).find(
      (r) => r.hostSocketId === socket.id
    );
    if (hostedRoom) {
      console.log(`[Room ${hostedRoom.pin}] Host disconnected — 20 s grace window started.`);
      hostedRoom.hostDisconnected = true;

      hostedRoom.hostDisconnectTimer = setTimeout(() => {
        // Only destroy if host never came back
        if (!hostedRoom.hostDisconnected) return;
        console.log(`[Room ${hostedRoom.pin}] Host reconnect window expired. Closing room.`);
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

        for (const [pendingSocketId] of hostedRoom.pendingJoinRequests) {
          const pendingSocket = io.sockets.sockets.get(pendingSocketId);
          if (pendingSocket) {
            pendingSocket.emit('room:closed', {
              message: 'The host has disconnected. The game has ended.',
            });
          }
        }

        setTimeout(() => {
          io.socketsLeave(hostedRoom.pin);
          clearPinAliasesForTargetPin(hostedRoom.pin);
          rooms.delete(hostedRoom.pin);
        }, 500);
      }, 60000); // 60-second grace period
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

  // ── Self-ping keepalive ──────────────────────
  // Prevents Render free-tier from spinning down the server after ~15 min idle.
  // Pings our own /health endpoint every 10 minutes.
  const keepAliveUrl = `https://${config.DOMAIN}/health`;
  setInterval(() => {
    fetch(keepAliveUrl).catch(() => {});
    console.log(`[KeepAlive] Pinged ${keepAliveUrl} — ${rooms.size} active room(s)`);
  }, 10 * 60 * 1000); // every 10 minutes
});
