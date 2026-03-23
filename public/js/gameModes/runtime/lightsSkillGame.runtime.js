const REDIRECT_GUARD_KEY = 'qyan:lights-skill-game:redirected';

function buildLightsStandaloneUrl({ quizSlug, miniGameConfig }) {
  const adminBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://qyan.app';

  const cfg = miniGameConfig || {};
  const params = new URLSearchParams();

  if (cfg.gameDurationSec) params.set('duration', String(cfg.gameDurationSec));
  if (cfg.numberOfRounds) params.set('rounds', String(cfg.numberOfRounds));
  if (quizSlug) params.set('quizId', quizSlug);

  return `${adminBase}/lights-skill-game/index.html${params.toString() ? `?${params.toString()}` : ''}`;
}

function redirectToLightsStandalone(payload = {}) {
  if (typeof window === 'undefined') return false;
  const currentPath = (window.location.pathname || '').toLowerCase();
  if (currentPath.includes('/lights-skill-game/index.html')) return true;

  if (sessionStorage.getItem(REDIRECT_GUARD_KEY) === '1') return true;
  sessionStorage.setItem(REDIRECT_GUARD_KEY, '1');

  const targetUrl = buildLightsStandaloneUrl(payload);
  window.location.href = targetUrl;
  return true;
}

// lights-skill-game runtime — redirects to standalone HTML5 game
export const lightsSkillGameRuntime = {
  onHostCreate({ quizSlug, miniGameConfig }) {
    return redirectToLightsStandalone({ quizSlug, miniGameConfig });
  },

  onGameStart({ state, data }) {
    const quizSlug = new URLSearchParams(window.location.search).get('quiz');
    const miniGameConfig = data?.miniGameConfig || state?.miniGameConfig || null;
    return redirectToLightsStandalone({ quizSlug, miniGameConfig });
  },

  onGameQuestion({ data }) {
    const quizSlug = new URLSearchParams(window.location.search).get('quiz');
    const miniGameConfig = data?.question?.config || null;
    return redirectToLightsStandalone({ quizSlug, miniGameConfig });
  },
};
