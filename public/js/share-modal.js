(function(){
	'use strict';

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

		if (typeof trigger.addEventListener === 'function') {
			trigger.addEventListener('click', onTriggerClick);
		}
		if (typeof document.addEventListener === 'function') {
			document.addEventListener('click', onDocumentClick);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot);
	} else {
		boot();
	}
})();
