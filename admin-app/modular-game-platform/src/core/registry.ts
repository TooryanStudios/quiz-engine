import type {
    GameModule,
    GameRegistryEntry,
    RegisteredGameSummary,
} from './types';

export class GameRegistry {
    private readonly entries = new Map<string, GameRegistryEntry>();
    private readonly enabled = new Map<string, boolean>();
    private readonly cache = new Map<string, GameModule>();

    constructor(gameEntries: GameRegistryEntry[]) {
        for (const entry of gameEntries) {
            this.entries.set(entry.id, entry);
            this.enabled.set(entry.id, entry.enabledByDefault);
        }
    }

    listGames(): RegisteredGameSummary[] {
        return Array.from(this.entries.values()).map((entry) => ({
            id: entry.id,
            name: entry.name,
            description: entry.description,
            enabled: this.enabled.get(entry.id) ?? false,
            loaded: this.cache.has(entry.id),
        }));
    }

    isEnabled(gameId: string): boolean {
        this.assertGameExists(gameId);
        return this.enabled.get(gameId) ?? false;
    }

    setEnabled(gameId: string, value: boolean): void {
        this.assertGameExists(gameId);
        this.enabled.set(gameId, value);
        if (!value) {
            this.cache.delete(gameId);
        }
    }

    async loadGame(gameId: string): Promise<GameModule> {
        this.assertGameExists(gameId);

        if (!this.isEnabled(gameId)) {
            throw new Error(`Game '${gameId}' is disabled in registry settings.`);
        }

        const cached = this.cache.get(gameId);
        if (cached) {
            return cached;
        }

        const entry = this.entries.get(gameId);
        if (!entry) {
            throw new Error(`Game '${gameId}' is not registered.`);
        }

        const loaded = await entry.loader();
        this.cache.set(gameId, loaded.default);
        return loaded.default;
    }

    unloadGame(gameId: string): void {
        this.assertGameExists(gameId);
        this.cache.delete(gameId);
    }

    private assertGameExists(gameId: string): void {
        if (!this.entries.has(gameId)) {
            throw new Error(`Game '${gameId}' is not registered.`);
        }
    }
}