import gsap from 'gsap';

export default {
  id: 'shakeObject',
  init(context, config) {
    const { target } = context;
    if (!target) return;

    gsap.fromTo(target, 
      { x: "-=5" }, 
      { x: "+=5", yoyo: true, repeat: 4, duration: 0.05, clearProps: "x" }
    );
  },
  destroy() {}
};
