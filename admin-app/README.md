# QYan Gaming Admin App

Separate admin app to manage quizzes, packs, and subscription billing.

## ToorGen remediation implementation docs

The detailed ToorGen implementation plan and sprint tracker are available here:

- [TOORGEN_GREENFIELD_BOOTSTRAP.md](TOORGEN_GREENFIELD_BOOTSTRAP.md) — **START HERE**: Day-by-day build plan for a fresh ToorGen project with all fixes baked in
- [TOORGEN_SECURITY_AND_PRIVACY.md](TOORGEN_SECURITY_AND_PRIVACY.md) — Comprehensive security architecture (auth, validation, file integrity, abuse prevention, privacy, encryption, compliance)
- [TOORGEN_IMPLEMENTATION_PLAN.md](TOORGEN_IMPLEMENTATION_PLAN.md) — 16-week remediation roadmap
- [TOORGEN_IMPLEMENTATION_TRACKER.md](TOORGEN_IMPLEMENTATION_TRACKER.md) — Sprint-ready tickets with Definition of Done
- [TOORGEN_TECHNICAL_REMEDIATION_AND_ARCHITECTURE.md](TOORGEN_TECHNICAL_REMEDIATION_AND_ARCHITECTURE.md) — Architecture and technical design
- [TOORGEN_RISK_REPORT.md](TOORGEN_RISK_REPORT.md) — Risk register and mitigations

Recommended reading order:

1. Greenfield bootstrap (if starting fresh)
2. Security and privacy architecture (how to prevent every attack vector)
3. Risk report (understand what we're fixing)
4. Remediation and architecture guide (how to fix it)
5. Implementation plan (overall roadmap)
6. Sprint tracker (day-to-day execution)

## MSE video sequencer (fragmented MP4)

The app includes an isolated `MSEVideoSequencer` component that streams a sequence
through a single `<video>` element using the browser Media Source Extensions API.

Expected preparation pipeline:

AI-generated MP4 clips
-> normalize with FFmpeg
-> convert to fragmented MP4 / `.m4s` segments
-> place files in `public/videos/sequence/`
-> play using `MSEVideoSequencer`

Expected files:

- `public/videos/sequence/init.mp4`
- `public/videos/sequence/segment001.m4s`
- `public/videos/sequence/segment002.m4s`
- `public/videos/sequence/segment003.m4s`
- `public/videos/sequence/segment004.m4s`

Notes:
- Append `init.mp4` first. It carries track/decoder metadata required before media fragments.
- Append `.m4s` fragments sequentially. Do not append normal standalone MP4 clips as segments.
- The component is opt-in and removable. Enable the demo mount with
	`VITE_ENABLE_MSE_SEQUENCER_DEMO=1` or in dev with `?mseDemo=1`.

Page access and clip workflow:

- Start app: `npm run dev`
- Open: `http://localhost:3000/toorgen/lab`
- In Generated Runs controls, click `Video Sequencer` (next to `Large Cards`)
- In the dialog:
	- Set `Init segment URL` (example: `/videos/sequence/init.mp4`)
	- Paste one `.m4s` segment URL per line
	- Click `Apply Clips` to load the player
	- Click `Save Clips` to keep this list in browser local storage

Your saved clip list can be loaded again from the same page using `Load Saved`.

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

WorkHub email notifications are sent from Firebase Cloud Functions using SMTP.

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
- Users also receive email for in-app WorkHub notifications such as task creation, task updates, comments, and project settings updates.
- Approved members can turn activity emails and access-status emails on or off from the WorkHub notification menu.
- The Master Admin overview page includes a `Send test email` action that sends a real SMTP message through Cloud Functions.
- Notification send failures are logged, but they do not block WorkHub actions.

Deployment:
- If you change anything under `functions/`, deploy Firebase Functions as well as hosting.
- Typical email-related deploy command: `firebase deploy --project qyan-om --only functions,hosting`

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
