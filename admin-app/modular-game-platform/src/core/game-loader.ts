import { gameCatalog } from '../games/catalog';
import { GameRegistry } from './registry';
import type { GameModule, RegisteredGameSummary } from './types';

const registry = new GameRegistry(gameCatalog);

export function listGames(): RegisteredGameSummary[] {
    return registry.listGames();
}

export function setGameEnabled(gameId: string, value: boolean): void {
    registry.setEnabled(gameId, value);
}

export async function loadGame(gameId: string): Promise<GameModule> {
    return registry.loadGame(gameId);
}

export function unloadGame(gameId: string): void {
    registry.unloadGame(gameId);
}