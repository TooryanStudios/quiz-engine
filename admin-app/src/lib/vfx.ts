export type VFXType = 
  | 'confetti' 
  | 'fireworks' 
  | 'sparkle' 
  | 'shake' 
  | 'flash'
  | 'floatText'
  | 'particleBurst';

export interface VFXConfig {
  type: VFXType;
  duration?: number;
  intensity?: number;
  color?: string | string[];
  position?: { x: number; y: number };
  payload?: any; // e.g., text for floatText
}

export type VFXTrigger = (config: VFXConfig) => void;

class VFXManager {
  private handlers = new Set<VFXTrigger>();

  subscribe(handler: VFXTrigger) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  trigger(config: VFXConfig) {
    this.handlers.forEach(handler => handler(config));
  }

  // Helper methods for common vfxs
  confetti(config: Partial<VFXConfig> = {}) {
    this.trigger({ type: 'confetti', duration: 2000, ...config });
  }

  floatText(text: string, x: number, y: number, color: string = '#ffffff') {
    this.trigger({ 
      type: 'floatText', 
      position: { x, y }, 
      color, 
      payload: { text },
      duration: 1000 
    });
  }

  shake(intensity: number = 5, duration: number = 500) {
    this.trigger({ type: 'shake', intensity, duration });
  }
}

export const vfx = new VFXManager();
