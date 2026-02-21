# Quiz Engine

Real-time multiplayer quiz engine with host/player views, QR join, and multiple question types.

## Local vs Global Mode

The host lobby includes a toggle:
- **Global**: QR points to `https://quizengine.onrender.com`
- **Local**: QR points to `http://<YOUR_LOCAL_IP>:<PORT>`

The server automatically detects your LAN IPv4 address. If detection fails (no Wi-Fi or firewall blocks it), the app defaults to Global mode and shows a warning.

### Find your Local IP manually

**Windows (PowerShell):**
```
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254*' } | Select-Object -First 1 -ExpandProperty IPAddress
```

**macOS / Linux:**
```
ipconfig getifaddr en0
```

If `en0` is not your Wi-Fi interface, use `ifconfig` or `ip a` to find the active IPv4 address.

## Remote Quiz Data Source

The server fetches quiz data from the internet before each game start.
- Default URL: `https://quizengine.onrender.com/api/quiz-data`
- Override with env var: `QUIZ_DATA_URL=https://your-domain/quiz.json`
- Optional shareable slug via host URL: `https://quizengine.onrender.com/?quiz=animals-pack-quiz-1`

If a `quiz` slug is present, the host sends it to the server and the server requests remote data with `?slug=<quiz>`.

The server handles all remote fetching so clients never hit CORS/HTTPS issues.

## Stripe Subscription Endpoints

- `POST /api/stripe/create-checkout-session` (requires `STRIPE_SECRET_KEY`)
- `POST /api/stripe/webhook` (requires `STRIPE_WEBHOOK_SECRET`, verifies signature)

Webhook now updates Firebase `entitlements/{userId}` using metadata (`uid`, `packId`).

### Backend env setup

Copy `.env.example` and fill:

```env
QUIZ_DATA_URL=https://quizengine.onrender.com/api/quiz-data
PAYMENTS_MODE=mock
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_JSON={...single-line-json...}
```

### PoC payment mode (no real money)

Set `PAYMENTS_MODE=mock` to bypass real Stripe charges.

- Admin app calls mock purchase endpoint and grants entitlements directly.
- Backend endpoint: `POST /api/payments/mock-purchase`.
- `GET /health` shows current `paymentsMode`.

When you are ready for real payments, switch to `PAYMENTS_MODE=stripe` and set Stripe secrets.

## Development

```
npm install
npm run dev
```
