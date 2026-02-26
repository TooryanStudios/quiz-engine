import { useState, useEffect } from 'react';

const useLoader = <T,>(loadGame: () => Promise<T>) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [game, setGame] = useState<T | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const loadedGame = await loadGame();
            setGame(loadedGame);
        } catch (err: unknown) {
            setError(err instanceof Error ? err : new Error('Failed to load resource'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [loadGame]);

    return { loading, error, game };
};

export default useLoader;