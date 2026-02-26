# Question Type Architecture

This project supports two safe extension paths for new question types.

## 1) Clone-style type (same mechanic)

Use this when the new type behaves exactly like an existing one (for example `order_plus` from `order`).

Required changes:

1. Add the new type id in admin config (`admin-app/src/config/questionTypes.ts`).
2. Add alias mapping only in:
   - `server/questionTypes/index.js` (`aliases: ['new_clone_id']`)
   - `public/js/renderers/questionTypes/index.js` (`aliases: ['new_clone_id']`)

Do **not** add gameplay `if/else` branches in `public/js/game.js` for clone IDs.

Why: gameplay reveal logic is schema-based, so clone aliases work automatically when they reuse the same handler/renderer.

## 2) New mechanic type (new payload schema)

Use this when gameplay behavior is genuinely different.

Required changes:

1. Create a server handler module in `server/questionTypes/`.
2. Register it as a canonical module in `server/questionTypes/index.js`.
3. Create a client renderer entry in `public/js/renderers/questionTypes/`.
4. Register it as a canonical module in `public/js/renderers/questionTypes/index.js`.
5. Add admin-side editor/preview config in `admin-app`.
6. Put type-specific submit UX in the renderer hook `onAnswerSubmitted(answerData)` (in `public/js/renderers/*Renderer.js`) instead of branching in `public/js/game.js`.

Only if reveal payload schema is new, extend schema handling in `public/js/game.js`.

## Verification commands

Run these before merging:


## Mini-game extensibility

For full quiz/mini-game lifecycle overrides without re-editing `public/js/game.js`, use the runtime hook contract documented in `docs/game-mode-runtime-hooks.md`.
