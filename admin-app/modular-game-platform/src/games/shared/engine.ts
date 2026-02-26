import type { GameAction, GameLogic, GameModule, GameState } from '../../core/types';
import type { CollaborativeGameFactory, GameBlueprint, ModeTuning } from './types';

function clampRound(round: number, totalRounds: number): number {
    return Math.max(1, Math.min(round, totalRounds));
}

function nextObjective(round: number, objectives: string[]): string {
    return objectives[clampRound(round, objectives.length) - 1];
}

function createInitialState(objectives: string[]): GameState {
    return {
        round: 1,
        totalRounds: objectives.length,
        score: 0,
        hintsUsed: 0,
        collaborations: 0,
        solvedPuzzles: 0,
        completed: false,
        currentObjective: nextObjective(1, objectives),
        activityLog: ['Session initialized.'],
    };
}

function toActionLog(action: GameAction): string {
    const actor = action.actorId ? `${action.actorId}` : 'player';
    const note = action.note ? ` (${action.note})` : '';
    return `${actor} used '${action.type}'${note}`;
}

function applyAction(
    state: GameState,
    action: GameAction,
    objectives: string[],
    tuning: ModeTuning,
): GameState {
    if (action.type === 'reset') {
        return createInitialState(objectives);
    }

    if (state.completed) {
        return state;
    }

    const activityLog = [...state.activityLog, toActionLog(action)];

    switch (action.type) {
        case 'hint':
            return {
                ...state,
                hintsUsed: state.hintsUsed + 1,
                score: Math.max(0, state.score - tuning.hintPenalty),
                activityLog,
            };

        case 'collaborate':
            return {
                ...state,
                collaborations: state.collaborations + 1,
                score: state.score + tuning.collaborationBonus,
                activityLog,
            };

        case 'submit': {
            const isSuccess = action.success ?? false;
            const solvedPuzzles = state.solvedPuzzles + (isSuccess ? 1 : 0);
            const score = state.score + (isSuccess ? tuning.baseSubmitScore : 0);
            return {
                ...state,
                solvedPuzzles,
                score,
                activityLog,
            };
        }

        case 'advance': {
            const round = clampRound(state.round + 1, state.totalRounds);
            const completed = round >= state.totalRounds;
            return {
                ...state,
                round,
                completed,
                currentObjective: nextObjective(round, objectives),
                activityLog,
            };
        }

        case 'start':
        default:
            return {
                ...state,
                activityLog,
            };
    }
}

export const collaborativeGameFactory: CollaborativeGameFactory = {
    createLogic(objectives: string[], tuning: ModeTuning): GameLogic {
        return {
            createInitialState: () => createInitialState(objectives),
            applyAction: (state, action) => applyAction(state, action, objectives, tuning),
            getObjective: (state) => state.currentObjective,
        };
    },
    createModule(blueprint: GameBlueprint): GameModule {
        return {
            id: blueprint.id,
            name: blueprint.name,
            description: blueprint.description,
            version: '1.0.0',
            tags: blueprint.tags,
            config: blueprint.config,
            controls: blueprint.controls,
            logic: this.createLogic(blueprint.objectives, blueprint.tuning),
        };
    },
    toActionLog,
};