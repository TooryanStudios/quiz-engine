import gsap from 'gsap';

export default {
  id: 'glowPulse',
  init(context, config) {
    const { target } = context;
    if (!target) return;

    this.tween = gsap.to(target, {
      opacity: 0.6,
      scale: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 0.8
    });
  },
  destroy() {
    if (this.tween) {
      this.tween.kill();
    }
  }
};
