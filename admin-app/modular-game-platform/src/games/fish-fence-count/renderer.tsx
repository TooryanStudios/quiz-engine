import React from 'react';
import { Link } from 'react-router-dom';
import type { GameRendererProps } from '../../core/types';
import './renderer.css';
import levelsConfig from './levels.json';

type Direction = 'up' | 'down' | 'left' | 'right';
type CreatorDifficulty = 'easy' | 'medium' | 'hard';

type Tile = { x: number; y: number };

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
    timeLimitSec: number;
    width: number;
    height: number;
    fish: Array<{ id: number; x: number; y: number; dir: Direction }>;
    obstacles: Tile[];
    cageBlockedCells: Tile[];
    cageSafeCells: Tile[];
    doorSwitchTile: Tile;
    door: {
        side: 'left' | 'right' | 'top' | 'bottom';
        offset: number;
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

const TILE = 62;
const TIMER_PAUSED_FOR_DEBUG = true;
const KEEP_DOOR_OPEN_FOR_NOW = true;
const ALLOW_MANUAL_SWITCH_TOGGLE = true;
const ENABLE_LEVEL_SELECTOR = false;

const LEVELS: LevelSpec[] = levelsConfig as LevelSpec[];

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

function cageBounds(cageSafeCells: Tile[]): { minX: number; minY: number; maxX: number; maxY: number } {
    const xs = cageSafeCells.map((tile) => tile.x);
    const ys = cageSafeCells.map((tile) => tile.y);
    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
    };
}

