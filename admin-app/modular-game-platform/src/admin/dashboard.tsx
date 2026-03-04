import React from 'react';
import { listGames, setGameEnabled } from '../core/game-loader';
import { RegisteredGameSummary } from '../core/types';
import Settings from './settings';
import GameShell from '../components/game-shell';

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
        <GameShell title="Admin Console">
            <div className="admin-container">
                <h2>Manage Marketplace Games</h2>
                <div className="game-list">
                    {games.map(game => (
                        <div key={game.id} className="game-card">
                            <div className="game-info">
                                <h3>{game.name}</h3>
                                <p>{game.description}</p>
                                <div className="status-container">
                                    <span className={`status-tag ${game.enabled ? 'enabled' : 'disabled'}`}>
                                        {game.enabled ? 'Active' : 'Disabled'}
                                    </span>
                                    {game.loaded && <span className="status-tag loaded">Loaded in Memory</span>}
                                </div>
                            </div>
                            <div className="game-actions">
                                <Settings game={game} onToggle={onToggle} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </GameShell>
    );
};

export default Dashboard;
