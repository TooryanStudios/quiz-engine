import React from 'react';
import type { GameRendererProps } from '../../core/types';
import './renderer.css';

type ArcadeHandlers = {
    __ctlArcadeStartSession?: () => void;
    __ctlArcadeEndSession?: () => void;
    __ctlArcadeRestartLevel?: (payload: { level: number }) => void;
    __ctlArcadeSaveScore?: (payload: { score: number }) => void;
    __ctlArcadeShowInterlevelAD?: () => void;
    __ctlArcadeShareEvent?: (payload: { score: number }) => void;
};

declare global {
    interface Window extends ArcadeHandlers {}
}

const iframeSrc = '/lights-skill-game/index.html?ctl-arcade=true';

const LightsSkillGameRenderer: React.FC<GameRendererProps> = ({ dispatch, standalone }) => {
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

    React.useEffect(() => {
        window.__ctlArcadeStartSession = () => {
            dispatch({ type: 'start', note: 'Arcade session started' });
        };
        window.__ctlArcadeEndSession = () => {
            dispatch({ type: 'advance', note: 'Arcade session finished' });
        };
        window.__ctlArcadeRestartLevel = ({ level }) => {
            dispatch({ type: 'reset', note: `Restarted level ${level}` });
        };
        window.__ctlArcadeSaveScore = ({ score }) => {
            dispatch({ type: 'submit', success: true, note: `Score ${score}` });
        };
        window.__ctlArcadeShowInterlevelAD = () => {
            dispatch({ type: 'hint', note: 'Interlevel ad placeholder' });
        };
        window.__ctlArcadeShareEvent = ({ score }) => {
            dispatch({ type: 'collaborate', note: `Share event score ${score}` });
        };

        if (standalone) {
            const previousColor = document.body.style.backgroundColor;
            document.body.style.backgroundColor = '#030915';
            document.body.style.margin = '0';
            document.documentElement.style.backgroundColor = '#030915';
            document.documentElement.style.margin = '0';
            return () => {
                document.body.style.backgroundColor = previousColor;
                document.documentElement.style.backgroundColor = '';
            };
        }

        return () => {
            window.__ctlArcadeStartSession = undefined;
            window.__ctlArcadeEndSession = undefined;
            window.__ctlArcadeRestartLevel = undefined;
            window.__ctlArcadeSaveScore = undefined;
            window.__ctlArcadeShowInterlevelAD = undefined;
            window.__ctlArcadeShareEvent = undefined;
        };
    }, [dispatch, standalone]);

    return (
        <div className="lights-skill-game-standalone">
            <iframe
                ref={iframeRef}
                src={iframeSrc}
                title="Lights Skill Game"
                allowFullScreen
                scrolling="no"
            />
        </div>
    );
};

export default LightsSkillGameRenderer;
