import React from 'react';
import { useGame } from '../hooks/use-game';
import type { GameAction, GameState } from '../core/types';
import './play.css';

interface PlayProps {
    gameId: string;
    onStateChange?: (gameState: GameState) => void;
    theme?: {
        bg: string;
        surface: string;
        surface2: string;
        accent: string;
        text: string;
        textDim: string;
        success: string;
    };
}

const Play: React.FC<PlayProps> = ({ gameId, onStateChange, theme }) => {
    const { game, loading, error } = useGame(gameId);
    const [gameState, setGameState] = React.useState<GameState | null>(null);

    const themeStyle = React.useMemo(() => {
        if (!theme) {
            return {};
        }

        return {
            '--theme-bg': theme.bg,
            '--theme-surface': theme.surface,
            '--theme-surface-2': theme.surface2,
            '--theme-accent': theme.accent,
            '--theme-text': theme.text,
            '--theme-text-dim': theme.textDim,
            '--theme-success': theme.success,
        } as React.CSSProperties;
    }, [theme]);

    React.useEffect(() => {
        if (!game) {
            setGameState(null);
            return;
        }

        setGameState(game.logic.createInitialState());
    }, [game]);

    React.useEffect(() => {
        if (!gameState || !onStateChange) {
            return;
        }

        onStateChange(gameState);
    }, [gameState, onStateChange]);

    const dispatch = React.useCallback(
        (action: Partial<GameAction>) => {
            if (!game) {
                return;
            }

            const fullAction: GameAction = {
                type: action.type ?? 'start',
                actorId: action.actorId ?? 'player-1',
                success: action.success,
                note: action.note,
            };

            setGameState((previousState) => {
                if (!previousState) {
                    return previousState;
                }

                return game.logic.applyAction(previousState, fullAction);
            });
        },
        [game],
    );

    if (loading) {
        return <div style={{ padding: '2rem' }}>Loading game module...</div>;
    }

    if (error || !game) {
        return <div style={{ padding: '2rem' }}>{error ?? 'Game not found.'}</div>;
    }

    if (!gameState) {
        return <div style={{ padding: '2rem' }}>Preparing runtime...</div>;
    }

    if (game.render) {
        const CustomGameRenderer = game.render;
        return <CustomGameRenderer game={game} gameState={gameState} dispatch={dispatch} />;
    }

    return (
        <div className="retro-quiz-container" style={themeStyle}>
            <header className="retro-header">
                <div className="badge-server">Server connected</div>
                <div className="hub-center">
                    <div className="badge-points">Score: {gameState.score}</div>
                    <div className="status-row">
                        <span>Round</span>
                        <div className="timer-circle">{gameState.round}</div>
                        <div style={{ lineHeight: '1.2', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {gameState.round} / {gameState.totalRounds}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>CLASSIC</div>
                        </div>
                    </div>
                    <div className="pin-badge">Game: {game.name}</div>
                </div>
            </header>

            <div className="question-card">
                <div className="question-card-inner">
                    <h2 className="question-text">{game.logic.getObjective(gameState)}</h2>
                    <p style={{ marginTop: '0.75rem' }}>{game.description}</p>
                </div>
            </div>

            <div className="actions-row" style={{ marginBottom: '1rem' }}>
                <button className="btn-retro btn-pause" onClick={() => dispatch({ type: 'hint' })}>
                    Hint
                </button>
                <button className="btn-retro btn-submit" onClick={() => dispatch({ type: 'submit', success: true })}>
                    Submit Success
                </button>
                <button className="btn-retro btn-end" onClick={() => dispatch({ type: 'advance' })}>
                    Next Round
                </button>
                <button className="btn-retro btn-end" onClick={() => dispatch({ type: 'reset' })}>
                    Reset
                </button>
            </div>

            <div style={{ maxWidth: 860, margin: '0 auto', background: '#fff8ea', borderRadius: 8, padding: '1rem' }}>
                <strong>Recent Events</strong>
                <ul>
                    {gameState.activityLog.slice(-8).map((line, idx) => (
                        <li key={`${line}-${idx}`}>{line}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default Play;
