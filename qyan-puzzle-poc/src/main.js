import './styles/global.css';
import GameApp from './core/GameApp.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp('#app');
  app.mount();
});
