# QYan Quiz Engine - Modular Architecture

## 📁 Structure Overview

```
public/js/
├── game.js                    # Main entry point (Socket.IO, routing)
├── state/
│   └── GameState.js          # Centralized state management
├── utils/
│   ├── sounds.js             # Audio engine (Web Audio API)
│   ├── dom.js                # DOM manipulation helpers
│   └── timer.js              # Client-side timer visualization
└── renderers/
    ├── QuestionRenderer.js    # Factory & dispatcher
    ├── BaseRenderer.js        # Base class for all renderers
    ├── SingleChoiceRenderer.js # Single-choice questions
    ├── MultiChoiceRenderer.js  # Multi-select questions
    ├── TypeSprintRenderer.js   # Text input questions
    ├── MatchRenderer.js        # Drag-and-drop matching
    ├── OrderRenderer.js        # Drag-to-reorder
    └── BossRenderer.js         # Boss battle questions
```

---

## 🎯 Architecture Pattern

**Component-Based Modular Design**

Each question type is now a **self-contained renderer class** that:
- Extends `BaseRenderer`
- Implements `render()` for player view
- Implements `renderHost()` for host view
- Manages its own UI state
- Handles its own event listeners
- Provides `cleanup()` for teardown

---

## 🔧 How to Add a New Question Type

### 1. Create a new renderer class

```javascript
// public/js/renderers/MyNewRenderer.js
import { BaseRenderer } from './BaseRenderer.js';

export class MyNewRenderer extends BaseRenderer {
  render() {
    // Build player UI
    const container = this.utils.safeGet('my-container');
    // ... your code
  }
  
  renderHost() {
    // Build host UI
    // ... your code
  }
  
  getAnswer() {
    // Return answer data
    return { myAnswer: 'value' };
  }
  
  cleanup() {
    // Remove event listeners, etc.
  }
}
```

### 2. Register in QuestionRenderer factory

```javascript
// public/js/renderers/QuestionRenderer.js
import { MyNewRenderer } from './MyNewRenderer.js';

static create(questionData) {
  switch (questionData.type) {
    // ... existing cases
    case 'mynew':
      return new MyNewRenderer(questionData);
  }
}
```

### 3. Done! 🎉

Your new question type will automatically integrate with:
- State management
- Sound effects
- Timer system
- Socket.IO communication
- Submit handling

---

## 🚀 Benefits of This Architecture

### ✅ **Separation of Concerns**
- Each question type is isolated
- Easier to understand and debug
- Changes don't affect other types

### ✅ **Reusability**
- Common utilities shared across renderers
- Base class provides common functionality
- DRY principle enforced

### ✅ **Maintainability**
- Small files (~100-200 lines each)
- Clear responsibilities
- Easy to locate bugs

### ✅ **Scalability**
- Easy to add new question types
- Easy to extend existing types
- Team can work on different renderers in parallel

### ✅ **Testability**
- Each renderer can be tested independently
- Utils can be unit tested
- State management is centralized

---

## 📚 API Reference

### BaseRenderer

All renderers extend this base class.

**Methods you must implement:**
- `render()` - Build player UI (interactive)
- `renderHost()` - Build host UI (display only)

**Methods you can implement (optional):**
- `getAnswer()` - Return answer data object
- `cleanup()` - Clean up event listeners, timers, etc.

**Methods you can use:**
```javascript
this.canSubmit()              // Check if user can submit
this.submit(answerData)       // Submit an answer
this.setSubmitButtonVisible(visible, enabled)
this.setSubmitButtonText(text)
this.getSubmitButton()        // Get submit button element
this.utils.safeGet(id)        // Safe getElementById
this.utils.escapeHtml(text)   // XSS protection
this.utils.Sounds.click()     // Play sound effect
```

### GameState

Centralized state management.

```javascript
import { state, updateState, resetQuestionState } from './state/GameState.js';

// Read state
console.log(state.myScore);

// Update state
updateState({ myScore: 100 });

// Reset question-specific state
resetQuestionState();
```

### Sounds

Audio effects engine.

```javascript
import { Sounds, setMuted } from './utils/sounds.js';

Sounds.click();      // Button click
Sounds.correct();    // Correct answer
Sounds.wrong();      // Wrong answer
Sounds.tick();       // Timer tick
Sounds.urgentTick(); // Last 5 seconds
Sounds.fanfare();    // Victory
```

### Timer

Client-side countdown timer.

```javascript
import { startClientTimer, stopClientTimer } from './utils/timer.js';

startClientTimer(30, countElement, ringElement);
stopClientTimer();
```

---

## 🔄 Migration Notes

### Before (v58 and earlier):
- **One massive file** (~2,836 lines)
- **All logic in global scope**
- **Hard to maintain and extend**

### After (v59+):
- **Modular ES6 architecture**
- **12 focused modules** (~100-300 lines each)
- **Easy to maintain and extend**

### Breaking Changes:
- `game.js` now uses ES6 modules (`type="module"`)
- Functions are no longer globally scoped
- Must import utilities explicitly

---

## 🧪 Testing Strategy

Each module can now be tested independently:

```javascript
// Example: Test SingleChoiceRenderer
import { SingleChoiceRenderer } from './renderers/SingleChoiceRenderer.js';

const renderer = new SingleChoiceRenderer({
  type: 'single',
  options: ['A', 'B', 'C', 'D']
});

renderer.onSubmit((answer) => {
  console.log('Answer:', answer);
});

renderer.render();
```

---

## 📝 Next Steps

1. **Add TypeScript** - Type safety for better DX
2. **Add Unit Tests** - Jest or Vitest for each module
3. **Add Hot Module Replacement** - Faster development
4. **Add State Persistence** - LocalStorage integration
5. **Add Analytics Module** - Track user interactions

---

## 🤝 Contributing

When adding new features:

1. **Choose the right module** - State? Utils? Renderer?
2. **Keep it focused** - One responsibility per file
3. **Export explicitly** - Use named exports
4. **Document your code** - JSDoc comments
5. **Test independently** - Each module should work standalone

---

## 📞 Support

For questions about the architecture:
- Check the inline code comments
- Review existing renderers as examples
- Each renderer follows the same pattern

Happy coding! 🚀
