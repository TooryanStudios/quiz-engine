import type {
    GameAction,
    GameConfig,
    GameLogic,
    GameModule,
    GameRenderer,
} from '../../core/types';

export interface ModeTuning {
    baseSubmitScore: number;
    hintPenalty: number;
    collaborationBonus: number;
}

export interface GameBlueprint {
    id: string;
    name: string;
    description: string;
    tags: string[];
    config: GameConfig;
    controls: string[];
    objectives: string[];
    tuning: ModeTuning;
    render?: GameRenderer;
}

export interface CollaborativeGameFactory {
    createLogic: (objectives: string[], tuning: ModeTuning) => GameLogic;
    createModule: (blueprint: GameBlueprint) => GameModule;
    toActionLog: (action: GameAction) => string;
}