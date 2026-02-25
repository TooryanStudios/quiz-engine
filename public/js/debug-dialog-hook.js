/**
 * 🔧 DEBUG DIALOG HOOK — temporary diagnostic tool
 *
 * Adds a floating "� Pick Avatar" button on the join page.
 * Clicking it opens a self-contained avatar picker inside a debug modal
 * that bypasses the real avatar-picker-modal entirely.
 *
 * Also intercepts & logs every event on the real avatar button so we can
 * see exactly what fires (or doesn't) in the console.
 *
 * TO REMOVE: Delete the <script> tag from index.html & delete this file.
 */
(function debugDialogHook() {
  'use strict';

  const AVATARS = ['🦁','🐯','🦊','🐼','🐨','🐸','🦄','🦖','🦜','🕺',
                   '🤖','👾','🎃','🧙','🦸','🐇','⚡','🔥','🎮','🏆'];

  // ── Floating trigger button (bottom-left) ──
  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'dbg-dialog-trigger';
  triggerBtn.textContent = '👤 Pick Avatar';
  Object.assign(triggerBtn.style, {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    zIndex: '99999',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '700',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    touchAction: 'manipulation',
  });
  document.body.appendChild(triggerBtn);

  // ── Event logger on real avatar button ──
  const realBtn = document.getElementById('join-avatar-btn');
  if (realBtn) {
    ['pointerdown','pointerup','touchstart','touchend','click','mousedown','mouseup'].forEach((evt) => {
      realBtn.addEventListener(evt, (e) => {
        console.log('[dbg-hook] join-avatar-btn event:', evt, 'target:', e.target?.tagName, e.target?.className);
      }, { capture: true });
    });
  }

  // ── Show the avatar picker dialog ──
  function showAvatarDialog() {
    const old = document.getElementById('dbg-avatar-modal');
    if (old) old.remove();

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'dbg-avatar-modal';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '100000',
      padding: '16px',
      backdropFilter: 'blur(6px)',
    });

    // Dialog box
    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      background: '#1e1e2e',
      border: '2px solid #7c3aed',
      borderRadius: '20px',
      padding: '20px',
      width: 'min(400px, 92vw)',
      maxHeight: '80vh',
      overflowY: 'auto',
      color: '#e2e8f0',
    });

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    const title = document.createElement('span');
    title.textContent = '👤 Choose Your Avatar';
    title.style.cssText = 'font-size:18px;font-weight:800;color:#a78bfa;';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: '#ef4444', border: 'none', color: '#fff', fontSize: '16px',
      width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
    });
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(title);
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // Current selection indicator
    const currentDisplay = document.getElementById('join-avatar-display');
    const currentAvatar = currentDisplay ? currentDisplay.textContent : '🎮';
    const selectionLabel = document.createElement('div');
    selectionLabel.style.cssText = 'text-align:center;font-size:13px;color:#94a3b8;margin-bottom:12px;';
    selectionLabel.innerHTML = 'Current: <span id="dbg-current-avatar" style="font-size:28px;vertical-align:middle;">' + currentAvatar + '</span>';
    dialog.appendChild(selectionLabel);

    // Avatar grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:10px;';

    AVATARS.forEach((emoji) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = emoji;
      const isSelected = emoji === currentAvatar;
      Object.assign(btn.style, {
        fontSize: '2rem',
        padding: '10px',
        border: isSelected ? '3px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        background: isSelected ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        touchAction: 'manipulation',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1',
      });

      btn.onclick = () => {
        // Update the game state directly
        // game.js uses a module-scoped `state` — we can't touch it,
        // but we CAN update the DOM display + hidden input / attribute
        const joinDisplay = document.getElementById('join-avatar-display');
        if (joinDisplay) joinDisplay.textContent = emoji;

        const joinLabel = document.querySelector('#join-avatar-btn .avatar-trigger-label');
        if (joinLabel) joinLabel.textContent = 'Avatar selected ✓';

        // Also update the current indicator
        const cur = document.getElementById('dbg-current-avatar');
        if (cur) cur.textContent = emoji;

        // Highlight selected, un-highlight rest
        grid.querySelectorAll('button').forEach((b) => {
          b.style.border = '2px solid rgba(255,255,255,0.1)';
          b.style.background = 'rgba(255,255,255,0.04)';
        });
        btn.style.border = '3px solid #7c3aed';
        btn.style.background = 'rgba(124,58,237,0.2)';

        // Dispatch a custom event so game.js can pick it up
        document.dispatchEvent(new CustomEvent('dbg:avatar-selected', { detail: { avatar: emoji } }));

        // Brief flash feedback
        btn.style.transform = 'scale(1.15)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; }, 150);
      };

      grid.appendChild(btn);
    });

    dialog.appendChild(grid);

    // Diagnostic info section (collapsed)
    const details = document.createElement('details');
    details.style.cssText = 'margin-top:16px;border-top:1px dashed #333;padding-top:12px;';
    const summary = document.createElement('summary');
    summary.textContent = '🔍 Diagnostic Info';
    summary.style.cssText = 'cursor:pointer;color:#94a3b8;font-size:12px;font-weight:600;';
    details.appendChild(summary);

    const diagInfo = document.createElement('pre');
    diagInfo.style.cssText = 'font-size:11px;color:#fbbf24;white-space:pre-wrap;margin-top:8px;line-height:1.4;';
    const avatarModal = document.getElementById('avatar-picker-modal');
    const lines = [];
    if (avatarModal) {
      const cs = window.getComputedStyle(avatarModal);
      lines.push('avatar-picker-modal: EXISTS');
      lines.push('  inline display: ' + (avatarModal.style.display || '(empty)'));
      lines.push('  computed display: ' + cs.display);
      lines.push('  computed z-index: ' + cs.zIndex);
      lines.push('  computed position: ' + cs.position);
      lines.push('  computed visibility: ' + cs.visibility);
      lines.push('  computed opacity: ' + cs.opacity);
      lines.push('  parent: ' + avatarModal.parentElement?.tagName + '#' + (avatarModal.parentElement?.id || ''));
      const viewAncestor = avatarModal.closest('.view');
      if (viewAncestor) {
        lines.push('  ⚠️ INSIDE .view#' + viewAncestor.id + ' active=' + viewAncestor.classList.contains('active'));
      } else {
        lines.push('  ✅ Not inside any .view');
      }
    } else {
      lines.push('avatar-picker-modal: ❌ NOT FOUND');
    }
    diagInfo.textContent = lines.join('\n');
    details.appendChild(diagInfo);
    dialog.appendChild(details);

    // "Done" button
    const doneBtn = document.createElement('button');
    doneBtn.textContent = '✅ Done';
    Object.assign(doneBtn.style, {
      display: 'block', width: '100%', marginTop: '16px', padding: '12px',
      fontSize: '15px', fontWeight: '700', background: '#22c55e', color: '#fff',
      border: 'none', borderRadius: '12px', cursor: 'pointer', touchAction: 'manipulation',
    });
    doneBtn.onclick = () => overlay.remove();
    dialog.appendChild(doneBtn);

    overlay.appendChild(dialog);

    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  triggerBtn.addEventListener('click', showAvatarDialog);

  // Listen for avatar picks from this debug dialog and sync with game.js state
  document.addEventListener('dbg:avatar-selected', (e) => {
    const emoji = e.detail?.avatar;
    if (!emoji) return;
    // Try to reach the module state — game.js exposes state on window for debug
    if (window.__gameState) {
      window.__gameState.avatar = emoji;
      console.log('[dbg-hook] Synced avatar to __gameState:', emoji);
    }
    console.log('[dbg-hook] Avatar selected:', emoji);
  });

  console.log('[debug-dialog-hook] 👤 Avatar picker button injected at bottom-left.');
})();
