import { collaborativeGameFactory } from '../shared/engine';
import Html5TargetRushRenderer from './renderer';

const html5TargetRushModule = collaborativeGameFactory.createModule({
    id: 'html5-target-rush',
    name: 'HTML5 Target Rush',
    description: 'Fast click-and-tap canvas challenge for live player testing.',
    tags: ['html5', 'canvas', 'arcade', 'realtime'],
    config: {
        minPlayers: 1,
        maxPlayers: 40,
        defaultTimeLimitSec: 30,
        collaborationMode: 'competitive',
        configurableSettings: {
            durationSec: 30,
            targetSpeed: 'normal',
            mobileFriendly: true,
        },
    },
    controls: ['Tap target', 'Avoid misses', 'Hit streak milestones', 'Restart run'],
    objectives: [
        'Land 5 hits before the first speed increase.',
        'Maintain at least 65 percent accuracy.',
        'Reach a double-digit hit score before timer ends.',
    ],
    tuning: {
        baseSubmitScore: 20,
        hintPenalty: 3,
        collaborationBonus: 0,
    },
    render: Html5TargetRushRenderer,
});

export default html5TargetRushModule;
