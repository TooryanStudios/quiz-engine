class AudioSystemClass {
  constructor() {
    this.audioCtx = null;
    this.ambientOsc = null;
    
    // Create AudioContext only on first user gesture to comply with browser autoplay policies
    document.addEventListener('pointerdown', () => {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } else if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }, { once: true });
  }

  playClick() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  playSuccess() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
    osc.frequency.setValueAtTime(600, this.audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime + 0.2);
    osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, this.audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.6);
    
    osc.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.6);
  }

  playAmbient() {
    if (!this.audioCtx || this.ambientOsc) return;
    this.ambientOsc = this.audioCtx.createOscillator();
    this.ambientGain = this.audioCtx.createGain();
    
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.setValueAtTime(50, this.audioCtx.currentTime);
    
    this.ambientGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
    this.ambientGain.gain.linearRampToValueAtTime(0.05, this.audioCtx.currentTime + 2);
    
    this.ambientOsc.connect(this.ambientGain);
    this.ambientGain.connect(this.audioCtx.destination);
    
    this.ambientOsc.start();
  }

  stopAmbient() {
    if (this.ambientOsc && this.ambientGain) {
      this.ambientGain.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 1);
      this.ambientOsc.stop(this.audioCtx.currentTime + 1);
      this.ambientOsc = null;
    }
  }
}

export const AudioSystem = new AudioSystemClass();
