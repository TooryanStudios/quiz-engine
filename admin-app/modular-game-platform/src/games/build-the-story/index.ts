import { collaborativeGameFactory } from '../shared/engine';

const buildTheStoryModule = collaborativeGameFactory.createModule({
    id: 'build-the-story',
    name: 'Build-the-Story Challenge',
    description: 'Teams collect story fragments and assemble the most coherent narrative arc.',
    tags: ['creative', 'narrative', 'collaboration'],
    config: {
        minPlayers: 2,
        maxPlayers: 12,
        defaultTimeLimitSec: 900,
        collaborationMode: 'hybrid',
        configurableSettings: {
            fragmentsPerRound: 5,
            votingEnabled: true,
            toneShiftRound: true,
        },
    },
    controls: ['Draft scene', 'Merge fragments', 'Vote narrative fit', 'Finalize story'],
    objectives: [
        'Arrange opening hooks by strongest attention score.',
        'Connect characters to matching motivations.',
        'Rebuild the middle conflict from shuffled scenes.',
        'Select the most logical climax branch.',
        'Deliver the final ending in one coherent timeline.',
    ],
    tuning: {
        baseSubmitScore: 130,
        hintPenalty: 18,
        collaborationBonus: 16,
    },
});

export default buildTheStoryModule;