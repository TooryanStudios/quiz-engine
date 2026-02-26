import { collaborativeGameFactory } from '../shared/engine';

const reverseQuizModule = collaborativeGameFactory.createModule({
    id: 'reverse-quiz',
    name: 'Reverse Quiz',
    description: 'Players receive answers first and collaborate to craft the most accurate question.',
    tags: ['lateral-thinking', 'creative', 'quiz'],
    config: {
        minPlayers: 2,
        maxPlayers: 14,
        defaultTimeLimitSec: 780,
        collaborationMode: 'hybrid',
        configurableSettings: {
            answerRevealTier: 'partial',
            confidenceScoring: true,
            multiQuestionBonus: true,
        },
    },
    controls: ['Inspect answer', 'Draft question', 'Rate confidence', 'Submit final wording'],
    objectives: [
        'Infer category from first revealed answer.',
        'Draft two possible question candidates.',
        'Choose the highest precision phrasing.',
        'Submit final reverse question with confidence tag.',
    ],
    tuning: {
        baseSubmitScore: 138,
        hintPenalty: 15,
        collaborationBonus: 17,
    },
});

export default reverseQuizModule;