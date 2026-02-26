import React, { useState } from 'react';
import { RegisteredGameSummary } from '../core/types';

interface SettingsProps {
    game: RegisteredGameSummary;
    onToggle: (gameId: string, enabled: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ game, onToggle }) => {
    const [enabled, setEnabled] = useState<boolean>(game.enabled);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEnabled(e.target.checked);
    };

    const handleSave = () => {
        onToggle(game.id, enabled);
    };

    return (
        <div>
            <h2>Game Settings</h2>
            <form>
                <label>
                    Enabled:
                    <input type="checkbox" checked={enabled} onChange={handleChange} />
                </label>
                <button type="button" onClick={handleSave}>Save Settings</button>
            </form>
        </div>
    );
};

export default Settings;
