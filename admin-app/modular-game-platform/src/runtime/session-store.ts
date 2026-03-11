export interface SessionPlayer {
    id: string;
    name: string;
    score: number;
    joinedAt: number;
    lastSeen: number;
}

export interface SessionRoom {
    code: string;
    gameId: string;
    createdAt: number;
    updatedAt: number;
    players: Record<string, SessionPlayer>;
}

interface JoinResult {
    room: SessionRoom;
    playerId: string;
}

const ROOM_PREFIX = 'mgp-room:';

function roomKey(code: string): string {
    return `${ROOM_PREFIX}${code}`;
}

export function normalizeRoomCode(input: string): string {
    return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function randomCode(length = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export function createPlayerId(): string {
    return `${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function readRoom(code: string): SessionRoom | null {
    const normalized = normalizeRoomCode(code);
    if (!normalized) {
        return null;
    }

    const raw = window.localStorage.getItem(roomKey(normalized));
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as SessionRoom;
    } catch {
        return null;
    }
}

function writeRoom(room: SessionRoom): void {
    room.updatedAt = Date.now();
    window.localStorage.setItem(roomKey(room.code), JSON.stringify(room));
}

function buildPlayer(name: string, playerId: string): SessionPlayer {
    const timestamp = Date.now();
    return {
        id: playerId,
        name: name.trim() || 'Player',
        score: 0,
        joinedAt: timestamp,
        lastSeen: timestamp,
    };
}

export function createRoom(gameId: string, playerName: string): JoinResult {
    let code = randomCode();
    while (readRoom(code)) {
        code = randomCode();
    }

    const playerId = createPlayerId();
    const room: SessionRoom = {
        code,
        gameId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        players: {
            [playerId]: buildPlayer(playerName, playerId),
        },
    };

    writeRoom(room);
    return { room, playerId };
}

export function joinRoom(code: string, playerName: string): JoinResult {
    const room = readRoom(code);
    if (!room) {
        throw new Error('Room not found');
    }

    const playerId = createPlayerId();
    room.players[playerId] = buildPlayer(playerName, playerId);
    writeRoom(room);

    return { room, playerId };
}

export function touchPlayer(code: string, playerId: string): SessionRoom | null {
    const room = readRoom(code);
    if (!room) {
        return null;
    }

    const player = room.players[playerId];
    if (!player) {
        return room;
    }

    player.lastSeen = Date.now();
    writeRoom(room);
    return room;
}

export function updatePlayerScore(
    code: string,
    playerId: string,
    score: number,
    playerName?: string,
): SessionRoom | null {
    const room = readRoom(code);
    if (!room) {
        return null;
    }

    if (!room.players[playerId]) {
        room.players[playerId] = buildPlayer(playerName ?? 'Player', playerId);
    }

    room.players[playerId].score = score;
    room.players[playerId].lastSeen = Date.now();
    if (playerName && playerName.trim()) {
        room.players[playerId].name = playerName.trim();
    }

    writeRoom(room);
    return room;
}

export function leaveRoom(code: string, playerId: string): SessionRoom | null {
    const room = readRoom(code);
    if (!room) {
        return null;
    }

    delete room.players[playerId];
    writeRoom(room);
    return room;
}

export function subscribeRoom(
    code: string,
    onChange: (room: SessionRoom | null) => void,
): () => void {
    const normalized = normalizeRoomCode(code);

    const sync = () => {
        onChange(readRoom(normalized));
    };

    const onStorage = (event: StorageEvent) => {
        if (event.key === roomKey(normalized)) {
            sync();
        }
    };

    sync();
    window.addEventListener('storage', onStorage);
    const intervalId = window.setInterval(sync, 800);

    return () => {
        window.removeEventListener('storage', onStorage);
        window.clearInterval(intervalId);
    };
}
