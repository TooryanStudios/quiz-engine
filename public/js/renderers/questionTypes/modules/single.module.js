import { createSingleRendererEntry } from '../single.js?v=122';

export const singleQuestionTypeModule = {
  id: 'single',
  aliases: [],
  timerPolicy: {
    kind: 'fixed',
  },
  createRendererEntry: createSingleRendererEntry,
};
