import React from 'react';
import { useGame } from '../hooks/use-game';
import type { GameAction, GameState } from '../core/types';
import './play.css';

interface PlayProps {
    gameId: string;
    isEmbed?: boolean;
    standalone?: boolean;
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

const Play: React.FC<PlayProps> = ({ gameId, isEmbed, standalone, onStateChange, theme }) => {
    const { game, loading, error } = useGame(gameId);
    const [gameState, setGameState] = React.useState<GameState | null>(null);

    const themeStyle = React.useMemo(() => {
        if (!theme || standalone) {
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
        if (standalone) {
            return (
                <CustomGameRenderer
                    game={game}
                    gameState={gameState}
                    dispatch={dispatch}
                    isEmbed={isEmbed}
                    standalone
                />
            );
        }
        return (
            <div
                className={`retro-quiz-container ${isEmbed ? 'is-embed' : ''}`}
                style={themeStyle}
            >
                <CustomGameRenderer
                    game={game}
                    gameState={gameState}
                    dispatch={dispatch}
                    isEmbed={isEmbed}
                />
            </div>
        );
    }

    if (standalone) {
        return (
            <div className="standalone-game-container">
                <div className="standalone-game-card">
                    <h2>{game.name}</h2>
                    <p>{game.logic.getObjective(gameState)}</p>
                    <p className="standalone-subtext">النقاط {gameState.score} · الجولة {gameState.round}/{gameState.totalRounds}</p>
                    <div className="standalone-actions">
                        <button onClick={() => dispatch({ type: 'reset' })}>إعادة تشغيل</button>
                        <button onClick={() => dispatch({ type: 'advance' })}>تخطي الجولة</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`retro-quiz-container ${isEmbed ? 'is-embed' : ''}`} style={themeStyle}>
            {/* retro-quiz-container */}
            <header className="retro-header">
                {/* retro-header */}
                <div className="badge-server">متصل بالخادم</div>
                <div className="hub-center">
                    {/* hub-center */}
                    <div className="badge-points">النقاط: {gameState.score}</div>
                    <div className="status-row">
                        {/* status-row */}
                        <span>الجولة</span>
                        <div className="timer-circle">{gameState.round}</div>
                        <div style={{ lineHeight: '1.2', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {gameState.round} / {gameState.totalRounds}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>CLASSIC</div>
                        </div>
                    </div>
                    <div className="pin-badge">اللعبة: {game.name}</div>
                </div>
            </header>

            <div className="question-card">
                {/* question-card */}
                <div className="question-card-inner">
                    {/* question-card-inner */}
                    <h2 className="question-text">{game.logic.getObjective(gameState)}</h2>
                    <p style={{ marginTop: '0.75rem' }}>{game.description}</p>
                </div>
            </div>

            <div className="actions-row" style={{ marginBottom: '1rem' }}>
                {/* actions-row */}
                <button className="btn-retro btn-pause" onClick={() => dispatch({ type: 'hint' })}>
                    تلميح
                </button>
                <button className="btn-retro btn-submit" onClick={() => dispatch({ type: 'submit', success: true })}>
                    إرسال النجاح
                </button>
                <button className="btn-retro btn-end" onClick={() => dispatch({ type: 'advance' })}>
                    الجولة التالية
                </button>
                <button className="btn-retro btn-end" onClick={() => dispatch({ type: 'reset' })}>
                    إعادة تعيين
                </button>
            </div>
        </div>
    );
}
;

export default Play;
