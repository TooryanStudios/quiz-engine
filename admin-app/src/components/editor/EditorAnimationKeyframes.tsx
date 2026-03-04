export function EditorAnimationKeyframes() {
  return (
    <style>{`
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes aiOrbit {
        0%   { transform: rotate(0deg)   translateX(52px) rotate(0deg); }
        100% { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
      }
      @keyframes aiOrbit2 {
        0%   { transform: rotate(120deg)  translateX(52px) rotate(-120deg); }
        100% { transform: rotate(480deg)  translateX(52px) rotate(-480deg); }
      }
      @keyframes aiOrbit3 {
        0%   { transform: rotate(240deg)  translateX(52px) rotate(-240deg); }
        100% { transform: rotate(600deg)  translateX(52px) rotate(-600deg); }
      }
      @keyframes aiBrain {
        0%, 100% { transform: scale(1) rotate(-4deg); }
        50%       { transform: scale(1.18) rotate(4deg); }
      }
      @keyframes aiFloat1 {
        0%   { transform: translateY(0px)   translateX(0px)  scale(1);   opacity: 0.7; }
        50%  { transform: translateY(-28px) translateX(10px) scale(1.2); opacity: 1; }
        100% { transform: translateY(-58px) translateX(-5px) scale(0.8); opacity: 0; }
      }
      @keyframes aiFloat2 {
        0%   { transform: translateY(0px)   translateX(0px)   scale(0.9); opacity: 0.6; }
        50%  { transform: translateY(-22px) translateX(-12px) scale(1.1); opacity: 1; }
        100% { transform: translateY(-50px) translateX(8px)   scale(0.7); opacity: 0; }
      }
      @keyframes aiFloat3 {
        0%   { transform: translateY(0px)   translateX(0px)  scale(1);   opacity: 0.5; }
        60%  { transform: translateY(-35px) translateX(16px) scale(1.3); opacity: 0.9; }
        100% { transform: translateY(-65px) translateX(-8px) scale(0.6); opacity: 0; }
      }
      @keyframes aiPulseRing {
        0%   { transform: scale(0.85); opacity: 0.6; }
        70%  { transform: scale(1.25); opacity: 0; }
        100% { transform: scale(1.25); opacity: 0; }
      }
      @keyframes aiShimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes aiDot {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
        40%            { transform: scale(1.2); opacity: 1; }
      }
      @keyframes aiMsgFade {
        0%   { opacity: 0; transform: translateY(8px); }
        15%  { opacity: 1; transform: translateY(0); }
        80%  { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-8px); }
      }
    `}</style>
  )
}