import { collaborativeGameFactory } from '../shared/engine';

const clueChainModule = collaborativeGameFactory.createModule({
    id: 'clue-chain',
    name: 'Clue Chain',
    description: 'Teams unlock consecutive clues where each solved clue reveals the next puzzle.',
    tags: ['collaboration', 'mystery', 'progressive'],
    config: {
        minPlayers: 2,
        maxPlayers: 8,
        defaultTimeLimitSec: 900,
        collaborationMode: 'team',
        configurableSettings: {
            maxHintsPerRound: 2,
            chainLength: 6,
            hardMode: false,
        },
    },
    controls: ['Request hint', 'Submit clue solution', 'Advance to next clue', 'Team sync'],
    objectives: [
        'Decode the opening cipher from the briefing card.',
        'Identify the hidden location from clue fragments.',
        'Reconstruct the timeline of events in order.',
        'Find the incorrect witness statement.',
        'Solve the lock phrase from word tiles.',
        'Reveal the final mastermind identity.',
    ],
    tuning: {
        baseSubmitScore: 140,
        hintPenalty: 20,
        collaborationBonus: 12,
    },
});

export default clueChainModule;