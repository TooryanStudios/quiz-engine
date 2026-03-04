import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './admin/dashboard';
import Play from './gameplay/play';

const App = () => {
    return (
        <Router>
            <div className="app-container">
                <nav className="main-nav" style={{ padding: '1rem', background: '#333', color: 'white' }}>
                    <a href="/" style={{ color: 'white', marginRight: '1rem', textDecoration: 'none', fontWeight: 'bold' }}>Platform Home</a>
                    <a href="/dashboard" style={{ color: '#eee', marginRight: '1rem', textDecoration: 'none' }}>Admin</a>
                    <a href="/play" style={{ color: '#eee', textDecoration: 'none' }}>Play Game</a>
                </nav>
                <Routes>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/play" element={<Play gameId="clue-chain" />} />
                    <Route path="/" element={
                        <div style={{ textAlign: 'center', padding: '5rem' }}>
                            <h1>Modular Game Platform v1.0</h1>
                            <p>Ready to collaborate and solve puzzles?</p>
                            <div style={{ marginTop: '2rem' }}>
                                <a href="/play" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.2rem', textDecoration: 'none' }}>Launch Game Instance</a>
                            </div>
                        </div>
                    } />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
