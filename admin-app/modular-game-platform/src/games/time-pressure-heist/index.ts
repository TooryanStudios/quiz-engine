import { collaborativeGameFactory } from '../shared/engine';

const heistModule = collaborativeGameFactory.createModule({
    id: 'time-pressure-heist',
    name: 'Time-Pressure Heist',
    description: 'Teams crack multi-layer vault sequences before the security timer expires.',
    tags: ['timed', 'high-pressure', 'puzzle'],
    config: {
        minPlayers: 2,
        maxPlayers: 10,
        defaultTimeLimitSec: 700,
        collaborationMode: 'team',
        configurableSettings: {
            alarmEscalation: true,
            vaultLayers: 5,
            penaltyOnFailure: true,
        },
    },
    controls: ['Crack code', 'Bypass alarm', 'Synchronize sequence', 'Extract vault data'],
    objectives: [
        'Bypass perimeter authentication challenge.',
        'Solve rotating digit cipher before alarm tick.',
        'Coordinate dual-switch puzzle under countdown.',
        'Unlock final vault with combined team sequence.',
    ],
    tuning: {
        baseSubmitScore: 180,
        hintPenalty: 30,
        collaborationBonus: 14,
    },
});

export default heistModule;