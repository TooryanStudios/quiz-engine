import React from 'react';
import { Link } from 'react-router-dom';
import type { GameRendererProps } from '../../core/types';
import './renderer.css';
import levelsConfig from './levels.json';

type Direction = 'up' | 'down' | 'left' | 'right';
type CreatorDifficulty = 'easy' | 'medium' | 'hard';

type Tile = { x: number; y: number };
type EdgeKind = 'h' | 'v';
type EdgeSegment = { kind: EdgeKind; x: number; y: number };

type Fish = {
    id: number;
    x: number;
    y: number;
    dir: Direction;
    settled: boolean;
};

type LevelSpec = {
    id: number;
    title: string;
    premium?: boolean;
    timeLimitSec: number;
    width: number;
    height: number;
    // Generic actor list for reusable themes. Legacy "fish" is still accepted for compatibility.
    actors?: Array<{ id: number; x: number; y: number; dir: Direction }>;
    fish?: Array<{ id: number; x: number; y: number; dir: Direction }>;
    obstacles: Tile[];
    cageBlockedCells: Tile[];
    cageSafeCells: Tile[];
    wallSegments?: EdgeSegment[];
    doorSwitchTile: Tile;
    door: {
        side: 'left' | 'right' | 'top' | 'bottom';
        offset: number;
        hinge?: 'left' | 'right' | 'top' | 'bottom';
        opensToward?: 'inward' | 'outward';
        edge?: EdgeSegment;
        animationMs?: number;
    };
    doors?: Array<{
        side: 'left' | 'right' | 'top' | 'bottom';
        offset: number;
        hinge?: 'left' | 'right' | 'top' | 'bottom';
        opensToward?: 'inward' | 'outward';
        edge?: EdgeSegment;
    }>;
    visuals?: {
        cageLineThickness?: number;
        hedgeJointDiameter?: number;
        doorColor?: string;
        doorThickness?: number;
    };
};

type LevelValidation = {
    solvable: boolean;
    minSteps: number;
    exploredStates: number;
    solutionActions: string[];
};

type SearchState = {
    fishList: Fish[];
    doorOpen: boolean;
    steps: number;
};

type BuilderTool = 'select' | 'actor' | 'cage' | 'obstacle' | 'switch' | 'door-edge';

type SelectedItem = 
    | { type: 'actor'; id: number }
    | { type: 'obstacle'; x: number; y: number }
    | { type: 'cage'; x: number; y: number }
    | { type: 'door'; doorIndex: number }
    | { type: 'switch' }
    | null;

type ConcreteSelectedItem = Exclude<SelectedItem, null>;

function selectedItemKey(item: ConcreteSelectedItem): string {
    if (item.type === 'actor') return `actor:${item.id}`;
    if (item.type === 'obstacle') return `obstacle:${item.x},${item.y}`;
    if (item.type === 'cage') return `cage:${item.x},${item.y}`;
    if (item.type === 'door') return `door:${item.doorIndex}`;
    return 'switch';
}

function isActorSelectedItem(item: ConcreteSelectedItem): item is Extract<ConcreteSelectedItem, { type: 'actor' }> {
    return item.type === 'actor';
}

function isObstacleSelectedItem(item: ConcreteSelectedItem): item is Extract<ConcreteSelectedItem, { type: 'obstacle' }> {
    return item.type === 'obstacle';
}

function isCageSelectedItem(item: ConcreteSelectedItem): item is Extract<ConcreteSelectedItem, { type: 'cage' }> {
    return item.type === 'cage';
}

function isDoorSelectedItem(item: ConcreteSelectedItem): item is Extract<ConcreteSelectedItem, { type: 'door' }> {
    return item.type === 'door';
}

const TILE = 62;
const TIMER_PAUSED_FOR_DEBUG = false;
const KEEP_DOOR_OPEN_FOR_NOW = true;
const ALLOW_MANUAL_SWITCH_TOGGLE = true;
const ENABLE_LEVEL_SELECTOR = false;
const LEVELS_LOCAL_STORAGE_KEY = 'fish-fence-count-levels-v1';

const LEVELS: LevelSpec[] = levelsConfig as LevelSpec[];

function actorSource(level: LevelSpec): Array<{ id: number; x: number; y: number; dir: Direction }> {
    if (level.actors && level.actors.length > 0) {
        return level.actors;
    }
    return level.fish ?? [];
}

function normalizeLevel(level: LevelSpec): LevelSpec {
    const actors = actorSource(level).map((item, idx) => ({
        id: item.id ?? idx + 1,
        x: item.x,
        y: item.y,
        dir: item.dir,
    }));

    return {
        ...level,
        premium: level.premium ?? false,
        actors,
        fish: actors,
        door: {
            ...level.door,
            hinge: level.door.hinge ?? level.door.side,
            opensToward: level.door.opensToward ?? 'inward',
            animationMs: level.door.animationMs ?? 450,
        },
        doors: level.doors?.map((door) => ({
            ...door,
            hinge: door.hinge ?? door.side,
            opensToward: door.opensToward ?? 'inward',
        })) ?? (level.door.edge ? [{
            side: level.door.side,
            offset: level.door.offset,
            hinge: level.door.hinge ?? level.door.side,
            opensToward: level.door.opensToward ?? 'inward',
            edge: level.door.edge,
        }] : []),
        visuals: {
            cageLineThickness: level.visuals?.cageLineThickness ?? 7,
            hedgeJointDiameter: level.visuals?.hedgeJointDiameter ?? 16,
            doorColor: level.visuals?.doorColor ?? '#ff7a00',
            doorThickness: level.visuals?.doorThickness ?? 6,
        },
    };
}

function loadLevelsFromStorage(): LevelSpec[] {
    try {
        const raw = window.localStorage.getItem(LEVELS_LOCAL_STORAGE_KEY);
        if (!raw) {
            return LEVELS.map(normalizeLevel);
        }
        const parsed = JSON.parse(raw) as LevelSpec[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return LEVELS.map(normalizeLevel);
        }
        return parsed.map(normalizeLevel);
    } catch {
        return LEVELS.map(normalizeLevel);
    }
}

function tileKey(x: number, y: number): string {
    return `${x},${y}`;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let idx = copy.length - 1; idx > 0; idx -= 1) {
        const swap = randomInt(0, idx);
        const temp = copy[idx];
        copy[idx] = copy[swap];
        copy[swap] = temp;
    }
    return copy;
}

function sampleUnique<T>(items: T[], count: number): T[] {
    return shuffle(items).slice(0, Math.max(0, Math.min(count, items.length)));
}

function dirVector(dir: Direction): { dx: number; dy: number } {
    switch (dir) {
        case 'up': return { dx: 0, dy: -1 };
        case 'down': return { dx: 0, dy: 1 };
        case 'left': return { dx: -1, dy: 0 };
        case 'right': return { dx: 1, dy: 0 };
        default: return { dx: 0, dy: 0 };
    }
}

function fishAngle(dir: Direction): number {
    switch (dir) {
        case 'left': return 0;
        case 'right': return 180;
        case 'up': return 90;
        case 'down': return 270;
        default: return 0;
    }
}

function inBounds(x: number, y: number, level: LevelSpec): boolean {
    return x >= 0 && y >= 0 && x < level.width && y < level.height;
}

function edgeKey(edge: EdgeSegment): string {
    return `${edge.kind}:${edge.x},${edge.y}`;
}

function stepEdge(fromX: number, fromY: number, toX: number, toY: number): EdgeSegment | null {
    if (toX === fromX + 1 && toY === fromY) {
        return { kind: 'v', x: toX, y: fromY };
    }
    if (toX === fromX - 1 && toY === fromY) {
        return { kind: 'v', x: fromX, y: fromY };
    }
    if (toY === fromY + 1 && toX === fromX) {
        return { kind: 'h', x: fromX, y: toY };
    }
    if (toY === fromY - 1 && toX === fromX) {
        return { kind: 'h', x: fromX, y: fromY };
    }
    return null;
}

function boundarySegmentsFromCageCells(cageSafeCells: Tile[]): EdgeSegment[] {
    const safe = new Set(cageSafeCells.map((tile) => tileKey(tile.x, tile.y)));
    const segments: EdgeSegment[] = [];

    cageSafeCells.forEach((tile) => {
        const { x, y } = tile;
        if (!safe.has(tileKey(x - 1, y))) {
            segments.push({ kind: 'v', x, y });
        }
        if (!safe.has(tileKey(x + 1, y))) {
            segments.push({ kind: 'v', x: x + 1, y });
        }
        if (!safe.has(tileKey(x, y - 1))) {
            segments.push({ kind: 'h', x, y });
        }
        if (!safe.has(tileKey(x, y + 1))) {
            segments.push({ kind: 'h', x, y: y + 1 });
        }
    });

    const dedup = new Map<string, EdgeSegment>();
    segments.forEach((segment) => dedup.set(edgeKey(segment), segment));
    return [...dedup.values()];
}

