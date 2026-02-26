import { useEffect, useState } from 'react';
import { loadGame, unloadGame } from '../core/game-loader';
import { GameModule } from '../core/types';

export const useGame = (gameId: string) => {
    const [game, setGame] = useState<GameModule | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const gameModule = await loadGame(gameId);
                setGame(gameModule);
                setError(null);
            } catch {
                setError('Failed to load game');
                setGame(null);
            } finally {
                setLoading(false);
            }
        };

        load();

        return () => {
            unloadGame(gameId);
            setGame(null);
        };
    }, [gameId]);

    return { game, loading, error };
};