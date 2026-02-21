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

The server handles all remote fetching so clients never hit CORS/HTTPS issues.

## Development

```
npm install
npm run dev
```
