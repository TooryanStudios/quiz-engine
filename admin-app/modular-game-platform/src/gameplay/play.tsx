import React, { useState } from "react";
import { useGame } from "../hooks/use-game";
import type { GameAction } from "../core/types";
import "./play.css";

interface PlayProps {
    gameId: string;
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

const Play: React.FC<PlayProps> = ({ gameId, theme }) => {
    const { game, loading, error } = useGame(gameId);
    const [gameState, setGameState] = useState<any>(null);

    // Apply theme variables
    const themeStyle = React.useMemo(() => {
        if (!theme) return {};
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
        if (game && !gameState) {
            setGameState(game.logic.createInitialState());
        }
    }, [game, gameState]);

    if (loading) return <div style={{ padding: "2rem" }}>Loading game module...</div>;
    if (error || !game) return <div style={{ padding: "2rem" }}>{error ?? "Game not found."}</div>;
    if (!gameState) return <div style={{ padding: "2rem" }}>Waiting for game logic...</div>;

    const dispatch = (action: Partial<GameAction>) => {
        const fullAction = {
            type: action.type || "start",
            actorId: "player-1",
            ...action
        } as GameAction;
        const nextState = game.logic.applyAction(gameState, fullAction);
        setGameState(nextState);
    };

    return (
        <div className="retro-quiz-container" dir="rtl" style={themeStyle}>
            <header className="retro-header">
                <div className="badge-server">Server connected</div>
                <div className="hub-center">
                    <div className="badge-points">
                        <span role="img" aria-label="Coins">??</span> {gameState.score || 0} pts
                    </div>
                    <div className="status-row">
                        <span style={{ fontWeight: "bold" }}>Demo</span>
                        <div className="timer-circle">18</div>
                        <div style={{ lineHeight: "1.2", textAlign: "center" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>
                                Q {gameState.round || 1} / {gameState.totalRounds || 20}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "#666" }}>CLASSIC</div>
                        </div>
                        <div className="hearts">??????????</div>
                    </div>
                    <div className="pin-badge">PIN: 124800</div>
                </div>
                <div>
                   <button style={{ background: "#73c5c1", border: "3px solid #5c4c3e", borderRadius: "50%", width: "40px", height: "40px", color: "white", fontWeight: "bold", fontSize: "1.2rem", cursor: "pointer" }}>??</button>
                </div>
            </header>

            <div className="question-card">
                <div className="question-card-inner">
                    <span className="calendar-icon">?? 17</span>
                    <h2 className="question-text">
                        {game.logic.getObjective(gameState) || "???? ?? ??? ??????? ?????? ????????"}
                    </h2>
                </div>
            </div>

            <div className="play-area">
                <div className="drop-zones">
                    <div style={{ textAlign: "center", fontWeight: "bold", color: "#5c4c3e" }}>?????? ???????</div>
                    <div className="drop-zone">drop here</div>
                    
                    <div style={{ textAlign: "center", fontWeight: "bold", color: "#5c4c3e" }}>??? ???</div>
                    <div className="drop-zone drop-zone-filled">
                        <span className="zone-label">????? ?????? ????</span>
                    </div>

                    <div style={{ textAlign: "center", fontWeight: "bold", color: "#5c4c3e" }}>????? ???</div>
                    <div className="drop-zone">drop here</div>

                    <div style={{ textAlign: "center", fontWeight: "bold", color: "#5c4c3e" }}>???? ???</div>
                    <div className="drop-zone">drop here</div>
                </div>

                <div className="drag-items">
                    <div style={{ textAlign: "right", fontWeight: "bold", color: "#8c7f6b", fontSize: "1.2rem", paddingBottom: "1rem" }}>
                        Drag to Match ?
                    </div>
                    <div className="drag-item">????? ??????? ????</div>
                    <div className="drag-item">????? ??????? ????</div>
                    <div className="drag-item">????? ??????? ????</div>
                </div>
            </div>

            <div className="actions-row">
                <button className="btn-retro btn-pause" onClick={() => dispatch({ type: "hint" })}>
                    || Pause
                </button>
                <button className="btn-retro btn-end" onClick={() => dispatch({ type: "reset" })}>
                    � End Game
                </button>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: "20px", paddingBottom: "40px" }}>
                <button 
                    className="btn-retro btn-submit"
                    onClick={() => dispatch({ type: "submit", success: true })}
                >
                    ????? ??????? ?
                </button>
            </div>

            <div className="shop-icon">
                <span style={{ fontSize: "2rem", marginBottom: "-5px" }}>??</span>
                <span style={{ fontSize: "0.6rem" }}>SHOP /</span>
                <span style={{ fontSize: "0.6rem" }}>PALETTES</span>
            </div>
            
            {/* Fake minimalist pixel cacti for the background */}
            <div style={{ position: "absolute", bottom: "20%", left: "5%", color: "#659c6b", fontSize: "4rem", opacity: 0.6 }}>??</div>
            <div style={{ position: "absolute", bottom: "5%", left: "15%", color: "#659c6b", fontSize: "6rem", opacity: 0.8 }}>??</div>
            <div style={{ position: "absolute", bottom: "15%", right: "10%", color: "#659c6b", fontSize: "5rem", opacity: 0.7 }}>??</div>
        </div>
    );
};

export default Play;
