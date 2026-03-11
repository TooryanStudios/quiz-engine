import { collaborativeGameFactory } from '../shared/engine';
import FishFenceCountRenderer from './renderer';

const fishFenceCountModule = collaborativeGameFactory.createModule({
    id: 'fish-fence-count',
    name: 'Fish Rescue Cage',
    description: 'Slide fish in fixed directions and rescue them into the safe cage before the whale arrives.',
    tags: ['visual', 'puzzle', 'move-order', 'sliding', 'family-friendly'],
    config: {
        minPlayers: 1,
        maxPlayers: 24,
        defaultTimeLimitSec: 95,
        collaborationMode: 'team',
        configurableSettings: {
            boardWidth: 9,
            boardHeight: 6,
            unsolvableCheck: true,
        },
    },
    controls: ['Tap fish', 'Slide until blocked', 'Manage move order', 'Beat timer'],
    objectives: [
        'Rescue all fish in level one before whale arrival.',
        'Use correct move sequence to avoid unsolvable lock in level two.',
        'Clear final pressure stage with strict order and timer control.',
    ],
    tuning: {
        baseSubmitScore: 110,
        hintPenalty: 14,
        collaborationBonus: 8,
    },
    render: FishFenceCountRenderer,
});

export default fishFenceCountModule;
