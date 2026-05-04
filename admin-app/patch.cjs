const fs = require('fs');
let code = fs.readFileSync('src/components/MSEVideoSequencer.tsx', 'utf8');

code = code.replace(/export function MSEVideoSequencer\(\s*\{/g, 'export const MSEVideoSequencer = React.forwardRef<MSEVideoSequencerHandle, MSEVideoSequencerProps>(({');
code = code.replace(/\}: MSEVideoSequencerProps\) \{/g, '}: MSEVideoSequencerProps, ref) => {');

code = code.replace(/type MSEVideoSequencerProps = \{/g, 
export interface MSEVideoSequencerHandle {
  play: () => Promise<void>;
  pause: () => void;
  rewind: () => void;
  seekTo: (timeSec: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

type MSEVideoSequencerProps = {
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  
);

const imperativeHandle =   React.useImperativeHandle(ref, () => ({
    play: async () => {
      const video = getVideoEl(visibleVideoSlot)
      if (video) await video.play()
    },
    pause: () => {
      const video = getVideoEl(visibleVideoSlot)
      if (video) video.pause()
    },
    rewind: () => {
      const video = getVideoEl(visibleVideoSlot)
      if (video) {
        try { video.currentTime = 0 } catch {}
      }
    },
    seekTo: (timeSec: number) => {
      const video = getVideoEl(visibleVideoSlot)
      if (video) {
        try { video.currentTime = timeSec } catch {}
      }
    },
    getCurrentTime: () => {
      const video = getVideoEl(visibleVideoSlot)
      return video ? video.currentTime : 0
    },
    getDuration: () => {
      const video = getVideoEl(visibleVideoSlot)
      return video && Number.isFinite(video.duration) ? video.duration : 0
    }
  }), [getVideoEl, visibleVideoSlot])

;

code = code.replace(/const handlePlayClick/g, imperativeHandle + 'const handlePlayClick');

if (!code.includes('import React')) {
  code = code.replace(/import \{ useCallback/, 'import React, { useCallback');
}

code = code.replace(/\}\s*\)\s*\}\s*$/g, '  )\n})');

code = code.replace(/const handleTimeUpdate = \(event: Event\) => \{/g, 'const handleTimeUpdate = (event: Event) => {\n        if (onTimeUpdate && videos[activeSlot]) {\n          onTimeUpdate(videos[activeSlot].currentTime, videos[activeSlot].duration || 0);\n        }');

fs.writeFileSync('src/components/MSEVideoSequencer.tsx', code);
