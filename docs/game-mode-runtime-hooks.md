# Game Mode Runtime Hooks

`public/js/game.js` now supports optional runtime hooks through a global object:

- `window.__QYAN_GAME_MODE_RUNTIME`

It also auto-loads runtime modules by URL param `gameMode` using:

- `public/js/gameModes/runtime/index.js`

If a hook returns `true`, the core runtime treats the event as fully handled and skips default behavior.

## Supported hooks

- `onGameStart({ totalQuestions, state, socket, showView })`
- `onGameQuestion({ data, state, socket, renderQuestion, showView })`
- `onQuestionEnd({ data, state, socket, showQuestionResult, showView })`
- `onLeaderboard({ data, state, socket, showLeaderboard, showView })`
- `onGameOver({ data, state, socket, showView })`

## Minimal example

```html
<script>
  window.__QYAN_GAME_MODE_RUNTIME = {
    onGameQuestion({ data, renderQuestion }) {
      // custom per-mode logic before default rendering
      renderQuestion(data, false);
      return true; // skip default game.js handler
    }
  };
</script>
```

## Add a new mini-game runtime module

1. Create a file under `public/js/gameModes/runtime/` (example: `my-mode.runtime.js`).
2. Export an object with any subset of the supported hooks.
3. Register it in `public/js/gameModes/runtime/index.js` with key equal to the `gameMode` URL value.

After that, launching with `?gameMode=my-mode` uses your module automatically, with no edits in `public/js/game.js`.

## Included example

- Registered sample mode: `runtime-example`
- File: `public/js/gameModes/runtime/runtimeExample.runtime.js`
- Behavior: overrides `onGameQuestion`, calls `renderQuestion(...)`, and adds a mode badge message for players.

Test URL example:

- `/player?quiz=YOUR_QUIZ_SLUG&mode=host&gameMode=runtime-example`

## Why this helps

- New mini-games can override lifecycle handling without editing `public/js/game.js`.
- Core runtime remains stable while modes evolve independently.
- Existing behavior is unchanged when no runtime hooks are provided.

## Server-side hooks

Server game lifecycle hooks are documented in `docs/server-game-mode-runtime-hooks.md` and loaded from `server/gameModes/runtime/index.js`.
