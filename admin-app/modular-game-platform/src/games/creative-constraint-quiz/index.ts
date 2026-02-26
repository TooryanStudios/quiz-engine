import { collaborativeGameFactory } from '../shared/engine';

const creativeConstraintModule = collaborativeGameFactory.createModule({
    id: 'creative-constraint-quiz',
    name: 'Creative Constraint Quiz',
    description: 'Teams solve quiz rounds while following changing communication constraints.',
    tags: ['party', 'communication', 'creative'],
    config: {
        minPlayers: 3,
        maxPlayers: 16,
        defaultTimeLimitSec: 760,
        collaborationMode: 'team',
        configurableSettings: {
            forbiddenWordsMode: true,
            roleRotation: true,
            gestureRound: false,
        },
    },
    controls: ['Read constraint', 'Submit constrained answer', 'Swap role', 'Appeal violation'],
    objectives: [
        'Answer without using restricted vocabulary list.',
        'Solve clue while assigned speaker remains silent.',
        'Coordinate mixed-role team response under time pressure.',
        'Complete final puzzle with double constraints active.',
    ],
    tuning: {
        baseSubmitScore: 142,
        hintPenalty: 21,
        collaborationBonus: 19,
    },
});

export default creativeConstraintModule;