function buildFish(level: LevelSpec): Fish[] {
    const safe = new Set(level.cageSafeCells.map((tile) => tileKey(tile.x, tile.y)));
    return level.fish.map((item) => ({ ...item, settled: safe.has(tileKey(item.x, item.y)) }));
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

function crossesClosedCageWall(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    door: LevelSpec['door'],
    doorOpen: boolean,
): boolean {
    const crossesLeft =
        (fromX === bounds.minX - 1 && toX === bounds.minX && fromY === toY && fromY >= bounds.minY && fromY <= bounds.maxY)
        || (fromX === bounds.minX && toX === bounds.minX - 1 && fromY === toY && fromY >= bounds.minY && fromY <= bounds.maxY);
    const crossesRight =
        (fromX === bounds.maxX + 1 && toX === bounds.maxX && fromY === toY && fromY >= bounds.minY && fromY <= bounds.maxY)
        || (fromX === bounds.maxX && toX === bounds.maxX + 1 && fromY === toY && fromY >= bounds.minY && fromY <= bounds.maxY);
    const crossesTop =
        (fromY === bounds.minY - 1 && toY === bounds.minY && fromX === toX && fromX >= bounds.minX && fromX <= bounds.maxX)
        || (fromY === bounds.minY && toY === bounds.minY - 1 && fromX === toX && fromX >= bounds.minX && fromX <= bounds.maxX);
    const crossesBottom =
        (fromY === bounds.maxY + 1 && toY === bounds.maxY && fromX === toX && fromX >= bounds.minX && fromX <= bounds.maxX)
        || (fromY === bounds.maxY && toY === bounds.maxY + 1 && fromX === toX && fromX >= bounds.minX && fromX <= bounds.maxX);

    const crossesBoundary = crossesLeft || crossesRight || crossesTop || crossesBottom;
    if (!crossesBoundary) {
        return false;
    }

    let doorCrossing = false;
    if (door.side === 'left' && crossesLeft && fromY === door.offset) {
        doorCrossing = true;
    }
    if (door.side === 'right' && crossesRight && fromY === door.offset) {
        doorCrossing = true;
    }
    if (door.side === 'top' && crossesTop && fromX === door.offset) {
        doorCrossing = true;
    }
    if (door.side === 'bottom' && crossesBottom && fromX === door.offset) {
        doorCrossing = true;
    }

    if (doorCrossing && doorOpen) {
        return false;
    }

    return true;
}

function slideFish(
    fish: Fish,
    level: LevelSpec,
    staticBlocked: Set<string>,
    fishList: Fish[],
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    doorOpen: boolean,
): Tile {
    const { dx, dy } = dirVector(fish.dir);
    let cursorX = fish.x;
    let cursorY = fish.y;

    while (true) {
        const probeX = cursorX + dx;
        const probeY = cursorY + dy;
        if (crossesClosedCageWall(cursorX, cursorY, probeX, probeY, bounds, level.door, doorOpen)) {
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
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    doorOpen: boolean,
): boolean {
    return fishList.some((fish) => {
        const target = slideFish(fish, level, staticBlocked, fishList, bounds, doorOpen);
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
    const bounds = cageBounds(level.cageSafeCells);
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

            const target = slideFish(candidate, level, staticBlocked, current.fishList, bounds, current.doorOpen);
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
    return {
        id: levelId,
        title: `Validated Fallback ${levelId}`,
        timeLimitSec: 240,
        width: 10,
        height: 6,
        fish: [
            { id: 1, x: 7, y: 3, dir: 'left' },
            { id: 2, x: 8, y: 3, dir: 'left' },
            { id: 3, x: 9, y: 3, dir: 'left' },
            { id: 4, x: 8, y: 4, dir: 'left' },
            { id: 5, x: 9, y: 4, dir: 'left' },
            { id: 6, x: 0, y: 4, dir: 'right' },
        ],
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

const FishFenceCountRenderer: React.FC<GameRendererProps> = ({ gameState, dispatch }) => {
    const { playableLevels, validations, correctedLevelIds } = React.useMemo(() => {
        // Keep campaign levels exactly as authored in JSON.
        // Validation is informational only in this phase and should not auto-replace user layouts.
        const nextValidations = LEVELS.map((item) => validateLevel(item, KEEP_DOOR_OPEN_FOR_NOW));
        return { playableLevels: LEVELS, validations: nextValidations, correctedLevelIds: [] as number[] };
    }, []);

    const [levelIndex, setLevelIndex] = React.useState(0);
    const [fishList, setFishList] = React.useState<Fish[]>(() => buildFish(playableLevels[0]));
    const [timeLeftSec, setTimeLeftSec] = React.useState(playableLevels[0].timeLimitSec);
    const [message, setMessage] = React.useState('Tap fish in sequence. They slide until blocked.');
    const [levelOverlayOpen, setLevelOverlayOpen] = React.useState(ENABLE_LEVEL_SELECTOR);
    const [levelCompleteOpen, setLevelCompleteOpen] = React.useState(false);
    const [failed, setFailed] = React.useState(false);
    const [muted, setMuted] = React.useState(false);
    const [cageDoorOpen, setCageDoorOpen] = React.useState(KEEP_DOOR_OPEN_FOR_NOW);
    const [createdLevel, setCreatedLevel] = React.useState<LevelSpec | null>(null);
    const [creatorInfo, setCreatorInfo] = React.useState('');
    const [creatorDifficulty, setCreatorDifficulty] = React.useState<CreatorDifficulty>('medium');

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
    const fishOccupiedSet = React.useMemo(() => new Set(fishList.map((f) => tileKey(f.x, f.y))), [fishList]);
    const bounds = React.useMemo(() => cageBounds(level.cageSafeCells), [level]);

    const resetLevel = React.useCallback((targetLevelIndex: number) => {
        const safeIndex = Math.max(0, Math.min(targetLevelIndex, playableLevels.length - 1));
        const nextLevel = playableLevels[safeIndex];
        setLevelIndex(safeIndex);
        setCreatedLevel(null);
        setCreatorInfo('');
        setFishList(buildFish(nextLevel));
        setTimeLeftSec(nextLevel.timeLimitSec);
        setMessage(`Level ${nextLevel.id}: move fish into the cage-safe cells only.`);
        setLevelCompleteOpen(false);
        setFailed(false);
        setCageDoorOpen(KEEP_DOOR_OPEN_FOR_NOW);
    }, [playableLevels]);

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
        if (levelOverlayOpen || levelCompleteOpen || failed || TIMER_PAUSED_FOR_DEBUG) {
            return;
        }

        if (timeLeftSec <= 0) {
            setFailed(true);
            setMessage('Time over. Whale reached the pond.');
            dispatch({ type: 'submit', success: false, note: 'Timer expired' });
            return;
        }

        const tick = window.setTimeout(() => {
            setTimeLeftSec((previous) => Math.max(0, previous - 1));
        }, 1000);

        return () => window.clearTimeout(tick);
    }, [dispatch, failed, levelCompleteOpen, levelOverlayOpen, timeLeftSec]);

    const onFishClick = (fishId: number) => {
        if (failed || levelCompleteOpen || levelOverlayOpen) {
            return;
        }

        setFishList((previous) => {
            const moving = previous.find((fish) => fish.id === fishId);
            if (!moving || moving.settled) {
                if (moving?.settled) {
                    setMessage(`Fish ${moving.id} is already inside cage and cannot be moved out.`);
                }
                return previous;
            }

            const target = slideFish(moving, level, staticBlockedSet, previous, bounds, cageDoorOpen);
            if (target.x === moving.x && target.y === moving.y) {
                setMessage(`Fish ${moving.id} cannot move; front cell is blocked.`);
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
                setMessage(`Fish ${movedFish.id} rescued into cage.`);
            } else {
                setMessage(`Fish ${fishId} stopped at cell (${target.x}, ${target.y}) before a blocker.`);
            }

            if (allSettled(nextFish)) {
                dispatch({ type: 'submit', success: true, note: `Level ${level.id} complete` });
                setMessage('All fish rescued.');
                setLevelCompleteOpen(true);
                if (!createdLevel && levelIndex < playableLevels.length - 1) {
                    dispatch({ type: 'advance', note: `Advance to level ${level.id + 1}` });
                }
                return nextFish;
            }

            if (!hasUsefulMoves(level, staticBlockedSet, nextFish, bounds, cageDoorOpen)) {
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
        setMessage('Door opened. Outside fish can now enter through the doorway.');
    };

    const closeDoor = () => {
        setCageDoorOpen(false);
        setMessage('Door closed. Fish cannot pass through cage walls.');
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
                    <span className="ui-pill">Door: {cageDoorOpen ? 'Open' : 'Closed'}</span>
                </div>
            </header>

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
                    <svg className="rescue-board" viewBox={`0 0 ${level.width * TILE} ${level.height * TILE}`} role="img" aria-label="Fish rescue puzzle board">
                        <rect x={0} y={0} width={level.width * TILE} height={level.height * TILE} fill="#0c8fd4" rx={14} />

                        {Array.from({ length: level.width + 1 }).map((_, idx) => (
                            <line key={`gv-${idx}`} x1={idx * TILE} y1={0} x2={idx * TILE} y2={level.height * TILE} stroke="#0f699f" strokeOpacity={0.58} strokeWidth={2} />
                        ))}
                        {Array.from({ length: level.height + 1 }).map((_, idx) => (
                            <line key={`gh-${idx}`} x1={0} y1={idx * TILE} x2={level.width * TILE} y2={idx * TILE} stroke="#0f699f" strokeOpacity={0.58} strokeWidth={2} />
                        ))}

                        {Array.from({ length: level.height }).flatMap((_, y) =>
                            Array.from({ length: level.width }).map((__, x) => (
                                <text key={`cell-id-${x}-${y}`} x={x * TILE + 6} y={y * TILE + 14} className="cell-index">
                                    {y * level.width + x + 1}
                                </text>
                            )),
                        )}

                        {Array.from({ length: level.height }).flatMap((_, y) =>
                            Array.from({ length: level.width }).map((__, x) => {
                                const key = tileKey(x, y);
                                if (!fishOccupiedSet.has(key) && !staticBlockedSet.has(key)) {
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
                                        className={cageBlockedSet.has(key) ? 'tile-cage-block' : obstacleSet.has(key) ? 'tile-occupied-obstacle' : 'tile-occupied-fish'}
                                    />
                                );
                            }),
                        )}

                        {level.cageSafeCells.map((tile) => (
                            <g key={`safe-${tileKey(tile.x, tile.y)}`}>
                                <rect x={tile.x * TILE + 6} y={tile.y * TILE + 6} width={TILE - 12} height={TILE - 12} rx={8} className="tile-cage-safe" />
                                <line x1={tile.x * TILE + 12} y1={tile.y * TILE + 12} x2={tile.x * TILE + TILE - 12} y2={tile.y * TILE + TILE - 12} className="tile-cage-safe-line" />
                            </g>
                        ))}

                        <rect
                            x={bounds.minX * TILE + 2}
                            y={bounds.minY * TILE + 2}
                            width={(bounds.maxX - bounds.minX + 1) * TILE - 4}
                            height={(bounds.maxY - bounds.minY + 1) * TILE - 4}
                            fill="none"
                            className="cage-fence"
                        />

                        <g
                            className="door-switch"
                            onClick={onDoorSwitchClick}
                            transform={`translate(${level.doorSwitchTile.x * TILE + TILE * 0.5} ${level.doorSwitchTile.y * TILE + TILE * 0.5})`}
                        >
                            <rect x={-22} y={-14} width={44} height={28} rx={8} className="door-switch-body" />
                            <circle cx={12} cy={0} r={6} className={cageDoorOpen ? 'door-switch-led-on' : 'door-switch-led-off'} />
                            <text x={-11} y={4} className="door-switch-label">SW</text>
                        </g>

                        <line
                            x1={bounds.minX * TILE + 2}
                            y1={(bounds.minY + 1) * TILE}
                            x2={bounds.minX * TILE + 2}
                            y2={(bounds.minY + 2) * TILE}
                            className={cageDoorOpen ? 'cage-door-open' : 'cage-door-closed'}
                        />

                        {[
                            { x: bounds.minX, y: bounds.minY },
                            { x: bounds.maxX + 1, y: bounds.minY },
                            { x: bounds.minX, y: bounds.maxY + 1 },
                            { x: bounds.maxX + 1, y: bounds.maxY + 1 },
                        ].map((pole, idx) => (
                            <circle key={`cage-pole-${idx}`} cx={pole.x * TILE} cy={pole.y * TILE} r={8} className="cage-pole" />
                        ))}

                        {level.obstacles.map((tile) => (
                            <rect key={`o-${tileKey(tile.x, tile.y)}`} x={tile.x * TILE + 10} y={tile.y * TILE + 10} width={TILE - 20} height={TILE - 20} rx={10} fill="#485f71" stroke="#1f2e3a" strokeWidth={2} />
                        ))}

                        <rect x={3} y={3} width={level.width * TILE - 6} height={level.height * TILE - 6} rx={12} fill="none" stroke="#8b3f1d" strokeWidth={7} />

                        {fishList.map((fish) => {
                            const x = fish.x * TILE + TILE / 2;
                            const y = fish.y * TILE + TILE / 2;
                            return (
                                <g key={`fish-${fish.id}`} className={fish.settled ? 'fish settled' : 'fish'} transform={`translate(${x} ${y}) rotate(${fishAngle(fish.dir)})`} onClick={() => onFishClick(fish.id)}>
                                    <ellipse cx={0} cy={0} rx={17} ry={12} fill="#8f4de2" stroke="#5d239f" strokeWidth={2} />
                                    <polygon points="17,0 28,-8 28,8" fill="#af85f0" stroke="#5d239f" strokeWidth={2} />
                                    <circle cx={-5} cy={-3} r={4} fill="#ffffff" />
                                    <circle cx={-4} cy={-3} r={1.9} fill="#1b1b1b" />
                                    <path d="M -9 8 L -2 5" stroke="#5d239f" strokeWidth={2} strokeLinecap="round" />
                                    <text x="0" y="5" textAnchor="middle" className="fish-index" transform={`rotate(${-fishAngle(fish.dir)})`}>
                                        {fish.id}
                                    </text>
                                </g>
                            );
                        })}
                    </svg>

                    <div className="board-message">{message}</div>
                    <div className="board-meta">
                        <span>Rescued: {rescued}/{fishList.length}</span>
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
                        <p>Green cells are cage blockers. Fish stop before any occupied or blocked cell.</p>
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
                        <p>{createdLevel ? 'Validated generated level solved successfully.' : levelIndex < playableLevels.length - 1 ? 'All fish are safe. Continue to next level.' : 'Every fish in all levels is rescued.'}</p>
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

            {failed && (
                <div className="overlay">
                    <div className="modal-card">
                        <h3>Mission Failed</h3>
                        <p>No useful moves remain, or timer expired.</p>
                        <div className="modal-grid">
                            <button onClick={() => createdLevel ? onCreateLevel() : resetLevel(levelIndex)}>
                                {createdLevel ? 'Create New Valid Level' : 'Retry Level'}
                            </button>
                            <button onClick={() => resetLevel(0)}>Back to Campaign</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FishFenceCountRenderer;
