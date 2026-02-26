import { collaborativeGameFactory } from '../shared/engine';

const allianceBetrayalModule = collaborativeGameFactory.createModule({
    id: 'alliance-betrayal-mode',
    name: 'Alliance & Betrayal Mode',
    description: 'Teams can form temporary alliances for shared puzzle gain before endgame competition.',
    tags: ['social', 'strategy', 'alliances'],
    config: {
        minPlayers: 4,
        maxPlayers: 24,
        defaultTimeLimitSec: 1300,
        collaborationMode: 'competitive',
        configurableSettings: {
            allianceWindowRounds: 2,
            betrayalBonusEnabled: true,
            hiddenObjectives: true,
        },
    },
    controls: ['Propose alliance', 'Share clue', 'Break pact', 'Lock endgame answer'],
    objectives: [
        'Form opening alliances and split puzzle workload.',
        'Complete shared objective before alliance timer closes.',
        'Predict rival strategy and secure private clues.',
        'Execute final solo answer for leaderboard position.',
    ],
    tuning: {
        baseSubmitScore: 175,
        hintPenalty: 26,
        collaborationBonus: 10,
    },
});

export default allianceBetrayalModule;