export const sceneData = {
  StoryScene01: {
    id: 'story-scene-01',
    next: 'PuzzleScene01',
    hotspots: [
      { id: 'rope', x: 820, y: 180, width: 90, height: 180, plugin: 'clickReveal' },
      { id: 'bucket', x: 260, y: 470, width: 120, height: 100, plugin: 'clickReveal' },
      { id: 'symbol-stone', x: 560, y: 330, width: 100, height: 100, plugin: 'glowPulse' }
    ]
  },
  StoryScene02: {
    id: 'story-scene-02',
    next: 'PuzzleScene02'
  }
};
