import { collaborativeGameFactory } from '../shared/engine';

const mysteryRoomModule = collaborativeGameFactory.createModule({
    id: 'mystery-room-quiz',
    name: 'Mystery Room Quiz',
    description: 'Solve room-based puzzle locks and narrative clues to escape before the timer ends.',
    tags: ['escape', 'teamwork', 'investigation'],
    config: {
        minPlayers: 2,
        maxPlayers: 10,
        defaultTimeLimitSec: 1200,
        collaborationMode: 'team',
        configurableSettings: {
            roomCount: 4,
            hiddenObjects: true,
            timerVisible: true,
        },
    },
    controls: ['Inspect area', 'Collect clue', 'Combine evidence', 'Unlock room'],
    objectives: [
        'Open the archives drawer by solving the symbol lock.',
        'Match artifacts to the right historical owner.',
        'Assemble torn map sections into one route.',
        'Use gathered evidence to unlock the exit panel.',
    ],
    tuning: {
        baseSubmitScore: 170,
        hintPenalty: 25,
        collaborationBonus: 15,
    },
});

export default mysteryRoomModule;