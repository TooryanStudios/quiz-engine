/**
 * BossRenderer.js
 * Handles boss battle questions (single choice + HP bar)
 */

import { SingleChoiceRenderer } from './SingleChoiceRenderer.js';
import { state } from '../state/GameState.js';
import { safeGet, safeSetDisplay } from '../utils/dom.js';

export class BossRenderer extends SingleChoiceRenderer {
  /**
   * Render player view (interactive)
   */
  render() {
    // Render as single choice
    super.render();
    
    // Add boss panel
    state.currentBoss = this.question.boss || null;
    this.updateBossPanel('player', this.question.boss);
    safeSetDisplay('player-boss-panel', 'block');
  }
  
  /**
   * Render host view (non-interactive display)
   */
  renderHost() {
    // Render options as single choice
    super.renderHost();
    
    // Add boss panel
    state.currentBoss = this.question.boss || null;
    this.updateBossPanel('host', this.question.boss);
    safeSetDisplay('host-boss-panel', 'block');
  }
  
  /**
   * Update boss HP panel
   */
  updateBossPanel(prefix, boss) {
    const nameEl = safeGet(`${prefix}-boss-name`);
    const hpEl = safeGet(`${prefix}-boss-hp`);
    const fillEl = safeGet(`${prefix}-boss-bar-fill`);
    
    if (!nameEl || !hpEl || !fillEl || !boss) return;
    
    const maxHp = Math.max(1, Number(boss.maxHp) || 100);
    const remainingHp = Math.max(0, Number(boss.remainingHp) || maxHp);
    const pct = Math.max(0, Math.min(100, Math.round((remainingHp / maxHp) * 100)));
    
    nameEl.textContent = boss.name || 'Tooryan Boss';
    hpEl.textContent = `${remainingHp} / ${maxHp}`;
    fillEl.style.width = `${pct}%`;
  }
}
