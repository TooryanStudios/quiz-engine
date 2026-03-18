# UI Configuration Guide

## Location
The UI configuration file is located at:
```
/public/lights-skill-game/config/ui-config.json
```

## Structure

### Win Panel Background Configuration

You can configure the background for the win panel (congratulations screen) with the following options:

```json
{
  "winPanel": {
    "background": {
      "type": "video",              // Options: "video", "image", "none"
      "url": "./sprites/your-video.mp4",  // Path to video or image file
      "position": {
        "x": -5,                    // X position (pixels)
        "y": 0                      // Y position (pixels)
      },
      "scale": {
        "x": 1.09,                  // Horizontal scale (1.0 = 100%)
        "y": 1.09                   // Vertical scale (1.0 = 100%)
      },
      "alpha": 0.7,                 // Transparency (0.0 - 1.0)
      "loop": true,                 // Video only: loop playback
      "muted": false,               // Video only: mute audio
      "autoplay": true              // Video only: auto-start
    }
  }
}
```

## Background Types

### Video Background
- **type**: `"video"`
- **Supported formats**: `.mp4`, `.webm`, `.ogg`
- **Additional properties**: `loop`, `muted`, `autoplay`

Example:
```json
"background": {
  "type": "video",
  "url": "./sprites/celebration.mp4",
  "position": { "x": 0, "y": 0 },
  "scale": { "x": 1.0, "y": 1.0 },
  "alpha": 0.8,
  "loop": true,
  "muted": false,
  "autoplay": true
}
```

### Image Background
- **type**: `"image"`
- **Supported formats**: `.png`, `.jpg`, `.jpeg`, `.gif`

Example:
```json
"background": {
  "type": "image",
  "url": "./sprites/celebration-bg.png",
  "position": { "x": 0, "y": 0 },
  "scale": { "x": 1.0, "y": 1.0 },
  "alpha": 1.0
}
```

### No Background
- **type**: `"none"`

Example:
```json
"background": {
  "type": "none"
}
```

## How to Use

1. **Edit the config file**: Open `ui-config.json` in any text editor
2. **Modify values**: Change the background type, URL, position, scale, or alpha
3. **Save the file**: Save your changes
4. **Refresh the game**: Hard-refresh your browser (Ctrl + Shift + R)
5. **Test**: Play through to the win screen to see your changes

## Tips

- **Position**: Use negative values to move left/up, positive to move right/down
- **Scale**: Values less than 1.0 shrink, greater than 1.0 enlarge
- **Alpha**: 0.0 is fully transparent, 1.0 is fully opaque
- **Canvas size**: The game canvas is 768x1400 pixels

## Debug Controls

The debug panel with sliders will still appear when you open the win panel. Use it to fine-tune your settings, then copy the final values to the JSON file.

## Future Extensions

The config file is designed to support additional UI elements in the future, such as:
- Button positions
- Text styling
- Star animations
- Panel layouts

These will be added to the same `ui-config.json` file as needed.
