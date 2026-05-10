# App Isolation Blueprint

## Goal

Prevent development failures in one tool, such as Canvas, from interrupting other tools, such as Video Editor or Vid Player, while preserving shared Firebase assets, shared jobs, and shared user authentication.

## Current State

- The workspace currently runs as one Vite app from the root `package.json`.
- `npm run dev` starts one frontend process and one API process.
- Routes such as `/vidEdit`, `/canvas`, and `/vidplayer` are lazy-loaded inside one React app shell.
- Route error boundaries already help with runtime React errors, but they cannot isolate syntax errors, failed transforms, bad imports, or HMR invalidation in a single Vite module graph.

## Recommended Architecture

Use a modular monorepo with separate frontend apps and shared platform packages.

### Target Apps

- `apps/shell`: auth shell, navigation, lightweight dashboards, route handoff.
- `apps/videdit`: video editor UI and render orchestration.
- `apps/canvas`: workflow builder, generation canvas, visual tooling.
- `apps/vidplayer`: playback and review surface.
- `functions-chatbot`: shared backend and job orchestration.

### Shared Packages

- `packages/firebase-client`: Firebase app bootstrap, auth helpers, Firestore/Storage access helpers.
- `packages/api-client`: typed HTTP clients for `/api` endpoints.
- `packages/shared-types`: project, asset, job, and permission types.
- `packages/shared-schemas`: runtime validators for Firestore documents and API payloads.
- `packages/ui`: shared primitives, tokens, and low-level components.
- `packages/media-domain`: asset records, render jobs, generation jobs, timeline references, storage path helpers.

## Industry Standard Principles

### 1. Isolate build graphs, not just components

Separate apps must have separate dev servers and separate bundler graphs.

- A broken import in Canvas should only break the Canvas dev server.
- Video Editor should keep running on its own port and keep its local state alive.
- Vid Player should remain available even if either editor is broken.

### 2. Keep one shared source of truth

Communication between apps must happen through shared backend state, not by one frontend talking directly to another frontend's memory.

- Firebase Auth stays shared.
- Firestore stays shared.
- Firebase Storage stays shared.
- Backend job APIs stay shared.

### 3. Make long-running work backend-owned

Rendering, generation, exports, imports, and media processing should be owned by the backend.

- Frontend submits a job.
- Backend returns a `jobId`.
- Backend updates job status in Firestore or via API.
- Any app can reconnect to the job later.

### 4. Share contracts, not copies

Do not duplicate Firestore shapes or asset logic in each app.

- Shared types define the canonical shape.
- Shared schemas validate reads and writes.
- Shared helpers centralize path conventions and status handling.

## Communication Model Between Apps

### Canonical data flow

1. Canvas creates or updates a generation request.
2. Backend writes a `generationJob` record.
3. Backend stores output files in Firebase Storage.
4. Backend creates or updates an `asset` record.
5. Video Editor subscribes to the related project and asset records.
6. Vid Player reads the same project and asset records.

This is the standard way to let multiple tools collaborate without coupling their runtimes.

### Recommended shared collections

- `projects`
- `assets`
- `generationJobs`
- `renderJobs`
- `timelines`
- `projectViews` or `derivedAssets` if needed for denormalized read models

### Minimum document expectations

Every shared job record should include:

- `id`
- `projectId`
- `type`
- `status` with values such as `queued`, `running`, `done`, `failed`
- `createdBy`
- `createdAt`
- `updatedAt`
- `inputRef` or `inputPayload`
- `outputAssetIds`
- `error` when failed

Every shared asset record should include:

- `id`
- `projectId`
- `kind`
- `storagePath`
- `downloadUrl` or resolvable storage reference
- `metadata`
- `version`
- `createdAt`
- `updatedAt`
- `createdBy`

## Proposed Repo Layout

```text
admin-app/
  apps/
    shell/
    videdit/
    canvas/
    vidplayer/
  packages/
    api-client/
    firebase-client/
    media-domain/
    shared-schemas/
    shared-types/
    ui/
  functions-chatbot/
  docs/
```

## Development Ports

Recommended development ports:

- `3000` for `shell`
- `3001` for `videdit`
- `3002` for `canvas`
- `3003` for `vidplayer`
- `8787` for shared API/backend

## URL Strategy

