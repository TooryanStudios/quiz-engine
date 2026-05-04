const fs = require('fs');

// --- PATCH MSEVideoSequencer.tsx ---
let msePath = 'src/components/MSEVideoSequencer.tsx';
let mseCode = fs.readFileSync(msePath, 'utf8');

mseCode = mseCode.replace(/export function MSEVideoSequencer\(\s*\{/, 'export const MSEVideoSequencer = React.forwardRef<MSEVideoSequencerHandle, MSEVideoSequencerProps>(({');
mseCode = mseCode.replace(/\}: MSEVideoSequencerProps\)\s*\{/, '}: MSEVideoSequencerProps, ref) => {');
mseCode = mseCode.replace(/type MSEVideoSequencerProps = \{/, 
\export interface MSEVideoSequencerHandle {
  play: () => Promise<void>;
  pause: () => void;
  rewind: () => void;
}

type MSEVideoSequencerProps = {
  onTimeUpdate?: (currentTime: number, duration: number) => void;\
);

let imp = \
  React.useImperativeHandle(ref, () => ({
    play: async () => {
      const v = getVideoEl(visibleVideoSlot);
      if (v) await v.play();
    },
    pause: () => {
      const v = getVideoEl(visibleVideoSlot);
      if (v) v.pause();
    },
    rewind: () => {
      const v = getVideoEl(visibleVideoSlot);
      if (v) try { v.currentTime = 0; } catch {}
    }
  }), [getVideoEl, visibleVideoSlot]);
\;

mseCode = mseCode.replace(/const handlePlayClick = async \(\) => \{/, imp + '\\n  const handlePlayClick = async () => {');
if(!mseCode.includes('import React')) mseCode = mseCode.replace(/import \{ useCallback/, 'import React, { useCallback');
mseCode = mseCode.replace(/\}\s*\)$/g, '  )\\n})');

// Add onTimeUpdate inside handleTimeUpdate wrapper
mseCode = mseCode.replace(/const handleTimeUpdate = \(event: Event\) => \{/, 
  \const handleTimeUpdate = (event: Event) => {
        const v = videos[activeSlot];
        if (onTimeUpdate && v) {
           onTimeUpdate(v.currentTime, v.duration);
        }\
);

if (mseCode.includes('export const MSEVideoSequencer = React.forwardRef')) {
  fs.writeFileSync(msePath, mseCode);
  console.log('Patched MSEVideoSequencer.tsx');
}



