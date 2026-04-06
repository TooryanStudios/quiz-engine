import React from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useParams, useLocation } from 'react-router-dom';
import Dashboard from './admin/dashboard';
import Play from './gameplay/play';
import SessionRuntimePage from './runtime/session-runtime-page';

const HomePage: React.FC = () => {
    return (
        <div style={{ padding: '2.5rem', display: 'grid', gap: '1.5rem' }}>
            <header>
                <h1 style={{ marginBottom: '0.5rem' }}>Quiz Engine Sandbox</h1>
                <p style={{ maxWidth: 640, color: '#555' }}>
                    Pick any flow below to launch the relevant experience. Use this page as the neutral starting point when
                    testing newly imported HTML5 builds or multiplayer runtimes.
                </p>
            </header>

            <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <HomeCard title="Classic Play" description="Loads the standard React-driven quiz shells." to="/play/clue-chain" />
                <HomeCard title="HTML5 Test" description="Opens the embedded HTML5 canvas harness." to="/play/html5-target-rush" />
                <HomeCard title="Fish Fence" description="Quick access to the Fish Fence QA build." to="/play/fish-fence-count" />
                <HomeCard title="Lights Skill Game" description="Launch the new Lights HTML5 mini game." to="/mini/lights-skill-game" />
                <HomeCard title="Admin Dashboard" description="View configuration tools and stats." to="/dashboard" accent="#434190" />
                <HomeCard title="Multiplayer Runtime" description="Spin up a live session room." to="/runtime" accent="#065f46" />
            </section>
        </div>
    );
};

const HomeCard: React.FC<{ title: string; description: string; to: string; accent?: string }> = ({ title, description, to, accent = '#1f2933' }) => {
    return (
        <Link
            to={to}
            style={{
                borderRadius: '1rem',
                padding: '1.25rem',
                textDecoration: 'none',
                color: '#0f172a',
                border: '1px solid #e2e8f0',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
                background: '#fff',
                transition: 'transform 160ms ease, box-shadow 160ms ease',
            }}
            onMouseEnter={(event) => {
                event.currentTarget.style.transform = 'translateY(-4px)';
                event.currentTarget.style.boxShadow = '0 14px 30px rgba(15, 23, 42, 0.14)';
            }}
            onMouseLeave={(event) => {
                event.currentTarget.style.transform = 'translateY(0)';
                event.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.08)';
            }}
        >
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: accent, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {title}
            </div>
            <p style={{ marginTop: '0.5rem', color: '#475569', lineHeight: 1.5 }}>{description}</p>
            <span style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', fontWeight: 600, color: accent }}>
                Launch →
            </span>
        </Link>
    );
};

interface PlayRouteProps {
    standalone?: boolean;
    forceGameId?: string;
}

const PlayRoute: React.FC<PlayRouteProps> = ({ standalone, forceGameId }) => {
    const { gameId } = useParams<{ gameId: string }>();
    const location = useLocation();
    const isEmbed = location.pathname.startsWith('/embed');
    const resolvedId = forceGameId ?? gameId ?? 'clue-chain';
    return <Play gameId={resolvedId} isEmbed={isEmbed} standalone={standalone} />;
};

const Navigation: React.FC = () => {
    const location = useLocation();
    const isEmbed = location.pathname.startsWith('/embed');
    const isStandaloneMini = location.pathname.startsWith('/mini') || location.pathname.startsWith('/play/lights-skill-game') || location.pathname.startsWith('/play/fish-fence-count') || location.pathname.startsWith('/builder/');
    
    if (isEmbed || isStandaloneMini) {
        return null;
    }
    
    return (
        <nav className="main-nav" style={{ padding: '1rem', background: '#333', color: 'white' }}>
            <Link to="/" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none', fontWeight: 'bold' }}>Platform Home</Link>
            <Link to="/dashboard" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Admin</Link>
            <Link to="/play/clue-chain" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play Classic</Link>
            <Link to="/play/html5-target-rush" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play HTML5 Test</Link>
            <Link to="/play/fish-fence-count" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Play Fish Fence</Link>
            <Link to="/builder/fish-fence-count" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Fish Fence Builder</Link>
            <Link to="/mini/lights-skill-game" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Standalone Mini</Link>
            <Link to="/runtime" style={{ color: '#eee', textDecoration: 'none' }}>Multiplayer Runtime</Link>
        </nav>
    );
};

const AppContent: React.FC = () => {
    const location = useLocation();
    const isEmbed = location.pathname.startsWith('/embed');
    
    return (
        <>
            <Navigation />
            <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/play" element={<Play gameId="clue-chain" />} />
                <Route path="/play/lights-skill-game" element={<PlayRoute standalone forceGameId="lights-skill-game" />} />
                <Route path="/play/fish-fence-count" element={<PlayRoute standalone forceGameId="fish-fence-count" />} />
                <Route path="/builder/fish-fence-count" element={<PlayRoute standalone forceGameId="fish-fence-count" />} />
                <Route path="/play/:gameId" element={<PlayRoute />} />
                <Route path="/embed/:gameId" element={<PlayRoute />} />
                <Route path="/mini/:gameId" element={<PlayRoute standalone />} />
                <Route path="/runtime" element={<SessionRuntimePage />} />
                <Route path="/runtime/:roomCode" element={<SessionRuntimePage />} />
                <Route path="/sandbox" element={<HomePage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </>
    );
};

const App = () => {
    return (
        <Router>
            <AppContent />
        </Router>
    );
};

export default App;