function legacyDoorEdge(level: LevelSpec, segments: EdgeSegment[]): EdgeSegment | null {
    if (segments.length === 0) {
        return null;
    }
    const xs = level.cageSafeCells.map((tile) => tile.x);
    const ys = level.cageSafeCells.map((tile) => tile.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    let candidate: EdgeSegment;
    if (level.door.side === 'left') {
        candidate = { kind: 'v', x: minX, y: level.door.offset };
    } else if (level.door.side === 'right') {
        candidate = { kind: 'v', x: maxX + 1, y: level.door.offset };
    } else if (level.door.side === 'top') {
        candidate = { kind: 'h', x: level.door.offset, y: minY };
    } else {
        candidate = { kind: 'h', x: level.door.offset, y: maxY + 1 };
    }

    const candidateKey = edgeKey(candidate);
    return segments.some((segment) => edgeKey(segment) === candidateKey) ? candidate : null;
}

function buildFence(level: LevelSpec): { segments: EdgeSegment[]; wallSet: Set<string>; doorEdgeKeys: Set<string> } {
    const segments = level.wallSegments && level.wallSegments.length > 0
        ? level.wallSegments
        : boundarySegmentsFromCageCells(level.cageSafeCells);
    const doorEdges = (level.doors && level.doors.length > 0
        ? level.doors.map((door) => door.edge).filter((edge): edge is EdgeSegment => Boolean(edge))
        : [level.door.edge ?? legacyDoorEdge(level, segments)].filter((edge): edge is EdgeSegment => Boolean(edge)));

    return {
        segments,
        wallSet: new Set(segments.map((segment) => edgeKey(segment))),
        doorEdgeKeys: new Set(doorEdges.map((edge) => edgeKey(edge))),
    };
}

function buildFenceWithMultipleDoors(cageCells: Tile[], doors: Array<{ edge: EdgeSegment; hinge: 'left' | 'right' | 'top' | 'bottom'; opensToward: 'inward' | 'outward' }>): { segments: EdgeSegment[]; wallSet: Set<string>; doorEdges: EdgeSegment[] } {
    const segments = boundarySegmentsFromCageCells(cageCells);
    const doorEdges = doors.map(d => d.edge);
    
    return {
        segments,
        wallSet: new Set(segments.map((segment) => edgeKey(segment))),
        doorEdges,
    };
}

function doorSwingVector(
    side: 'left' | 'right' | 'top' | 'bottom',
    opensToward: 'inward' | 'outward',
): { dx: number; dy: number } {
    switch (side) {
        case 'left': return { dx: opensToward === 'inward' ? 1 : -1, dy: 0 };
        case 'right': return { dx: opensToward === 'inward' ? -1 : 1, dy: 0 };
        case 'top': return { dx: 0, dy: opensToward === 'inward' ? 1 : -1 };
        case 'bottom': return { dx: 0, dy: opensToward === 'inward' ? -1 : 1 };
        default: return { dx: 0, dy: 0 };
    }
}

function getDoorLeafLine(
    door: LevelSpec['door'],
    tileSize: number,
    progress: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
    if (!door.edge) {
        return null;
    }

    const clamped = Math.max(0, Math.min(1, progress));
    const swing = doorSwingVector(door.side, door.opensToward ?? 'inward');

    if (door.edge.kind === 'v') {
        const top = { x: door.edge.x * tileSize, y: door.edge.y * tileSize };
        const bottom = { x: door.edge.x * tileSize, y: (door.edge.y + 1) * tileSize };
        const hingeAtBottom = door.hinge === 'bottom';
        const pivot = hingeAtBottom ? bottom : top;
        const closedFree = hingeAtBottom ? top : bottom;
        const openFree = { x: pivot.x + swing.dx * tileSize, y: pivot.y };
        return {
            x1: pivot.x,
            y1: pivot.y,
            x2: closedFree.x + (openFree.x - closedFree.x) * clamped,
            y2: closedFree.y + (openFree.y - closedFree.y) * clamped,
        };
    }

    const left = { x: door.edge.x * tileSize, y: door.edge.y * tileSize };
    const right = { x: (door.edge.x + 1) * tileSize, y: door.edge.y * tileSize };
    const hingeAtRight = door.hinge === 'right';
    const pivot = hingeAtRight ? right : left;
    const closedFree = hingeAtRight ? left : right;
    const openFree = { x: pivot.x, y: pivot.y + swing.dy * tileSize };
    return {
        x1: pivot.x,
        y1: pivot.y,
        x2: closedFree.x + (openFree.x - closedFree.x) * clamped,
        y2: closedFree.y + (openFree.y - closedFree.y) * clamped,
    };
}

function crossesClosedCageWall(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    fence: { wallSet: Set<string>; doorEdgeKeys: Set<string> },
    doorOpen: boolean,
): boolean {
    const crossed = stepEdge(fromX, fromY, toX, toY);
    if (!crossed) {
        return false;
    }
    const crossedKey = edgeKey(crossed);
    if (!fence.wallSet.has(crossedKey)) {
        return false;
    }
    if (doorOpen && fence.doorEdgeKeys.has(crossedKey)) {
        return false;
    }
    return true;
}

function buildFish(level: LevelSpec): Fish[] {
    const safe = new Set(level.cageSafeCells.map((tile) => tileKey(tile.x, tile.y)));
    return actorSource(level).map((item) => ({ ...item, settled: safe.has(tileKey(item.x, item.y)) }));
}

function blocksByCellOccupancy(
    x: number,
    y: number,
    movingId: number,
    level: LevelSpec,
    staticBlocked: Set<string>,
    fishList: Fish[],
): boolean {
    if (!inBounds(x, y, level)) {
        return true;
    }
    if (staticBlocked.has(tileKey(x, y))) {
        return true;
    }
    return fishList.some((fish) => fish.id !== movingId && fish.x === x && fish.y === y);
}

function slideFish(
    fish: Fish,
    level: LevelSpec,
    staticBlocked: Set<string>,
    fishList: Fish[],
    fence: { wallSet: Set<string>; doorEdgeKeys: Set<string> },
    doorOpen: boolean,
): Tile {
    const { dx, dy } = dirVector(fish.dir);
    let cursorX = fish.x;
    let cursorY = fish.y;

    while (true) {
        const probeX = cursorX + dx;
        const probeY = cursorY + dy;
        if (crossesClosedCageWall(cursorX, cursorY, probeX, probeY, fence, doorOpen)) {
            break;
        }
        if (blocksByCellOccupancy(probeX, probeY, fish.id, level, staticBlocked, fishList)) {
            break;
        }
        cursorX = probeX;
        cursorY = probeY;
    }

    return { x: cursorX, y: cursorY };
}

function allSettled(fishList: Fish[]): boolean {
    return fishList.every((fish) => fish.settled);
}

function hasUsefulMoves(
    level: LevelSpec,
    staticBlocked: Set<string>,
    fishList: Fish[],
    fence: { wallSet: Set<string>; doorEdgeKeys: Set<string> },
    doorOpen: boolean,
): boolean {
    return fishList.some((fish) => {
        const target = slideFish(fish, level, staticBlocked, fishList, fence, doorOpen);
        return target.x !== fish.x || target.y !== fish.y;
    });
}

function serializeState(fishList: Fish[], doorOpen: boolean): string {
    const packed = [...fishList]
        .sort((a, b) => a.id - b.id)
        .map((fish) => `${fish.id}:${fish.x},${fish.y},${fish.settled ? '1' : '0'}`)
        .join('|');
    return `${doorOpen ? '1' : '0'}|${packed}`;
}

function validateLevel(level: LevelSpec, initialDoorOpen: boolean): LevelValidation {
    const fence = buildFence(level);
    const staticBlocked = new Set<string>();
    level.obstacles.forEach((tile) => staticBlocked.add(tileKey(tile.x, tile.y)));
    level.cageBlockedCells.forEach((tile) => staticBlocked.add(tileKey(tile.x, tile.y)));
    const safeSet = new Set(level.cageSafeCells.map((tile) => tileKey(tile.x, tile.y)));

    const initialFish = buildFish(level).map((fish) => ({ ...fish }));
    const initialKey = serializeState(initialFish, initialDoorOpen);
    const queue: SearchState[] = [{ fishList: initialFish, doorOpen: initialDoorOpen, steps: 0 }];
    const visited = new Set<string>([initialKey]);
    const parents = new Map<string, { prev: string; action: string }>();

    const maxStates = 120000;
    const maxDepth = 90;

    while (queue.length > 0 && visited.size <= maxStates) {
        const current = queue.shift();
        if (!current) {
            break;
        }

        const currentKey = serializeState(current.fishList, current.doorOpen);
        if (allSettled(current.fishList)) {
            const actions: string[] = [];
            let walk = currentKey;
            while (parents.has(walk)) {
                const link = parents.get(walk);
                if (!link) {
                    break;
                }
                actions.push(link.action);
                walk = link.prev;
            }
            actions.reverse();
            return {
                solvable: true,
                minSteps: current.steps,
                exploredStates: visited.size,
                solutionActions: actions,
            };
        }

        if (current.steps >= maxDepth) {
            continue;
        }

        current.fishList.forEach((candidate) => {
            if (candidate.settled) {
                return;
            }

            const target = slideFish(candidate, level, staticBlocked, current.fishList, fence, current.doorOpen);
            if (target.x === candidate.x && target.y === candidate.y) {
                return;
            }

            const nextFish = current.fishList.map((fish) => {
                if (fish.id !== candidate.id) {
                    return fish;
                }
                const settled = safeSet.has(tileKey(target.x, target.y));
                return { ...fish, x: target.x, y: target.y, settled };
            });

            const key = serializeState(nextFish, current.doorOpen);
            if (visited.has(key)) {
                return;
            }

            visited.add(key);
            parents.set(key, { prev: currentKey, action: `F${candidate.id}` });
            queue.push({ fishList: nextFish, doorOpen: current.doorOpen, steps: current.steps + 1 });
        });

        if (ALLOW_MANUAL_SWITCH_TOGGLE) {
            const toggledDoor = !current.doorOpen;
            const key = serializeState(current.fishList, toggledDoor);
            if (!visited.has(key)) {
                visited.add(key);
                parents.set(key, { prev: currentKey, action: toggledDoor ? 'DoorOpen' : 'DoorClose' });
                queue.push({
                    fishList: current.fishList.map((fish) => ({ ...fish })),
                    doorOpen: toggledDoor,
                    steps: current.steps + 1,
                });
            }
        }
    }

    return {
        solvable: false,
        minSteps: -1,
        exploredStates: visited.size,
        solutionActions: [],
    };
}

function createFallbackLevel(levelId: number): LevelSpec {
    // Guaranteed solvable: 5 pre-settled fish fill all cage safe cells except (7,4).
    // One outside fish at (0,4) dir='right' slides through the open door and lands at (7,4). 1-step solution.
    const actors = [
        { id: 1, x: 7, y: 3, dir: 'left' as Direction },
        { id: 2, x: 8, y: 3, dir: 'left' as Direction },
        { id: 3, x: 9, y: 3, dir: 'left' as Direction },
        { id: 4, x: 8, y: 4, dir: 'left' as Direction },
        { id: 5, x: 9, y: 4, dir: 'left' as Direction },
        { id: 6, x: 0, y: 4, dir: 'right' as Direction },
    ];

    return {
        id: levelId,
        title: `Validated Fallback ${levelId}`,
        timeLimitSec: 240,
        width: 10,
        height: 6,
        actors,
        fish: actors,
        obstacles: [
            { x: 1, y: 0 },
            { x: 3, y: 1 },
            { x: 4, y: 2 },
            { x: 6, y: 1 },
        ],
        cageBlockedCells: [
            { x: 7, y: 1 },
            { x: 8, y: 1 },
            { x: 7, y: 2 },
            { x: 8, y: 2 },
        ],
        cageSafeCells: [
            { x: 7, y: 3 },
            { x: 8, y: 3 },
            { x: 9, y: 3 },
            { x: 7, y: 4 },
            { x: 8, y: 4 },
            { x: 9, y: 4 },
        ],
        doorSwitchTile: { x: 6, y: 4 },
        door: { side: 'left', offset: 4 },
    };
}

function createCandidateLevel(levelId: number, difficulty: CreatorDifficulty): LevelSpec {
    // KEY CONSTRAINT: the cage door is on the LEFT at row y=4.
    // The ONLY way an outside fish can enter the cage is to face 'right' while at y=4.
    // All other directions / rows lead to an unsolvable state.
    const width = 10;
    const height = 6;
    const cageSafeCells: Tile[] = [
        { x: 7, y: 3 },
        { x: 8, y: 3 },
        { x: 9, y: 3 },
        { x: 7, y: 4 },
        { x: 8, y: 4 },
        { x: 9, y: 4 },
    ];
    const cageBlockedCells: Tile[] = [
        { x: 7, y: 1 },
        { x: 8, y: 1 },
        { x: 7, y: 2 },
        { x: 8, y: 2 },
    ];
    const door: LevelSpec['door'] = { side: 'left', offset: 4 };

    // y=4 cage safe cells (reachable by outside fish through the door)
    const y4CageCells: Tile[] = [
        { x: 9, y: 4 },
        { x: 8, y: 4 },
        { x: 7, y: 4 },
    ];
    const y3CageCells: Tile[] = [
        { x: 7, y: 3 },
        { x: 8, y: 3 },
        { x: 9, y: 3 },
    ];

    const fishRange = difficulty === 'easy'
        ? { min: 3, max: 5 }
        : difficulty === 'medium'
            ? { min: 4, max: 6 }
            : { min: 5, max: 6 };

    // Reserve 1 or 2 y=4 cage slots for outside fish
    const outsideFishCount = randomInt(1, Math.min(2, y4CageCells.length));
    const totalFish = randomInt(fishRange.min, fishRange.max);
    const insideFishCount = Math.max(0, totalFish - outsideFishCount);

    // Pre-settled inside fish: fill y=3 cells freely; fill y=4 cells only up to (3 - outsideFishCount)
    const maxInsideFromY4 = Math.max(0, y4CageCells.length - outsideFishCount);
    const insideFromY4 = sampleUnique(y4CageCells, Math.min(insideFishCount, maxInsideFromY4));
    const remainingInside = Math.max(0, insideFishCount - insideFromY4.length);
    const insideFromY3 = sampleUnique(y3CageCells, Math.min(remainingInside, y3CageCells.length));
    const insideCells = [...insideFromY4, ...insideFromY3];

    // Obstacles: avoid row y=4 (keep entry path clear) and cage cells
    const forbiddenForObs = new Set<string>([
        ...cageSafeCells.map((c) => tileKey(c.x, c.y)),
        ...cageBlockedCells.map((c) => tileKey(c.x, c.y)),
        tileKey(6, 4),
        tileKey(6, 3),
    ]);
    const obstacleCandidates: Tile[] = [];
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (y === 4 && x < 7) { continue; } // keep door row clear
            if (forbiddenForObs.has(tileKey(x, y))) { continue; }
            obstacleCandidates.push({ x, y });
        }
    }
    const obstacleRange = difficulty === 'easy'
        ? { min: 2, max: 3 }
        : difficulty === 'medium'
            ? { min: 3, max: 5 }
            : { min: 4, max: 6 };
    const obstacles = sampleUnique(obstacleCandidates, randomInt(obstacleRange.min, obstacleRange.max));
    const obstacleKeys = new Set(obstacles.map((c) => tileKey(c.x, c.y)));

    // Outside fish: MUST be at y=4 and face 'right' — the only path into the cage
    const outsidePositions: Tile[] = [];
    for (let x = 0; x < 6; x += 1) {
        const key = tileKey(x, 4);
        if (!obstacleKeys.has(key) && !forbiddenForObs.has(key)) {
            outsidePositions.push({ x, y: 4 });
        }
    }
    const outsideCells = sampleUnique(outsidePositions, Math.min(outsideFishCount, outsidePositions.length));

    const fish: Array<{ id: number; x: number; y: number; dir: Direction }> = [];
    const insideDirections: Direction[] = ['left', 'up', 'right'];

    insideCells.forEach((cell, idx) => {
        fish.push({
            id: idx + 1,
            x: cell.x,
            y: cell.y,
            dir: insideDirections[randomInt(0, insideDirections.length - 1)],
        });
    });

    outsideCells.forEach((cell, idx) => {
        // Direction MUST be 'right' — door is on the left wall at y=4
        fish.push({
            id: insideCells.length + idx + 1,
            x: cell.x,
            y: cell.y,
            dir: 'right',
        });
    });

    return {
        id: levelId,
        title: `Creator ${difficulty.toUpperCase()} ${levelId}`,
        timeLimitSec: 240,
        width,
        height,
        fish,
        obstacles,
        cageBlockedCells,
        cageSafeCells,
        doorSwitchTile: { x: 6, y: 4 },
        door,
    };
}

