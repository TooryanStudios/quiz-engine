import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './admin/dashboard';
import Play from './gameplay/play';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/play" element={<Play gameId="clue-chain" />} />
                <Route path="/" element={<h1>Welcome to the Modular Game Platform</h1>} />
            </Routes>
        </Router>
    );
};

export default App;