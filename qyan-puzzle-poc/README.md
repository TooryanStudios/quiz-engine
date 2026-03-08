# The Hidden Gate - POC

A browser-playable Phaser 3 proof of concept using plain JavaScript and Vite.

## Goal
This project is a modular, standalone puzzle game prototype for QYan. It represents a single 5 to 7 minute vertical slice featuring intro scenes, dialogue captions, drag-and-drop puzzles, and sequence puzzles. It uses a lightweight plugin architecture so scenes can be driven primarily by data.

## Setup & Running

```bash
npm install
npm run dev
```

Then visit the dev server URL in your browser.

## Architecture

- **SaveState**: Holds lightweight session state including unlocked puzzle flags and inventory.
- **EventBus**: Global EventEmitter for decoupled communication.
- **PluginRegistry**: Registers small reusable behavior chips (plugins) that can be dynamically instanced on any scene object.

## Scene Flow
1. **BootScene**: App startup.
2. **PreloadScene**: Loads placeholders and generates fallback graphics on the fly.
3. **UIScene**: Launched in parallel to provide sticky top-level views like the restart button.
4. **IntroScene**: Displays sequential story panels.
5. **StoryScene01**: The valley entrance (teaches clicking and highlighting).
6. **PuzzleScene01**: Drag-and-drop rope to bucket, bucket to canal to retrieve key stone.
7. **StoryScene02**: Gate chamber lead-in scene.
8. **PuzzleScene02**: 3 ring alignment puzzle to open gate.
9. **EndingScene**: Final conclusion scene and reveal.

Safe to remove or run isolated. Does not share codebase dependencies with the main QYan project.
