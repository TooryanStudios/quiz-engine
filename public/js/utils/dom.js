/**
 * dom.js
 * DOM manipulation utilities
 */

/**
 * Safe element getter
 */
export function safeGet(id) {
  const el = document.getElementById(id);
  if (!el && window.__dbgLog) {
    window.__dbgLog(`WARN: element #${id} not found`);
  }
  return el;
}

/**
 * Safe display style setter
 */
export function safeSetDisplay(id, display) {
  const el = safeGet(id);
  if (el) el.style.display = display;
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show a specific view by ID
 */
export function showView(viewId) {
  const views = document.querySelectorAll('.view');
  views.forEach(v => v.classList.remove('active'));
  
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.classList.add('active');
  } else {
    console.error(`View not found: ${viewId}`);
  }
}

/**
 * Normalize view DOM (move views out of hidden parents)
 */
export function normalizeViewDom() {
  const views = document.querySelectorAll('.view');
  const body = document.body;
  
  views.forEach(view => {
    if (view.parentElement !== body) {
      let parent = view.parentElement;
      let hidden = false;
      
      while (parent && parent !== body) {
        const cs = window.getComputedStyle(parent);
        if (cs.display === 'none' || cs.visibility === 'hidden') {
          hidden = true;
          break;
        }
        parent = parent.parentElement;
      }
      
      if (hidden) {
        body.appendChild(view);
      }
    }
  });
}

/**
 * Option colors (Kahoot-style)
 */
export const OPTION_COLORS = ['opt-violet', 'opt-cyan', 'opt-amber', 'opt-emerald'];
export const OPTION_ICONS = ['A', 'B', 'C', 'D'];

/**
 * Hide connection chip
 */
export function hideConnectionChip() {
  const chip = safeGet('connection-reconnecting-chip');
  if (chip) chip.style.display = 'none';
}
