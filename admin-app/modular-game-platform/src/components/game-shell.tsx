import React from 'react';

interface GameShellProps {
    children: React.ReactNode;
}

const GameShell: React.FC<GameShellProps> = ({ children }) => {
    return (
        <div className="game-shell">
            <header className="game-header">
                <h1>Game Title</h1>
            </header>
            <main className="game-content">
                {children}
            </main>
            <footer className="game-footer">
                <p>Game Footer Information</p>
            </footer>
        </div>
    );
};

export default GameShell;