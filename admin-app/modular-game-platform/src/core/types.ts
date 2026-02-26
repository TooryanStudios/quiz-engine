export type CollaborationMode = 'team' | 'hybrid' | 'competitive';

export interface GameConfig {
    minPlayers: number;
    maxPlayers: number;
    defaultTimeLimitSec: number;
    collaborationMode: CollaborationMode;
    configurableSettings: Record<string, string | number | boolean>;
}

export type GameActionType =
    | 'start'
    | 'hint'
    | 'collaborate'
    | 'submit'
    | 'advance'
    | 'reset';

export interface GameAction {
    type: GameActionType;
    actorId?: string;
    success?: boolean;
    note?: string;
}

export interface GameState {
    round: number;
    totalRounds: number;
    score: number;
    hintsUsed: number;
    collaborations: number;
    solvedPuzzles: number;
    completed: boolean;
    currentObjective: string;
    activityLog: string[];
}

export interface GameLogic {
    createInitialState: () => GameState;
    applyAction: (state: GameState, action: GameAction) => GameState;
    getObjective: (state: GameState) => string;
}

export interface GameModule {
    id: string;
    name: string;
    description: string;
    version: string;
    tags: string[];
    config: GameConfig;
    controls: string[];
    logic: GameLogic;
}

export interface GameRegistryEntry {
    id: string;
    name: string;
    description: string;
    enabledByDefault: boolean;
    loader: () => Promise<{ default: GameModule }>;
}

export interface RegisteredGameSummary {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    loaded: boolean;
}