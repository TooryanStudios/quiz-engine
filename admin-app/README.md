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
