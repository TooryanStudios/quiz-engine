import { fishFenceCountLevels } from './fishFenceCountLevels.js?v=1';

const FISH_FENCE_STYLE_ID = 'fish-fence-count-style';

function ensureFishFenceStyles() {
  if (document.getElementById(FISH_FENCE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FISH_FENCE_STYLE_ID;
  style.textContent = `
    .fish-fence-shell {
      position: fixed;
      inset: 0;
      z-index: 1200;
      width: 100vw;
      height: 100dvh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      background: #0a1f3a;
      padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left));
      box-sizing: border-box;
      border-radius: 0;
      gap: 10px;
    }
    .fish-fence-hud {
      display: flex;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 10px;
      font-family: sans-serif;
      font-weight: bold;
      color: #1f2e3a;
    }
    .fish-fence-svg {
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      max-height: none;
      background: #0c8fd4;
      border-radius: 14px;
      user-select: none;
    }
    .tile-occupied-fish { fill: rgba(143, 77, 226, 0.2); }
    .tile-occupied-obstacle { fill: rgba(72, 95, 113, 0.4); }
    .tile-cage-block { fill: rgba(220, 53, 69, 0.3); }
    .tile-cage-safe { fill: #8be1a7; stroke: #2f855a; stroke-width: 2; }
    .cage-fence { stroke: #8b3f1d; stroke-linecap: round; }
    .cage-door-open { stroke: #ff7a00; stroke-linecap: round; }
    .cage-door-closed { stroke: #ff7a00; stroke-linecap: round; }
    .door-switch-body { fill: #20658f; stroke: #133f5a; stroke-width: 2; }
    .door-switch-led-on { fill: #22c55e; }
    .door-switch-led-off { fill: #dc3545; }
    .door-switch-label { fill: #fff; font-size: 10px; font-family: sans-serif; font-weight: bold; }
    .cage-pole { fill: #8b3f1d; }
    .fish { cursor: pointer; transition: transform 0.2s; }
    .fish:hover { filter: brightness(1.1); }
    .fish.settled polygon { fill: #48bb78; stroke: #2f855a; }
    .fish-message {
      margin-top: 10px;
      padding: 10px;
      background: #fff;
      border-radius: 8px;
      width: 100%;
      text-align: center;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .fish-modal {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      z-index: 10;
    }
    .fish-modal-content {
      background: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      max-width: 80%;
    }
    .fish-btn {
      margin-top: 15px;
      padding: 10px 20px;
      background: #0c8fd4;
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    }
    .fish-btn:hover { background: #0a7ab5; }
    @media (max-width: 560px) {
      .fish-fence-shell {
        padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
        gap: 8px;
      }
    }
  `;
  document.head.appendChild(style);
}

function tileKey(x, y) { return `${x},${y}`; }

function dirVector(dir) {
  switch (dir) {
    case 'up': return { dx: 0, dy: -1 };
    case 'down': return { dx: 0, dy: 1 };
    case 'left': return { dx: -1, dy: 0 };
    case 'right': return { dx: 1, dy: 0 };
    default: return { dx: 0, dy: 0 };
  }
}

function fishAngle(dir) {
  switch (dir) {
    case 'left': return 0;
    case 'right': return 180;
    case 'up': return 90;
    case 'down': return 270;
    default: return 0;
  }
}

function inBounds(x, y, width, height) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function stepEdge(fromX, fromY, toX, toY) {
  if (toX === fromX + 1 && toY === fromY) return { kind: 'v', x: toX, y: fromY };
  if (toX === fromX - 1 && toY === fromY) return { kind: 'v', x: fromX, y: fromY };
  if (toY === fromY + 1 && toX === fromX) return { kind: 'h', x: fromX, y: toY };
  if (toY === fromY - 1 && toX === fromX) return { kind: 'h', x: fromX, y: fromY };
  return null;
}

function edgeKey(edge) { return `${edge.kind}:${edge.x},${edge.y}`; }

function boundarySegmentsFromCageCells(cageSafeCells) {
  const safe = new Set(cageSafeCells.map(t => tileKey(t.x, t.y)));
  const segments = [];
  cageSafeCells.forEach(t => {
    const { x, y } = t;
    if (!safe.has(tileKey(x - 1, y))) segments.push({ kind: 'v', x, y });
    if (!safe.has(tileKey(x + 1, y))) segments.push({ kind: 'v', x: x + 1, y });
    if (!safe.has(tileKey(x, y - 1))) segments.push({ kind: 'h', x, y });
    if (!safe.has(tileKey(x, y + 1))) segments.push({ kind: 'h', x, y: y + 1 });
  });
  
  const dedup = new Map();
  segments.forEach(seg => dedup.set(edgeKey(seg), seg));
  return Array.from(dedup.values());
}

function buildFence(level) {
  const segments = boundarySegmentsFromCageCells(level.cageSafeCells);
  let doorEdge = level.door.edge;
  
  if (!doorEdge) {
    const xs = level.cageSafeCells.map(t => t.x);
    const ys = level.cageSafeCells.map(t => t.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    
    if (level.door.side === 'left') doorEdge = { kind: 'v', x: minX, y: level.door.offset };
    else if (level.door.side === 'right') doorEdge = { kind: 'v', x: maxX + 1, y: level.door.offset };
    else if (level.door.side === 'top') doorEdge = { kind: 'h', x: level.door.offset, y: minY };
    else doorEdge = { kind: 'h', x: level.door.offset, y: maxY + 1 };
    
    const candidateKey = edgeKey(doorEdge);
    if (!segments.some(seg => edgeKey(seg) === candidateKey)) {
      doorEdge = null;
    }
  }

  return {
    segments,
    wallSet: new Set(segments.map(edgeKey)),
    doorEdgeKeys: new Set(doorEdge ? [edgeKey(doorEdge)] : [])
  };
}

function crossesClosedCageWall(fromX, fromY, toX, toY, fence, doorOpen) {
  const crossed = stepEdge(fromX, fromY, toX, toY);
  if (!crossed) return false;
  const crossedKey = edgeKey(crossed);
  if (!fence.wallSet.has(crossedKey)) return false;
  if (doorOpen && fence.doorEdgeKeys.has(crossedKey)) return false;
  return true;
}

function blocksByCellOccupancy(x, y, movingId, level, staticBlocked, fishList) {
  if (!inBounds(x, y, level.width, level.height)) return true;
  if (staticBlocked.has(tileKey(x, y))) return true;
  return fishList.some(fish => fish.id !== movingId && fish.x === x && fish.y === y);
}

function slideFish(fish, level, staticBlocked, fishList, fence, doorOpen) {
  const { dx, dy } = dirVector(fish.dir);
  let cursorX = fish.x;
  let cursorY = fish.y;

  while (true) {
    const probeX = cursorX + dx;
    const probeY = cursorY + dy;
    if (crossesClosedCageWall(cursorX, cursorY, probeX, probeY, fence, doorOpen)) break;
    if (blocksByCellOccupancy(probeX, probeY, fish.id, level, staticBlocked, fishList)) break;
    cursorX = probeX;
    cursorY = probeY;
  }

  return { x: cursorX, y: cursorY };
}

function allSettled(fishList) {
  return fishList.every(fish => fish.settled);
}

function hasUsefulMoves(level, staticBlocked, fishList, fence, doorOpen) {
  return fishList.some(fish => {
    const target = slideFish(fish, level, staticBlocked, fishList, fence, doorOpen);
    return target.x !== fish.x || target.y !== fish.y;
  });
}

function buildFish(level) {
  const safe = new Set(level.cageSafeCells.map(t => tileKey(t.x, t.y)));
  return level.fish.map(item => ({ ...item, settled: safe.has(tileKey(item.x, item.y)) }));
}

function renderFishFenceView({ state, socket, isHostOnly }) {
  ensureFishFenceStyles();
  
  const TILE = 62;
  const viewPrefix = isHostOnly ? 'host' : 'player';
  const gridEl = document.getElementById(`${viewPrefix}-options-grid`);
  if (!gridEl) return false;

  let levelIndex = 0;
  let level = fishFenceCountLevels[levelIndex];
  let fishList = buildFish(level);
  let doorOpen = true;
  let message = 'Tap an actor in sequence. It slides until blocked.';
  let score = 0;
  
  const shell = document.createElement('div');
  shell.className = 'fish-fence-shell';
  gridEl.innerHTML = '';
  gridEl.appendChild(shell);

  let svgRoot = null;
  let hudEl = null;
  let msgEl = null;
  
  function getStaticBlocked() {
    const set = new Set();
    level.obstacles.forEach(t => set.add(tileKey(t.x, t.y)));
    level.cageBlockedCells.forEach(t => set.add(tileKey(t.x, t.y)));
    return set;
  }
  
  function getCageSafeSet() {
    return new Set(level.cageSafeCells.map(t => tileKey(t.x, t.y)));
  }

  function advanceLevel() {
    levelIndex++;
    if (levelIndex < fishFenceCountLevels.length) {
      level = fishFenceCountLevels[levelIndex];
      fishList = buildFish(level);
      doorOpen = true;
      message = `Level ${level.id}: move actors into the cage.`;
      draw();
    } else {
      showModal('Mission Complete', 'All actors rescued!');
      if (!isHostOnly) {
        socket.emit('player:answer', {
          answer: { action: 'level_complete', score }
        });
      }
    }
  }

  function onFishClick(fishId) {
    if (isHostOnly) return;
    
    const moving = fishList.find(f => f.id === fishId);
    if (!moving || moving.settled) {
      message = moving?.settled ? 'Actor is already inside cage.' : '';
      draw();
      return;
    }

    const fence = buildFence(level);
    const staticBlocked = getStaticBlocked();
    const safeSet = getCageSafeSet();
    const target = slideFish(moving, level, staticBlocked, fishList, fence, doorOpen);
    
    if (target.x === moving.x && target.y === moving.y) {
      message = 'Actor cannot move; front cell is blocked.';
      draw();
      return;
    }

    fishList = fishList.map(fish => {
      if (fish.id !== fishId) return fish;
      return { ...fish, x: target.x, y: target.y, settled: safeSet.has(tileKey(target.x, target.y)) };
    });

    const moved = fishList.find(f => f.id === fishId);
    if (moved.settled) message = 'Actor entered cage.';
    else message = `Actor stopped at (${target.x}, ${target.y}).`;

    if (allSettled(fishList)) {
      score += 100;
      showModal('Level Complete', 'All actors inside!');
    } else if (!hasUsefulMoves(level, staticBlocked, fishList, fence, doorOpen)) {
      showModal('Level Locked', 'No useful moves remain!', () => {
        fishList = buildFish(level);
        draw();
      });
    } else {
      draw();
    }
  }

  function showModal(title, text, onAction = advanceLevel) {
    const modal = document.createElement('div');
    modal.className = 'fish-modal';
    const content = document.createElement('div');
    content.className = 'fish-modal-content';
    
    content.innerHTML = `
      <h2>${title}</h2>
      <p>${text}</p>
    `;
    const btn = document.createElement('button');
    btn.className = 'fish-btn';
    btn.textContent = 'Continue';
    btn.onclick = () => {
      modal.remove();
      onAction();
    };
    if (!isHostOnly) content.appendChild(btn);
    modal.appendChild(content);
    shell.appendChild(modal);
  }

  function drawDoorLeaf(door, progress) {
    if (!door) return '';
    const swing = {
      left: { dx: 1, dy: 0 }, right: { dx: -1, dy: 0 },
      top: { dx: 0, dy: 1 }, bottom: { dx: 0, dy: -1 }
    }[door.side];
    
    if (!swing || !door.edge) return '';
    
    let x1, y1, closedX2, closedY2;
    if (door.edge.kind === 'v') {
      const hingeTop = door.hinge !== 'bottom';
      x1 = door.edge.x * TILE;
      y1 = hingeTop ? door.edge.y * TILE : (door.edge.y + 1) * TILE;
      closedX2 = x1;
      closedY2 = hingeTop ? (door.edge.y + 1) * TILE : door.edge.y * TILE;
    } else {
      const hingeLeft = door.hinge !== 'right';
      x1 = hingeLeft ? door.edge.x * TILE : (door.edge.x + 1) * TILE;
      y1 = door.edge.y * TILE;
      closedX2 = hingeLeft ? (door.edge.x + 1) * TILE : door.edge.x * TILE;
      closedY2 = y1;
    }
    
    const openX2 = x1 + swing.dx * TILE;
    const openY2 = y1 + swing.dy * TILE;
    
    const x2 = closedX2 + (openX2 - closedX2) * progress;
    const y2 = closedY2 + (openY2 - closedY2) * progress;
    
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${progress > 0.02 ? 'cage-door-open' : 'cage-door-closed'}" stroke-width="6" />`;
  }

  function draw() {
    shell.innerHTML = '';
    
    hudEl = document.createElement('div');
    hudEl.className = 'fish-fence-hud';
    hudEl.innerHTML = `
      <span>Level ${levelIndex + 1} / ${fishFenceCountLevels.length}</span>
      <span>Score: ${score}</span>
    `;
    shell.appendChild(hudEl);

    svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgRoot.setAttribute('class', 'fish-fence-svg');
    svgRoot.setAttribute('viewBox', `0 0 ${level.width * TILE} ${level.height * TILE}`);
    
    let svgContent = `<rect x="0" y="0" width="${level.width * TILE}" height="${level.height * TILE}" fill="#0c8fd4" rx="14" />`;
    
    // Background Grid & Obstacles
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const key = tileKey(x, y);
        let occClass = '';
        if (level.obstacles.some(t => t.x === x && t.y === y)) occClass = 'tile-occupied-obstacle';
        else if (level.cageBlockedCells.some(t => t.x === x && t.y === y)) occClass = 'tile-cage-block';
        else if (fishList.some(f => f.x === x && f.y === y)) occClass = 'tile-occupied-fish';
        
        if (occClass) {
          svgContent += `<rect x="${x * TILE + 4}" y="${y * TILE + 4}" width="${TILE - 8}" height="${TILE - 8}" rx="8" class="${occClass}" />`;
        }
      }
    }

    // Cage safe cells
    level.cageSafeCells.forEach(t => {
      svgContent += `
        <g>
          <rect x="${t.x * TILE + 6}" y="${t.y * TILE + 6}" width="${TILE - 12}" height="${TILE - 12}" rx="8" class="tile-cage-safe" />
          <line x1="${t.x * TILE + 12}" y1="${t.y * TILE + 12}" x2="${t.x * TILE + TILE - 12}" y2="${t.y * TILE + TILE - 12}" class="tile-cage-safe-line" stroke="#2f855a" stroke-width="2" />
        </g>
      `;
    });

    // Fence
    const fence = buildFence(level);
    fence.segments.forEach(seg => {
      if (fence.doorEdgeKeys.has(edgeKey(seg))) return;
      const x1 = seg.kind === 'h' ? seg.x * TILE : seg.x * TILE;
      const y1 = seg.kind === 'h' ? seg.y * TILE : seg.y * TILE;
      const x2 = seg.kind === 'h' ? (seg.x + 1) * TILE : seg.x * TILE;
      const y2 = seg.kind === 'h' ? seg.y * TILE : (seg.y + 1) * TILE;
      svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="cage-fence" stroke-width="7" />`;
    });

    // Door Switch
    const st = level.doorSwitchTile;
    svgContent += `
      <g class="door-switch" transform="translate(${st.x * TILE + TILE/2}, ${st.y * TILE + TILE/2})" style="cursor: pointer;">
        <rect x="-22" y="-14" width="44" height="28" rx="8" class="door-switch-body" />
        <circle cx="12" cy="0" r="6" class="${doorOpen ? 'door-switch-led-on' : 'door-switch-led-off'}" />
        <text x="-11" y="4" class="door-switch-label">SW</text>
      </g>
    `;

    // Door Leaf
    const doorEdge = Array.from(fence.doorEdgeKeys)[0];
    if (doorEdge) {
      const [kind, coords] = doorEdge.split(':');
      const [x, y] = coords.split(',').map(Number);
      const doorConfig = { ...level.door, hinge: level.door.hinge || level.door.side, edge: { kind, x, y } };
      svgContent += drawDoorLeaf(doorConfig, doorOpen ? 1 : 0);
    }

    svgRoot.innerHTML = svgContent;

    // Fish
    fishList.forEach(fish => {
      const fx = fish.x * TILE + TILE / 2;
      const fy = fish.y * TILE + TILE / 2;
      const ang = fishAngle(fish.dir);
      const fishGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      fishGroup.setAttribute('class', fish.settled ? 'fish settled' : 'fish');
      fishGroup.setAttribute('transform', `translate(${fx}, ${fy}) rotate(${ang})`);
      fishGroup.innerHTML = `
        <polygon points="-18,0 18,-12 18,12" fill="#8f4de2" stroke="#5d239f" stroke-width="3" />
        <circle cx="-8" cy="0" r="5" fill="#ffffff" />
        <circle cx="-7" cy="0" r="2.5" fill="#1b1b1b" />
      `;
      fishGroup.onclick = () => onFishClick(fish.id);
      svgRoot.appendChild(fishGroup);
    });
    
    // Wire up door switch click manually since we set innerHTML
    const switchEl = svgRoot.querySelector('.door-switch');
    if (switchEl && !isHostOnly) {
      switchEl.onclick = () => {
        doorOpen = !doorOpen;
        draw();
      };
    }

    shell.appendChild(svgRoot);

    msgEl = document.createElement('div');
    msgEl.className = 'fish-message';
    msgEl.textContent = message;
    shell.appendChild(msgEl);
  }

  draw();
  return true;
}

export const fishFenceCountRuntime = {
  id: 'fish-fence-count',

  onGameStart({ state }) {
    if (typeof document === 'undefined') return false;
    
    // Hide default quiz chrome
    ['player-q-progress', 'host-q-progress', 'player-q-difficulty', 'host-q-difficulty'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    ['player-question-text', 'host-question-text'].forEach((id) => {
      const textEl = document.getElementById(id);
      if (!textEl) return;
      const wrapper = textEl.parentElement;
      if (wrapper) wrapper.style.display = 'none';
    });

    return false;
  },

  onGameQuestion({ data, state, socket, showView }) {
    const isHostOnly = state.role === 'host' && !state.hostIsPlayer;
    showView(isHostOnly ? 'view-host-question' : 'view-player-question');
    return renderFishFenceView({ state, socket, isHostOnly });
  },

  onQuestionEnd() {
    return false;
  },

  onLeaderboard() {
    return false;
  },

  onGameOver() {
    return false;
  }
};
