# Server Game Mode Runtime Hooks

Server-side game mode hooks are resolved per room from:

- `server/gameModes/runtime/index.js`

Each room gets `room.gameModeRuntime` based on the host-selected `gameMode`.

## Supported hooks

- `onGameStart({ room, io, socket, quizData, sessionRandomize, sessionQuestionLimit, dispatchDefault })`
- `onQuestionDispatch({ room, io, questionPayload, players, duration, countdownExtraMs, dispatchDefault })`
- `onQuestionEnd({ room, io, q, roundScores, correctReveal, dispatchDefault })`
- `onGameOver({ room, io, socket, leaderboard, endedByHost, dispatchDefault })`

If a hook returns `true`, the default server behavior is skipped.

## Add a new mode

1. Create `server/gameModes/runtime/my-mode.runtime.js`.
2. Export a creator returning the hook object.
3. Register it in `server/gameModes/runtime/index.js`.

No core edits in `server/server.js` are required for new mode behavior.