function createValidGeneratedLevel(
    levelId: number,
    difficulty: CreatorDifficulty,
): { level: LevelSpec; validation: LevelValidation; attempts: number } | null {
    const maxAttempts = 220;
    const minSteps = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 4 : 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const candidate = createCandidateLevel(levelId, difficulty);
        const validation = validateLevel(candidate, KEEP_DOOR_OPEN_FOR_NOW);
        if (validation.solvable && validation.minSteps >= minSteps) {
            return { level: candidate, validation, attempts: attempt };
        }
    }

    const fallback = createFallbackLevel(levelId);
    const validation = validateLevel(fallback, KEEP_DOOR_OPEN_FOR_NOW);
    if (!validation.solvable) {
        return null;
    }
    return { level: fallback, validation, attempts: maxAttempts };
}

const FishFenceCountRenderer: React.FC<GameRendererProps> = ({ gameState, dispatch, isEmbed }) => {
    const [editableLevels, setEditableLevels] = React.useState<LevelSpec[]>(() => loadLevelsFromStorage());
    const playableLevels = editableLevels.length > 0 ? editableLevels : LEVELS.map(normalizeLevel);
    const validations = React.useMemo(
        () => playableLevels.map((item) => validateLevel(item, KEEP_DOOR_OPEN_FOR_NOW)),
        [playableLevels],
    );
    const correctedLevelIds: number[] = [];

    React.useEffect(() => {
        window.localStorage.setItem(LEVELS_LOCAL_STORAGE_KEY, JSON.stringify(playableLevels, null, 2));
    }, [playableLevels]);

    const [levelIndex, setLevelIndex] = React.useState(0);
    const [fishList, setFishList] = React.useState<Fish[]>(() => buildFish(playableLevels[0]));
    const [timeLeftSec, setTimeLeftSec] = React.useState(playableLevels[0].timeLimitSec);
    const [message, setMessage] = React.useState('Tap an actor in sequence. It slides until blocked.');
    const [levelOverlayOpen, setLevelOverlayOpen] = React.useState(ENABLE_LEVEL_SELECTOR);
    const [levelCompleteOpen, setLevelCompleteOpen] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [muted, setMuted] = React.useState(false);
    const [cageDoorOpen, setCageDoorOpen] = React.useState(KEEP_DOOR_OPEN_FOR_NOW);
    const [doorOpenProgress, setDoorOpenProgress] = React.useState(KEEP_DOOR_OPEN_FOR_NOW ? 1 : 0);
    const [createdLevel, setCreatedLevel] = React.useState<LevelSpec | null>(null);
    const [creatorInfo, setCreatorInfo] = React.useState('');
    const [creatorDifficulty, setCreatorDifficulty] = React.useState<CreatorDifficulty>('medium');
    const [builderOpen, setBuilderOpen] = React.useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        return new URLSearchParams(window.location.search).has('builder');
    });
    const [builderLivePreview, setBuilderLivePreview] = React.useState(true);
    const [builderTool, setBuilderTool] = React.useState<BuilderTool>('select');
    const [builderDir, setBuilderDir] = React.useState<Direction>('right');
    const [builderUpdateFlash, setBuilderUpdateFlash] = React.useState(false);
    const [builderTitle, setBuilderTitle] = React.useState('New Level');
    const [builderWidth, setBuilderWidth] = React.useState(10);
    const [builderHeight, setBuilderHeight] = React.useState(7);
    const [builderTime, setBuilderTime] = React.useState(180);
    const [builderActors, setBuilderActors] = React.useState<Array<{ id: number; x: number; y: number; dir: Direction }>>([]);
    const [builderObstacles, setBuilderObstacles] = React.useState<Tile[]>([]);
    const [builderCageCells, setBuilderCageCells] = React.useState<Tile[]>([]);
    const [builderCageDraft, setBuilderCageDraft] = React.useState<Set<string>>(new Set());
    const [builderDoors, setBuilderDoors] = React.useState<Array<{
        edge: EdgeSegment;
        side: 'left' | 'right' | 'top' | 'bottom';
        offset: number;
        hinge: 'left' | 'right' | 'top' | 'bottom';
        opensToward: 'inward' | 'outward';
    }>>([]);
    const [builderDoorSide, setBuilderDoorSide] = React.useState<'left' | 'right' | 'top' | 'bottom'>('left');
    const [builderDoorOffset, setBuilderDoorOffset] = React.useState(0);
    const [builderDoorHinge, setBuilderDoorHinge] = React.useState<'left' | 'right' | 'top' | 'bottom'>('left');
    const [builderDoorOpensToward, setBuilderDoorOpensToward] = React.useState<'inward' | 'outward'>('inward');
    const [builderDoorAnimationMs, setBuilderDoorAnimationMs] = React.useState(450);
    const [builderCageLineThickness, setBuilderCageLineThickness] = React.useState(7);
    const [builderHedgeJointDiameter, setBuilderHedgeJointDiameter] = React.useState(16);
    const [builderDoorColor, setBuilderDoorColor] = React.useState('#ff7a00');
    const [builderDoorThickness, setBuilderDoorThickness] = React.useState(6);
    const [builderSwitch, setBuilderSwitch] = React.useState<Tile>({ x: 0, y: 0 });
    const [builderJsonInput, setBuilderJsonInput] = React.useState('');
    const [selectedItem, setSelectedItem] = React.useState<SelectedItem>(null);
    const [selectedItems, setSelectedItems] = React.useState<ConcreteSelectedItem[]>([]);

    const safeBuilderOffsetMax = React.useMemo(
        () => (builderDoorSide === 'left' || builderDoorSide === 'right' ? Math.max(0, builderHeight - 1) : Math.max(0, builderWidth - 1)),
        [builderDoorSide, builderHeight, builderWidth],
    );

    React.useEffect(() => {
        setBuilderDoorOffset((prev) => Math.max(0, Math.min(prev, safeBuilderOffsetMax)));
    }, [safeBuilderOffsetMax]);

    const clearSelection = React.useCallback(() => {
        setSelectedItem(null);
        setSelectedItems([]);
    }, []);

    const selectSingleItem = React.useCallback((item: ConcreteSelectedItem | null) => {
        setSelectedItem(item);
        setSelectedItems(item ? [item] : []);
    }, []);

    const toggleMultiSelectedItem = React.useCallback((item: ConcreteSelectedItem) => {
        setSelectedItems((previous) => {
            const exists = previous.some((entry) => selectedItemKey(entry) === selectedItemKey(item));
            const next = exists
                ? previous.filter((entry) => selectedItemKey(entry) !== selectedItemKey(item))
                : [...previous, item];
            setSelectedItem(next.length === 1 ? next[0] : null);
            return next;
        });
    }, []);

    React.useEffect(() => {
        const target = cageDoorOpen ? 1 : 0;
        const durationMs = Math.max(50, builderDoorAnimationMs);
        let frameId = 0;
        let startTime: number | null = null;
        const initialProgress = doorOpenProgress;

        const step = (timestamp: number) => {
            if (startTime === null) {
                startTime = timestamp;
            }
            const elapsed = timestamp - startTime;
            const t = Math.max(0, Math.min(1, elapsed / durationMs));
            const next = initialProgress + (target - initialProgress) * t;
            setDoorOpenProgress(t >= 1 ? target : next);
            if (t < 1) {
                frameId = window.requestAnimationFrame(step);
            }
        };

        frameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(frameId);
    }, [cageDoorOpen, builderDoorAnimationMs, doorOpenProgress]);

    const hydrateBuilderFromLevel = React.useCallback((sourceLevel: LevelSpec) => {
        const normalized = normalizeLevel(sourceLevel);
        setBuilderTitle(normalized.title);
        setBuilderWidth(normalized.width);
        setBuilderHeight(normalized.height);
        setBuilderTime(normalized.timeLimitSec);
        setBuilderActors(actorSource(normalized));
        setBuilderObstacles(normalized.obstacles);
        setBuilderCageCells(normalized.cageSafeCells);
        setBuilderCageDraft(new Set());
        setBuilderDoorSide(normalized.door.side);
        setBuilderDoorOffset(normalized.door.offset);
        setBuilderDoorHinge(normalized.door.hinge ?? normalized.door.side);
        setBuilderDoorOpensToward(normalized.door.opensToward ?? 'inward');
        setBuilderDoorAnimationMs(normalized.door.animationMs ?? 450);
        setBuilderCageLineThickness(normalized.visuals?.cageLineThickness ?? 7);
        setBuilderHedgeJointDiameter(normalized.visuals?.hedgeJointDiameter ?? 16);
        setBuilderDoorColor(normalized.visuals?.doorColor ?? '#ff7a00');
        setBuilderDoorThickness(normalized.visuals?.doorThickness ?? 6);
        setBuilderDoors(
            normalized.doors?.map((door) => ({
                edge: door.edge ?? legacyDoorEdge(
                    {
                        ...normalized,
                        door: {
                            ...normalized.door,
                            side: door.side,
                            offset: door.offset,
                            hinge: door.hinge ?? door.side,
                            opensToward: door.opensToward ?? 'inward',
                            edge: door.edge,
                        },
                    },
                    normalized.wallSegments && normalized.wallSegments.length > 0
                        ? normalized.wallSegments
                        : boundarySegmentsFromCageCells(normalized.cageSafeCells),
                ) ?? { kind: 'h', x: 0, y: 0 },
                side: door.side,
                offset: door.offset,
                hinge: door.hinge ?? door.side,
                opensToward: door.opensToward ?? 'inward',
            })).filter((door) => door.edge.x >= 0)
            ?? [],
        );
        setBuilderSwitch(normalized.doorSwitchTile);
    }, []);

    const buildLevelFromBuilder = React.useCallback((id: number): LevelSpec => {
        const draftCells = [...builderCageDraft].map((key) => {
            const [x, y] = key.split(',').map((value) => Number(value));
            return { x, y };
        });
        const effectiveCageCells = draftCells.length > 0
            ? (() => {
                const merged = new Map<string, Tile>();
                builderCageCells.forEach((tile) => merged.set(tileKey(tile.x, tile.y), tile));
                draftCells.forEach((tile) => merged.set(tileKey(tile.x, tile.y), tile));
                return [...merged.values()];
            })()
            : builderCageCells;

        const actors = builderActors.map((item, idx) => ({ ...item, id: idx + 1 }));
        return normalizeLevel({
            id,
            title: builderTitle.trim() || `Level ${id}`,
            timeLimitSec: Math.max(30, builderTime),
            width: Math.max(4, builderWidth),
            height: Math.max(4, builderHeight),
            actors,
            obstacles: builderObstacles,
            cageBlockedCells: [],
            cageSafeCells: effectiveCageCells,
            doorSwitchTile: builderSwitch,
            door: {
                side: builderDoors[0]?.side ?? builderDoorSide,
                offset: builderDoors[0]?.offset ?? builderDoorOffset,
                hinge: builderDoors[0]?.hinge ?? builderDoorHinge,
                opensToward: builderDoors[0]?.opensToward ?? builderDoorOpensToward,
                edge: builderDoors[0]?.edge ?? undefined,
                animationMs: builderDoorAnimationMs,
            },
            doors: builderDoors.map((door) => ({
                side: door.side,
                offset: door.offset,
                hinge: door.hinge,
                opensToward: door.opensToward,
                edge: door.edge,
            })),
            visuals: {
                cageLineThickness: builderCageLineThickness,
                hedgeJointDiameter: builderHedgeJointDiameter,
                doorColor: builderDoorColor,
                doorThickness: builderDoorThickness,
            },
        });
    }, [
        builderActors,
        builderCageCells,
        builderCageDraft,
        builderDoors,
        builderCageLineThickness,
        builderDoorAnimationMs,
        builderDoorColor,
        builderDoorThickness,
        builderDoorOffset,
        builderDoorSide,
        builderHedgeJointDiameter,
        builderHeight,
        builderObstacles,
        builderSwitch,
        builderTime,
        builderTitle,
        builderWidth,
    ]);

    const createdLevelValidation = React.useMemo(
        () => (createdLevel ? validateLevel(createdLevel, KEEP_DOOR_OPEN_FOR_NOW) : null),
        [createdLevel],
    );

    const level = createdLevel ?? playableLevels[levelIndex];
    const levelValidation = createdLevelValidation ?? validations[levelIndex];

    const obstacleSet = React.useMemo(() => new Set(level.obstacles.map((t) => tileKey(t.x, t.y))), [level]);
    const cageBlockedSet = React.useMemo(() => new Set(level.cageBlockedCells.map((t) => tileKey(t.x, t.y))), [level]);
    const cageSafeSet = React.useMemo(() => new Set(level.cageSafeCells.map((t) => tileKey(t.x, t.y))), [level]);
    const staticBlockedSet = React.useMemo(() => {
        const combined = new Set<string>();
        obstacleSet.forEach((item) => combined.add(item));
        cageBlockedSet.forEach((item) => combined.add(item));
        return combined;
    }, [cageBlockedSet, obstacleSet]);
    const fence = React.useMemo(() => buildFence(level), [level]);

    const previewMode = builderOpen && builderLivePreview;
    const previewCageCells = React.useMemo(() => {
        if (builderCageDraft.size === 0) {
            return builderCageCells;
        }
        const draftCells = [...builderCageDraft].map((key) => {
            const [x, y] = key.split(',').map((value) => Number(value));
            return { x, y };
        });
        const merged = new Map<string, Tile>();
        builderCageCells.forEach((tile) => merged.set(tileKey(tile.x, tile.y), tile));
        draftCells.forEach((tile) => merged.set(tileKey(tile.x, tile.y), tile));
        return [...merged.values()];
    }, [builderCageCells, builderCageDraft]);

    const renderWidth = previewMode ? Math.max(4, builderWidth) : level.width;
    const renderHeight = previewMode ? Math.max(4, builderHeight) : level.height;
    const renderCageCells = previewMode ? previewCageCells : level.cageSafeCells;
    const renderDoor = previewMode
        ? {
            ...level.door,
            side: builderDoors[0]?.side ?? builderDoorSide,
            offset: builderDoors[0]?.offset ?? builderDoorOffset,
            hinge: builderDoors[0]?.hinge ?? builderDoorHinge,
            opensToward: builderDoors[0]?.opensToward ?? builderDoorOpensToward,
            edge: builderDoors[0]?.edge ?? undefined,
            animationMs: builderDoorAnimationMs,
        }
        : level.door;
    const renderVisuals = previewMode
        ? {
            cageLineThickness: builderCageLineThickness,
            hedgeJointDiameter: builderHedgeJointDiameter,
            doorColor: builderDoorColor,
            doorThickness: builderDoorThickness,
        }
        : {
            cageLineThickness: level.visuals?.cageLineThickness ?? 7,
            hedgeJointDiameter: level.visuals?.hedgeJointDiameter ?? 16,
            doorColor: level.visuals?.doorColor ?? '#ff7a00',
            doorThickness: level.visuals?.doorThickness ?? 6,
        };
    const renderDoorSwitchTile = previewMode ? builderSwitch : level.doorSwitchTile;
    const renderObstacles = previewMode ? builderObstacles : level.obstacles;
    const renderCageBlockedCells = previewMode ? [] : level.cageBlockedCells;

    React.useEffect(() => {
        if (!builderOpen) {
            return;
        }
        const source = createdLevel ?? playableLevels[levelIndex];
        if (source) {
            hydrateBuilderFromLevel(source);
        }
    }, [builderOpen, createdLevel, hydrateBuilderFromLevel, levelIndex, playableLevels]);

    const renderLevelModel = React.useMemo(
        () => ({
            ...level,
            width: renderWidth,
            height: renderHeight,
            cageSafeCells: renderCageCells,
            cageBlockedCells: renderCageBlockedCells,
            obstacles: renderObstacles,
            doorSwitchTile: renderDoorSwitchTile,
            door: renderDoor,
            wallSegments: previewMode ? undefined : level.wallSegments,
        }),
        [
            level,
            previewMode,
            renderWidth,
            renderHeight,
            renderCageCells,
            renderCageBlockedCells,
            renderObstacles,
            renderDoorSwitchTile,
            renderDoor,
        ],
    );

    const renderFence = React.useMemo(() => {
        if (previewMode && builderDoors.length > 0) {
            return buildFenceWithMultipleDoors(renderCageCells, builderDoors);
        }
        return buildFence(renderLevelModel);
    }, [renderLevelModel, previewMode, builderDoors, renderCageCells]);
    const renderObstacleSet = React.useMemo(() => new Set(renderObstacles.map((t) => tileKey(t.x, t.y))), [renderObstacles]);
    const renderCageBlockedSet = React.useMemo(
        () => new Set(renderCageBlockedCells.map((t) => tileKey(t.x, t.y))),
        [renderCageBlockedCells],
    );
    const renderStaticBlockedSet = React.useMemo(() => {
        const combined = new Set<string>();
        renderObstacleSet.forEach((item) => combined.add(item));
        renderCageBlockedSet.forEach((item) => combined.add(item));
        return combined;
    }, [renderCageBlockedSet, renderObstacleSet]);
    const renderCageSafeSet = React.useMemo(() => new Set(renderCageCells.map((t) => tileKey(t.x, t.y))), [renderCageCells]);
    const renderActors = React.useMemo(
        () => (previewMode
            ? builderActors.map((item) => ({ ...item, settled: renderCageSafeSet.has(tileKey(item.x, item.y)) }))
            : fishList),
        [builderActors, fishList, previewMode, renderCageSafeSet],
    );
    const renderOccupiedSet = React.useMemo(() => new Set(renderActors.map((f) => tileKey(f.x, f.y))), [renderActors]);

    const resetLevel = React.useCallback((targetLevelIndex: number) => {
        const safeIndex = Math.max(0, Math.min(targetLevelIndex, playableLevels.length - 1));
        const nextLevel = playableLevels[safeIndex];
        setLevelIndex(safeIndex);
        setCreatedLevel(null);
        setCreatorInfo('');
        setFishList(buildFish(nextLevel));
        setTimeLeftSec(nextLevel.timeLimitSec);
        setMessage(`Level ${nextLevel.id}: move actors into the cage-safe cells only.`);
        setLevelCompleteOpen(false);
        setFailed(false);
        setCageDoorOpen(KEEP_DOOR_OPEN_FOR_NOW);
        if (builderOpen) {
            hydrateBuilderFromLevel(nextLevel);
        }
    }, [builderOpen, hydrateBuilderFromLevel, playableLevels]);

    const playBuilderLevel = React.useCallback(() => {
        const playable = buildLevelFromBuilder(level.id);
        setCreatedLevel(playable);
        setCreatorInfo('');
        setFishList(buildFish(playable));
        setTimeLeftSec(playable.timeLimitSec);
        setLevelCompleteOpen(false);
        setFailed(false);
        setLevelOverlayOpen(false);
        setBuilderOpen(false);
        setCageDoorOpen(true);
        setMessage(`Playing builder level ${playable.id}. Doors start open and will close when time runs out.`);
    }, [buildLevelFromBuilder, level.id]);

    const onCreateLevel = React.useCallback(() => {
        const nextId = Math.max(playableLevels.length + 1, 50 + randomInt(0, 949));
        const generated = createValidGeneratedLevel(nextId, creatorDifficulty);
        if (!generated) {
            setMessage('Creator failed to produce a solvable level. Try again.');
            return;
        }

        setCreatedLevel(generated.level);
        setCreatorInfo(
            `Created (${creatorDifficulty}) in ${generated.attempts} attempt(s). Min steps: ${generated.validation.minSteps}.`,
        );
        setFishList(buildFish(generated.level));
        setTimeLeftSec(generated.level.timeLimitSec);
        setCageDoorOpen(KEEP_DOOR_OPEN_FOR_NOW);
        setLevelCompleteOpen(false);
        setFailed(false);
        setLevelOverlayOpen(false);
        setMessage(`Generated validated level ${generated.level.id}.`);
    }, [creatorDifficulty, playableLevels.length]);

    const onDoorSwitchClick = React.useCallback(() => {
        if (!ALLOW_MANUAL_SWITCH_TOGGLE) {
            setMessage('Door switch is locked to OPEN for this tuning phase.');
            return;
        }

        setCageDoorOpen((previous) => {
            const next = !previous;
            setMessage(`Door switched ${next ? 'open' : 'closed'}.`);
            return next;
        });
    }, []);

    React.useEffect(() => {
        if (levelOverlayOpen || levelCompleteOpen || TIMER_PAUSED_FOR_DEBUG) {
            return;
        }

        if (timeLeftSec <= 0) {
            if (cageDoorOpen) {
                setCageDoorOpen(false);
                const allInside = allSettled(fishList);
                if (allInside) {
                    dispatch({ type: 'submit', success: true, note: `Level ${level.id} complete on door close` });
                    setMessage('Time finished. Doors closed with all actors safely inside.');
                    setLevelCompleteOpen(true);
                } else {
                    setFailed(true);
                    setMessage('Time finished. Doors closed and some actors were still outside.');
                    dispatch({ type: 'submit', success: false, note: 'Timer expired with actors outside cage' });
                }
            }
            return;
        }

        const tick = window.setTimeout(() => {
            setTimeLeftSec((previous) => Math.max(0, previous - 1));
        }, 1000);

        return () => window.clearTimeout(tick);
    }, [cageDoorOpen, dispatch, fishList, level.id, levelCompleteOpen, levelOverlayOpen, timeLeftSec]);

    const onFishClick = (fishId: number) => {
        if (failed || levelCompleteOpen || levelOverlayOpen) {
            return;
        }

        setFishList((previous) => {
            const moving = previous.find((fish) => fish.id === fishId);
            if (!moving || moving.settled) {
                if (moving?.settled) {
                    setMessage(`Actor ${moving.id} is already inside cage and cannot be moved out.`);
                }
                return previous;
            }

            const target = slideFish(moving, level, staticBlockedSet, previous, fence, cageDoorOpen);
            if (target.x === moving.x && target.y === moving.y) {
                setMessage(`Actor ${moving.id} cannot move; front cell is blocked.`);
                return previous;
            }

            const nextFish = previous.map((fish) => {
                if (fish.id !== fishId) {
                    return fish;
                }
                const safe = cageSafeSet.has(tileKey(target.x, target.y));
                return { ...fish, x: target.x, y: target.y, settled: safe };
            });

            const movedFish = nextFish.find((fish) => fish.id === fishId);
            if (movedFish?.settled) {
                setMessage(`Actor ${movedFish.id} entered cage.`);
            } else {
                setMessage(`Actor ${fishId} stopped at cell (${target.x}, ${target.y}) before a blocker.`);
            }

            if (allSettled(nextFish)) {
                dispatch({ type: 'submit', success: true, note: `Level ${level.id} complete` });
                setMessage('All actors are inside the cage area.');
                setLevelCompleteOpen(true);
                if (!createdLevel && levelIndex < playableLevels.length - 1) {
                    dispatch({ type: 'advance', note: `Advance to level ${level.id + 1}` });
                }
                return nextFish;
            }

            if (!hasUsefulMoves(level, staticBlockedSet, nextFish, fence, cageDoorOpen)) {
                setFailed(true);
                setMessage('No useful moves remain. This move order locked the puzzle.');
                dispatch({ type: 'submit', success: false, note: `Level ${level.id} locked` });
            }

            return nextFish;
        });
    };

    const whaleProgress = Math.max(0, Math.min(100, 100 - (timeLeftSec / level.timeLimitSec) * 100));
    const rescued = fishList.filter((fish) => fish.settled).length;

    const openDoor = () => {
        setCageDoorOpen(true);
        setMessage('Door opened. Outside actors can now enter through the doorway.');
    };

    const closeDoor = () => {
        setCageDoorOpen(false);
        setMessage('Door closed. Actors cannot pass through cage walls.');
    };

    const toggleBuilder = () => {
        if (!builderOpen) {
            const source = createdLevel ?? playableLevels[levelIndex];
            if (source) {
                hydrateBuilderFromLevel(source);
            }
        }
        const nextOpen = !builderOpen;
        setBuilderOpen(nextOpen);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (nextOpen) {
                url.searchParams.set('builder', '');
            } else {
                url.searchParams.delete('builder');
            }
            const normalized = `${url.pathname}${url.search ? url.search.replace(/=$/, '') : ''}${url.hash}`;
            window.history.replaceState({}, '', normalized);
        }
    };

    const onBuilderCellClick = (x: number, y: number, shiftKey = false) => {
        if (x < 0 || y < 0 || x >= builderWidth || y >= builderHeight) {
            return;
        }

        const key = tileKey(x, y);

        if (builderTool === 'select') {
            const actor = builderActors.find((item) => item.x === x && item.y === y);
            if (actor) {
                const nextSelection: ConcreteSelectedItem = { type: 'actor', id: actor.id };
                if (shiftKey) {
                    toggleMultiSelectedItem(nextSelection);
                    setMessage(`Toggled actor ${actor.id} in selection.`);
                } else {
                    selectSingleItem(nextSelection);
                    setBuilderDir(actor.dir);
                    setMessage(`Selected actor ${actor.id} at (${x}, ${y})`);
                }
                return;
            }

            const isObstacle = builderObstacles.some((tile) => tile.x === x && tile.y === y);
            if (isObstacle) {
                const nextSelection: ConcreteSelectedItem = { type: 'obstacle', x, y };
                if (shiftKey) {
                    toggleMultiSelectedItem(nextSelection);
                    setMessage(`Toggled obstacle at (${x}, ${y}) in selection.`);
                } else {
                    selectSingleItem(nextSelection);
                    setMessage(`Selected obstacle at (${x}, ${y})`);
                }
                return;
            }

            const isCage = builderCageCells.some((tile) => tile.x === x && tile.y === y);
            if (isCage) {
                const nextSelection: ConcreteSelectedItem = { type: 'cage', x, y };
                if (shiftKey) {
                    toggleMultiSelectedItem(nextSelection);
                    setMessage(`Toggled cage cell at (${x}, ${y}) in selection.`);
                } else {
                    selectSingleItem(nextSelection);
                    setMessage(`Selected cage cell at (${x}, ${y})`);
                }
                return;
            }

            const isSwitch = builderSwitch.x === x && builderSwitch.y === y;
            if (isSwitch) {
                const nextSelection: ConcreteSelectedItem = { type: 'switch' };
                if (shiftKey) {
                    toggleMultiSelectedItem(nextSelection);
                    setMessage(`Toggled door switch at (${x}, ${y}) in selection.`);
                } else {
                    selectSingleItem(nextSelection);
                    setMessage(`Selected door switch at (${x}, ${y})`);
                }
                return;
            }

            if (!shiftKey) {
                clearSelection();
                setMessage('No item at this cell');
            }
            return;
        }

        if (builderTool === 'switch') {
            setBuilderSwitch({ x, y });
            selectSingleItem({ type: 'switch' });
            return;
        }

        if (builderTool === 'door-edge') {
            return;
        }

        if (builderTool === 'cage') {
            setBuilderCageDraft((previous) => {
                const next = new Set(previous);
                if (next.has(key)) {
                    next.delete(key);
                } else {
                    next.add(key);
                }
                return next;
            });
            return;
        }

        if (builderTool === 'obstacle') {
            setBuilderObstacles((previous) => {
                const has = previous.some((tile) => tile.x === x && tile.y === y);
                if (has) {
                    return previous.filter((tile) => !(tile.x === x && tile.y === y));
                }
                return [...previous, { x, y }];
            });
            return;
        }

        setBuilderActors((previous) => {
            const existing = previous.find((item) => item.x === x && item.y === y);
            if (existing) {
                return previous.map((item) => (item.x === x && item.y === y ? { ...item, dir: builderDir } : item));
            }
            return [...previous, { id: previous.length + 1, x, y, dir: builderDir }];
        });
    };

    const removeBuilderActorAt = (x: number, y: number) => {
        setBuilderActors((previous) => previous.filter((item) => !(item.x === x && item.y === y)));
    };

    const deleteSelectedItem = () => {
        const targets = selectedItems.length > 0
            ? selectedItems
            : (selectedItem ? [selectedItem as ConcreteSelectedItem] : []);
        if (targets.length === 0) return;

        const actorIds = new Set(targets.filter(isActorSelectedItem).map((item) => item.id));
        const obstacleKeys = new Set(targets.filter(isObstacleSelectedItem).map((item) => `${item.x},${item.y}`));
        const cageKeys = new Set(targets.filter(isCageSelectedItem).map((item) => `${item.x},${item.y}`));
        const doorIndexes = new Set(targets.filter(isDoorSelectedItem).map((item) => item.doorIndex));

        if (actorIds.size > 0) {
            setBuilderActors((previous) => previous.filter((item) => !actorIds.has(item.id)));
        }
        if (obstacleKeys.size > 0) {
            setBuilderObstacles((previous) => previous.filter((tile) => !obstacleKeys.has(`${tile.x},${tile.y}`)));
        }
        if (cageKeys.size > 0) {
            setBuilderCageCells((previous) => previous.filter((tile) => !cageKeys.has(`${tile.x},${tile.y}`)));
        }
        if (doorIndexes.size > 0) {
            setBuilderDoors((previous) => previous.filter((_, idx) => !doorIndexes.has(idx)));
        }

        clearSelection();
        setMessage(targets.length > 1 ? `Deleted ${targets.length} selected item(s).` : 'Deleted selected item.');
    };

    const onEdgeClick = (edge: EdgeSegment, shiftKey = false) => {
        if (builderTool === 'select') {
            const doorIndex = builderDoors.findIndex(d => 
                d.edge.kind === edge.kind && d.edge.x === edge.x && d.edge.y === edge.y
            );
            if (doorIndex >= 0) {
                const nextSelection: ConcreteSelectedItem = { type: 'door', doorIndex };
                if (shiftKey) {
                    toggleMultiSelectedItem(nextSelection);
                    setMessage(`Toggled door at ${edge.kind}:${edge.x},${edge.y} in selection.`);
                } else {
                    selectSingleItem(nextSelection);
                    setMessage(`Selected door at ${edge.kind}:${edge.x},${edge.y}`);
                }
            }
            return;
        }

        if (builderTool === 'door-edge') {
            const existingIndex = builderDoors.findIndex(d => 
                d.edge.kind === edge.kind && d.edge.x === edge.x && d.edge.y === edge.y
            );
            
            if (existingIndex >= 0) {
                setBuilderDoors((previous) => previous.filter((_, idx) => idx !== existingIndex));
                setMessage('Removed door (double-click)');
                clearSelection();
            } else {
                const newDoor: {
                    edge: EdgeSegment;
                    side: 'left' | 'right' | 'top' | 'bottom';
                    offset: number;
                    hinge: 'left' | 'right' | 'top' | 'bottom';
                    opensToward: 'inward' | 'outward';
                } = {
                    edge,
                    side: edge.kind === 'v' ? 'left' : 'top',
                    offset: edge.kind === 'v' ? edge.y : edge.x,
                    hinge: edge.kind === 'v' ? 'top' : 'left',
                    opensToward: 'inward' as const,
                };
                setBuilderDoors((previous) => [...previous, newDoor]);
                selectSingleItem({ type: 'door', doorIndex: builderDoors.length });
                setMessage(`Added door at ${edge.kind}:${edge.x},${edge.y}`);
            }
        }
    };

    const updateDoorAtIndex = (
        doorIndex: number,
        updates: Partial<{
            side: 'left' | 'right' | 'top' | 'bottom';
            offset: number;
            hinge: 'left' | 'right' | 'top' | 'bottom';
            opensToward: 'inward' | 'outward';
        }>,
    ) => {
        setBuilderDoors((previous) =>
            previous.map((door, idx) => (idx === doorIndex ? { ...door, ...updates } : door)),
        );
    };

    const updateSelectedActorDirection = (newDir: Direction) => {
        if (selectedItem?.type === 'actor') {
            setBuilderActors((previous) => 
                previous.map((item) => item.id === selectedItem.id ? { ...item, dir: newDir } : item)
            );
            setBuilderDir(newDir);
            setMessage(`Updated actor ${selectedItem.id} direction to ${newDir}`);
        }
    };

    const applyCageFromSelection = () => {
        const selected = [...builderCageDraft].map((key) => {
            const [x, y] = key.split(',').map((value) => Number(value));
            return { x, y };
        });
        setBuilderCageCells((previous) => {
            const merged = new Map<string, Tile>();
            previous.forEach((tile) => merged.set(tileKey(tile.x, tile.y), tile));
            selected.forEach((tile) => merged.set(tileKey(tile.x, tile.y), tile));
            return [...merged.values()];
        });
        setBuilderCageDraft(new Set());
        setMessage(`Added ${selected.length} cage cell(s) to the current cage.`);
    };

    const saveBuilderAsNewLevel = () => {
        const nextId = playableLevels.reduce((max, item) => Math.max(max, item.id), 0) + 1;
        const levelFromBuilder = buildLevelFromBuilder(nextId);
        const nextLevels = [...playableLevels, levelFromBuilder];
        setEditableLevels(nextLevels);
        setLevelIndex(nextLevels.length - 1);
        setCreatedLevel(null);
        setFishList(buildFish(levelFromBuilder));
        setTimeLeftSec(levelFromBuilder.timeLimitSec);
        setFailed(false);
        setLevelCompleteOpen(false);
        setBuilderCageCells(levelFromBuilder.cageSafeCells);
        setBuilderCageDraft(new Set());
        setMessage(`Builder saved new level ${levelFromBuilder.id}.`);
    };

    const updateCurrentLevelFromBuilder = () => {
        const current = playableLevels[levelIndex];
        if (!current) {
            return;
        }
        const updated = buildLevelFromBuilder(current.id);
        const next = playableLevels.map((item, idx) => (idx === levelIndex ? updated : item));
        setEditableLevels(next);
        setCreatedLevel(null);
        setFishList(buildFish(updated));
        setTimeLeftSec(updated.timeLimitSec);
        setFailed(false);
        setLevelCompleteOpen(false);
        setBuilderCageCells(updated.cageSafeCells);
        setBuilderCageDraft(new Set());
        setBuilderUpdateFlash(true);
        setTimeout(() => setBuilderUpdateFlash(false), 1500);
        setMessage(`Updated level ${updated.id} from builder.`);
    };

    const exportLevelsJson = () => {
        const genericLevels = playableLevels.map((levelItem) => {
            const normalized = normalizeLevel(levelItem);
            return {
                ...normalized,
                actors: actorSource(normalized),
                fish: undefined,
            };
        });
        const payload = JSON.stringify(genericLevels, null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'levels.json';
        anchor.click();
        URL.revokeObjectURL(url);
        setBuilderJsonInput(payload);
        setMessage('Exported levels.json (download started).');
    };

    const importLevelsJson = () => {
        try {
            const parsed = JSON.parse(builderJsonInput) as LevelSpec[];
            if (!Array.isArray(parsed) || parsed.length === 0) {
                setMessage('Import failed: provide a JSON array with at least one level.');
                return;
            }
            const next = parsed.map(normalizeLevel);
            setEditableLevels(next);
            setLevelIndex(0);
            setCreatedLevel(null);
            setFishList(buildFish(next[0]));
            setTimeLeftSec(next[0].timeLimitSec);
            setFailed(false);
            setLevelCompleteOpen(false);
            setMessage(`Imported ${next.length} level(s) from JSON.`);
        } catch {
            setMessage('Import failed: Invalid JSON.');
        }
    };

    const jumpToLevel = (idx: number) => {
        resetLevel(idx);
        const nextLevel = playableLevels[idx];
        if (nextLevel) {
            setMessage(`Loaded level ${nextLevel.id}: ${nextLevel.title}.`);
        }
    };

    const goPrevLevel = () => {
        const prev = levelIndex <= 0 ? playableLevels.length - 1 : levelIndex - 1;
        jumpToLevel(prev);
    };

    const goNextLevel = () => {
        const next = levelIndex >= playableLevels.length - 1 ? 0 : levelIndex + 1;
        jumpToLevel(next);
    };

    return (
        <div className="rescue-page">
            {!isEmbed && (
                <header className="rescue-topbar">
                    <div className="rescue-level">Level {level.id}: {level.title}</div>
                    <div className="rescue-top-controls">
                        <Link to="/" className="ui-pill">Home</Link>
                        <button className="ui-pill" onClick={() => resetLevel(levelIndex)}>Restart</button>
                        <button className="ui-pill" onClick={() => setMuted((value) => !value)}>{muted ? 'Sound Off' : 'Sound On'}</button>
                        <button className="ui-pill" onClick={openDoor}>Open Door</button>
                        <button className="ui-pill" onClick={closeDoor}>Close Door</button>
                        <button className={`ui-pill ${creatorDifficulty === 'easy' ? 'ui-pill-active' : ''}`} onClick={() => setCreatorDifficulty('easy')}>Easy</button>
                        <button className={`ui-pill ${creatorDifficulty === 'medium' ? 'ui-pill-active' : ''}`} onClick={() => setCreatorDifficulty('medium')}>Medium</button>
                        <button className={`ui-pill ${creatorDifficulty === 'hard' ? 'ui-pill-active' : ''}`} onClick={() => setCreatorDifficulty('hard')}>Hard</button>
                        <button className="ui-pill" onClick={onCreateLevel}>Create Valid Level</button>
                        <button className={`ui-pill ${builderOpen ? 'ui-pill-active' : ''}`} onClick={toggleBuilder}>{builderOpen ? 'Hide Builder' : 'Open Builder'}</button>
                        <span className="ui-pill">Door: {cageDoorOpen ? 'Open' : 'Closed'}</span>
                    </div>
                </header>
            )}

            {!isEmbed && (
                <div className="level-list-strip">
                    <div className="level-list-label">Level List</div>
                    <button className="ui-pill" onClick={goPrevLevel}>Prev</button>
                    {playableLevels.map((item, idx) => (
                        <button
                            key={`jump-${item.id}`}
                            className={`ui-pill ${!createdLevel && idx === levelIndex ? 'ui-pill-active' : ''}`}
                            onClick={() => jumpToLevel(idx)}
                        >
                            {item.id}
                        </button>
                    ))}
                    <button className="ui-pill" onClick={goNextLevel}>Next</button>
                </div>
            )}

            {builderOpen && !isEmbed && (
                <>
                    <div style={{ maxWidth: '1600px', margin: '0 auto 1rem', padding: '0 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255, 255, 255, 0.98)', padding: '0.75rem', borderRadius: '12px', border: '2px solid #7aa5bf', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }}>
                            <button className={`ui-pill ${builderUpdateFlash ? 'ui-pill-success' : ''}`} onClick={updateCurrentLevelFromBuilder} style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}>
                                {builderUpdateFlash ? '✅ Updated' : '💾 Update'}
                            </button>
                            <button className="ui-pill" onClick={saveBuilderAsNewLevel} style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}>➕ Save New</button>
                            <button className="ui-pill" onClick={playBuilderLevel} style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}>▶️ Play</button>
                            <button className="ui-pill" onClick={exportLevelsJson} style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}>📤 Export</button>
                            <button className="ui-pill" onClick={importLevelsJson} style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}>📥 Import</button>
                            <button className={`ui-pill ${builderLivePreview ? 'ui-pill-active' : ''}`} onClick={() => setBuilderLivePreview((prev) => !prev)} style={{ fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}>
                                {builderLivePreview ? '👁️ Preview' : '👁️ No Preview'}
                            </button>
                            <select className="builder-input" value={String(builderTime)} onChange={(event) => setBuilderTime(Number(event.target.value))} style={{ width: '120px', fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}>
                                <option value="10">10 sec</option>
                                <option value="30">30 sec</option>
                                <option value="60">60 sec</option>
                                <option value="90">90 sec</option>
                                <option value="120">120 sec</option>
                                <option value="180">180 sec</option>
                            </select>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                    className="builder-input"
                                    value={builderTitle}
                                    onChange={(event) => setBuilderTitle(event.target.value)}
                                    placeholder="Level title"
                                    style={{ width: '200px', fontSize: '0.85rem', padding: '0.35rem 0.5rem' }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="builder-layout">
                        <div className="builder-controls-panel">
                        <div className="builder-section">
                            <h3>🎨 Tools</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <button className={`ui-pill ${builderTool === 'select' ? 'ui-pill-active' : ''}`} onClick={() => { setBuilderTool('select'); clearSelection(); }}>👆 Select</button>
                                <button className={`ui-pill ${builderTool === 'actor' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderTool('actor')}>🐟 Actor</button>
                                <button className={`ui-pill ${builderTool === 'cage' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderTool('cage')}>🟩 Cage</button>
                                <button className={`ui-pill ${builderTool === 'obstacle' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderTool('obstacle')}>🟫 Block</button>
                                <button className={`ui-pill ${builderTool === 'door-edge' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderTool('door-edge')}>🚪 Door</button>
                                <button className={`ui-pill ${builderTool === 'switch' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderTool('switch')}>🔘 Switch</button>
                            </div>
                            
                            {builderTool === 'actor' && (
                                <div className="builder-field" style={{ marginTop: '0.75rem' }}>
                                    <label>Direction</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <button className={`ui-pill ${builderDir === 'up' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderDir('up')}>⬆️ Up</button>
                                        <button className={`ui-pill ${builderDir === 'down' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderDir('down')}>⬇️ Down</button>
                                        <button className={`ui-pill ${builderDir === 'left' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderDir('left')}>⬅️ Left</button>
                                        <button className={`ui-pill ${builderDir === 'right' ? 'ui-pill-active' : ''}`} onClick={() => setBuilderDir('right')}>➡️ Right</button>
                                    </div>
                                </div>
                            )}

                            {builderTool === 'cage' && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <button className="ui-pill" onClick={applyCageFromSelection} style={{ width: '100%' }}>✅ Apply Cage ({builderCageDraft.size})</button>
                                    <span className="builder-hint">Click cells to select, then apply</span>
                                </div>
                            )}
                        </div>

                        {selectedItems.length > 0 && (
                            <div className="builder-section" style={{ background: 'rgba(255, 248, 220, 0.98)', borderColor: '#d4a017' }}>
                                <h3>✏️ Selected Item</h3>
                                {selectedItems.length > 1 && (
                                    <>
                                        <div className="builder-hint" style={{ marginBottom: '0.75rem' }}>
                                            {selectedItems.length} items selected
                                        </div>
                                        <button className="ui-pill" onClick={deleteSelectedItem} style={{ width: '100%', background: '#dc3545', color: '#fff', borderColor: '#dc3545' }}>🗑️ Delete Selected Items</button>
                                    </>
                                )}

                                {selectedItems.length === 1 && selectedItem?.type === 'actor' && (() => {
                                    const actor = builderActors.find(a => a.id === selectedItem.id);
                                    if (!actor) return null;
                                    return (
                                        <>
                                            <div className="builder-hint" style={{ marginBottom: '0.75rem' }}>
                                                Actor #{actor.id} at ({actor.x}, {actor.y})
                                            </div>
                                            <div className="builder-field">
                                                <label>Direction</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem', maxWidth: '180px' }}>
                                                    <div />
                                                    <button
                                                        className={`ui-pill ${actor.dir === 'up' ? 'ui-pill-active' : ''}`}
                                                        onClick={() => updateSelectedActorDirection('up')}
                                                        style={{ aspectRatio: '1 / 1', minHeight: '42px', padding: 0, fontSize: '1.15rem' }}
                                                        aria-label="Set actor direction up"
                                                    >
                                                        ↑
                                                    </button>
                                                    <div />
                                                    <button
                                                        className={`ui-pill ${actor.dir === 'left' ? 'ui-pill-active' : ''}`}
                                                        onClick={() => updateSelectedActorDirection('left')}
                                                        style={{ aspectRatio: '1 / 1', minHeight: '42px', padding: 0, fontSize: '1.15rem' }}
                                                        aria-label="Set actor direction left"
                                                    >
                                                        ←
                                                    </button>
                                                    <div style={{ border: '1px solid #c8dbe8', borderRadius: '999px', background: '#f4fbff' }} />
                                                    <button
                                                        className={`ui-pill ${actor.dir === 'right' ? 'ui-pill-active' : ''}`}
                                                        onClick={() => updateSelectedActorDirection('right')}
                                                        style={{ aspectRatio: '1 / 1', minHeight: '42px', padding: 0, fontSize: '1.15rem' }}
                                                        aria-label="Set actor direction right"
                                                    >
                                                        →
                                                    </button>
                                                    <div />
                                                    <button
                                                        className={`ui-pill ${actor.dir === 'down' ? 'ui-pill-active' : ''}`}
                                                        onClick={() => updateSelectedActorDirection('down')}
                                                        style={{ aspectRatio: '1 / 1', minHeight: '42px', padding: 0, fontSize: '1.15rem' }}
                                                        aria-label="Set actor direction down"
                                                    >
                                                        ↓
                                                    </button>
                                                    <div />
                                                </div>
                                            </div>
                                            <button className="ui-pill" onClick={deleteSelectedItem} style={{ width: '100%', marginTop: '0.5rem', background: '#dc3545', color: '#fff', borderColor: '#dc3545' }}>🗑️ Delete Actor</button>
                                        </>
                                    );
                                })()}

                                {selectedItems.length === 1 && selectedItem?.type === 'obstacle' && (
                                    <>
                                        <div className="builder-hint" style={{ marginBottom: '0.75rem' }}>
                                            Obstacle at ({selectedItem.x}, {selectedItem.y})
                                        </div>
                                        <button className="ui-pill" onClick={deleteSelectedItem} style={{ width: '100%', background: '#dc3545', color: '#fff', borderColor: '#dc3545' }}>🗑️ Delete Obstacle</button>
                                    </>
                                )}

                                {selectedItems.length === 1 && selectedItem?.type === 'cage' && (
                                    <>
                                        <div className="builder-hint" style={{ marginBottom: '0.75rem' }}>
                                            Cage cell at ({selectedItem.x}, {selectedItem.y})
                                        </div>
                                        <button className="ui-pill" onClick={deleteSelectedItem} style={{ width: '100%', background: '#dc3545', color: '#fff', borderColor: '#dc3545' }}>🗑️ Remove from Cage</button>
                                    </>
                                )}

                                {selectedItems.length === 1 && selectedItem?.type === 'switch' && (
                                    <>
                                        <div className="builder-hint" style={{ marginBottom: '0.75rem' }}>
                                            Door Switch at ({builderSwitch.x}, {builderSwitch.y})
                                        </div>
                                        <span className="builder-hint">Use Switch tool to relocate</span>
                                    </>
                                )}

                                {selectedItems.length === 1 && selectedItem?.type === 'door' && (() => {
                                    const door = builderDoors[selectedItem.doorIndex];
                                    if (!door) return null;
                                    return (
                                        <>
                                            <div className="builder-hint" style={{ marginBottom: '0.75rem' }}>
                                                Door at {door.edge.kind}:{door.edge.x},{door.edge.y}
                                            </div>
                                            <div className="builder-field-row">
                                                <div className="builder-field">
                                                    <label>Side</label>
                                                    <select className="builder-input" value={door.side} onChange={(e) => updateDoorAtIndex(selectedItem.doorIndex, { side: e.target.value as 'left' | 'right' | 'top' | 'bottom' })}>
                                                        <option value="left">⬅️ Left</option>
                                                        <option value="right">➡️ Right</option>
                                                        <option value="top">⬆️ Top</option>
                                                        <option value="bottom">⬇️ Bottom</option>
                                                    </select>
                                                </div>
                                                <div className="builder-field">
                                                    <label>Offset</label>
                                                    <input className="builder-input" type="number" value={door.offset} min={0} max={door.side === 'left' || door.side === 'right' ? Math.max(0, builderHeight - 1) : Math.max(0, builderWidth - 1)} onChange={(e) => updateDoorAtIndex(selectedItem.doorIndex, { offset: Math.max(0, Math.min(Number(e.target.value) || 0, door.side === 'left' || door.side === 'right' ? Math.max(0, builderHeight - 1) : Math.max(0, builderWidth - 1))) })} />
                                                </div>
                                            </div>
                                            <div className="builder-field-row">
                                                <div className="builder-field">
                                                    <label>Hinge</label>
                                                    <select className="builder-input" value={door.hinge} onChange={(e) => updateDoorAtIndex(selectedItem.doorIndex, { hinge: e.target.value as 'left' | 'right' | 'top' | 'bottom' })}>
                                                        <option value="left">Left</option>
                                                        <option value="right">Right</option>
                                                        <option value="top">Top</option>
                                                        <option value="bottom">Bottom</option>
                                                    </select>
                                                </div>
                                                <div className="builder-field">
                                                    <label>Opens</label>
                                                    <select className="builder-input" value={door.opensToward} onChange={(e) => updateDoorAtIndex(selectedItem.doorIndex, { opensToward: e.target.value as 'inward' | 'outward' })}>
                                                        <option value="inward">In</option>
                                                        <option value="outward">Out</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button className="ui-pill" onClick={deleteSelectedItem} style={{ width: '100%', marginTop: '0.5rem', background: '#dc3545', color: '#fff', borderColor: '#dc3545' }}>🗑️ Remove Door</button>
                                        </>
                                    );
                                })()}
                            </div>
                        )}

                        <div className="builder-section">
                            <h3>🚪 Door Setup</h3>
                            <span className="builder-hint">Select a door to edit its own side, offset, hinge, and opening direction.</span>
                            <div className="builder-field-row" style={{ marginTop: '0.5rem' }}>
                                <div className="builder-field">
                                    <label>Anim Time (ms)</label>
                                    <input
                                        className="builder-input"
                                        type="number"
                                        value={builderDoorAnimationMs}
                                        min={50}
                                        step={50}
                                        onChange={(event) => setBuilderDoorAnimationMs(Math.max(50, Number(event.target.value) || 50))}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button className="ui-pill" onClick={openDoor}>🔓 Open</button>
                                <button className="ui-pill" onClick={closeDoor}>🔒 Close</button>
                            </div>
                            <span className="builder-hint">
                                {builderDoors.length} door(s) placed
                            </span>
                        </div>

                        <div className="builder-section">
                            <h3>🎨 Visual Style</h3>
                            <div className="builder-field-row">
                                <div className="builder-field">
                                    <label>Joint Diameter</label>
                                    <input className="builder-input" type="number" value={builderHedgeJointDiameter} min={6} max={30} onChange={(event) => setBuilderHedgeJointDiameter(Math.max(6, Number(event.target.value) || 6))} />
                                </div>
                                <div className="builder-field">
                                    <label>Cage Thickness</label>
                                    <input className="builder-input" type="number" value={builderCageLineThickness} min={2} max={20} onChange={(event) => setBuilderCageLineThickness(Math.max(2, Number(event.target.value) || 2))} />
                                </div>
                            </div>
                            <div className="builder-field-row">
                                <div className="builder-field">
                                    <label>Door Color</label>
                                    <input className="builder-input" type="color" value={builderDoorColor} onChange={(event) => setBuilderDoorColor(event.target.value)} />
                                </div>
                                <div className="builder-field">
                                    <label>Door Thickness</label>
                                    <input className="builder-input" type="number" value={builderDoorThickness} min={2} max={20} onChange={(event) => setBuilderDoorThickness(Math.max(2, Number(event.target.value) || 2))} />
                                </div>
                            </div>
                        </div>

                        <div className="builder-section">
                            <h3>⚙️ Level Settings</h3>
                            <div className="builder-field-row">
                                <div className="builder-field">
                                    <label>Width</label>
                                    <input className="builder-input" type="number" value={builderWidth} min={4} max={24} onChange={(event) => setBuilderWidth(Number(event.target.value) || 4)} />
                                </div>
                                <div className="builder-field">
                                    <label>Height</label>
                                    <input className="builder-input" type="number" value={builderHeight} min={4} max={24} onChange={(event) => setBuilderHeight(Number(event.target.value) || 4)} />
                                </div>
                            </div>
                        </div>

                        <div className="builder-section">
                            <h3>� JSON Import</h3>
                            <textarea
                                className="builder-json"
                                value={builderJsonInput}
                                onChange={(event) => setBuilderJsonInput(event.target.value)}
                                placeholder="Paste JSON here for import..."
                                style={{ minHeight: '80px' }}
                            />
                        </div>
                    </div>

                    <div className="builder-grid-panel">
                        <div className="builder-section">
                            <h3>Builder Canvas</h3>
                            <svg
                                className="builder-grid"
                                viewBox={`0 0 ${builderWidth * 34} ${builderHeight * 34}`}
                                role="img"
                                aria-label="Level builder grid"
                            >
                                <rect x={0} y={0} width={builderWidth * 34} height={builderHeight * 34} fill="#d9efff" rx={8} />
                                {Array.from({ length: builderHeight }).flatMap((_, y) =>
                                    Array.from({ length: builderWidth }).map((__, x) => {
                                        const key = tileKey(x, y);
                                        const isCage = builderCageCells.some((tile) => tile.x === x && tile.y === y);
                                        const isDraft = builderCageDraft.has(key);
                                        const isObstacle = builderObstacles.some((tile) => tile.x === x && tile.y === y);
                                        const actor = builderActors.find((item) => item.x === x && item.y === y);
                                        const isSwitch = builderSwitch.x === x && builderSwitch.y === y;

                                        const isSelected = selectedItems.some((item) =>
                                            (item.type === 'actor' && actor && actor.id === item.id) ||
                                            (item.type === 'obstacle' && isObstacle && item.x === x && item.y === y) ||
                                            (item.type === 'cage' && isCage && item.x === x && item.y === y) ||
                                            (item.type === 'switch' && isSwitch)
                                        );

                                        return (
                                            <g key={`builder-cell-${key}`} onClick={(event) => onBuilderCellClick(x, y, event.shiftKey)}>
                                                <rect 
                                                    x={x * 34 + 1} 
                                                    y={y * 34 + 1} 
                                                    width={32} 
                                                    height={32} 
                                                    fill={isDraft ? '#9bd2ff' : isCage ? '#8be1a7' : '#ffffff'} 
                                                    stroke={isSelected ? '#ffa500' : '#7aa5bf'} 
                                                    strokeWidth={isSelected ? 3 : 1} 
                                                />
                                                {isObstacle && <rect x={x * 34 + 7} y={y * 34 + 7} width={20} height={20} fill="#4a5d6d" rx={4} />}
                                                {isSwitch && <circle cx={x * 34 + 17} cy={y * 34 + 17} r={6} fill="#20658f" />}
                                                {actor && (
                                                    <g 
                                                        transform={`translate(${x * 34 + 17} ${y * 34 + 17}) rotate(${fishAngle(actor.dir)})`}
                                                        onContextMenu={(event) => {
                                                            event.preventDefault();
                                                            removeBuilderActorAt(x, y);
                                                        }}
                                                    >
                                                        <polygon points="-8,0 8,-5 8,5" fill="#8f4de2" stroke="#5d239f" strokeWidth="1.5" />
                                                        <circle cx="-4" cy="0" r="2" fill="#ffffff" />
                                                    </g>
                                                )}
                                            </g>
                                        );
                                    }),
                                )}
                                {/* Render clickable edges for door placement */}
                                {(builderTool === 'door-edge' || builderTool === 'select') && (
                                    <>
                                        {/* Horizontal edges */}
                                        {Array.from({ length: builderHeight + 1 }).map((_, y) =>
                                            Array.from({ length: builderWidth }).map((__, x) => {
                                                const edge: EdgeSegment = { kind: 'h', x, y };
                                                const hasDoor = builderDoors.some(d => d.edge.kind === 'h' && d.edge.x === x && d.edge.y === y);
                                                if (!hasDoor && builderTool !== 'door-edge') return null;
                                                return (
                                                    <line
                                                        key={`h-edge-${x}-${y}`}
                                                        x1={x * 34}
                                                        y1={y * 34}
                                                        x2={(x + 1) * 34}
                                                        y2={y * 34}
                                                        stroke="transparent"
                                                        strokeWidth={8}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEdgeClick(edge);
                                                        }}
                                                    />
                                                );
                                            })
                                        )}
                                        {/* Vertical edges */}
                                        {Array.from({ length: builderHeight }).map((_, y) =>
                                            Array.from({ length: builderWidth + 1 }).map((__, x) => {
                                                const edge: EdgeSegment = { kind: 'v', x, y };
                                                const hasDoor = builderDoors.some(d => d.edge.kind === 'v' && d.edge.x === x && d.edge.y === y);
                                                if (!hasDoor && builderTool !== 'door-edge') return null;
                                                return (
                                                    <line
                                                        key={`v-edge-${x}-${y}`}
                                                        x1={x * 34}
                                                        y1={y * 34}
                                                        x2={x * 34}
                                                        y2={(y + 1) * 34}
                                                        stroke="transparent"
                                                        strokeWidth={8}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEdgeClick(edge);
                                                        }}
                                                    />
                                                );
                                            })
                                        )}
                                    </>
                                )}
                                {/* Render visible door lines */}
                                {builderDoors.map((door, doorIndex) => {
                                    const isSelected = selectedItems.some((item) => item.type === 'door' && item.doorIndex === doorIndex);
                                    return (
                                        <line
                                            key={`door-${doorIndex}`}
                                            x1={(door.edge.kind === 'h' ? door.edge.x : door.edge.x) * 34}
                                            y1={(door.edge.kind === 'h' ? door.edge.y : door.edge.y) * 34}
                                            x2={(door.edge.kind === 'h' ? door.edge.x + 1 : door.edge.x) * 34}
                                            y2={(door.edge.kind === 'h' ? door.edge.y : door.edge.y + 1) * 34}
                                            stroke={isSelected ? '#ffa500' : builderDoorColor}
                                            strokeWidth={isSelected ? Math.max(builderDoorThickness + 2, 4) : builderDoorThickness}
                                            strokeLinecap="round"
                                            pointerEvents="none"
                                        />
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {builderLivePreview && (
                        <div className="builder-preview-panel">
                            <div className="builder-section">
                                <h3>Live Preview</h3>
                                <div className="preview-content">
                                    <svg
                                        className="rescue-board"
                                        viewBox={`0 0 ${renderWidth * TILE} ${renderHeight * TILE}`}
                                        role="img"
                                        aria-label="Game board preview"
                                    >
                                        <rect x={0} y={0} width={renderWidth * TILE} height={renderHeight * TILE} fill="#e1f0ff" />

                                        {Array.from({ length: renderHeight }).flatMap((_, y) =>
                                            Array.from({ length: renderWidth }).map((__, x) => (
                                                <rect key={`grid-${x}-${y}`} x={x * TILE} y={y * TILE} width={TILE} height={TILE} fill="none" stroke="#b8d9f2" strokeWidth={1} />
                                            )),
                                        )}

                                        {renderObstacles.map((tile) => (
                                            <rect key={`o-${tileKey(tile.x, tile.y)}`} x={tile.x * TILE + 10} y={tile.y * TILE + 10} width={TILE - 20} height={TILE - 20} rx={10} fill="#485f71" stroke="#1f2e3a" strokeWidth={2} />
                                        ))}

                                        {renderCageCells.map((tile) => (
                                            <g key={`safe-${tileKey(tile.x, tile.y)}`}>
                                                <rect x={tile.x * TILE + 6} y={tile.y * TILE + 6} width={TILE - 12} height={TILE - 12} rx={8} className="tile-cage-safe" />
                                                <line x1={tile.x * TILE + 12} y1={tile.y * TILE + 12} x2={tile.x * TILE + TILE - 12} y2={tile.y * TILE + TILE - 12} className="tile-cage-safe-line" strokeWidth={Math.max(1.5, renderVisuals.cageLineThickness * 0.35)} />
                                            </g>
                                        ))}

                                        {renderFence.segments.map((segment) => {
                                            const isDoorSegment = 'doorEdgeKeys' in renderFence
                                                ? renderFence.doorEdgeKeys.has(edgeKey(segment))
                                                : 'doorEdges' in renderFence && renderFence.doorEdges.some((door) => edgeKey(door) === edgeKey(segment));
                                            if (isDoorSegment) {
                                                return null;
                                            }
                                            const x1 = segment.kind === 'h' ? segment.x * TILE : segment.x * TILE;
                                            const y1 = segment.kind === 'h' ? segment.y * TILE : segment.y * TILE;
                                            const x2 = segment.kind === 'h' ? (segment.x + 1) * TILE : segment.x * TILE;
                                            const y2 = segment.kind === 'h' ? segment.y * TILE : (segment.y + 1) * TILE;
                                            return (
                                                <line
                                                    key={`wall-${edgeKey(segment)}`}
                                                    x1={x1}
                                                    y1={y1}
                                                    x2={x2}
                                                    y2={y2}
                                                    className="cage-fence"
                                                    strokeWidth={renderVisuals.cageLineThickness}
                                                />
                                            );
                                        })}

                                        {(previewMode
                                            ? (builderDoors.length > 0 ? builderDoors : (renderDoor.edge ? [renderDoor] : []))
                                            : ((level.doors && level.doors.length > 0 ? level.doors : (renderDoor.edge ? [renderDoor] : [])))
                                        ).map((door, index) => {
                                            let doorForLeaf: any;
                                            if ('side' in door) {
                                                doorForLeaf = door;
                                            } else {
                                                doorForLeaf = {
                                                    side: builderDoorSide,
                                                    offset: builderDoorOffset,
                                                    hinge: (door as any).hinge,
                                                    opensToward: (door as any).opensToward,
                                                    edge: (door as any).edge
                                                };
                                            }
                                            const doorLeaf = getDoorLeafLine(doorForLeaf, TILE, doorOpenProgress);
                                            if (!doorLeaf) {
                                                return null;
                                            }
                                            return (
                                                <line
                                                    key={`door-preview-${index}`}
                                                    x1={doorLeaf.x1}
                                                    y1={doorLeaf.y1}
                                                    x2={doorLeaf.x2}
                                                    y2={doorLeaf.y2}
                                                    className={doorOpenProgress > 0.02 ? 'cage-door-open' : 'cage-door-closed'}
                                                    stroke={renderVisuals.doorColor}
                                                    strokeWidth={renderVisuals.doorThickness}
                                                />
                                            );
                                        })}

                                        <g
                                            className="door-switch"
                                            transform={`translate(${renderDoorSwitchTile.x * TILE + TILE * 0.5} ${renderDoorSwitchTile.y * TILE + TILE * 0.5})`}
                                        >
                                            <rect x={-22} y={-14} width={44} height={28} rx={8} className="door-switch-body" />
                                            <circle cx={12} cy={0} r={6} className={cageDoorOpen ? 'door-switch-led-on' : 'door-switch-led-off'} />
                                            <text x={-11} y={4} className="door-switch-label">SW</text>
                                        </g>

                                        {[...new Set(
                                            renderFence.segments.flatMap((segment) => {
                                                if (segment.kind === 'h') {
                                                    return [`${segment.x},${segment.y}`, `${segment.x + 1},${segment.y}`];
                                                }
                                                return [`${segment.x},${segment.y}`, `${segment.x},${segment.y + 1}`];
                                            }),
                                        )].map((pointKey) => {
                                            const [px, py] = pointKey.split(',').map((value) => Number(value));
                                            return <circle key={`preview-cage-pole-${pointKey}`} cx={px * TILE} cy={py * TILE} r={renderVisuals.hedgeJointDiameter / 2} className="cage-pole" />;
                                        })}

                                        <rect x={3} y={3} width={renderWidth * TILE - 6} height={renderHeight * TILE - 6} rx={12} fill="none" stroke="#8b3f1d" strokeWidth={renderVisuals.cageLineThickness} />

                                        {renderActors.map((fish) => {
                                            const x = fish.x * TILE + TILE / 2;
                                            const y = fish.y * TILE + TILE / 2;
                                            return (
                                                <g key={`${createdLevel ? `created-${createdLevel.id}` : `level-${level.id}`}-fish-${fish.id}`} className={fish.settled ? 'fish settled' : 'fish'} transform={`translate(${x} ${y}) rotate(${fishAngle(fish.dir)})`}>
                                                    <polygon points="-18,0 18,-12 18,12" fill={fish.settled ? '#48bb78' : '#8f4de2'} stroke={fish.settled ? '#2f855a' : '#5d239f'} strokeWidth={3} />
                                                    <circle cx="-8" cy="0" r="5" fill="#ffffff" />
                                                    <circle cx="-7" cy="0" r="2.5" fill="#1b1b1b" />
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </>
            )}

            <main className="rescue-stage">
                <aside className="whale-lane" aria-hidden="true">
                    <div className="whale-body">
                        <div className="whale-eye" />
                        <div className="whale-fin" />
                    </div>
                    <div className="bubble b1" />
                    <div className="bubble b2" />
                    <div className="bubble b3" />
                </aside>

                <section className="board-panel">
                    <svg key={`board-${createdLevel ? `created-${createdLevel.id}` : `level-${level.id}`}`} className="rescue-board" viewBox={`0 0 ${renderWidth * TILE} ${renderHeight * TILE}`} role="img" aria-label="Actor cage puzzle board">
                        <rect x={0} y={0} width={renderWidth * TILE} height={renderHeight * TILE} fill="#0c8fd4" rx={14} />

                        {Array.from({ length: renderHeight }).flatMap((_, y) =>
                            Array.from({ length: renderWidth }).map((__, x) => {
                                const key = tileKey(x, y);
                                if (!renderOccupiedSet.has(key) && !renderStaticBlockedSet.has(key)) {
                                    return null;
                                }

                                return (
                                    <rect
                                        key={`occ-${key}`}
                                        x={x * TILE + 4}
                                        y={y * TILE + 4}
                                        width={TILE - 8}
                                        height={TILE - 8}
                                        rx={8}
                                        className={renderCageBlockedSet.has(key) ? 'tile-cage-block' : renderObstacleSet.has(key) ? 'tile-occupied-obstacle' : 'tile-occupied-fish'}
                                    />
                                );
                            }),
                        )}

                        {renderCageCells.map((tile) => (
                            <g key={`safe-${tileKey(tile.x, tile.y)}`}>
                                <rect x={tile.x * TILE + 6} y={tile.y * TILE + 6} width={TILE - 12} height={TILE - 12} rx={8} className="tile-cage-safe" />
                                <line x1={tile.x * TILE + 12} y1={tile.y * TILE + 12} x2={tile.x * TILE + TILE - 12} y2={tile.y * TILE + TILE - 12} className="tile-cage-safe-line" strokeWidth={Math.max(1.5, renderVisuals.cageLineThickness * 0.35)} />
                            </g>
                        ))}

                        {renderFence.segments.map((segment) => {
                            const isDoorSegment = 'doorEdgeKeys' in renderFence
                                ? renderFence.doorEdgeKeys.has(edgeKey(segment))
                                : 'doorEdges' in renderFence && renderFence.doorEdges.some((door) => edgeKey(door) === edgeKey(segment));
                            if (isDoorSegment) {
                                return null;
                            }
                            const x1 = segment.kind === 'h' ? segment.x * TILE : segment.x * TILE;
                            const y1 = segment.kind === 'h' ? segment.y * TILE : segment.y * TILE;
                            const x2 = segment.kind === 'h' ? (segment.x + 1) * TILE : segment.x * TILE;
                            const y2 = segment.kind === 'h' ? segment.y * TILE : (segment.y + 1) * TILE;
                            return (
                                <line
                                    key={`wall-${edgeKey(segment)}`}
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    className="cage-fence"
                                    strokeWidth={renderVisuals.cageLineThickness}
                                />
                            );
                        })}

                        {(previewMode
                            ? (builderDoors.length > 0 ? builderDoors : (renderDoor.edge ? [renderDoor] : []))
                            : ((level.doors && level.doors.length > 0 ? level.doors : (renderDoor.edge ? [renderDoor] : [])))
                        ).map((door, index) => {
                            let doorForLeaf: any;
                            if ('side' in door) {
                                doorForLeaf = door;
                            } else {
                                doorForLeaf = {
                                    side: builderDoorSide,
                                    offset: builderDoorOffset,
                                    hinge: (door as any).hinge,
                                    opensToward: (door as any).opensToward,
                                    edge: (door as any).edge
                                };
                            }
                            const doorLeaf = getDoorLeafLine(doorForLeaf, TILE, doorOpenProgress);
                            if (!doorLeaf) {
                                return null;
                            }
                            return (
                                <line
                                    key={`door-preview-${index}`}
                                    x1={doorLeaf.x1}
                                    y1={doorLeaf.y1}
                                    x2={doorLeaf.x2}
                                    y2={doorLeaf.y2}
                                    className={doorOpenProgress > 0.02 ? 'cage-door-open' : 'cage-door-closed'}
                                    stroke={renderVisuals.doorColor}
                                    strokeWidth={renderVisuals.doorThickness}
                                />
                            );
                        })}

                        <g
                            className="door-switch"
                            onClick={onDoorSwitchClick}
                            transform={`translate(${renderDoorSwitchTile.x * TILE + TILE * 0.5} ${renderDoorSwitchTile.y * TILE + TILE * 0.5})`}
                        >
                            <rect x={-22} y={-14} width={44} height={28} rx={8} className="door-switch-body" />
                            <circle cx={12} cy={0} r={6} className={cageDoorOpen ? 'door-switch-led-on' : 'door-switch-led-off'} />
                            <text x={-11} y={4} className="door-switch-label">SW</text>
                        </g>

                        {[...new Set(
                            renderFence.segments.flatMap((segment) => {
                                if (segment.kind === 'h') {
                                    return [`${segment.x},${segment.y}`, `${segment.x + 1},${segment.y}`];
                                }
                                return [`${segment.x},${segment.y}`, `${segment.x},${segment.y + 1}`];
                            }),
                        )].map((pointKey) => {
                            const [px, py] = pointKey.split(',').map((value) => Number(value));
                            return <circle key={`cage-pole-${pointKey}`} cx={px * TILE} cy={py * TILE} r={renderVisuals.hedgeJointDiameter / 2} className="cage-pole" />;
                        })}

                        {renderObstacles.map((tile) => (
                            <rect key={`o-${tileKey(tile.x, tile.y)}`} x={tile.x * TILE + 10} y={tile.y * TILE + 10} width={TILE - 20} height={TILE - 20} rx={10} fill="#485f71" stroke="#1f2e3a" strokeWidth={2} />
                        ))}

                        <rect x={3} y={3} width={renderWidth * TILE - 6} height={renderHeight * TILE - 6} rx={12} fill="none" stroke="#8b3f1d" strokeWidth={7} />

                        {renderActors.map((fish) => {
                            const x = fish.x * TILE + TILE / 2;
                            const y = fish.y * TILE + TILE / 2;
                            return (
                                <g key={`${createdLevel ? `created-${createdLevel.id}` : `level-${level.id}`}-fish-${fish.id}`} className={fish.settled ? 'fish settled' : 'fish'} transform={`translate(${x} ${y}) rotate(${fishAngle(fish.dir)})`} onClick={previewMode ? undefined : () => onFishClick(fish.id)}>
                                    <polygon points="-18,0 18,-12 18,12" fill={fish.settled ? '#48bb78' : '#8f4de2'} stroke={fish.settled ? '#2f855a' : '#5d239f'} strokeWidth={3} />
                                    <circle cx="-8" cy="0" r="5" fill="#ffffff" />
                                    <circle cx="-7" cy="0" r="2.5" fill="#1b1b1b" />
                                </g>
                            );
                        })}
                    </svg>

                    <div className="board-message">{message}</div>
                    <div className="board-meta">
                        <span>Inside Cage: {rescued}/{fishList.length}</span>
                        <span>Cage Door: {cageDoorOpen ? 'Open' : 'Closed'}</span>
                        <span>Validator: {levelValidation.solvable ? `OK (${levelValidation.minSteps} steps)` : 'Invalid'}</span>
                        <span>Guide: {levelValidation.solutionActions.slice(0, 8).join(' -> ') || 'n/a'}</span>
                        {creatorInfo && <span>{creatorInfo}</span>}
                        <span>Round Score: {gameState.score}</span>
                    </div>
                </section>
            </main>

            <footer className="rescue-footer">
                <div className="timer-row">
                    <span>Whale Arrival</span>
                    <strong>{TIMER_PAUSED_FOR_DEBUG ? 'Paused (debug)' : `${timeLeftSec}s`}</strong>
                </div>
                <div className="timer-track" role="progressbar" aria-valuenow={Math.round(whaleProgress)} aria-valuemin={0} aria-valuemax={100}>
                    <div className="timer-fill" style={{ width: `${TIMER_PAUSED_FOR_DEBUG ? 0 : whaleProgress}%` }} />
                </div>
            </footer>

            {ENABLE_LEVEL_SELECTOR && levelOverlayOpen && (
                <div className="overlay">
                    <div className="modal-card">
                        <h3>Select Level</h3>
                        <p>Green cells are cage blockers. Actors stop before any occupied or blocked cell.</p>
                        <div className="modal-grid">
                            {playableLevels.map((item, idx) => {
                                const validation = validations[idx];
                                return (
                                    <button key={item.id} disabled={!validation.solvable} onClick={() => {
                                        if (!validation.solvable) {
                                            return;
                                        }
                                        resetLevel(idx);
                                        setMessage(`Level ${item.id} validated. Minimum solve depth: ${validation.minSteps}.`);
                                        setLevelOverlayOpen(false);
                                    }}>
                                        Level {item.id} {validation.solvable ? 'OK' : 'Invalid'}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {levelCompleteOpen && (
                <div className="overlay">
                    <div className="modal-card">
                        <h3>{createdLevel ? 'Generated Level Complete' : levelIndex < playableLevels.length - 1 ? 'Level Complete' : 'Mission Complete'}</h3>
                        <p>{createdLevel ? 'Validated generated level solved successfully.' : levelIndex < playableLevels.length - 1 ? 'All actors are inside. Continue to next level.' : 'All actors are inside in every level.'}</p>
                        {correctedLevelIds.length > 0 && <p>Auto-corrected levels: {correctedLevelIds.join(', ')}</p>}
                        <div className="modal-grid">
                            {createdLevel ? (
                                <button onClick={() => {
                                    onCreateLevel();
                                    setLevelCompleteOpen(false);
                                }}>
                                    Create Another
                                </button>
                            ) : levelIndex < playableLevels.length - 1 ? (
                                <button onClick={() => {
                                    resetLevel(levelIndex + 1);
                                    setLevelCompleteOpen(false);
                                }}>
                                    Next Level
                                </button>
                            ) : (
                                <button onClick={() => {
                                    resetLevel(0);
                                    setLevelOverlayOpen(true);
                                    setLevelCompleteOpen(false);
                                }}>
                                    Restart Campaign
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FishFenceCountRenderer;
