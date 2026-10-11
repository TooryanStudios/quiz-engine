# WorkHub layout prototype

Run from `admin-app`: `npm run dev:workhub -- --host 127.0.0.1`.

Open http://localhost:3002/prototype.html. The existing WorkHub remains at http://localhost:3002/workhub. The old 127.0.0.1 prototype link redirects to localhost, which is already an authorized Firebase sign-in domain.

This is an isolated React entry point for reviewing the new layout against original WorkHub data. It reuses the project's Firebase initialization, Google provider, persistent authentication session, entity types, workspace access helper, ancestor visibility helper, and configured task statuses. No deployment, Firebase security settings, or production build configuration was changed.

Sign in with the existing Google account. Approved membership is required. Workspaces, folders, tasks, documents, boards, member display names, and notifications load through Firestore subscriptions. Folder nesting is shown progressively. Search and type filters expose workspace items when needed. My work uses actual assignee IDs. Navigation uses URL parameters with browser Back/Forward and refresh support.

Details show original descriptions, document text, checklists and task statuses. Item discussions and workspace conversations/activity read existing collections. Sending messages and advanced document/board tools open the corresponding item in the current WorkHub, pending the next integration phase. Task status dropdowns and completion controls update original task records. Quick-add rows create tasks in the selected folder, inheriting its visibility and members. These controls write to the existing Firebase database from the local preview. No sample-data fallback exists. Loading, empty, unavailable and error states are separate.

Workspace visibility and member-specific full access are respected; restricted ancestors prevent descendants from appearing. Related boards and activity also obey visible-entity checks. Subscriptions stop when auth or access changes. Current scope keys prevent previous-account data from being rendered during transitions. Server-side Firestore rules remain authoritative.

UI strings are in `locales/en.json` and `locales/ar.json`, separate from components. The live entity adapter is in `data.ts` and subscriptions are in `useLiveWorkhub.ts`. Dates and numbers use `Intl`; Arabic activates RTL through logical CSS properties. Workspace names, user content, and configured statuses remain in their original language. Theme and language persist under prototype-specific localStorage keys.

Type check: `npx tsc --project apps/workhub/prototype/tsconfig.json`.

Permission and routing tests: `npx vitest run tests/workhub-live-layout.test.ts`.

The shell stays within the viewport. Workspace navigation, title, filters and table headings stay visible while the item list scrolls independently. The workspace sidebar has a separate scroll region and a persisted collapse control. Details use a complementary panel without a backdrop or focus trap; narrow screens use a panel over the item area without dimming the page. Discussion subscriptions stay active while the selected item is open, including when viewing Details. The item table, date/number formatters, and document text are memoized to avoid repeated work when switching detail tabs.

The earlier `previews/light-en.png` and `previews/dark-ar.png` images show the initial sample layout; live preview captures use a `live-` prefix.

Workspaces now have an inner sections panel with expandable folders, direct subfolder selection, section search, and independent scrolling. Selecting a section lists only its direct non-folder items. All workspace items lists content across the workspace; folders remain in the navigation panel. Section search preserves matching ancestor paths. The sections panel fills the inner height directly below the header and can collapse. Content stays aligned to the start edge. The details rail overlays the end edge without resizing or recentering the item list; selecting another folder while it is open updates its details and keeps it open.


The compact workspace trail includes chat and editor actions; repeated workspace headings are removed. Status groups and filters use inherited original configuration. Completion is available when that configuration includes a completed/done status. Files have a separate details tab. Scrollbars are thin and reveal on hover or keyboard focus.

List and Cards share status filtering and row selection. Quick-add precedes task rows. Completed items have a green treatment. Subtasks display original checklist progress and can update completion. Tree plus controls create folders, documents, or tasks inside the chosen folder, preserving access settings. Expanded ancestry remains open across section changes.

Task row checkboxes select tasks for bulk status, assignee changes, or confirmed permanent deletion; they do not complete tasks. Inline task drafts include assignee, due date and priority. Details reuse repository task updates, checklist editing, existing Firebase/Drive upload paths, and original comment/activity/notification collections. Mention candidates and assignees respect restricted ancestry. Deadlines count calendar days in Asia/Muscat. The details rail floats with small margins and rounded corners. No writes are made during verification against the live database.

Tree row creation/settings controls reveal on hover or keyboard focus. Menus offer tasks, documents, notes, folders and projects. Clicking a task selects it; its pencil opens the editor. Assignee pickers retain multiple IDs and show member thumbnails. File cards support image previews, copying/opening URLs, title editing, detaching, uploads and titled external/Drive URLs. Detaching changes the task reference without deleting the stored file. Subtask editing uses a pencil rather than clicking its label.


The layout is now an exported React component loaded through the main WorkHub React Router at `/workhub/next`. The old `prototype.html` URL redirects to that route, preserving its query parameters. Original routes load their original entry styles and application separately. No deployment is required.
