import React, { useEffect } from 'react';
import { useGame } from '../hooks/use-game';
import GameShell from '../components/game-shell';

interface PlayProps {
    gameId: string;
}

const Play: React.FC<PlayProps> = ({ gameId }) => {
    const { game, loading, error } = useGame(gameId);

    useEffect(() => {
        if (!game) {
            return;
        }
        game.logic.createInitialState();
    }, [game]);

    if (loading) {
        return <div>Loading game...</div>;
    }

    if (error || !game) {
        return <div>{error ?? 'Game not found.'}</div>;
    }

    const state = game.logic.createInitialState();

    return (
        <GameShell>
            <h2>{game.name}</h2>
            <p>{game.description}</p>
            <p>Current objective: {game.logic.getObjective(state)}</p>
            <p>Mode: {game.config.collaborationMode}</p>
        </GameShell>
    );
};

export default Play;