import React from 'react';
import { BrowserRouter as Router, Link, Route, Routes, useParams } from 'react-router-dom';
import Dashboard from './admin/dashboard';
import Play from './gameplay/play';
import SessionRuntimePage from './runtime/session-runtime-page';

const PlayRoute: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    return <Play gameId={gameId ?? 'clue-chain'} />;
};

const App = () => {
    return (
        <Router>
            <div className="app-container">
                <nav className="main-nav" style={{ padding: '1rem', background: '#333', color: 'white' }}>
                    <Link to="/" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none', fontWeight: 'bold' }}>Platform Home</Link>
                    <Link to="/dashboard" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Admin</Link>
                    <Link to="/play/clue-chain" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play Classic</Link>
                    <Link to="/play/html5-target-rush" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play HTML5 Test</Link>
                    <Link to="/play/fish-fence-count" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play Fish Fence</Link>
                    <Link to="/runtime" style={{ color: '#eee', textDecoration: 'none' }}>Multiplayer Runtime</Link>
                </nav>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/play" element={<Play gameId="clue-chain" />} />
                    <Route path="/play/:gameId" element={<PlayRoute />} />
                    <Route path="/runtime" element={<SessionRuntimePage />} />
                    <Route path="/runtime/:roomCode" element={<SessionRuntimePage />} />
                    <Route path="/" element={
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <h1>Modular Game Platform v1.0</h1>
                            <p>Ready to collaborate and solve puzzles?</p>
                            <div style={{ marginTop: '2rem' }}>
                                <Link to="/play/clue-chain" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', textDecoration: 'none', marginRight: '1rem', display: 'inline-block' }}>
                                    Launch Classic
                                </Link>
                                <Link to="/play/html5-target-rush" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', textDecoration: 'none', display: 'inline-block' }}>
                                    Launch HTML5 Test
                                </Link>
                                <Link to="/play/fish-fence-count" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', textDecoration: 'none', marginLeft: '1rem', display: 'inline-block' }}>
                                    Launch Fish Fence
                                </Link>
                                <Link to="/runtime" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', textDecoration: 'none', marginLeft: '1rem', display: 'inline-block' }}>
                                    Launch Multiplayer Runtime
                                </Link>
                            </div>
                        </div>
                    } />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
