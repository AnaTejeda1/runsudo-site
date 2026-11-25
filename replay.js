// The pinned walkthrough uses CSS scroll timelines or, where needed, --p.
(() => {
  const reel = document.querySelector('#replay .reel');
  const motionStyles = document.getElementById('replay-motion');
  if (!reel || !motionStyles) return;
  const motion = matchMedia(motionStyles.media);
  const needsProgress = document.documentElement.classList.contains('no-sdt');
  const stage = reel.querySelector('.stage'), frame = reel.querySelector('.frame');
  // Scale the stage, then nudge the scaled frame onto whole device pixels (--ox/--oy) so its
  // layers are not drawn at half-pixel offsets.
  let last = '';
  const fit = () => {
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
  const showStoryboard = (progress) => {
    // Where caption ranges overlap, the one furthest inside its range is more visible.
    // Reading the CSS ranges also works between paints, while both captions are faded.
    let currentCaption = null, best = -Infinity;
    for (const caption of reel.querySelectorAll('.cap')) {
      const style = getComputedStyle(caption);
      const start = Number(style.getPropertyValue('--a'));
      const end = Number(style.getPropertyValue('--b'));
      const phase = (progress * 100 - start) / (end - start);
      const depth = Math.min(phase, 1 - phase);
      if (depth > best) {
        currentCaption = caption;
        best = depth;
      }
    }
    const top = currentCaption?.getBoundingClientRect().top;
    motionStyles.disabled = true;
    if (currentCaption) {
      scrollBy({ top: currentCaption.getBoundingClientRect().top - top, behavior: 'instant' });
    }
  };

  let raf = 0, needsFit = true, lastP = '';
  let previousY = null, previousTime = null, slowFrames = 0;
  const reset = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    previousY = previousTime = null;
    slowFrames = 0;
  };
  const tick = (now) => {
    raf = 0;
    if (needsFit) { fit(); needsFit = false; }
    const y = scrollY;
    if (y === previousY) { reset(); return; }
    const r = reel.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
    if (needsProgress) {
      const p = progress.toFixed(5);
      if (p !== lastP) { lastP = p; reel.style.setProperty('--p', p); }
    }
    if (r.top > 0 || r.bottom < innerHeight) { reset(); return; }

    slowFrames = previousTime !== null && now - previousTime > 80 ? slowFrames + 1 : 0;
    if (slowFrames === 3) { showStoryboard(progress); return; }
    previousY = y;
    previousTime = now;
    // Check the next rendered frame. A stationary frame ends the sample immediately,
    // so time spent reading a step never contributes to a slow-frame streak.
    raf = requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (!raf && !document.hidden && motion.matches && !motionStyles.disabled && motionStyles.sheet) {
      raf = requestAnimationFrame(tick);
    }
  };
  const refresh = () => {
    reset();
    needsFit = true;
    schedule();
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', refresh);
  addEventListener('load', refresh);
  addEventListener('pagehide', reset);
  addEventListener('pageshow', refresh);
  document.addEventListener('visibilitychange', refresh);
  motion.addEventListener('change', refresh);
  refresh();
})();
