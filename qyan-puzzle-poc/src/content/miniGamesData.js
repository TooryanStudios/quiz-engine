export const miniGamesData = {
  MiniGameStagePart1: {
    bg: '/assets/images/valley-bg.svg',
    text: 'A wandering merchant has lost his balance scales.',
    puzzleType: 'click', 
    targetText: 'Hidden Scales',
    targetPosition: { left: '20%', top: '70%', w: '60px', h: '60px' },
    next: 'MiniGameStagePart2',
    color: '#FFD700'
  },
  MiniGameStagePart2: {
    bg: '/assets/images/chamber-bg.svg',
    text: 'A locked chest sits in the dark. Find the hidden key.',
    puzzleType: 'click', 
    targetText: 'Silver Key',
    targetPosition: { left: '70%', top: '80%', w: '60px', h: '30px' },
    collectItem: { id: 'silver_key', name: 'Silver Key', svg: '/assets/images/key-stone.svg' },
    next: 'MiniGameStagePart3',
    color: '#C0C0C0'
  },
  MiniGameStagePart3: {
    bg: '/assets/images/valley-bg.svg',
    text: 'A visual sequence lock...',
    puzzleType: 'visual_order', 
    items: [
      { id: 'star', svg: '/assets/images/shape-star.svg' },
      { id: 'circle', svg: '/assets/images/shape-circle.svg' },
      { id: 'square', svg: '/assets/images/shape-square.svg' }
    ],
    correctOrder: ['star', 'circle', 'square'], // Solution
    next: 'MiniGameStagePart4',
  },
  MiniGameStagePart4: {
    bg: '/assets/images/chamber-bg.svg',
    text: 'A secondary locked door needs the Silver Key you found.',
    puzzleType: 'use_item', 
    requireItem: 'silver_key',
    targetText: 'Drag Key Here',
    targetPosition: { left: '40%', top: '40%', w: '100px', h: '100px' },
    next: 'MiniGameStagePart5',
    color: '#8B4513'
  },
  MiniGameStagePart5: {
    bg: '/assets/images/valley-bg.svg',
    text: 'Arrange the symbols matching the constellation above.',
    puzzleType: 'visual_order', 
    items: [
      { id: 'triangle', svg: '/assets/images/shape-triangle.svg' },
      { id: 'star', svg: '/assets/images/shape-star.svg' },
      { id: 'square', svg: '/assets/images/shape-square.svg' },
      { id: 'circle', svg: '/assets/images/shape-circle.svg' }
    ],
    correctOrder: ['triangle', 'star', 'circle', 'square'],
    next: 'MiniGameStagePart6',
  },
  MiniGameStagePart6: {
    bg: '/assets/images/chamber-bg.svg',
    text: 'You found a dusty mirror. Clean it.',
    puzzleType: 'click', 
    targetText: 'Dust Cloth',
    targetPosition: { left: '50%', top: '30%', w: '80px', h: '60px' },
    collectItem: { id: 'cloth', name: 'Dust Cloth', svg: '/assets/images/shape-square.svg' },
    next: 'MiniGameStagePart7',
    color: '#aaa'
  },
  MiniGameStagePart7: {
    bg: '/assets/images/valley-bg.svg',
    text: 'The mirror reflects nothing. It must be wiped down.',
    puzzleType: 'use_item', 
    requireItem: 'cloth',
    targetText: 'Drag Cloth Here',
    targetPosition: { left: '80%', top: '50%', w: '120px', h: '120px' },
    next: 'MiniGameStagePart8',
    color: '#000'
  },
  MiniGameStagePart8: {
    bg: '/assets/images/chamber-bg.svg',
    text: 'Align the crests to open the heavy portcullis.',
    puzzleType: 'visual_order', 
    items: [
      { id: 'star', svg: '/assets/images/shape-star.svg' },
      { id: 'triangle', svg: '/assets/images/shape-triangle.svg' },
      { id: 'square', svg: '/assets/images/shape-square.svg' }
    ],
    correctOrder: ['square', 'star', 'triangle'],
    next: 'MiniGameStagePart9',
  },
  MiniGameStagePart9: {
    bg: '/assets/images/valley-bg.svg',
    text: 'The exit is blocked by rubble.',
    puzzleType: 'click', 
    targetText: 'Move Rubble',
    targetPosition: { left: '50%', top: '80%', w: '120px', h: '60px' },
    next: 'MiniGameStagePart10',
    color: '#666'
  },
  MiniGameStagePart10: {
    bg: '/assets/images/chamber-bg.svg',
    text: 'A glowing teleporter awaits you!',
    puzzleType: 'click', 
    targetText: 'Enter Portal',
    targetPosition: { left: '50%', top: '50%', w: '100px', h: '100px' },
    next: 'EndingScene',
    color: '#00FA9A'
  }
};
