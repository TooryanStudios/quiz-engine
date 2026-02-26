import { collaborativeGameFactory } from '../shared/engine';

const memoryGridModule = collaborativeGameFactory.createModule({
    id: 'memory-grid-battle',
    name: 'Memory Grid Battle',
    description: 'Teams memorize revealed grid symbols and reconstruct hidden coordinates for points.',
    tags: ['memory', 'visual', 'team-quiz'],
    config: {
        minPlayers: 2,
        maxPlayers: 12,
        defaultTimeLimitSec: 850,
        collaborationMode: 'team',
        configurableSettings: {
            gridSize: 6,
            revealDurationSec: 10,
            mirroredPatterns: true,
        },
    },
    controls: ['Reveal grid', 'Lock position', 'Confirm pattern', 'Team memory sync'],
    objectives: [
        'Memorize opening 3x3 symbol burst.',
        'Recreate missing row from short reveal.',
        'Track mirrored symbol swap in round three.',
        'Complete full board reconstruction challenge.',
    ],
    tuning: {
        baseSubmitScore: 145,
        hintPenalty: 16,
        collaborationBonus: 13,
    },
});

export default memoryGridModule;