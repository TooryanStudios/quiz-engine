import { collaborativeGameFactory } from '../shared/engine';

const debateDuelModule = collaborativeGameFactory.createModule({
    id: 'debate-duel-quiz',
    name: 'Debate Duel Quiz',
    description: 'Teams answer and then defend choices in a timed debate for bonus persuasion points.',
    tags: ['debate', 'communication', 'critical-thinking'],
    config: {
        minPlayers: 4,
        maxPlayers: 20,
        defaultTimeLimitSec: 1100,
        collaborationMode: 'hybrid',
        configurableSettings: {
            rebuttalWindowSec: 45,
            judgeVoting: true,
            evidenceBonus: true,
        },
    },
    controls: ['Answer stance', 'Assign speaker', 'Submit rebuttal', 'Claim evidence bonus'],
    objectives: [
        'Pick the strongest initial argument among options.',
        'Counter the opposing interpretation with evidence.',
        'Identify logical fallacies in rebuttal statements.',
        'Deliver final synthesis to secure judge votes.',
    ],
    tuning: {
        baseSubmitScore: 165,
        hintPenalty: 24,
        collaborationBonus: 20,
    },
});

export default debateDuelModule;