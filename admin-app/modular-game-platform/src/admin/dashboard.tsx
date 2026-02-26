import React from 'react';
import { listGames, setGameEnabled } from '../core/game-loader';
import { RegisteredGameSummary } from '../core/types';
import Settings from './settings';

const Dashboard: React.FC = () => {
    const [games, setGames] = React.useState<RegisteredGameSummary[]>([]);

    const refresh = React.useCallback(() => {
        setGames(listGames());
    }, []);

    React.useEffect(() => {
        refresh();
    }, [refresh]);

    const onToggle = (gameId: string, enabled: boolean) => {
        setGameEnabled(gameId, enabled);
        refresh();
    };

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <h2>Manage Games</h2>
            <ul>
                {games.map(game => (
                    <li key={game.id}>
                        <h3>{game.name}</h3>
                        <p>{game.description}</p>
                        <p>Enabled: {game.enabled ? 'Yes' : 'No'} | Loaded: {game.loaded ? 'Yes' : 'No'}</p>
                        <Settings game={game} onToggle={onToggle} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Dashboard;