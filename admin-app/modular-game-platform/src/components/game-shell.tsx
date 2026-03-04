import React from 'react';
import '../styles.css';

interface GameShellProps {
    children: React.ReactNode;
    title?: string;
}

const GameShell: React.FC<GameShellProps> = ({ children, title = "Game Station" }) => {
    return (
        <div className="game-shell">
            <header className="game-header">
                <h1>{title}</h1>
            </header>
            <main className="game-content">
                {children}
            </main>
            <footer className="game-footer">
                <p>&copy; 2026 Modular Game Platform - All Rights Reserved</p>
            </footer>
        </div>
    );
};

export default GameShell;
