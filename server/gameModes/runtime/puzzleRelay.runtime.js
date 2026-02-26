'use strict';

function createPuzzleRelayRuntime() {
  function getConnectedRelayPlayers(room) {
    return Array.from(room.players.values()).filter((player) => !player.disconnected);
  }

  return {
    id: 'puzzle-relay',

    onGameStart({ room, dispatchDefault }) {
      room.relayTurnIndex = 0;
      dispatchDefault();
      return true;
    },

    onQuestionDispatch({ room, questionPayload, players, dispatchDefault }) {
      const relayPlayers = Array.isArray(players) && players.length > 0
        ? players
        : getConnectedRelayPlayers(room).map((player) => ({ id: player.id, nickname: player.nickname }));

      if (relayPlayers.length > 0) {
        const currentTurn = Number.isInteger(room.relayTurnIndex) ? room.relayTurnIndex : 0;
        const idx = ((currentTurn % relayPlayers.length) + relayPlayers.length) % relayPlayers.length;
        const active = relayPlayers[idx];

        questionPayload.relay = {
          activePlayerId: active.id,
          activeNickname: active.nickname,
          turnIndex: idx,
          totalRelayPlayers: relayPlayers.length,
        };

        if (room.currentQuestionMeta) {
          room.currentQuestionMeta.relayActivePlayerId = active.id;
          room.currentQuestionMeta.relayActiveNickname = active.nickname;
        }
      }

      dispatchDefault();
      return true;
    },

    onPlayerAnswer({ room, socket, player, dispatchDefault }) {
      const activePlayerId = room?.currentQuestionMeta?.relayActivePlayerId
        || room?.currentQuestionPayload?.relay?.activePlayerId
        || room?.currentQuestionPayload?.relayActivePlayerId;

      if (activePlayerId && player.id !== activePlayerId) {
        const activeNickname = room?.currentQuestionMeta?.relayActiveNickname
          || room?.currentQuestionPayload?.relay?.activeNickname
          || 'the active relay player';

        socket.emit('room:error', {
          message: `Puzzle Relay: wait for ${activeNickname} to answer this turn.`,
          code: 'RELAY_NOT_YOUR_TURN',
        });
        return true;
      }

      dispatchDefault();
      return true;
    },

    onQuestionEnd({ room, dispatchDefault }) {
      dispatchDefault();
      room.relayTurnIndex = (Number.isInteger(room.relayTurnIndex) ? room.relayTurnIndex : 0) + 1;
      return true;
    },
  };
}

module.exports = { createPuzzleRelayRuntime };
