import { collaborativeGameFactory } from '../shared/engine';

const mapQuestModule = collaborativeGameFactory.createModule({
    id: 'map-quest-trivia',
    name: 'Map Quest Trivia',
    description: 'Answer route-based trivia to travel across checkpoints on a mission map.',
    tags: ['adventure', 'geography', 'strategy'],
    config: {
        minPlayers: 2,
        maxPlayers: 16,
        defaultTimeLimitSec: 1000,
        collaborationMode: 'team',
        configurableSettings: {
            mapSize: 'large',
            checkpointCount: 7,
            detoursEnabled: true,
        },
    },
    controls: ['Pick route', 'Answer checkpoint', 'Use shortcut token', 'Secure territory'],
    objectives: [
        'Choose the optimal opening route to checkpoint one.',
        'Solve landmark clues to cross mountain pass.',
        'Recover lost supplies with rapid-fire micro quiz.',
        'Negotiate alliance path through the city zone.',
        'Reach the final destination with maximum fuel score.',
    ],
    tuning: {
        baseSubmitScore: 150,
        hintPenalty: 22,
        collaborationBonus: 14,
    },
});

export default mapQuestModule;