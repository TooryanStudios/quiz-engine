import { createSingleRendererEntry } from '../single.js?v=121';

export const singleQuestionTypeModule = {
  id: 'single',
  aliases: [],
  timerPolicy: {
    kind: 'fixed',
  },
  createRendererEntry: createSingleRendererEntry,
};
