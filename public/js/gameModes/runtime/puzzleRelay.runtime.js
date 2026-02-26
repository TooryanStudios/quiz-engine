export const puzzleRelayRuntime = {
  id: 'puzzle-relay',

  onGameStart(_ctx) {
    return false;
  },

  onGameQuestion({ data, state, socket, renderQuestion }) {
    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;

    const pauseOverlay = document.getElementById('overlay-paused');
    if (pauseOverlay) pauseOverlay.style.display = 'none';

    const finalOverlay = document.getElementById('overlay-final-question');
    if (finalOverlay) finalOverlay.style.display = 'none';

    renderQuestion(data, isHostOnly);

    const hostModeBadge = document.getElementById('host-q-difficulty');
    if (hostModeBadge) hostModeBadge.textContent = 'PUZZLE RELAY';
    const playerModeBadge = document.getElementById('player-q-difficulty');
    if (playerModeBadge) playerModeBadge.textContent = 'PUZZLE RELAY';

    if (state.role !== 'player') return true;

    const relay = data?.question?.relay || {};
    const activePlayerId = relay.activePlayerId;
    const activeNickname = relay.activeNickname || 'another player';
    const isActivePlayer = !!activePlayerId && activePlayerId === socket.id;

    const answerMsg = document.getElementById('player-answered-msg');
    if (answerMsg) {
      answerMsg.textContent = isActivePlayer
        ? '🧩 Puzzle Relay: your turn — answer now!'
        : `🧩 Puzzle Relay: waiting for ${activeNickname}`;
    }

    if (!isActivePlayer) {
      document.querySelectorAll('#player-options-grid .option-btn').forEach((btn) => {
        btn.disabled = true;
      });

      const typeInput = document.getElementById('player-type-input');
      if (typeInput) typeInput.disabled = true;

      const submitBtn = document.getElementById('btn-submit-answer');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = `⏳ Waiting for ${activeNickname}`;
      }
    }

    return true;
  },

  onQuestionEnd(_ctx) {
    return false;
  },

  onLeaderboard(_ctx) {
    return false;
  },

  onGameOver(_ctx) {
    return false;
  },
};
