import { DialogueSystem } from '../../systems/DialogueSystem.js';

export default {
  id: 'captionPanel',
  init(context, config) {
    const { scene } = context;
    const text = config && config.text ? config.text : context.text;
    if (text) {
      DialogueSystem.showCaption(scene, text);
    }
  },
  destroy() {
    DialogueSystem.hideCaption();
  }
};
