# Migration Example: Using the New Renderer System

##  Current Status (v59)

All renderer modules have been created and are fully functional. The main `game.js` file still uses the old monolithic rendering functions.

## How to Migrate

### 1. Update Imports (Already Done

)

```javascript
import { QuestionRendererFactory } from './renderers/QuestionRenderer.js';
import { Sounds } from './utils/sounds.js';
import { startClientTimer, stopClientTimer } from './utils/timer.js';
import { safeGet, showView } from './utils/dom.js';
```

### 2. Replace Player Rendering Function

**Before (Old Code  - Lines 932-1016):**
```javascript
function renderPlayerQuestion(data) {
  // ... setup code ...
  
  if (q.type === 'single') {
    renderSingleChoice(q);
  } else if (q.type === 'type') {
    safeSetDisplay('player-options-grid', 'none');
    renderTypeSprint(q);
  } else if (q.type === 'multi') {
    renderMultiChoice(q);
  } else if (q.type === 'match') {
    safeSetDisplay('player-options-grid', 'none');
    renderMatch(q);
  } else if (q.type === 'order') {
    safeSetDisplay('player-options-grid', 'none');
    renderOrder(q);
  } else if (q.type === 'boss') {
    renderBossQuestion(q);
  }
  
  startClientTimer(data.duration, ...);
  showView('view-player-question');
}
```

**After (New Code with Modules):**
```javascript
function renderPlayerQuestion(data) {
  try {
    hideConnectionChip();
    const q = data.question;
    
    // Update progress and text (keep existing code)
    const qProg = safeGet('player-q-progress');
    if (qProg) qProg.textContent = `Q ${data.questionIndex + 1} / ${data.total}`;
    const qText = safeGet('player-question-text');
    if (qText) qText.textContent = q.text || 'Question text missing';
    
    renderQuestionMedia(q.media || null, 'player-question-text');
    
    // Use the NEW RENDERER FACTORY instead of if/else chain
    QuestionRendererFactory.render(q, false, submitAnswer);
    
    startClientTimer(data.duration, 
      safeGet('player-timer-count'), 
      safeGet('player-timer-ring'));
    
    showView('view-player-question');
  } catch (err) {
    console.error('renderPlayerQuestion failed:', err);
    showView('view-player-question');
  }
}
```

### 3. Benefits You Get Immediately

✅ **Single Line Rendering**: `QuestionRendererFactory.render(q, false, submitAnswer)` replaces 20+ lines of if/else logic  
✅ **Self-Contained Logic**: Each question type's render, events, and cleanup are isolated  
✅ **Easy Testing**: Test individual renderers without loading the entire game  
✅ **Easy Extension**: Add new question types in 3 steps (see ARCHITECTURE.md)  
✅ **Cleaner Code**: No more scattered helper functions, everything is organized

### 4. Next Steps

1. Update `renderPlayerQuestion()` to use factory (5 minutes)
2. Update `renderHostQuestion()` to use factory (5 minutes) 
3. Remove old render functions (`renderSingleChoice`, `renderMultiChoice`, etc.) - ~800 lines deleted
4. Test all 6 question types
5. Deploy v59

### 5. Submit Button Integration

The renderer factory automatically manages the submit button:

```javascript
// OLD WAY (scattered across multiple functions):
const submitBtn = document.getElementById('btn-submit-answer');
submitBtn.style.display = 'block';
submitBtn.disabled = true;
submitBtn.addEventListener('click', () => {
  if (type === 'multi') { /* collect multi answers */ }
  else if (type === 'match') { /* collect match answers */ }
  // ... 30 more lines ...
});

// NEW WAY (handled automatically by renderers):
QuestionRendererFactory.render(q, false, submitAnswer);
// That's it! Each renderer manages its own submit button logic
```

### 6. Getting Answers

```javascript
// When you need to get the current answer:
const answer = QuestionRendererFactory.getAnswer();
// Returns: { answerIndex: 0 } for single
//          { answerIndices: [0,2] } for multi
//          { textAnswer: "Paris" } for type
//          { matches: [1,0,2] } for match
//          { order: [2,0,1] } for order
```

### 7. Cleanup on Question Transition

```javascript
// Before moving to next question:
QuestionRendererFactory.cleanup();
// Removes all event listeners, cleans up drag state, etc.
```

## File Size Reduction

- **Before**: game.js = 2,789 lines (monolith)
- **After**: game.js ≈ 1,900 lines + 12 focused modules (~1,540 lines)
- **Net Result**: Same functionality, but **much more maintainable**

## Testing Strategy

```javascript
// Test a single renderer independently:
import { MatchRenderer } from './renderers/MatchRenderer.js';

const renderer = new MatchRenderer();
const testQuestion = {
  type: 'match',
  text: 'Match capitals',
  lefts: ['France', 'Spain'],
  rights: ['Madrid', 'Paris']
};

renderer.render(testQuestion, false);
// Verify UI, drag-drop, submit button, etc.
```

## Backwards Compatibility

The new modules **coexist** with the old code during migration:
- Old render functions still work
- New renderer modules are independent
- Migrate one function at a time
- Test after each migration step
- No rush, no breaking changes
