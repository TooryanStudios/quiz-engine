import React from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useParams, useLocation } from 'react-router-dom';
import Dashboard from './admin/dashboard';
import Play from './gameplay/play';
import SessionRuntimePage from './runtime/session-runtime-page';

const PlayRoute: React.FC = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const location = useLocation();
    const isEmbed = location.pathname.startsWith('/embed');
    return <Play gameId={gameId ?? 'clue-chain'} isEmbed={isEmbed} />;
};

const Navigation: React.FC = () => {
    const location = useLocation();
    const isEmbed = location.pathname.startsWith('/embed');
    
    if (isEmbed) {
        return null;
    }
    
    return (
        <nav className="main-nav" style={{ padding: '1rem', background: '#333', color: 'white' }}>
            <Link to="/" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none', fontWeight: 'bold' }}>Platform Home</Link>
            <Link to="/dashboard" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Admin</Link>
            <Link to="/play/clue-chain" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play Classic</Link>
            <Link to="/play/html5-target-rush" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play HTML5 Test</Link>
            <Link to="/play/fish-fence-count" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play Fish Fence</Link>
            <Link to="/runtime" style={{ color: '#eee', textDecoration: 'none' }}>Multiplayer Runtime</Link>
        </nav>
    );
};

const App = () => {
    return (
        <Router>
            <div className="app-container">
                <Navigation />
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/play" element={<Play gameId="clue-chain" />} />
                    <Route path="/play/:gameId" element={<PlayRoute />} />
                    <Route path="/embed/:gameId" element={<PlayRoute />} />
                    <Route path="/runtime" element={<SessionRuntimePage />} />
                    <Route path="/runtime/:roomCode" element={<SessionRuntimePage />} />
                    <Route path="/" element={<Navigate to="/play/fish-fence-count" replace />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
