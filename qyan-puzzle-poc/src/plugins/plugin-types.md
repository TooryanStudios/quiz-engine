# Plugin Types & Contracts

Each plugin must export an object containing:
- `id` (String): A unique identifier for the plugin.
- `init(context, config)` (Function): Called when the plugin is created.
  - `context`: Standard dependencies like `scene`, `target`, `eventBus`.
  - `config`: Plugin-specific parameters.
- `destroy()` (Function): Called to clean up events and tweens.
