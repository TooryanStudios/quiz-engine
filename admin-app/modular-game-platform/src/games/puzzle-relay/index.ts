import { collaborativeGameFactory } from '../shared/engine';

const puzzleRelayModule = collaborativeGameFactory.createModule({
    id: 'puzzle-relay',
    name: 'Puzzle Relay',
    description: 'Each teammate solves a unique stage and passes partial data to the next player.',
    tags: ['relay', 'teamwork', 'logic'],
    config: {
        minPlayers: 3,
        maxPlayers: 12,
        defaultTimeLimitSec: 800,
        collaborationMode: 'team',
        configurableSettings: {
            relayStages: 5,
            handoffTimerSec: 20,
            randomRoleAssignment: true,
        },
    },
    controls: ['Solve stage', 'Pass token', 'Request teammate context', 'Finalize chain'],
    objectives: [
        'Decrypt the first relay code fragment.',
        'Transform fragment into matching symbol matrix.',
        'Infer missing data from previous teammate clue.',
        'Resolve final relay lock with all gathered pieces.',
    ],
    tuning: {
        baseSubmitScore: 160,
        hintPenalty: 18,
        collaborationBonus: 18,
    },
});

export default puzzleRelayModule;