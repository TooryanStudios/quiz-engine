# QYan Gaming Admin App

Separate admin app to manage quizzes, packs, and subscription billing.

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Fill Firebase and Stripe keys
3. Run:

```bash
npm install
npm run dev
```

## Required env vars

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_TEST_PRICE_ID=
VITE_API_BASE_URL=https://quizengine.onrender.com
VITE_PAYMENTS_MODE=mock
```

## Firestore data model

### quizzes/{quizId}
- ownerId
- title
- slug
- visibility (`public` | `private`)
- tags
- questions[]
- createdAt, updatedAt

### packs/{packId}
- ownerId
- title
- slug
- description
- stripePriceId
- quizIds[]

### entitlements/{userId}
- activePackIds[]
- plan
- validUntil

## Stripe flow

- Frontend: `POST /api/stripe/create-checkout-session`
- Backend verifies webhook: `POST /api/stripe/webhook`
- Webhook updates Firestore entitlements (`entitlements/{uid}`)

## PoC mock payments

For proof-of-concept without real money:

- Set `VITE_PAYMENTS_MODE=mock` in admin app env
- Set `PAYMENTS_MODE=mock` in quiz-engine backend env

Billing page will use **Simulate Purchase** and grant entitlement directly.

## Shareable quiz links

Use public slug links:

`https://quizengine.onrender.com/?quiz=<slug>`

The quiz engine server fetches quiz data by slug from cloud source.

## Experimental voice chat (testing only)

The admin app includes a test page at `/voice-lab` for real-time voice trials.

- Status: experimental (not production-ready)
- Scope: small room tests only (recommended 2–4 users)
- Room format: must start with `test-` (example: `test-team-a`)
- Signaling: Firestore (`voiceRooms/{roomId}` with `participants` and `signals` subcollections)

### Cost notes

- Browser-to-browser audio uses WebRTC peer-to-peer where possible.
- Current test setup uses free public STUN and no TURN relay.
- Main Firestore cost is signaling reads/writes (usually low for test usage).
- For production reliability, TURN is typically required and becomes the main bandwidth cost.

### Integration notes

1. Keep Voice Lab behind authenticated admin users only.
2. Restrict test room IDs and Firestore rules (already enforced by `test-` room format).
3. For production rollout, move signaling to dedicated backend controls and add managed TURN.
