// Walkthrough section (#replay). The motion itself is CSS scroll-driven animation.
// This script only scales the stage to the viewport and, where scroll timelines are
// missing, writes scroll progress to --p so the same keyframes can be scrubbed.
(() => {
  const reel = document.querySelector('#replay .reel');
  if (!reel) return;
  const stage = reel.querySelector('.stage'), frame = reel.querySelector('.frame');
  // Scale the stage, then nudge the scaled frame onto whole device pixels (--ox/--oy) so its
  // layers are not drawn at half-pixel offsets. Runs at most once a frame, only on resize.
  let last = '', fr = 0;
  const fit = () => {
    fr = 0;
    const v = Math.min(innerWidth / 1260, innerHeight / 820, 1.3).toFixed(3);
    if (v !== last) { last = v; reel.style.setProperty('--fit', v); }
    if (!stage || !frame) return;
    reel.style.setProperty('--ox', '0px');
    reel.style.setProperty('--oy', '0px');
    const d = devicePixelRatio || 1, f = frame.getBoundingClientRect(), s = stage.getBoundingClientRect();
    const snap = n => (Math.round(n * d) - n * d) / d;
    reel.style.setProperty('--ox', snap(f.left).toFixed(3) + 'px');
    reel.style.setProperty('--oy', snap(f.top - s.top).toFixed(3) + 'px');
  };
  addEventListener('resize', () => { if (!fr) fr = requestAnimationFrame(fit); });
  addEventListener('load', fit);
  fit();
  if (CSS.supports('animation-timeline: view()')) return;
  let raf = 0, lastP = '';
  const tick = () => {
    raf = 0;
    const r = reel.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight))).toFixed(5);
    if (p !== lastP) { lastP = p; reel.style.setProperty('--p', p); }
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  addEventListener('resize', tick);
  tick();
})();
