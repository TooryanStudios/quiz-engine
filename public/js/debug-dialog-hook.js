/**
 * 🔧 DEBUG DIALOG HOOK — temporary diagnostic tool
 *
 * Adds a floating "🔍 Debug" button at the bottom-right of the screen.
 * Clicking it opens a test modal that:
 *   1. Proves modals can render at various z-index levels
 *   2. Inspects the avatar-picker-modal's computed styles
 *   3. Tries to force-open the real avatar picker
 *
 * TO REMOVE: Just delete this <script> tag from index.html
 *            and delete this file.
 */
(function debugDialogHook() {
  'use strict';

  // ── Floating trigger button ──
  const triggerBtn = document.createElement('button');
  triggerBtn.id = 'dbg-dialog-trigger';
  triggerBtn.textContent = '🔍 Debug';
  Object.assign(triggerBtn.style, {
    position: 'fixed',
    bottom: '16px',
    left: '16px',
    zIndex: '99999',
    padding: '10px 18px',
    fontSize: '14px',
    fontWeight: '700',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    touchAction: 'manipulation',
  });
  document.body.appendChild(triggerBtn);

  // ── Build the test modal ──
  function buildModal() {
    // Gather diagnostic info about the real avatar picker
    const avatarModal = document.getElementById('avatar-picker-modal');
    const avatarGrid = document.getElementById('modal-avatar-grid');
    const closeBtn = document.getElementById('btn-close-avatar-picker');
    const joinAvatarBtn = document.getElementById('join-avatar-btn');

    const diag = {};

    if (avatarModal) {
      const cs = window.getComputedStyle(avatarModal);
      diag['avatar-modal EXISTS'] = '✅ yes';
      diag['inline style.display'] = avatarModal.style.display || '(empty)';
      diag['computed display'] = cs.display;
      diag['computed visibility'] = cs.visibility;
      diag['computed opacity'] = cs.opacity;
      diag['computed z-index'] = cs.zIndex;
      diag['computed position'] = cs.position;
      diag['computed top'] = cs.top;
      diag['computed left'] = cs.left;
      diag['computed width'] = cs.width;
      diag['computed height'] = cs.height;
      diag['computed pointer-events'] = cs.pointerEvents;
      diag['offsetParent'] = avatarModal.offsetParent ? avatarModal.offsetParent.tagName + '#' + (avatarModal.offsetParent.id || '') : 'null (hidden)';
      diag['parent element'] = avatarModal.parentElement ? avatarModal.parentElement.tagName + '#' + (avatarModal.parentElement.id || '') : 'none';
      diag['has .view class?'] = avatarModal.classList.contains('view') ? '⚠️ YES (BUG!)' : '✅ No';
      diag['childElementCount'] = avatarModal.childElementCount;
    } else {
      diag['avatar-modal EXISTS'] = '❌ NOT FOUND';
    }

    diag['---'] = '---';
    diag['avatar-grid EXISTS'] = avatarGrid ? '✅' : '❌';
    diag['close-btn EXISTS'] = closeBtn ? '✅' : '❌';
    diag['join-avatar-btn EXISTS'] = joinAvatarBtn ? '✅' : '❌';

    // Check all elements with z-index > 9000
    diag['--- z-index audit ---'] = '';
    const all = document.querySelectorAll('*');
    const highZ = [];
    all.forEach((el) => {
      const z = window.getComputedStyle(el).zIndex;
      if (z !== 'auto' && parseInt(z) > 9000) {
        const tag = el.tagName.toLowerCase();
        const id = el.id ? '#' + el.id : '';
        const cls = el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '';
        const vis = window.getComputedStyle(el).display;
        highZ.push(`${tag}${id}${cls} z:${z} d:${vis}`);
      }
    });
    diag['high z-index (>9000)'] = highZ.length ? highZ.join('\n') : 'none';

    return diag;
  }

  function showDebugModal() {
    // Remove any existing debug modal
    const old = document.getElementById('dbg-test-modal');
    if (old) old.remove();

    const diag = buildModal();

    // Create the overlay
    const overlay = document.createElement('div');
    overlay.id = 'dbg-test-modal';
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

    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      background: '#1e1e2e',
      border: '2px solid #7c3aed',
      borderRadius: '16px',
      padding: '20px',
      width: 'min(480px, 94vw)',
      maxHeight: '85vh',
      overflowY: 'auto',
      color: '#e2e8f0',
      fontFamily: 'monospace',
      fontSize: '13px',
      lineHeight: '1.5',
    });

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;';
    header.innerHTML = `<span style="font-size:16px;font-weight:800;color:#a78bfa;">🔍 Dialog Debug Panel</span>`;
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: '#ef4444',
      border: 'none',
      color: '#fff',
      fontSize: '16px',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      cursor: 'pointer',
    });
    closeBtn.onclick = () => overlay.remove();
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    // Diagnostic data rows
    Object.entries(diag).forEach(([key, val]) => {
      if (key.startsWith('---')) {
        const hr = document.createElement('hr');
        hr.style.cssText = 'border:none;border-top:1px dashed #444;margin:8px 0;';
        dialog.appendChild(hr);
        return;
      }
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px dotted #333;';
      const k = document.createElement('span');
      k.style.cssText = 'color:#94a3b8;flex-shrink:0;';
      k.textContent = key;
      const v = document.createElement('span');
      v.style.cssText = 'color:#fbbf24;text-align:right;word-break:break-all;white-space:pre-wrap;';
      v.textContent = String(val);
      row.appendChild(k);
      row.appendChild(v);
      dialog.appendChild(row);
    });

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;';

    // Button 1: Force-show avatar modal
    const btnForceShow = document.createElement('button');
    btnForceShow.textContent = '🟢 Force-Show Avatar Modal';
    Object.assign(btnForceShow.style, {
      padding: '8px 14px', fontSize: '13px', fontWeight: '700',
      background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px',
      cursor: 'pointer', touchAction: 'manipulation',
    });
    btnForceShow.onclick = () => {
      overlay.remove();
      const m = document.getElementById('avatar-picker-modal');
      if (m) {
        // Force it visible with every possible override
        m.style.cssText = 'display:flex !important; position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,0.8); align-items:center; justify-content:center; visibility:visible; opacity:1; pointer-events:auto;';
        // Also populate grid if empty
        const grid = document.getElementById('modal-avatar-grid');
        if (grid && grid.children.length === 0) {
          const AVATARS = ['🦁','🐯','🦊','🐼','🐨','🐸','🦄','🦖','🦜','🕺','🤖','👾','🎃','🧙','🦸','🐇','⚡','🔥','🎮','🏆'];
          AVATARS.forEach((a) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'avatar-option';
            btn.textContent = a;
            btn.style.cssText = 'font-size:2rem;padding:8px;border:2px solid transparent;border-radius:12px;background:rgba(255,255,255,0.05);cursor:pointer;';
            btn.onclick = () => { alert('Selected: ' + a); m.style.display = 'none'; };
            grid.appendChild(btn);
          });
        }
      } else {
        alert('avatar-picker-modal element NOT found in DOM!');
      }
    };

    // Button 2: Create a pure test modal (no existing DOM dependency)
    const btnPureTest = document.createElement('button');
    btnPureTest.textContent = '🟡 Pure Test Modal (z:100k)';
    Object.assign(btnPureTest.style, {
      padding: '8px 14px', fontSize: '13px', fontWeight: '700',
      background: '#eab308', color: '#000', border: 'none', borderRadius: '8px',
      cursor: 'pointer', touchAction: 'manipulation',
    });
    btnPureTest.onclick = () => {
      overlay.remove();
      const testOv = document.createElement('div');
      Object.assign(testOv.style, {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '100000',
      });
      testOv.innerHTML = `
        <div style="background:#1e293b;padding:30px;border-radius:16px;border:2px solid #facc15;text-align:center;">
          <h2 style="color:#facc15;margin:0 0 12px;">✅ Pure Test Modal Works!</h2>
          <p style="color:#e2e8f0;margin:0 0 16px;">This modal was created from scratch at z-index:100000.<br>If you can see this, the z-index overlay system works fine.</p>
          <button style="padding:10px 24px;font-size:14px;font-weight:700;background:#7c3aed;color:#fff;border:none;border-radius:8px;cursor:pointer;" onclick="this.closest('div[style]').parentElement.remove()">Close</button>
        </div>`;
      document.body.appendChild(testOv);
    };

    // Button 3: Check if avatar modal is being hidden by showView
    const btnCheckView = document.createElement('button');
    btnCheckView.textContent = '🔵 Check .view Conflicts';
    Object.assign(btnCheckView.style, {
      padding: '8px 14px', fontSize: '13px', fontWeight: '700',
      background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px',
      cursor: 'pointer', touchAction: 'manipulation',
    });
    btnCheckView.onclick = () => {
      const m = document.getElementById('avatar-picker-modal');
      const results = [];
      if (m) {
        results.push('Modal tag: ' + m.tagName);
        results.push('Modal classList: ' + [...m.classList].join(', '));
        results.push('Has .view? ' + m.classList.contains('view'));
        results.push('Parent: ' + (m.parentElement ? m.parentElement.tagName + '#' + m.parentElement.id : 'none'));
        // Check if any ancestor has display:none or overflow:hidden
        let el = m.parentElement;
        while (el && el !== document.body) {
          const cs = window.getComputedStyle(el);
          if (cs.display === 'none') results.push('⚠️ HIDDEN ancestor: ' + el.tagName + '#' + el.id + ' display:none');
          if (cs.overflow === 'hidden') results.push('⚠️ overflow:hidden on: ' + el.tagName + '#' + el.id);
          if (cs.visibility === 'hidden') results.push('⚠️ visibility:hidden on: ' + el.tagName + '#' + el.id);
          el = el.parentElement;
        }
        // Check if modal is inside a .view
        const viewAncestor = m.closest('.view');
        if (viewAncestor) {
          results.push('⚠️ INSIDE a .view: #' + viewAncestor.id + ' — active? ' + viewAncestor.classList.contains('active'));
          results.push('   This means showView() resets its inline styles!');
        } else {
          results.push('✅ Not inside any .view');
        }
      } else {
        results.push('❌ avatar-picker-modal NOT in DOM');
      }
      alert(results.join('\n'));
    };

    actions.appendChild(btnForceShow);
    actions.appendChild(btnPureTest);
    actions.appendChild(btnCheckView);
    dialog.appendChild(actions);

    overlay.appendChild(dialog);
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  triggerBtn.addEventListener('click', showDebugModal);

  console.log('[debug-dialog-hook] 🔍 Debug button injected. Click the red button at bottom-left.');
})();
