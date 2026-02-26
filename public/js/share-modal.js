// share-modal.js — backward-compatible safe shim
// Some cached pages may still load this script directly.
// Keep behavior minimal and never throw if DOM elements are missing.
(function () {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function setOpen(trigger, panel, isOpen) {
    if (!panel || !trigger) return;
    panel.classList.toggle('share-open', !!isOpen);
    trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  function boot() {
    const trigger = byId('btn-share-menu');
    const panel = byId('share-actions');

    if (!trigger || !panel) return;

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      setOpen(trigger, panel, !panel.classList.contains('share-open'));
    });

    document.addEventListener('click', function (event) {
      if (!panel.classList.contains('share-open')) return;
      if (panel.contains(event.target) || trigger.contains(event.target)) return;
      setOpen(trigger, panel, false);
    });

    panel.addEventListener('click', function (event) {
      const item = event.target.closest('.share-social-btn, .share-icon-btn');
      if (!item) return;
      setTimeout(function () {
        setOpen(trigger, panel, false);
      }, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
