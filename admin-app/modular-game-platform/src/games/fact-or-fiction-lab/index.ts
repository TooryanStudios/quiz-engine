import { collaborativeGameFactory } from '../shared/engine';

const factOrFictionModule = collaborativeGameFactory.createModule({
    id: 'fact-or-fiction-lab',
    name: 'Fact or Fiction Lab',
    description: 'Teams investigate mixed claims and classify each as true, false, or uncertain.',
    tags: ['verification', 'research', 'critical-thinking'],
    config: {
        minPlayers: 2,
        maxPlayers: 20,
        defaultTimeLimitSec: 920,
        collaborationMode: 'team',
        configurableSettings: {
            claimBundles: 8,
            confidenceMultiplier: true,
            evidenceTokens: 3,
        },
    },
    controls: ['Tag claim', 'Attach evidence', 'Set confidence', 'Lock verdict'],
    objectives: [
        'Classify introductory claims with confidence score.',
        'Spot manipulated statistics in data snippets.',
        'Differentiate correlation from causation examples.',
        'Finalize claim board with strongest evidence trail.',
    ],
    tuning: {
        baseSubmitScore: 155,
        hintPenalty: 19,
        collaborationBonus: 11,
    },
});

export default factOrFictionModule;