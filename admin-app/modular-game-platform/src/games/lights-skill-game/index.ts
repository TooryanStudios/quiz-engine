import { collaborativeGameFactory } from '../shared/engine';
import LightsSkillGameRenderer from './renderer';

const lightsSkillGameModule = collaborativeGameFactory.createModule({
    id: 'lights-skill-game',
    name: 'Lights Skill Game',
    description: 'Rotate tiles to route power through every square before the timer runs dry.',
    tags: ['html5', 'puzzle', 'timed', 'canvas'],
    config: {
        minPlayers: 1,
        maxPlayers: 12,
        defaultTimeLimitSec: 240,
        collaborationMode: 'team',
        configurableSettings: {
            difficulty: 2,
            allowHardMode: true,
        },
    },
    controls: ['Tap tiles to rotate', 'Complete the circuit', 'Beat the timer', 'Use restarts wisely'],
    objectives: [
        'Solve the replica starter grid by lighting every conduit.',
        'Route power efficiently through mid-sized grids.',
        'Clear expert mode with minimal restarts to maximize score.',
    ],
    tuning: {
        baseSubmitScore: 150,
        hintPenalty: 20,
        collaborationBonus: 12,
    },
    render: LightsSkillGameRenderer,
});

export default lightsSkillGameModule;
