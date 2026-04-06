# Quick Start - JSON Config System

## ✅ System is Active!

The JSON configuration system is now active and working. You can edit the config file to change video/image backgrounds without touching any code.

## 📍 Config File Location

**Edit this file to change settings:**
```
C:\Projects\quiz-engine\admin-app\modular-game-platform\public\lights-skill-game\config\ui-config.json
```

## 🎮 Access the Game

**Use this URL:**
```
http://localhost:3001/play/lights-skill-game
```

## 🔧 How to Make Changes

1. **Open** `ui-config.json` in any text editor
2. **Edit** the values you want to change (see examples below)
3. **Save** the file
4. **Hard-refresh** your browser (Ctrl + Shift + R)
5. **Play through** to the win screen to see changes

## 📝 Quick Examples

### Change Video Position
```json
"position": {
  "x": -5,    // Move left (negative) or right (positive)
  "y": 0      // Move up (negative) or down (positive)
}
```

### Change Video Scale
```json
"scale": {
  "x": 1.09,  // Horizontal scale (1.0 = 100%)
  "y": 1.09   // Vertical scale (1.0 = 100%)
}
```

### Change to Image Background
```json
"background": {
  "type": "image",
  "url": "./sprites/your-image.png",
  "position": { "x": 0, "y": 0 },
  "scale": { "x": 1.0, "y": 1.0 },
  "alpha": 1.0
}
```

### Remove Background
```json
"background": {
  "type": "none"
}
```

## 🎛️ Debug Controls

The debug panel with sliders still appears when you open the win panel. Use it to:
- Fine-tune position with +/- buttons
- Adjust scale in real-time
- Click "Print Settings to Console" to get exact values
- Copy those values into the JSON file

## 📂 Current Settings

Your current working values in the JSON file:
- **Type:** video
- **URL:** `./sprites/ba5aa73d88e980cd712a6ad1216260a4_720w.mp4`
- **Position:** x: -5, y: 0
- **Scale:** x: 1.09, y: 1.09
- **Alpha:** 0.7 (70% opacity)

## 🚀 Next Steps

1. Test the system by changing a value in `ui-config.json`
2. Use the debug sliders to find perfect settings
3. Copy final values from debug panel to JSON file
4. When ready, we can remove the debug controls

For detailed documentation, see `README.md` in the same folder.
