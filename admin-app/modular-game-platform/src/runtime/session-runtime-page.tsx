import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Play from '../gameplay/play';
import type { GameState } from '../core/types';
import {
    createRoom,
    joinRoom,
    leaveRoom,
    normalizeRoomCode,
    readRoom,
    SessionRoom,
    subscribeRoom,
    touchPlayer,
    updatePlayerScore,
} from './session-store';
import './session-runtime-page.css';

const SESSION_GAME_ID = 'html5-target-rush';

interface JoinedSession {
    roomCode: string;
    playerId: string;
    playerName: string;
}

function randomPlayerName(): string {
    return `Player-${Math.floor(100 + Math.random() * 900)}`;
}

const SessionRuntimePage: React.FC = () => {
    const { roomCode: roomCodeFromPath } = useParams<{ roomCode?: string }>();

    const [playerName, setPlayerName] = React.useState(randomPlayerName());
    const [roomInput, setRoomInput] = React.useState(roomCodeFromPath ? normalizeRoomCode(roomCodeFromPath) : '');
    const [joined, setJoined] = React.useState<JoinedSession | null>(null);
    const [room, setRoom] = React.useState<SessionRoom | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const lastSubmittedScoreRef = React.useRef<number | null>(null);

    React.useEffect(() => {
        if (roomCodeFromPath) {
            setRoomInput(normalizeRoomCode(roomCodeFromPath));
        }
    }, [roomCodeFromPath]);

    React.useEffect(() => {
        if (!joined) {
            return;
        }

        const unsubscribe = subscribeRoom(joined.roomCode, (nextRoom) => {
            setRoom(nextRoom);
        });

        const heartbeatId = window.setInterval(() => {
            touchPlayer(joined.roomCode, joined.playerId);
        }, 3000);

        return () => {
            unsubscribe();
            window.clearInterval(heartbeatId);
        };
    }, [joined]);

    const handleCreateRoom = () => {
        try {
            const result = createRoom(SESSION_GAME_ID, playerName);
            const nextJoined: JoinedSession = {
                roomCode: result.room.code,
                playerId: result.playerId,
                playerName: playerName.trim() || 'Player',
            };
            setJoined(nextJoined);
            setRoom(result.room);
            setRoomInput(result.room.code);
            setError(null);
            lastSubmittedScoreRef.current = null;
        } catch (creationError) {
            const message = creationError instanceof Error ? creationError.message : 'Could not create room';
            setError(message);
        }
    };

    const handleJoinRoom = () => {
        try {
            const code = normalizeRoomCode(roomInput);
            if (!code) {
                setError('Enter a valid room code.');
                return;
            }

            const existingRoom = readRoom(code);
            if (!existingRoom) {
                setError('Room not found. Ask host to share a valid code.');
                return;
            }

            const result = joinRoom(code, playerName);
            const nextJoined: JoinedSession = {
                roomCode: result.room.code,
                playerId: result.playerId,
                playerName: playerName.trim() || 'Player',
            };

            setJoined(nextJoined);
            setRoom(result.room);
            setError(null);
            lastSubmittedScoreRef.current = null;
        } catch (joinError) {
            const message = joinError instanceof Error ? joinError.message : 'Could not join room';
            setError(message);
        }
    };

    const handleLeave = () => {
        if (joined) {
            leaveRoom(joined.roomCode, joined.playerId);
        }
        setJoined(null);
        setRoom(null);
        lastSubmittedScoreRef.current = null;
    };

    const handleStateChange = React.useCallback(
        (gameState: GameState) => {
            if (!joined) {
                return;
            }

            if (lastSubmittedScoreRef.current === gameState.score) {
                return;
            }

            lastSubmittedScoreRef.current = gameState.score;
            updatePlayerScore(joined.roomCode, joined.playerId, gameState.score, joined.playerName);
        },
        [joined],
    );

    const sortedPlayers = React.useMemo(() => {
        const players = room ? Object.values(room.players) : [];
        return players.sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);
    }, [room]);

    return (
        <div className="session-page">
            <div className="session-shell">
                <div className="session-card">
                    <h2>HTML5 Target Rush Multiplayer Runtime</h2>
                    <p className="muted">Create a room, share the code, and compare live scores while each player runs their own game session.</p>
                    <div className="session-actions">
                        <Link to="/play/html5-target-rush" className="session-btn secondary">Single Player View</Link>
                        <Link to="/" className="session-btn secondary">Back Home</Link>
                    </div>
                </div>

                {!joined && (
                    <div className="session-grid">
                        <div className="session-card">
                            <h3>Create Room</h3>
                            <label>
                                Display Name
                                <input
                                    className="session-input"
                                    value={playerName}
                                    onChange={(event) => setPlayerName(event.target.value)}
                                    maxLength={24}
                                />
                            </label>
                            <div className="session-actions">
                                <button className="session-btn" onClick={handleCreateRoom}>Create New Room</button>
                            </div>
                        </div>

                        <div className="session-card">
                            <h3>Join Room</h3>
                            <label>
                                Room Code
                                <input
                                    className="session-input"
                                    value={roomInput}
                                    onChange={(event) => setRoomInput(normalizeRoomCode(event.target.value))}
                                    maxLength={6}
                                />
                            </label>
                            <label>
                                Display Name
                                <input
                                    className="session-input"
                                    value={playerName}
                                    onChange={(event) => setPlayerName(event.target.value)}
                                    maxLength={24}
                                />
                            </label>
                            <div className="session-actions">
                                <button className="session-btn" onClick={handleJoinRoom}>Join Existing Room</button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="session-card">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {joined && (
                    <>
                        <div className="session-grid">
                            <div className="session-card">
                                <h3>Session Details</h3>
                                <p><strong>Room Code:</strong> {joined.roomCode}</p>
                                <p><strong>You:</strong> {joined.playerName}</p>
                                <p className="muted">Ask others to open this URL and join with the room code.</p>
                                <code>{`${window.location.origin}/runtime/${joined.roomCode}`}</code>
                                <div className="session-actions">
                                    <button className="session-btn secondary" onClick={handleLeave}>Leave Room</button>
                                </div>
                            </div>

                            <div className="session-card">
                                <h3>Live Scoreboard</h3>
                                <ul className="scoreboard-list">
                                    {sortedPlayers.map((player) => (
                                        <li key={player.id} className="scoreboard-item">
                                            <span>{player.name}</span>
                                            <strong>{player.score}</strong>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <Play
                            gameId={SESSION_GAME_ID}
                            onStateChange={handleStateChange}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default SessionRuntimePage;