There are two acceptable standard approaches.

### Option A: Separate URLs during development

- `http://localhost:3001/` for Video Editor
- `http://localhost:3002/` for Canvas
- `http://localhost:3003/` for Vid Player

This is the simplest and most robust during migration.

### Option B: One visible origin with local proxy

- `/vidEdit` proxied to `3001`
- `/canvas` proxied to `3002`
- `/vidplayer` proxied to `3003`

This preserves the current route shape while keeping app isolation behind the proxy.

## Migration Plan

### Phase 1: Extract shared platform code

Move only the code that must remain common.

- Firebase config and auth bootstrap
- Firestore and Storage helpers
- API clients
- shared types and schemas
- shared design tokens or base UI primitives

Do not move heavy feature code yet.

### Phase 2: Extract Video Editor first

Video Editor is the best first extraction candidate because it is already conceptually isolated and operationally sensitive.

Move into `apps/videdit`:

- `src/pages/VideoEditorPage.tsx`
- `src/pages/VideoEditorPage.css`
- `src/reactvideoeditor/**`
- only the page-specific hooks, components, and types that the editor truly owns

Keep shared backend rendering in `functions-chatbot`.

### Phase 3: Extract Canvas second

Move into `apps/canvas`:

- `src/pages/WorkflowBuilderTestPage.tsx`
- `src/pages/WorkflowBuilderTestPage.css`
- `src/features/workflowBuilder/**`
- only Canvas-owned support code

This is the app most likely to cause dev-time interruption from feature churn, so isolating it second delivers immediate value.

### Phase 4: Extract Vid Player third

Move into `apps/vidplayer`:

- `src/pages/VidPlayerPage.tsx`
- `src/pages/VidPlayerPage.css`
- player-specific helpers and UI

### Phase 5: Reduce the shell

After the heavy tools are extracted, keep the root shell thin.

- login
- top-level navigation
- dashboard and lightweight admin surfaces
- redirects or proxy handoff to tool apps

## How Shared Assets Continue To Work

Shared assets are not harmed by the split if the split is done at the frontend boundary only.

- Canvas writes generation output to shared Storage and Firestore.
- Video Editor reads the same records.
- Vid Player reads the same records.
- None of these apps depends on another app being open.

The rule is simple: apps do not exchange business data directly. They exchange business state through shared backend records.

## Guardrails For A Safe Migration

### Use shared schemas for writes

All writes to project, asset, timeline, and job records should pass through one shared schema layer.

### Use stable IDs

Jobs, assets, and project references must be stable across apps.

### Version key records

If asset or timeline shape changes over time, add explicit `version` fields so older apps or migrations can handle them safely.

### Keep auth bootstrap identical

Each app must use the same Firebase project config and the same auth/session conventions.

### Do not duplicate storage path rules

Storage path helpers should live in one package so every app resolves asset locations the same way.

## What Not To Rely On

- React context across apps
- in-memory route state as a communication mechanism
- cross-tab state as the primary source of truth
- a single SPA with route boundaries as the main isolation strategy

## Optional Real-Time Convenience Layer

For faster UX when multiple tool tabs are open simultaneously, it is acceptable to add a secondary real-time hint channel.

- `BroadcastChannel`
- `storage` events
- lightweight websocket notifications

These should only be used to hint that new data is available. They should not replace the shared backend record as the source of truth.

## Concrete First Step For This Repo

The lowest-risk sequence is:

1. Create `packages/shared-types`, `packages/firebase-client`, and `packages/api-client`.
2. Extract Video Editor into `apps/videdit` and run it on `3001`.
3. Keep existing shared backend routes in `functions-chatbot`.
4. Point the current `/vidEdit` route in the shell to the standalone app during development.
5. Extract Canvas into `apps/canvas` only after Video Editor is stable.

This sequence gives immediate isolation for the most operationally sensitive tool without forcing a full rewrite.

## Success Criteria

The migration is successful when all of the following are true:

- A syntax error in Canvas does not interrupt Video Editor development.
- A render started from Video Editor survives frontend refresh or local UI restart.
- Canvas-generated assets appear in Video Editor through shared backend records.
- Vid Player can read the same asset records without app-to-app coupling.
- Shared auth, permissions, and project ownership remain consistent across apps.
