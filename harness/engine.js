/* /harness/engine.js — scroll story engine for runsudo.dev/harness/.
 *
 * No build step, no dependencies. One rAF loop. Animates transform / opacity / filter only.
 *
 *   Harness.registerScene({ id, mount(root, api), update(p, api), pause?, camera?, travel?, light?, radius?, numeral? })
 *
 * World units are CSS px. Axes: +x right, +y down, +z toward the viewer (CSS convention).
 * Each scene lives in its <section class="scene" data-scene="ID">, which the engine places at the
 * scene's world anchor (LAYOUT[].pos / .rot). mount() receives `root`, a zero-size preserve-3d
 * container whose origin is that anchor; build everything inside it with api.plane()/api.group().
 * update(p, api) is called with local progress p in 0..1 (dwell included) whenever p changes.
 *
 * See /harness/STORYBOARD.md for the per-scene layout, camera path and captions.
 */
(() => {
  'use strict';

  const D = document;
  const R = D.documentElement;
  const qs = new URLSearchParams(location.search);
  const mqReduced = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  const REDUCED = !!(mqReduced && mqReduced.matches);
  const MOTION = !REDUCED && qs.get('static') !== '1' && typeof DOMMatrix === 'function';
  R.classList.toggle('h-motion', MOTION);

  /* ------------------------------------------------------------------ math + easing */

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const range = (v, a, b) => (a === b ? (v >= b ? 1 : 0) : clamp((v - a) / (b - a)));
  const PI = Math.PI;

  const ease = {
    linear: (t) => t,
    inQuad: (t) => t * t,
    outQuad: (t) => 1 - (1 - t) * (1 - t),
    inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: (t) => t * t * t,
    outCubic: (t) => 1 - Math.pow(1 - t, 3),
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: (t) => t * t * t * t,
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: (t) => 1 - Math.pow(1 - t, 5),
    inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    inSine: (t) => 1 - Math.cos((t * PI) / 2),
    outSine: (t) => Math.sin((t * PI) / 2),
    inOutSine: (t) => -(Math.cos(PI * t) - 1) / 2,
    outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    inOutCirc: (t) => (t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inOutBack: (t, s = 1.70158 * 1.525) =>
      t < 0.5 ? (Math.pow(2 * t, 2) * ((s + 1) * 2 * t - s)) / 2 : (Math.pow(2 * t - 2, 2) * ((s + 1) * (t * 2 - 2) + s) + 2) / 2,
    smooth: (t) => t * t * (3 - 2 * t),
    smoother: (t) => t * t * t * (t * (t * 6 - 15) + 10),
    /* Damped-spring step response used as an easing: overshoots once and settles. zeta<1 bouncier. */
    spring: (t, zeta = 0.52, omega = 13) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      const wd = omega * Math.sqrt(1 - zeta * zeta);
      return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
    },
    /* Gentle spring with almost no overshoot. */
    softSpring: (t) => ease.spring(t, 0.82, 11),
  };

  /* Critically damped smoothing (stateless step). state = {v}. Returns new value. */
  function damp(cur, target, state, smoothTime, dt) {
    const omega = 2 / Math.max(1e-4, smoothTime);
    const x = omega * dt;
    const e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const change = cur - target;
    const temp = (state.v + omega * change) * dt;
    state.v = (state.v - omega * temp) * e;
    return target + (change + temp) * e;
  }

  /* Deterministic PRNG (mulberry32) so screenshots are stable. */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ storyboard layout */
  /* Camera keys are scene-local: x/y/z = look-at target offset from the scene anchor (rotated with
   * the scene); rx/ry/rz = degrees added to the scene's own rotation (0,0,0 = facing it squarely);
   * dolly = px toward the target (negative pulls back); fov = vertical degrees; sx/sy = screen shift
   * of the whole image in viewport fractions (sx .12 puts the anchor at 62% of the width).
   * u = 0..1 along the scene's travel (dwell excluded). The key flagged hold:true sits at u = pause.at;
   * the engine duplicates it to the hold's start and end (end pose = hold pose + drift). */

  const LAYOUT = [
    { id: '00-intro', step: null, name: 'Intro', cap: 'light', pos: [0, 0, 0], rot: [0, 0, 0], travel: 1.4, exit: 0.96,
      light: { x: 0, y: -40, z: 0, color: 'accent' },
      cam: [
        { u: 0, dolly: -760, rx: 12, ry: -8, y: -40 },
        { u: 0.45, dolly: -170, rx: 4, ry: -2 },
        { u: 0.92, dolly: 140, rx: -6, ry: 10, x: 160, y: 90, rz: 2 },
      ] },
    { id: '01-clone', step: '01', name: 'Clone', cap: 'light', pos: [1150, 950, -1400], rot: [0, -24, 0], travel: 1.9, enter: 0.22, exit: 0.95,
      light: { x: 0, y: 0, z: 60, color: 'white' },
      cam: [
        { u: 0.16, dolly: -420, ry: -20, rz: -5, x: -180 },
        { u: 0.5, dolly: -50, ry: -6, rz: -1, sx: 0.06 },
        { u: 0.88, dolly: 90, ry: 8, rx: -8, y: 140, rz: 3 },
      ] },
    { id: '02-recipe', step: '02', name: 'Build', cap: 'light', pos: [-250, 1950, -2650], rot: [0, 22, 0], travel: 2.0, enter: 0.22, exit: 0.93,
      light: { x: 0, y: 0, z: 60, color: 'add' },
      cam: [
        { u: 0.15, dolly: -460, ry: 18, rx: 8, rz: 5 },
        { u: 0.52, dolly: -40, ry: 4, sx: 0.06 },
        { u: 0.88, dolly: 70, rx: -18, y: 220, ry: -4 },
      ] },
    { id: '03-funnel', step: '03', name: 'Discover', cap: 'pause', pos: [450, 3350, -3650], rot: [0, 0, 0], travel: 2.4, enter: 0.15, exit: 0.93,
      pause: { at: 0.5, dwell: 1.6, drift: { dolly: 50 } },
      light: { x: 0, y: 40, z: 0, color: 'accent' },
      cam: [
        { u: 0.1, dolly: -540, rx: -38, y: -200 },
        { u: 0.3, dolly: -260, rx: -14, y: -60 },
        { u: 0.5, hold: true, dolly: -20, rx: -3, sx: 0.12 },
        { u: 0.88, dolly: 110, rx: 6, ry: 16, x: 320, rz: -3 },
      ] },
    { id: '04-rewind', step: '04', name: 'Rewind', cap: 'pause', pos: [1550, 4250, -2750], rot: [0, -18, 0], travel: 2.4, enter: 0.2, exit: 0.93,
      pause: { at: 0.62, dwell: 1.4, drift: { dolly: -30, z: 30 } },
      light: { x: 0, y: 0, z: 0, color: 'add' },
      cam: [
        { u: 0.12, z: -1000, dolly: 80, ry: -10, rz: 7 },
        { u: 0.38, z: -460, dolly: 0, ry: 5, rz: -3 },
        { u: 0.62, hold: true, z: 0, dolly: -60, sx: 0.12 },
        { u: 0.9, dolly: -220, rx: -12, y: 170, ry: -10 },
      ] },
    { id: '05-baseline', step: '05', name: 'Baseline', cap: 'light', pos: [700, 5250, -4350], rot: [0, 12, 0], travel: 1.8, enter: 0.16, exit: 0.93,
      light: { x: 0, y: 0, z: 60, color: 'white' },
      cam: [
        { u: 0.15, dolly: -440, ry: 14, rx: -8, rz: -4 },
        { u: 0.5, dolly: -40, ry: 4, sx: 0.06 },
        { u: 0.88, dolly: 60, ry: -14, x: -240, y: 130, rz: 3 },
      ] },
    { id: '06-sandbox', step: '06', name: 'Solve', cap: 'pause', pos: [-550, 6350, -5650], rot: [0, 0, 0], travel: 2.6, enter: 0.21, exit: 0.95,
      pause: { at: 0.55, dwell: 1.6, drift: { ry: -10, dolly: -70 } },
      light: { x: 0, y: -40, z: 0, color: 'accent' },
      cam: [
        { u: 0.1, dolly: -520, ry: -42, rx: -20 },
        { u: 0.32, dolly: -330, ry: -30, rx: -13 },
        { u: 0.55, hold: true, dolly: -110, ry: -18, rx: -10, sx: 0.12 },
        { u: 0.9, dolly: 60, ry: 20, rx: -4, y: 160 },
      ] },
    { id: '07-audit', step: '07', name: 'Audit', cap: 'light', pos: [-1550, 7250, -6450], rot: [0, 28, 0], travel: 1.8, enter: 0.2, exit: 0.93,
      light: { x: 0, y: 0, z: 60, color: 'good' },
      cam: [
        { u: 0.15, dolly: -400, ry: 34, rz: -6 },
        { u: 0.5, dolly: -40, ry: 6, rz: -1, sx: 0.06 },
        { u: 0.86, dolly: 80, ry: -6, rx: -10, y: 170, rz: 3 },
      ] },
    { id: '08-verify', step: '08', name: 'Verify', cap: 'pause', pos: [-650, 8250, -7850], rot: [0, -10, 0], travel: 2.4, enter: 0.17, exit: 0.95,
      pause: { at: 0.5, dwell: 1.4, drift: { dolly: 35 } },
      light: { x: 0, y: 0, z: 0, color: 'good' },
      cam: [
        { u: 0.14, dolly: -430, rx: -16, ry: -12, y: -110 },
        { u: 0.5, hold: true, dolly: -30, sx: 0.12 },
        { u: 0.88, dolly: 120, rx: -10, y: 190, ry: 8 },
      ] },
    { id: '09-judge', step: '09', name: 'Judge', cap: 'pause', pos: [200, 9350, -9250], rot: [0, 0, 0], travel: 2.8, enter: 0.12, exit: 0.95,
      pause: { at: 0.6, dwell: 1.8, drift: { dolly: 130, fov: -2 } },
      light: { x: 0, y: 0, z: 0, color: 'accent' },
      cam: [
        { u: 0.12, dolly: -540, rx: -6 },
        { u: 0.4, dolly: -250, rx: -2 },
        { u: 0.6, hold: true, dolly: 170, sx: 0.12, fov: 46 },
        { u: 0.9, dolly: -320, rx: -8, y: 150 },
      ] },
    { id: '10-publish', step: '10', name: 'Publish', cap: 'pause', pos: [0, 10550, -10650], rot: [0, 0, 0], travel: 2.6, enter: 0.08, exit: 0.97,
      pause: { at: 0.55, dwell: 1.6, drift: { dolly: -60 } },
      light: { x: 0, y: -60, z: 0, color: 'good' },
      cam: [
        { u: 0.12, dolly: -220, rx: -22, y: -220 },
        { u: 0.55, hold: true, dolly: -120, sx: 0.12 },
        { u: 0.9, dolly: -430, rx: 6, y: 120 },
      ] },
    { id: '11-outro', step: null, name: 'Outro', cap: 'end', pos: [0, 11550, -11850], rot: [0, 0, 0], travel: 1.4, enter: 0.12,
      light: { x: 0, y: 0, z: 0, color: 'accent' },
      cam: [
        { u: 0.2, dolly: -620, rx: -6 },
        { u: 0.62, dolly: -90 },
        { u: 0.98, dolly: -70 },
      ] },
  ];

  const CH = ['x', 'y', 'z', 'rx', 'ry', 'rz', 'dolly', 'fov', 'sx', 'sy'];
  const ROT = { rx: 1, ry: 1, rz: 1 };
  const DEF_FOV = 50;
  const LIGHT_COLORS = ['accent', 'good', 'bad', 'add', 'warn', 'white'];

  /* ------------------------------------------------------------------ registry */

  const regs = Object.create(null);
  const H = (window.Harness = window.Harness || {});
  Object.assign(H, {
    version: '1.0',
    motion: MOTION,
    reduced: REDUCED,
    ready: false,
    ease, clamp, lerp, range, damp, rng,
    LAYOUT: JSON.parse(JSON.stringify(LAYOUT)),
    registerScene(def) {
      if (!def || !def.id) return;
      regs[def.id] = def;
      if (H.ready && MOTION) lateRegister(def.id);
    },
  });

  /* ------------------------------------------------------------------ runtime state */

  let els = {};
  let scenes = [];
  let byId = Object.create(null);
  let keys = [];
  let tangents = {};
  let totalScreens = 1;
  let W = innerWidth, VH = innerHeight, mobile = W <= 760, k = 1, P = 1000;
  let trackTop = 0, scrollable = 1;
  let cur = 0, target = 0;
  let sCur = 0, sTarget = 0; // scroll fraction (pre-warp)
  let warpS = null, warpN = 0, effScreens = 1;
  const vel = { v: 0 };
  let raf = 0, lastNow = 0, lastRendered = -1, forceRender = true;
  let waiters = [];
  let view = null; // DOMMatrix: world -> camera space
  let shiftX = 0, shiftY = 0;
  let pose = {};
  let dust = [];
  let path = [], warpW = null;
  let lightOn = {};
  let debugEl = null, fpsAvg = 60;
  const ORIGIN = typeof DOMPoint === 'function' ? new DOMPoint(0, 0, 0) : null;

  /* ------------------------------------------------------------------ helpers */

  function el(tag, cls, html, parent) {
    const e = D.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  const n2 = (v) => Math.round(v * 100) / 100;
  const n3 = (v) => Math.round(v * 1000) / 1000;

  function tfString(o) {
    let s = `translate3d(${n2(o.x || 0)}px,${n2(o.y || 0)}px,${n2(o.z || 0)}px)`;
    if (o.ry) s += ` rotateY(${n3(o.ry)}deg)`;
    if (o.rx) s += ` rotateX(${n3(o.rx)}deg)`;
    if (o.rz) s += ` rotateZ(${n3(o.rz)}deg)`;
    if (o.s != null && o.s !== 1) s += ` scale(${n3(o.s)})`;
    if (o.center) s += ' translate(-50%,-50%)';
    return s;
  }
  function tfMatrix(o) {
    const m = new DOMMatrix().translateSelf(o.x || 0, o.y || 0, o.z || 0);
    if (o.ry) m.rotateAxisAngleSelf(0, 1, 0, o.ry);
    if (o.rx) m.rotateAxisAngleSelf(1, 0, 0, o.rx);
    if (o.rz) m.rotateAxisAngleSelf(0, 0, 1, o.rz);
    if (o.s != null && o.s !== 1) m.scale3dSelf(o.s);
    return m;
  }
  /* Set transform from a placement object; merges with the element's previous placement. */
  function place(e, o) {
    const prev = e.__ho || { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, center: e.classList.contains('h-plane') };
    const next = Object.assign({}, prev, o);
    e.__ho = next;
    const s = tfString(next);
    if (s !== e.__hs) {
      e.__hs = s;
      e.style.transform = s;
      e.__hm = null;
    }
    return e;
  }
  function matOf(e) {
    if (!e.__ho) return null;
    if (!e.__hm) e.__hm = tfMatrix(e.__ho);
    return e.__hm;
  }
  function setOpacity(e, v) {
    v = Math.round(clamp(v) * 500) / 500;
    if (e.__op === v) return;
    e.__op = v;
    e.style.opacity = v;
  }
  function setVis(e, on) {
    if (e.__vis === on) return;
    e.__vis = on;
    e.style.visibility = on ? 'visible' : 'hidden';
  }
  function setTf(e, s) {
    if (e.__tf === s) return;
    e.__tf = s;
    e.style.transform = s;
  }
  function setFilter(e, s) {
    if (e.__fl === s) return;
    e.__fl = s;
    e.style.filter = s;
  }
  function fmt(v, dec = 0) {
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  /* ------------------------------------------------------------------ timeline + camera spline */

  function sceneLocalFromU(s, u) {
    if (!s.pause) return u;
    const { at, dwell } = s.pause;
    return u <= at ? (u * s.travel) / s.len : (u * s.travel + dwell) / s.len;
  }

  function buildTimeline() {
    totalScreens = 0;
    for (const s of scenes) {
      const reg = s.reg || {};
      s.travel = reg.travel != null ? reg.travel : s.L.travel;
      const pz = reg.pause !== undefined ? reg.pause : s.L.pause;
      s.pause = pz ? Object.assign({ at: 0.5, dwell: 1.4 }, s.L.pause || {}, pz) : null;
      s.len = s.travel + (s.pause ? s.pause.dwell : 0);
      totalScreens += s.len;
    }
    let acc = 0;
    for (const s of scenes) {
      s.g0 = acc / totalScreens;
      acc += s.len;
      s.g1 = acc / totalScreens;
      s.pl = s.pause
        ? { start: (s.pause.at * s.travel) / s.len, end: (s.pause.at * s.travel + s.pause.dwell) / s.len }
        : null;
      if (s.api) s.api.pause = s.pl;
    }
    if (scenes.length) scenes[scenes.length - 1].g1 = 1;

    keys = [];
    const mob = mobile ? 0.55 : 1;
    for (const s of scenes) {
      const reg = s.reg || {};
      let ks = ((typeof reg.camera === 'function' ? reg.camera({ mobile }) : reg.camera) || s.L.cam || [{ u: 0.5 }]).map((q) => Object.assign({}, q));
      ks.sort((a, b) => a.u - b.u);
      if (s.pause && !ks.some((q) => q.hold)) {
        // synthesize a hold key by interpolating neighbours at u = at
        const at = s.pause.at;
        let a = ks[0], b = ks[ks.length - 1];
        for (let i = 0; i < ks.length - 1; i++) if (ks[i].u <= at && ks[i + 1].u >= at) { a = ks[i]; b = ks[i + 1]; }
        const f = b.u === a.u ? 0 : (at - a.u) / (b.u - a.u);
        const h = { u: at, hold: true };
        for (const c of CH) h[c] = lerp(a[c] != null ? a[c] : c === 'fov' ? DEF_FOV : 0, b[c] != null ? b[c] : c === 'fov' ? DEF_FOV : 0, f);
        ks.push(h);
        ks.sort((x, y) => x.u - y.u);
      }
      const toPose = (q) => {
        const pt = s.M.transformPoint(new DOMPoint(q.x || 0, q.y || 0, q.z || 0));
        return {
          x: pt.x, y: pt.y, z: pt.z,
          rx: s.L.rot[0] + (q.rx || 0) * mob,
          ry: s.L.rot[1] + (q.ry || 0) * mob,
          rz: s.L.rot[2] + (q.rz || 0) * mob,
          dolly: (q.dolly || 0) * (mobile && q.dolly > 0 ? 0.6 : 1),
          fov: q.fov != null ? q.fov : DEF_FOV,
          sx: mobile ? 0 : q.sx || 0,
          sy: mobile ? 0 : q.sy || 0,
        };
      };
      for (const q of ks) {
        if (q.hold && s.pause) {
          const p0 = toPose(q);
          const dq = Object.assign({}, q);
          const dr = s.pause.drift || {};
          for (const c in dr) dq[c] = (dq[c] != null ? dq[c] : c === 'fov' ? DEF_FOV : 0) + dr[c];
          const p1 = toPose(dq);
          keys.push({ t: s.g0 + s.pl.start * (s.g1 - s.g0), pose: p0, hold: true, scene: s.id });
          keys.push({ t: s.g0 + s.pl.end * (s.g1 - s.g0), pose: p1, hold: true, scene: s.id });
        } else {
          const lp = sceneLocalFromU(s, clamp(q.u));
          keys.push({ t: s.g0 + lp * (s.g1 - s.g0), pose: toPose(q), hold: !!q.hold, scene: s.id });
        }
      }
    }
    keys.sort((a, b) => a.t - b.t);
    keys = keys.filter((q, i) => i === 0 || q.t - keys[i - 1].t > 1e-6);
    // Keep rotations continuous (no 350 -> 10 jumps)
    for (let i = 1; i < keys.length; i++)
      for (const c in ROT) {
        let d = keys[i].pose[c] - keys[i - 1].pose[c];
        while (d > 180) { keys[i].pose[c] -= 360; d -= 360; }
        while (d < -180) { keys[i].pose[c] += 360; d += 360; }
      }
    // PCHIP (monotone cubic) tangents per channel; holds and endpoints get zero tangents.
    tangents = {};
    const n = keys.length;
    for (const c of CH) {
      const m = new Float64Array(n);
      const d = [], h = [];
      for (let i = 0; i < n - 1; i++) {
        h[i] = keys[i + 1].t - keys[i].t;
        d[i] = (keys[i + 1].pose[c] - keys[i].pose[c]) / h[i];
      }
      for (let i = 1; i < n - 1; i++) {
        if (keys[i].hold || d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
        const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
      m[0] = 0;
      m[n - 1] = 0;
      tangents[c] = m;
    }
  }

  /* Scroll -> timeline warp. Transitions between scenes (from a scene's `exit` p to the next
   * scene's `enter` p) get less scroll per unit of t, so the camera whips through the empty
   * space between stages and slows down where there is something to read. */
  const WARP_MIN = 0.38;
  function buildWarp() {
    const N = 4000;
    const zones = [];
    for (let i = 0; i < scenes.length - 1; i++) {
      const a = scenes[i], b = scenes[i + 1];
      const ex = a.L.exit != null ? a.L.exit : 0.94, en = b.L.enter != null ? b.L.enter : 0.12;
      const t0 = a.g0 + ex * (a.g1 - a.g0), t1 = b.g0 + en * (b.g1 - b.g0);
      if (t1 > t0) zones.push([t0, t1]);
    }
    const w = new Float64Array(N + 1);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      let z = 0;
      for (const [t0, t1] of zones) {
        if (t <= t0 || t >= t1) continue;
        const r = Math.min(0.3 * (t1 - t0), 0.012);
        z = Math.max(z, ease.smooth(range(t, t0, t0 + r)) * (1 - ease.smooth(range(t, t1 - r, t1))));
      }
      w[i] = 1 - (1 - WARP_MIN) * z;
    }
    warpW = w;
    warpS = new Float64Array(N + 1);
    for (let i = 1; i <= N; i++) warpS[i] = warpS[i - 1] + (w[i - 1] + w[i]) / 2 / N;
    const tot = warpS[N];
    for (let i = 0; i <= N; i++) warpS[i] /= tot;
    warpN = N;
    effScreens = totalScreens * tot;
  }
  /* scroll fraction -> t */
  function warp(sf) {
    if (!warpS) return sf;
    sf = clamp(sf);
    let lo = 0, hi = warpN;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (warpS[m] <= sf) lo = m; else hi = m; }
    const d = warpS[hi] - warpS[lo];
    return (lo + (d > 0 ? (sf - warpS[lo]) / d : 0)) / warpN;
  }
  /* t -> scroll fraction */
  function unwarp(t) {
    if (!warpS) return t;
    const x = clamp(t) * warpN, i = Math.min(warpN - 1, Math.floor(x));
    return lerp(warpS[i], warpS[i + 1], x - i);
  }

  let segHint = 0;
  function evalCamera(t, out) {
    const n = keys.length;
    if (!n) { for (const c of CH) out[c] = c === 'fov' ? DEF_FOV : 0; return out; }
    if (t <= keys[0].t) { Object.assign(out, keys[0].pose); return out; }
    if (t >= keys[n - 1].t) { Object.assign(out, keys[n - 1].pose); return out; }
    let i = clamp(segHint, 0, n - 2);
    while (i > 0 && t < keys[i].t) i--;
    while (i < n - 2 && t >= keys[i + 1].t) i++;
    segHint = i;
    const a = keys[i], b = keys[i + 1];
    const hh = b.t - a.t;
    const s = (t - a.t) / hh, s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    for (const c of CH) {
      const m = tangents[c];
      out[c] = h00 * a.pose[c] + h10 * hh * m[i] + h01 * b.pose[c] + h11 * hh * m[i + 1];
    }
    return out;
  }

  function applyCamera(c) {
    const p = (VH / 2) / Math.tan((clamp(c.fov, 10, 120) * PI) / 360);
    if (Math.abs(p - P) > 0.25 || !els.viewport.__p) {
      P = p;
      els.viewport.__p = 1;
      els.viewport.style.perspective = n2(P) + 'px';
    }
    shiftX = c.sx * W;
    shiftY = (c.sy + (mobile ? -0.1 : 0)) * VH;
    setTf(els.viewport, `translate3d(${n2(shiftX)}px,${n2(shiftY)}px,0)`);
    setTf(
      els.camera,
      `translate3d(0,0,${n2(c.dolly)}px) scale3d(${n3(k)},${n3(k)},${n3(k)}) rotateZ(${n3(-c.rz)}deg) rotateX(${n3(-c.rx)}deg) rotateY(${n3(-c.ry)}deg) translate3d(${n2(-c.x)}px,${n2(-c.y)}px,${n2(-c.z)}px)`
    );
    view = new DOMMatrix()
      .translateSelf(0, 0, c.dolly)
      .scale3dSelf(k)
      .rotateAxisAngleSelf(0, 0, 1, -c.rz)
      .rotateAxisAngleSelf(1, 0, 0, -c.rx)
      .rotateAxisAngleSelf(0, 1, 0, -c.ry)
      .translateSelf(-c.x, -c.y, -c.z);
  }

  /* Project a camera-space point to viewport px. */
  function projectCam(q) {
    const dz = P - q.z;
    if (dz <= 1) return null;
    const f = P / dz;
    return { x: W / 2 + q.x * f + shiftX, y: VH / 2 + q.y * f + shiftY, f, d: dz };
  }

  /* ------------------------------------------------------------------ fog */

  function fogAlpha(d) {
    // d = distance from the eye along the view axis, in screen px (P = target plane)
    const near = ease.smooth(range(d, P * 0.12, P * 0.45));
    const far = 1 - ease.smooth(range(d, P * 1.3, P * 4.0));
    return near * far * far;
  }

  function planeDepth(e, stop, M) {
    let pt = ORIGIN;
    for (let x = e; x && x !== stop; x = x.parentElement) {
      const m = matOf(x);
      if (m) pt = m.transformPoint(pt);
    }
    return M.transformPoint(pt);
  }

  /* ------------------------------------------------------------------ scenes */

  function sceneDim(s, t) {
    let a;
    if (t >= s.g0 && t <= s.g1) a = 1;
    else a = 1 - range(t < s.g0 ? s.g0 - t : t - s.g1, 0, 0.035);
    return 0.26 + 0.74 * ease.smooth(a);
  }

  function makeApi(s) {
    const api = {
      id: s.id,
      root: s.root,
      section: s.sec,
      fallback: s.fallback,
      layout: s.L,
      mobile,
      p: 0,
      t: 0,
      pause: s.pl,
      ease, clamp, lerp, mix: lerp, range, rng, fmt,
      seg: (p, a, b, fn = ease.inOutCubic) => fn(range(p, a, b)),
      bump: (p, a, b, c, d, fn = ease.inOutSine) => fn(range(p, a, b)) * (1 - fn(range(p, c, d))),
      stagger(p, i, n, a = 0, b = 1, win = 0.4, fn = ease.outCubic) {
        const span = (b - a) * (1 - win);
        const st = a + (n > 1 ? (span * i) / (n - 1) : 0);
        return fn(range(p, st, st + (b - a) * win));
      },
      hold: (p) => (s.pl ? range(p, s.pl.start, s.pl.end) : 0),
      approach: (p) => (s.pl ? range(p, 0, s.pl.start) : p),
      leave: (p) => (s.pl ? range(p, s.pl.end, 1) : 0),
      el,
      plane(o = {}, parent) {
        const e = el('div', 'h-plane' + (o.cls ? ' ' + o.cls : ''), o.html != null ? o.html : null, parent || s.root);
        if (o.w) e.style.width = typeof o.w === 'number' ? o.w + 'px' : o.w;
        if (o.h) e.style.height = typeof o.h === 'number' ? o.h + 'px' : o.h;
        const po = Object.assign({ center: o.center !== false }, o);
        delete po.cls; delete po.html; delete po.w; delete po.h; delete po.fog; delete po.dim;
        place(e, po);
        s.planes.push({ e, fog: o.fog !== false, dim: o.dim !== false });
        return e;
      },
      group(o = {}, parent) {
        const e = el('div', 'h-group' + (o.cls ? ' ' + o.cls : ''), null, parent || s.root);
        const po = Object.assign({}, o, { center: false });
        delete po.cls;
        place(e, po);
        return e;
      },
      place,
      track(e, o = {}) {
        s.planes.push({ e, fog: o.fog !== false, dim: o.dim !== false });
        return e;
      },
      halo(e, color = 'accent', cls = '') {
        const h = el('span', `h-halo h-halo--${color}${cls ? ' ' + cls : ''}`, null, e);
        h.setAttribute('aria-hidden', 'true');
        return h;
      },
      opacity: setOpacity,
      transform: setTf,
      filter: setFilter,
      text(e, str) {
        str = String(str);
        if (e.__tx !== str) { e.__tx = str; e.textContent = str; }
      },
      count(e, v, dec = 0) { api.text(e, fmt(v, dec)); },
      type(e, full, f) {
        const n = Math.round(clamp(f) * full.length);
        api.text(e, full.slice(0, n));
        e.classList.toggle('is-typing', f > 0 && f < 1);
      },
      setLight(o) { s.lightOverride = o; },
      project(x, y, z) {
        if (!view) return null;
        const q = view.multiply(s.M).transformPoint(new DOMPoint(x, y, z));
        return projectCam(q);
      },
    };
    return api;
  }

  function safe(s, fn, label) {
    try { fn(); } catch (err) {
      if (!s.errored) console.error(`[harness] scene ${s.id} ${label} failed:`, err);
      s.errored = true;
    }
  }

  function mountScene(s) {
    s.root.textContent = '';
    s.planes = s.planes.filter((q) => q.engine);
    s.lastP = -1;
    s.lightOverride = null;
    s.errored = false;
    s.api = makeApi(s);
    if (s.reg && typeof s.reg.mount === 'function') safe(s, () => s.reg.mount(s.root, s.api), 'mount');
  }

  function lateRegister(id) {
    const s = byId[id];
    if (!s) return;
    s.reg = regs[id];
    buildTimeline();
    buildWarp();
    measureTrack();
    mountScene(s);
    if (els.ticks) buildRail();
    forceRender = true;
    kick();
  }

  /* ------------------------------------------------------------------ captions, rail, fx */

  function buildCaptions() {
    els.caps.textContent = '';
    for (const s of scenes) {
      const src = s.fallback && s.fallback.querySelector('.cap');
      if (!src) { s.cap = null; continue; }
      const c = el('div', `h-cap is-${s.L.cap}`, null, els.caps);
      c.innerHTML = src.innerHTML;
      c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      if (s.L.cap !== 'end') c.setAttribute('aria-hidden', 'true');
      const parts = [...c.children];
      parts.forEach((n) => { n.style.opacity = 0; });
      setVis(c, false);
      s.cap = { el: c, parts, v: -1 };
    }
  }

  function capVisibility(s, p) {
    switch (s.L.cap) {
      case 'pause': {
        if (!s.pl) return ease.inOutSine(range(p, 0.18, 0.4)) * (1 - ease.inOutSine(range(p, 0.66, 0.86)));
        const fi = Math.min(0.2, s.pl.start * 0.7), fo = Math.min(0.12, (1 - s.pl.end) * 0.6);
        return ease.inOutSine(range(p, s.pl.start - fi, s.pl.start - fi * 0.1)) * (1 - ease.inOutSine(range(p, s.pl.end, s.pl.end + fo)));
      }
      case 'end':
        return ease.inOutSine(range(p, 0.32, 0.62));
      default:
        return ease.inOutSine(range(p, 0.14, 0.32)) * (1 - ease.inOutSine(range(p, 0.68, 0.86)));
    }
  }

  function renderCaptions(t) {
    let scrim = 0;
    for (const s of scenes) {
      if (!s.cap) continue;
      const near = t >= s.g0 - 0.02 && t <= s.g1 + 0.02;
      const p = clamp((t - s.g0) / (s.g1 - s.g0));
      const v = near ? capVisibility(s, p) : 0;
      if (Math.abs(v - s.cap.v) < 0.0005) { if (s.L.cap !== 'light') scrim = Math.max(scrim, v); continue; }
      s.cap.v = v;
      setVis(s.cap.el, v > 0.001);
      s.cap.el.classList.toggle('is-on', v > 0.5);
      if (v <= 0.001) continue;
      const blur = s.L.cap !== 'light' && !mobile;
      s.cap.parts.forEach((n, i) => {
        const a = i / Math.max(1, s.cap.parts.length);
        const vi = ease.outCubic(range(v, a * 0.45, a * 0.45 + 0.55));
        setOpacity(n, vi);
        setTf(n, `translate3d(0,${n2((1 - vi) * 18)}px,0)`);
        if (blur) setFilter(n, vi > 0.995 ? 'none' : `blur(${n2((1 - vi) * 7)}px)`);
      });
      if (s.L.cap !== 'light') scrim = Math.max(scrim, v);
    }
    setOpacity(els.scrim, scrim);
  }

  function buildRail() {
    const r = els.rail;
    r.textContent = '';
    el('span', 'h-rail-line', null, r);
    els.railFill = el('span', 'h-rail-fill', null, r);
    els.ticks = [];
    for (const s of scenes) {
      if (!s.L.step) continue;
      const ft = s.pl ? s.g0 + s.pl.start * (s.g1 - s.g0) : s.g0 + 0.5 * (s.g1 - s.g0);
      const a = el('a', 'h-tick' + (s.pl ? ' is-pause' : ''), `<i></i><b>${s.L.step}</b><span>${s.L.name}</span>`, r);
      a.href = '#' + s.sec.id;
      a.style.top = (unwarp(ft) * 100).toFixed(3) + '%';
      a.setAttribute('aria-label', `Step ${s.L.step}: ${s.L.name}`);
      a.addEventListener('click', (ev) => { ev.preventDefault(); H.seek(ft, { smooth: true }); });
      els.ticks.push({ a, s, ft });
    }
  }

  function renderRail(t, active) {
    setTf(els.railFill, `scaleY(${n3(unwarp(t))})`);
    for (const q of els.ticks) {
      const on = q.s === active;
      if (q.on !== on) { q.on = on; q.a.classList.toggle('is-active', on); }
      const done = t >= q.ft - 1e-4;
      if (q.done !== done) { q.done = done; q.a.classList.toggle('is-done', done); }
    }
  }

  function buildFx() {
    const rig = els.rig;
    rig.textContent = '';
    for (const c of LIGHT_COLORS) {
      lightOn[c] = el('span', `h-light h-light--${c}`, null, rig);
      setOpacity(lightOn[c], 0);
    }
    els.streak = el('span', 'h-streak', null, rig);
    setOpacity(els.streak, 0);
  }

  function buildDust() {
    for (const d of dust) d.e.remove();
    dust = [];
    const rand = rng(15169);
    const N = mobile ? 70 : 140;
    for (let i = 0; i < N; i++) {
      const tt = rand();
      const c = evalCamera(tt, {});
      const e = el('i', 'h-dust' + (rand() < 0.16 ? ' is-accent' : ''), null, els.world);
      const o = {
        x: c.x + (rand() - 0.5) * 3000,
        y: c.y + (rand() - 0.5) * 1700,
        z: c.z - 300 - rand() * 1800,
        s: 0.6 + rand() * 1.6,
        center: true,
      };
      place(e, o);
      dust.push({ e });
    }
  }

  /* The flight path: small runway lights laid along the camera's look-at track through each
   * transition, so the whip between stages always has something to follow. Shown only while the
   * camera is between stages. */
  function zoneAt(t) {
    if (!warpW) return 0;
    const i = Math.round(clamp(t) * (warpW.length - 1));
    return (1 - warpW[i]) / (1 - WARP_MIN);
  }
  function buildPath() {
    for (const d of path) d.e.remove();
    path = [];
    if (!warpW) return;
    const N = warpW.length - 1, tmp = {};
    let last = null, acc = 0, n = 0;
    const gap = mobile ? 90 : 70;
    for (let i = 0; i <= N; i += 2) {
      const t = i / N;
      if (warpW[i] > 0.995) { last = null; continue; }
      evalCamera(t, tmp);
      const q = { x: tmp.x, y: tmp.y + 70, z: tmp.z };
      if (last) acc += Math.hypot(q.x - last.x, q.y - last.y, q.z - last.z);
      last = q;
      if (path.length && acc < gap) continue;
      acc = 0;
      n++;
      const e = el('i', 'h-pathdot' + (n % 6 === 0 ? ' is-major' : ''), null, els.world);
      place(e, { x: q.x, y: q.y, z: q.z, ry: tmp.ry, rx: tmp.rx, center: true });
      setOpacity(e, 0);
      setVis(e, false);
      path.push({ e, t });
    }
  }

  function renderLight(active, p) {
    let colors = null, lx = 0, ly = 0, lz = 0, inten = 0;
    if (active) {
      const lo = Object.assign({}, active.L.light || {}, (active.reg && active.reg.light) || {}, active.lightOverride || {});
      lx = lo.x || 0; ly = lo.y || 0; lz = lo.z || 0;
      const env = ease.smooth(range(p, 0, 0.18)) * (1 - ease.smooth(range(p, 0.84, 1)));
      const capv = active.cap ? Math.max(0, active.cap.v) : 0;
      inten = lo.intensity != null ? lo.intensity : env * (active.L.cap === 'light' ? 0.42 : 0.3 + 0.7 * capv);
      colors = lo.colors || { [lo.color || 'accent']: 1 };
    }
    let pr = null;
    if (active && inten > 0.001) {
      const q = view.multiply(active.M).transformPoint(new DOMPoint(lx, ly, lz));
      pr = projectCam(q);
    }
    if (!pr) inten = 0;
    for (const c of LIGHT_COLORS) setOpacity(lightOn[c], inten * ((colors && colors[c]) || 0));
    // the anamorphic streak reads as motion; keep it off the text while a caption is up
    const capOn = active && active.cap ? Math.max(0, active.cap.v) : 0;
    setOpacity(els.streak, inten * 0.34 * (1 - 0.85 * capOn));
    if (pr) setTf(els.rig, `translate3d(${n2(pr.x)}px,${n2(pr.y)}px,0) scale(${n3(clamp(pr.f, 0.55, 1.7))})`);
  }

  /* ------------------------------------------------------------------ render */

  function activeScene(t) {
    for (const s of scenes) if (t >= s.g0 && t < s.g1) return s;
    return scenes[scenes.length - 1];
  }

  function render(t) {
    evalCamera(t, pose);
    applyCamera(pose);
    const far = P * 4.0;
    for (const s of scenes) {
      const Msc = view.multiply(s.M);
      const q = Msc.transformPoint(ORIGIN);
      const d = P - q.z;
      const rad = (s.reg && s.reg.radius ? s.reg.radius : 1500) * k;
      const vis = d > -rad && d < far + rad;
      if (vis !== s.vis) {
        s.vis = vis;
        s.sec.style.display = vis ? '' : 'none';
        if (vis) s.lastP = -1;
      }
      if (!vis) continue;
      const p = clamp((t - s.g0) / (s.g1 - s.g0));
      const dim = sceneDim(s, t);
      if (s.api) {
        s.api.p = p;
        s.api.t = t;
        s.api.dim = dim;
      }
      if (p !== s.lastP && s.reg && typeof s.reg.update === 'function' && !s.errored) {
        s.lastP = p;
        safe(s, () => s.reg.update(p, s.api), 'update');
      }
      for (const pl of s.planes) {
        if (!pl.e.isConnected) continue;
        if (!pl.fog) { if (pl.dim) setOpacity(pl.e, dim); continue; }
        const qq = planeDepth(pl.e, s.sec, Msc);
        const a = fogAlpha(P - qq.z) * (pl.dim ? dim : 1);
        setOpacity(pl.e, a);
        setVis(pl.e, a > 0.003);
      }
    }
    const zn = ease.smooth(clamp(zoneAt(t) * 1.6));
    if (zn > 0.002 || path.vis) {
      path.vis = zn > 0.002;
      for (const dd of path) {
        const qq = view.transformPoint(dd.e.__ho);
        // lights ahead of the camera's current point glow; ones already passed fade out
        const ahead = 1 - ease.smooth(range(t - dd.t, 0.0, 0.006));
        const a = fogAlpha(P - qq.z) * zn * (0.25 + 0.75 * ahead);
        setOpacity(dd.e, a);
        setVis(dd.e, a > 0.01);
      }
    }
    for (const dd of dust) {
      const qq = view.transformPoint(dd.e.__ho);
      const a = fogAlpha(P - qq.z) * 0.9;
      setOpacity(dd.e, a);
      setVis(dd.e, a > 0.01);
    }
    const act = activeScene(t);
    const ap = clamp((t - act.g0) / (act.g1 - act.g0));
    renderCaptions(t);
    renderLight(act, ap);
    renderRail(t, act);
    if (debugEl) {
      const hold = act.pl ? range(ap, act.pl.start, act.pl.end) : 0;
      debugEl.textContent = `t ${t.toFixed(4)}  ${act.id}  p ${ap.toFixed(3)}${act.pl ? '  hold ' + hold.toFixed(2) : ''}  ${Math.round(fpsAvg)}fps`;
    }
    H.t = t;
  }

  /* ------------------------------------------------------------------ scroll + loop */

  function measureTrack() {
    const h = Math.round(effScreens * VH + VH);
    els.track.style.height = h + 'px';
    const r = els.track.getBoundingClientRect();
    trackTop = r.top + scrollY;
    scrollable = Math.max(1, h - VH);
  }
  function scrollS() {
    return clamp((scrollY - trackTop) / scrollable);
  }
  function scrollT() {
    return warp(scrollS());
  }
  function measure() {
    W = innerWidth;
    VH = innerHeight;
    const m = W <= 760;
    const changed = m !== mobile;
    mobile = m;
    k = mobile ? clamp(W / 420, 0.8, 1.05) : clamp(Math.min(W / 1440, VH / 900), 0.7, 1.2);
    R.classList.toggle('h-mobile', mobile);
    return changed;
  }

  function frame(now) {
    raf = 0;
    const dt = clamp((now - (lastNow || now)) / 1000, 0, 0.05);
    lastNow = now;
    if (dt > 0) fpsAvg = lerp(fpsAvg, 1 / dt, 0.08);
    sTarget = scrollS();
    const st = mobile ? 0.2 : 0.3;
    sCur = damp(sCur, sTarget, vel, st, dt || 1 / 60);
    let settled = false;
    if (Math.abs(sCur - sTarget) < 2e-6 && Math.abs(vel.v) < 1e-5) {
      sCur = sTarget;
      vel.v = 0;
      settled = true;
    }
    target = warp(sTarget);
    cur = settled ? target : warp(sCur);
    if (forceRender || cur !== lastRendered) {
      forceRender = false;
      lastRendered = cur;
      render(cur);
    }
    if (!settled) raf = requestAnimationFrame(frame);
    else {
      lastNow = 0;
      const w = waiters;
      waiters = [];
      w.forEach((f) => f());
    }
  }
  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ public API */

  function seek(t, opts = {}) {
    t = clamp(+t || 0);
    if (!H.ready) { H._pendingSeek = [t, opts]; return; }
    const sf = unwarp(t);
    const y = Math.round(trackTop + sf * scrollable);
    if (opts.smooth) {
      window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
      window.scrollTo(0, y);
      cur = target = t;
      sCur = sTarget = sf;
      vel.v = 0;
      forceRender = true;
      lastRendered = -1;
      render(cur);
    }
    kick();
  }
  function sceneT(id, p = 0) {
    const s = byId[id];
    if (!s) return null;
    return s.g0 + clamp(p) * (s.g1 - s.g0);
  }
  Object.assign(H, {
    seek,
    sceneT,
    scrollFrac: (t) => unwarp(t),
    timeAt: (sf) => warp(sf),
    seekScene(id, p = 0.5, opts) {
      const t = sceneT(id, p);
      if (t != null) seek(t, opts);
    },
    seekHold(id, h = 0.5, opts) {
      const s = byId[id];
      if (!s) return;
      const p = s.pl ? lerp(s.pl.start, s.pl.end, clamp(h)) : 0.5;
      seek(sceneT(id, p), opts);
    },
    timeline() {
      return scenes.map((s) => ({
        id: s.id, step: s.L.step, t0: s.g0, t1: s.g1, screens: s.len,
        pause: s.pl ? { start: s.pl.start, end: s.pl.end, t0: s.g0 + s.pl.start * (s.g1 - s.g0), t1: s.g0 + s.pl.end * (s.g1 - s.g0) } : null,
      }));
    },
    cameraKeys: () => keys.map((q) => ({ t: q.t, hold: q.hold, scene: q.scene, pose: Object.assign({}, q.pose) })),
    state() {
      const a = activeScene(cur);
      return { t: cur, target, scene: a.id, p: clamp((cur - a.g0) / (a.g1 - a.g0)), mobile, k, P, camera: Object.assign({}, pose) };
    },
    settled() {
      return new Promise((res) => (raf ? waiters.push(res) : res()));
    },
  });

  /* ------------------------------------------------------------------ init */

  function init() {
    if (!MOTION) { H.ready = false; return; }
    els.track = D.getElementById('h-track');
    if (!els.track) return;
    els.stage = els.track.querySelector('.h-stage');
    els.viewport = els.track.querySelector('.h-viewport');
    els.camera = els.track.querySelector('.h-camera');
    els.world = els.track.querySelector('.h-world');
    els.caps = els.track.querySelector('.h-captions');
    els.rail = els.track.querySelector('.h-rail');
    els.rig = els.track.querySelector('.h-lightrig');
    els.scrim = els.track.querySelector('.h-scrim');
    measure();

    scenes = [];
    byId = Object.create(null);
    for (const L of LAYOUT) {
      const sec = els.world.querySelector(`.scene[data-scene="${L.id}"]`);
      if (!sec) continue;
      if (!sec.id) sec.id = 's-' + L.id;
      const s = {
        id: L.id, L, sec, reg: regs[L.id] || null, planes: [], vis: true, lastP: -1,
        fallback: sec.querySelector('.scene-fallback'),
      };
      const o = { x: L.pos[0], y: L.pos[1], z: L.pos[2], ry: L.rot[1], rx: L.rot[0], rz: L.rot[2] };
      sec.style.transform = tfString(o);
      s.M = tfMatrix(o);
      s.root = el('div', 'scene-root', null, sec);
      if (L.step && !(s.reg && s.reg.numeral === false)) {
        const nm = el('div', 'h-plane h-numeral', L.step, sec);
        nm.setAttribute('aria-hidden', 'true');
        place(nm, mobile ? { x: 60, y: -300, z: -700, center: true } : { x: 420, y: -170, z: -900, center: true });
        s.planes.push({ e: nm, fog: true, dim: true, engine: true });
      }
      scenes.push(s);
      byId[L.id] = s;
    }
    buildTimeline();
    buildWarp();
    measureTrack();
    for (const s of scenes) mountScene(s);
    buildCaptions();
    buildRail();
    buildFx();
    buildDust();
    buildPath();

    if (qs.get('debug') === '1') debugEl = el('div', 'h-debug', null, D.body);

    addEventListener('scroll', kick, { passive: true });
    let rt = 0, lastW = W, lastH = VH;
    addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 140) return; // mobile URL-bar jitter
        lastW = innerWidth; lastH = innerHeight;
        const keepT = cur;
        const changed = measure();
        if (changed) {
          buildTimeline();
          buildWarp();
          for (const s of scenes) {
            const nm = s.sec.querySelector('.h-numeral');
            if (nm) place(nm, mobile ? { x: 60, y: -300, z: -700 } : { x: 420, y: -170, z: -900 });
            mountScene(s);
          }
          buildRail();
          buildDust();
          buildPath();
        }
        measureTrack();
        seek(keepT);
      }, 140);
    });
    if (mqReduced && mqReduced.addEventListener) mqReduced.addEventListener('change', () => location.reload());

    H.ready = true;
    R.classList.add('h-ready');

    // Debug / screenshot hooks: ?t=0.42  or  ?scene=03-funnel&p=0.5  or  ?scene=03-funnel&hold=0.5
    let jump = null;
    if (qs.has('t')) jump = clamp(parseFloat(qs.get('t')) || 0);
    if (qs.has('scene') && byId[qs.get('scene')]) {
      const s = byId[qs.get('scene')];
      if (qs.has('hold') && s.pl) jump = sceneT(s.id, lerp(s.pl.start, s.pl.end, clamp(parseFloat(qs.get('hold')) || 0)));
      else jump = sceneT(s.id, qs.has('p') ? parseFloat(qs.get('p')) : 0.5);
    }
    if (H._pendingSeek) { jump = H._pendingSeek[0]; delete H._pendingSeek; }
    if (jump != null) {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      seek(jump);
    } else {
      sCur = sTarget = scrollS();
      cur = target = warp(sCur);
      forceRender = true;
      kick();
    }
    // Fonts change card sizes; re-render once they land.
    if (D.fonts && D.fonts.ready) D.fonts.ready.then(() => { forceRender = true; kick(); });
  }

  if (D.readyState === 'complete') setTimeout(init, 0);
  else D.addEventListener('DOMContentLoaded', init);
})();
