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
VITE_LOCAL_GAME_URL=http://localhost:3001
VITE_PAYMENTS_MODE=mock
VITE_TINYMCE_DEPLOYMENT_MODE=self-hosted
VITE_TINYMCE_API_KEY=
VITE_TINYMCE_SCRIPT_SRC=
```

## TinyMCE setup (free by default)

The editor is configured to use **self-hosted TinyMCE** by default, which is free under GPL and does not require a Tiny Cloud API key.

- `VITE_TINYMCE_DEPLOYMENT_MODE=self-hosted`:
	Uses local `/public/tinymce` assets.
- `VITE_TINYMCE_DEPLOYMENT_MODE=cloud`:
	Uses Tiny Cloud and requires `VITE_TINYMCE_API_KEY`.
- `VITE_TINYMCE_SCRIPT_SRC` (optional):
	Override script source explicitly for advanced hosting/CDN setups.

TinyMCE assets are synced from `node_modules/tinymce` to `public/tinymce` automatically before `dev` and `build`.

## Local gameplay preview

For local gameplay testing, set:

```env
VITE_LOCAL_GAME_URL=http://localhost:3001
```

When the admin app runs on localhost, launch/share links will automatically target your local gameplay server.

- Host preview on localhost uses: `http://localhost:3001/?quiz=<id>&mode=host&theme=<themeId>`
- Player preview on localhost uses: `http://localhost:3001/?quiz=<id>&theme=<themeId>`

## WorkHub email notifications (Cloud Functions)

WorkHub access request and approval/suspension notifications are sent from Firebase Cloud Functions using SMTP.

Set these values in `functions/.env` (or with your deployed function params):

```env
EMAIL_NOTIFICATIONS_ENABLED=true
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM="QYan WorkHub <no-reply@your-domain.com>"
SMTP_REPLY_TO=support@your-domain.com
```

Notes:
- `EMAIL_NOTIFICATIONS_ENABLED` must be `true` to send emails.
- `MASTER_EMAIL` receives new pending WorkHub access request notifications.
- Users receive email when their WorkHub status changes to `approved` or `suspended`.
- Notification send failures are logged, but they do not block WorkHub actions.

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

`https://quizengine.onrender.com/player?quiz=<slug>`

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
