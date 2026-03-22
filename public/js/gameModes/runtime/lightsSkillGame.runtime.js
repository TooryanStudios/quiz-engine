// lights-skill-game runtime — redirects to standalone HTML5 game
export const lightsSkillGameRuntime = {
  onHostCreate({ quizSlug, miniGameConfig }) {
    // Redirect host to the standalone lights-skill-game instead of showing lobby
    const adminBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:3000'
      : 'https://qyan.app';
    
    const cfg = miniGameConfig || {};
    const params = new URLSearchParams();
    
    if (cfg.gameDurationSec) params.set('duration', String(cfg.gameDurationSec));
    if (cfg.numberOfRounds) params.set('rounds', String(cfg.numberOfRounds));
    if (quizSlug) params.set('quizId', quizSlug);
    
    const gameUrl = `${adminBase}/lights-skill-game/index.html${params.toString() ? '?' + params.toString() : ''}`;
    
    // Redirect immediately
    window.location.href = gameUrl;
    
    // Return true to signal that we've handled the host creation
    return true;
  },
};
