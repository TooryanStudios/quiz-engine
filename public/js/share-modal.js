(function(){
	'use strict';

	function safeCall(fn){
		try { fn(); } catch (_err) {}
	}

	function onSafe(target, eventName, handler){
		if (!target || typeof target.addEventListener !== 'function') return;
		target.addEventListener(eventName, handler);
	}

	function boot(){
		var trigger = document.getElementById('btn-share-menu');
		var panel = document.getElementById('share-actions');

		if (!trigger || !panel) return;

		var onTriggerClick = function(event){
			if (event) event.stopPropagation();
			panel.classList.toggle('share-open');
			trigger.setAttribute('aria-expanded', panel.classList.contains('share-open') ? 'true' : 'false');
		};

		var onDocumentClick = function(event){
			var target = event && event.target ? event.target : null;
			if (!target) return;
			if (panel.classList.contains('share-open') && !panel.contains(target) && !trigger.contains(target)) {
				panel.classList.remove('share-open');
				trigger.setAttribute('aria-expanded', 'false');
			}
		};

		onSafe(trigger, 'click', onTriggerClick);
		onSafe(document, 'click', onDocumentClick);
	}

	function bootWithRetry(attempt){
		safeCall(function(){
			var trigger = document.getElementById('btn-share-menu');
			var panel = document.getElementById('share-actions');
			if (trigger && panel) {
				boot();
				return;
			}
			if ((attempt || 0) < 10) {
				setTimeout(function(){ bootWithRetry((attempt || 0) + 1); }, 120);
			}
		});
	}

	if (document.readyState === 'loading') {
		onSafe(document, 'DOMContentLoaded', function(){ bootWithRetry(0); });
	} else {
		bootWithRetry(0);
	}
})();
