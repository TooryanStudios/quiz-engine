# Test Renderer System - TEMPORARY (v59)

## Purpose
Provides a standalone UI to test all 6 question type renderers without playing a full game.

## Files to Remove After Testing

### 1. JavaScript Module
- `public/js/test-renderers.js` (entire file)

### 2. HTML Changes in `public/index.html`

**Remove these sections** (clearly marked with comments):

```html
<!-- Line ~803-950: Floating test button and test panel -->
⚠️ TEMPORARY: TEST RENDERER PANEL - REMOVE AFTER V59 TESTING ⚠️
...
END TEMPORARY TEST CODE

<!-- Line ~960: Test module script tag -->
<script type="module" src="/js/test-renderers.js"></script>
```

Look for these markers:
- `<!-- ⚠️ TEMPORARY: TEST RENDERER PANEL`
- `<!-- END TEMPORARY TEST CODE`
- `<!-- TEMPORARY: Test renderer module`

## How to Use

1. **Open your quiz app** in a browser
2. **Look for the purple "🧪 Test Renderers" button** in the bottom-right corner
3. **Click it** to open the test panel
4. **Use navigation buttons**:
   - **Previous/Next**: Cycle through all 6 question types
   - **Get Answer**: Shows current answer in the renderer
   - **Submit Answer**: (on question) Tests the submit callback
5. **Test each renderer**:
   - ✅ Single Choice - Click an option (auto-submits)
   - ✅ Multi Choice - Select multiple, click submit button
   - ✅ Type Sprint - Type answer, click submit
   - ✅ Match - Drag chips to dropzones
   - ✅ Order - Drag to reorder items
   - ✅ Boss - Click option (shows HP bar)

## What to Check

- [ ] All 6 renderers display correctly
- [ ] Submit button appears/disappears as expected
- [ ] Drag-and-drop works (match and order)
- [ ] Boss HP bar displays
- [ ] Submit callbacks trigger correctly
- [ ] No console errors
- [ ] Answer data structure is correct for each type

## Console Output

The test system logs to console:
```
[TEST MODULE] Loaded - test-renderers.js
[TEST] ✅ Successfully rendered: single
[TEST] Submit callback triggered: {answerIndex: 1}
```

## Removal Checklist

When testing is complete and v59 is verified:

- [ ] Delete file: `public/js/test-renderers.js`
- [ ] Remove test button from `index.html` (lines ~803-950)
- [ ] Remove test script tag from `index.html` (line ~960)
- [ ] Search for "TEMPORARY" in index.html to confirm all removed
- [ ] Delete this README: `docs/TEST_RENDERER_README.md`
- [ ] Commit: "Remove test renderer system (v59 testing complete)"

## Quick Removal Commands

```bash
# Delete test files
rm public/js/test-renderers.js
rm docs/TEST_RENDERER_README.md

# Edit index.html to remove marked sections
# Then commit
git add .
git commit -m "Remove test renderer system (v59 testing complete)"
git push origin main
```
