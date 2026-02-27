# File-based Theme System

This folder contains editable game themes.

## Structure

- `themes.manifest.json`: list of available themes.
- `/<theme-id>/theme.json`: token values + base mode.
- `/<theme-id>/theme.css` (optional): extra scoped CSS.
- `/<theme-id>/assets/*`: images (PNG/JPG/SVG).

## Add a new theme

1. Create a folder, e.g. `public/themes/sunset/`.
2. Add `theme.json`:

```json
{
  "id": "sunset",
  "name": "Sunset Glow",
  "baseTheme": "dark",
  "tokens": {
    "--bg": "#2b1027",
    "--surface": "#3a1633",
    "--surface-2": "#4a1f3e",
    "--accent": "#fb7185",
    "--text": "#ffe4e6",
    "--text-dim": "#f9a8d4",
    "--app-bg-image": "url('/themes/sunset/assets/bg.png')",
    "--app-bg-size": "cover",
    "--app-bg-repeat": "no-repeat",
    "--app-bg-position": "center center"
  },
  "cssFile": "/themes/sunset/theme.css"
}
```

3. Put your image files in `assets/` (PNG works directly).
4. Add it to `themes.manifest.json`.

## Edit colors

Change `tokens` in your theme JSON and refresh the app.

## Remove a theme

- Delete the theme folder.
- Remove its entry from `themes.manifest.json`.

If a selected theme is missing, the app falls back to the default theme from the manifest.
