import { SaveState } from '../core/SaveState.js';
import EventBus from '../core/EventBus.js';
import { puzzleData } from '../content/puzzleData.js';

export const PuzzleStateSystem = {
  completePuzzle(puzzleId) {
    if (!SaveState.solvedPuzzles.includes(puzzleId)) {
      SaveState.solvedPuzzles.push(puzzleId);
      EventBus.emit('puzzle-solved', puzzleId);
    }
  },

  isPuzzleComplete(puzzleId) {
    return SaveState.solvedPuzzles.includes(puzzleId);
  },

  tryCompletePuzzle01() {
    this.completePuzzle('puzzle-01');
    SaveState.setFlag('keyStoneFound', true);
  },

  tryCompletePuzzle02(currentSequence) {
    const target = puzzleData.puzzle02.targetSequence;
    const isMatch = currentSequence.every((val, index) => val === target[index]);
    
    if (isMatch) {
      this.completePuzzle('puzzle-02');
      SaveState.setFlag('gateUnlocked', true);
      return true;
    }
    return false;
  }
};
