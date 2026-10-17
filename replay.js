// Walkthrough section (#replay). The motion itself is CSS scroll-driven animation.
// This script only scales the stage to the viewport and, where scroll timelines are
// missing, writes scroll progress to --p so the same keyframes can be scrubbed.
(() => {
  const reel = document.querySelector('#replay .reel');
  if (!reel) return;
  const fit = () => reel.style.setProperty('--fit', Math.min(innerWidth / 1260, innerHeight / 820, 1.3).toFixed(4));
  addEventListener('resize', fit);
  fit();
  if (CSS.supports('animation-timeline: view()')) return;
  let raf = 0;
  const tick = () => {
    raf = 0;
    const r = reel.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    reel.style.setProperty('--p', p.toFixed(5));
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  addEventListener('resize', tick);
  tick();
})();
