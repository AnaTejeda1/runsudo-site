// Scroll-driven one-take walkthrough for the homepage #replay section.
// The panels are authored as plain HTML in index.html (that is the static and
// reduced-motion layout). When motion is allowed and the screen is wide enough, this
// lifts them into a Three.js CSS3D scene so they stay crisp, real DOM, and flies one
// camera along a spline through them as the page scrolls. A WebGL layer underneath
// draws the dot-grid ground, container footprints and ticket trails.
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const root = document.getElementById('replay');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 760px)');

// Static layout shows the Jira rows already sorted.
root.querySelectorAll('.jr-row').forEach((r) => { r.style.order = r.dataset.to; });

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const range = (p, a, b) => clamp01((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Timeline in scroll progress (0..1). Each stop is a hold window where the camera
// settles; everything between is travel.
const HOLDS = [[0, 0.012], [0.11, 0.15], [0.3, 0.35], [0.44, 0.53], [0.61, 0.66], [0.71, 0.78], [0.83, 0.88], [0.95, 1]];
const STEP_OF_HOLD = [1, 1, 2, 3, 4, 5, 6, 7];
const SORT = [0.012, 0.075];
const POP = [0.07, 0.108];
const FLY = [0.15, 0.292];
const LOCAL = { agent: [0.395, 0.525], harness: [0.68, 0.775], judge: [0.8, 0.875], report: [0.91, 0.975] };
// Scroll windows where groups fade in or out, so later panels don't crowd earlier shots.
const SHOW = { boxes: [-1, -1, 0.56, 0.62], late: [0.5, 0.57, 2, 2], report: [0.78, 0.86, 2, 2] };

// World layout, in CSS pixels (CSS3D maps one unit to one pixel at 1:1 depth).
const GROUND = -760;
const BOX = { w: 1150, h: 780, d: 1600, z: -5400, xs: [-1550, 0, 1550] };
BOX.y = GROUND + BOX.h / 2;
const PATH_BOX = 1; // the container we follow inside: API-482
const ARC = { c: V(1500, 40, -8800), r: 2300, deg: [-31, 0, 31] }; // diffs, harness, judge
const REPORT = V(1500, 1250, -13300);

let active = null;

function supportsGL() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

function decide() {
  const want = !reduce.matches && !narrow.matches && supportsGL();
  if (want && !active) active = enable();
  else if (!want && active) { active(); active = null; }
}
reduce.addEventListener('change', decide);
narrow.addEventListener('change', decide);
decide();

function enable() {
  const track = root.querySelector('.rp-track');
  const stage = root.querySelector('.rp-stage');
  const canvas = stage.querySelector('.rp-gl');
  const cssHost = stage.querySelector('.rp-css');
  const hud = stage.querySelector('.rp-hud');
  const rail = stage.querySelector('.rp-rail');
  const steps = [...root.querySelectorAll('.rp-step')].map((li) => ({
    n: li.dataset.step, t: li.querySelector('.rp-cap h3').textContent, p: li.querySelector('.rp-cap p').textContent,
  }));
  const $ = (s) => root.querySelector(s);
  const moved = []; // [el, parent, next] so we can put panels back
  const lift = (el) => { moved.push([el, el.parentNode, el.nextSibling]); return new CSS3DObject(el); };

  root.classList.add('is-3d');
  document.documentElement.style.setProperty('--sbw', `${innerWidth - document.documentElement.clientWidth}px`);
  rail.innerHTML = steps.map(() => '<li></li>').join('');

  // ---- renderers ----
  const camera = new THREE.PerspectiveCamera(38, 1, 10, 30000);
  const scene = new THREE.Scene();
  const glScene = new THREE.Scene();
  glScene.fog = new THREE.Fog(0x0a0a0a, 2600, 9500);
  const gl = new THREE.WebGLRenderer({ canvas, antialias: true });
  gl.setClearColor(0x0a0a0a, 1);
  gl.setPixelRatio(Math.min(devicePixelRatio, 2));
  const css = new CSS3DRenderer();
  cssHost.appendChild(css.domElement);

  // ---- panels ----
  const jiraEl = $('.rp-jira');
  const jira = lift(jiraEl);
  scene.add(jira);
  const rows = [...jiraEl.querySelectorAll('.jr-row')].map((el) => ({
    el, from: +el.dataset.from, to: +el.dataset.to, card: el.dataset.card == null ? -1 : +el.dataset.card,
  }));
  const pickRows = [];
  rows.forEach((r) => { if (r.card >= 0) pickRows[r.card] = r; });

  // Containers: open-topped glass boxes, one per ticket.
  const shield = $('.rp-box .shield').outerHTML;
  const boxes = BOX.xs.map((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, BOX.y, BOX.z);
    const wall = (w, h, cls, html = '') => {
      const el = document.createElement('div');
      el.className = `rp-wall ${cls}`;
      el.style.width = `${w}px`; el.style.height = `${h}px`;
      el.innerHTML = html;
      const o = new CSS3DObject(el);
      g.add(o);
      return o;
    };
    const key = pickRows[i].el.querySelector('.k').textContent;
    const back = wall(BOX.w, BOX.h, 'back'); back.position.z = -BOX.d / 2;
    const left = wall(BOX.d, BOX.h, 'side'); left.position.x = -BOX.w / 2; left.rotation.y = Math.PI / 2;
    const right = wall(BOX.d, BOX.h, 'side'); right.position.x = BOX.w / 2; right.rotation.y = -Math.PI / 2;
    const floor = wall(BOX.w, BOX.d, 'floor'); floor.position.y = -BOX.h / 2; floor.rotation.x = -Math.PI / 2;
    const front = wall(BOX.w, BOX.h, 'front', `<div class="bx-label">${shield}<span>sealed · ${key.toLowerCase()}</span><small>no network</small></div>`);
    front.position.z = BOX.d / 2;
    scene.add(g);
    return { g, front };
  });

  // Ticket cards: copies of the static cards, popped out of Jira and flown to the boxes.
  const cards = [...root.querySelectorAll('.rp-boxes .rp-card')].map((src, i) => {
    const el = src.cloneNode(true);
    const o = new CSS3DObject(el);
    scene.add(o);
    return { el, o, i };
  });

  const agent = lift($('.rp-agent'));
  const diffEls = [...root.querySelectorAll('.rp-diff')];
  const diffGroup = new THREE.Group();
  const diffs = diffEls.map((el) => { const o = lift(el); diffGroup.add(o); return o; });
  scene.add(agent, diffGroup);
  const harness = lift($('.rp-harness'));
  const judge = lift($('.rp-judge'));
  const report = lift($('.rp-report'));
  scene.add(harness, judge, report);

  // Panels with scroll-scrubbed inner animation.
  const scrub = Object.entries(LOCAL).map(([k, [a, b]]) => ({
    a, b, items: [...$(`.rp-${k}`).querySelectorAll('[data-t]')].map((el) => {
      const [s, e] = el.dataset.t.split(' ').map(Number);
      return { el, s, e, last: -1 };
    }),
  }));

  // ---- GL ground ----
  {
    const pts = [];
    for (let x = -6000; x <= 8000; x += 160) for (let z = 3000; z >= -16000; z -= 160) pts.push(x, GROUND, z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    glScene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x3a3a3a, size: 2, sizeAttenuation: false })));
    const glow = document.createElement('canvas');
    glow.width = glow.height = 128;
    const c2 = glow.getContext('2d');
    const grd = c2.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(36,150,237,0.55)'); grd.addColorStop(1, 'rgba(36,150,237,0)');
    c2.fillStyle = grd; c2.fillRect(0, 0, 128, 128);
    const glowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glow), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1d63ed, transparent: true, opacity: 0.7 });
    BOX.xs.forEach((x) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(BOX.w * 2, BOX.d * 1.7), glowMat);
      m.rotation.x = -Math.PI / 2; m.position.set(x, GROUND + 1, BOX.z);
      glScene.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d)), edgeMat);
      e.position.set(x, BOX.y, BOX.z);
      glScene.add(e);
    });
  }
  const trailMat = new THREE.LineBasicMaterial({ color: 0x5a5a3a, transparent: true, opacity: 0.55 });
  const trails = [];

  // ---- layout that depends on measured sizes and viewport aspect ----
  let K = [], stopIdx = [], camCurve, lookCurve, lens, flights = [];
  const sizes = {};
  const rowGeom = {};

  function fitDist(w, h, fw = 0.8, fh = 0.66) {
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return Math.max(h / (fh * vh), w / (fw * vh * camera.aspect));
  }
  // Camera framing a panel at `c` whose face points along `n`, nudged up so the HUD has room.
  function frame(c, n, w, h, opts = {}) {
    const d = fitDist(w, h, opts.fw, opts.fh) * (opts.k || 1);
    if (opts.yaw) n = n.clone().applyAxisAngle(V(0, 1, 0), THREE.MathUtils.degToRad(opts.yaw));
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const lift = d * vh * 0.06;
    const look = c.clone().add(V(0, -lift, 0));
    const cam = c.clone().add(n.clone().multiplyScalar(d)).add(V(0, -lift, 0)).add(opts.off || V(0, 0, 0));
    return { cam, look: look.add(opts.lookOff || V(0, 0, 0)) };
  }
  const arcPos = (deg) => { const a = THREE.MathUtils.degToRad(deg); return ARC.c.clone().add(V(Math.sin(a) * ARC.r, 0, -Math.cos(a) * ARC.r)); };
  const arcNorm = (deg) => { const a = THREE.MathUtils.degToRad(deg); return V(-Math.sin(a), 0, Math.cos(a)); };

  function measure() {
    for (const [k, o] of Object.entries({ jira, agent, harness, judge, report, diff: diffs[0], card: cards[0].o })) {
      sizes[k] = { w: o.element.offsetWidth, h: o.element.offsetHeight };
    }
    const rowsEl = jiraEl.querySelector('.jr-rows');
    Object.assign(rowGeom, { top: rowsEl.offsetTop, left: rowsEl.offsetLeft, w: rowsEl.offsetWidth, h: 44 });
  }

  function rowWorld(index) {
    const { w, h } = sizes.jira;
    return V(-w / 2 + rowGeom.left + rowGeom.w / 2, h / 2 - (rowGeom.top + index * rowGeom.h + rowGeom.h / 2), 2);
  }
  const popPos = (i) => V([-430, 0, 430][i], sizes.jira.h / 2 + 40 + [0, 36, 0][i], 300);
  const slotPos = (i) => V(BOX.xs[i], BOX.y - 30, BOX.z + 160);
  const agentPos = () => V(0, BOX.y + 10, BOX.z - BOX.d / 2 + 160);
  const notePos = () => { const a = agentPos(); return V(-sizes.agent.w / 2 + sizes.card.w * 0.4, a.y + sizes.agent.h / 2 + 85, a.z + 70); };

  function layout() {
    const aspect = camera.aspect;
    // Panels
    agent.position.copy(agentPos());
    const dDeg = ARC.deg[0];
    diffGroup.position.copy(arcPos(dDeg));
    diffGroup.rotation.y = -THREE.MathUtils.degToRad(dDeg);
    const gap = 24, dw = sizes.diff.w;
    const dh = diffs.map((o) => o.element.offsetHeight), dmax = Math.max(...dh);
    diffs[0].position.set(-(dw + gap) / 2, (dmax - dh[0]) / 2, 18); diffs[0].rotation.y = 0.07;
    diffs[1].position.set((dw + gap) / 2, (dmax - dh[1]) / 2, 18); diffs[1].rotation.y = -0.07;
    harness.position.copy(arcPos(ARC.deg[1])); harness.rotation.y = -THREE.MathUtils.degToRad(ARC.deg[1]);
    judge.position.copy(arcPos(ARC.deg[2])); judge.rotation.y = -THREE.MathUtils.degToRad(ARC.deg[2]);
    report.position.copy(REPORT);

    // Card flights
    const sx = [-1, 0.55, 1];
    flights = cards.map((c, i) => {
      const P = popPos(i), Q = slotPos(i);
      const curve = new THREE.CatmullRomCurve3([
        P,
        P.clone().add(V(sx[i] * 260, 340, -520)),
        V(BOX.xs[i] * 0.55 + sx[i] * 420, 980, (P.z + Q.z) * 0.45),
        V(Q.x + sx[i] * 120, BOX.y + BOX.h / 2 + 520, Q.z + 260),
        V(Q.x, BOX.y + BOX.h / 2 + 140, Q.z + 40),
        Q,
      ], false, 'centripetal');
      return curve;
    });
    trails.forEach((t) => { glScene.remove(t); t.geometry.dispose(); });
    trails.length = 0;
    flights.forEach((curve) => {
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160));
      geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, trailMat);
      glScene.add(line); trails.push(line);
    });

    // Camera keyframes. `stop: true` marks a hold, in order.
    const J = sizes.jira;
    const s0 = frame(V(0, 0, 0), V(0, 0, 1), J.w, J.h, { fw: 0.84, fh: 0.8 });
    const s1 = frame(V(0, 70, 140), V(0.3, 0.12, 1).normalize(), J.w, J.h + 220, { fw: 0.8, fh: 0.8, k: aspect < 1.5 ? 1.12 : 1 });
    const contW = BOX.xs[2] - BOX.xs[0] + BOX.w;
    const s2look = V(0, BOX.y - 40, BOX.z);
    const s2 = frame(s2look, V(0.12, 0.34, 1).normalize(), contW, BOX.h * 1.3, { fw: 0.84, fh: 0.9, k: 1.12 });
    const a = agentPos();
    const s3 = frame(a.clone().add(V(0, 50, 0)), V(0, 0, 1), sizes.agent.w + 40, sizes.agent.h + 220, { fw: 0.78, fh: 0.74 });
    const dPos = arcPos(ARC.deg[0]);
    const s4 = frame(dPos, arcNorm(ARC.deg[0]), dw * 2 + gap + 40, dmax, { fw: aspect < 1.5 ? 0.94 : 0.8, fh: 0.7 });
    const s5 = frame(arcPos(ARC.deg[1]), arcNorm(ARC.deg[1]), sizes.harness.w, sizes.harness.h, { fw: 0.6, fh: 0.7, yaw: -7 });
    const s6 = frame(arcPos(ARC.deg[2]), arcNorm(ARC.deg[2]), sizes.judge.w, sizes.judge.h, { fw: 0.6, fh: 0.7, yaw: -9 });
    const s7 = frame(REPORT, V(0.16, -0.1, 1).normalize(), sizes.report.w, sizes.report.h, { fw: 0.62, fh: 0.68 });
    const midArc = (d1, d2, rr) => {
      const m = (d1 + d2) / 2;
      const p = arcPos(m), n = arcNorm(m);
      return { cam: p.clone().add(n.clone().multiplyScalar(rr)).add(V(0, 60, 0)), look: p.clone().add(V(0, -20, 0)) };
    };
    const r45 = s4.cam.distanceTo(dPos), r5 = s5.cam.distanceTo(arcPos(ARC.deg[1]));
    K = [
      { ...s0, stop: true },
      { ...s1, stop: true },
      { cam: V(320, 560, 900), look: V(0, 60, -1200) },
      { cam: V(-220, 1150, -900), look: V(0, -200, -4200) },
      { ...s2, stop: true },
      { cam: V(0, BOX.y + 90, BOX.z + BOX.d / 2 + 900), look: a.clone().add(V(0, 0, 0)) },
      { ...s3, stop: true },
      { cam: V(-40, BOX.y + BOX.h / 2 + 260, a.z + 1000), look: V(200, 0, -7400) },
      { cam: V(260, 700, (a.z + s4.cam.z) / 2), look: dPos.clone().add(V(0, 120, 0)) },
      { ...s4, stop: true },
      midArc(ARC.deg[0], ARC.deg[1], (r45 + r5) / 2),
      { ...s5, stop: true },
      midArc(ARC.deg[1], ARC.deg[2], r5),
      { ...s6, stop: true },
      { cam: V(2300, 900, -10900), look: REPORT.clone().add(V(0, -150, 0)) },
      { ...s7, stop: true },
    ];
    stopIdx = K.map((k, i) => (k.stop ? i : -1)).filter((i) => i >= 0);
    camCurve = new THREE.CatmullRomCurve3(K.map((k) => k.cam), false, 'centripetal');
    lookCurve = new THREE.CatmullRomCurve3(K.map((k) => k.look), false, 'centripetal');
    // Arc-length table so travel speed is even across waypoints.
    const N = 3000;
    lens = new Float32Array(N + 1);
    let prev = camCurve.getPoint(0);
    for (let i = 1; i <= N; i++) { const q = camCurve.getPoint(i / N); lens[i] = lens[i - 1] + q.distanceTo(prev); prev = q; }
  }

  const lenAt = (u) => lens[Math.round(u * (lens.length - 1))];
  function uForLen(L) {
    let lo = 0, hi = lens.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (lens[m] < L) lo = m + 1; else hi = m; }
    return lo / (lens.length - 1);
  }
  const uOfIdx = (i) => i / (K.length - 1);

  // Spline parameter for scroll progress, with eased holds.
  function cameraParam(p) {
    for (let i = 0; i < HOLDS.length; i++) {
      const [a, b] = HOLDS[i];
      if (p <= b) {
        if (p >= a || i === 0) return { u: uOfIdx(stopIdx[i]), hold: i, ht: range(p, a, b), travel: 1 };
        const t = range(p, HOLDS[i - 1][1], a);
        const L0 = lenAt(uOfIdx(stopIdx[i - 1])), L1 = lenAt(uOfIdx(stopIdx[i]));
        return { u: uForLen(lerp(L0, L1, ease(t))), from: i - 1, travel: t };
      }
    }
    return { u: 1, hold: HOLDS.length - 1, ht: 1, travel: 1 };
  }

  const tmp = new THREE.Vector3();
  let lastHud = -1;
  function render(p) {
    // Camera
    const cp = cameraParam(p);
    camera.position.copy(camCurve.getPoint(cp.u));
    const look = lookCurve.getPoint(cp.u);
    if (cp.hold != null && cp.hold > 0) {
      // Slow push-in while holding so the frame never feels frozen.
      tmp.copy(look).sub(camera.position).normalize().multiplyScalar((cp.ht - 0.5) * 40);
      camera.position.add(tmp);
    }
    camera.lookAt(look);
    camera.updateMatrixWorld();

    // Jira sort, then the three picks lift out
    const st = range(p, SORT[0], SORT[1]);
    jiraEl.style.setProperty('--sort', ease(range(st, 0, 0.25)).toFixed(3));
    const pop = range(p, POP[0], POP[1]);
    for (const r of rows) {
      const k = ease(range(st, 0.15 + r.from * 0.012, 0.75 + r.from * 0.012));
      r.el.style.transform = `translateY(${(lerp(r.from, r.to, k) * rowGeom.h).toFixed(1)}px)`;
      r.el.classList.toggle('ghost', r.card >= 0 && pop > 0.15);
      r.el.classList.toggle('pick', r.card >= 0 && st > 0.6);
    }
    // Cards
    cards.forEach((c, i) => {
      const o = c.o;
      const ft = ease(range(p, FLY[0] + i * 0.01, FLY[1] - (2 - i) * 0.01));
      if (ft <= 0) {
        const t = easeOut(range(pop, i * 0.12, 0.76 + i * 0.12));
        const from = rowWorld(pickRows[i].to);
        o.position.lerpVectors(from, popPos(i), t);
        o.position.z = lerp(2, popPos(i).z, t);
        o.rotation.set(lerp(0, -0.12, t), [0.16, 0, -0.16][i] * t, 0);
        o.scale.setScalar(lerp(0.9, 1, t));
        c.el.style.opacity = clamp01(t * 4).toFixed(3);
        trails[i].geometry.setDrawRange(0, 0);
      } else {
        const sx = [-1, 0.6, 1][i];
        o.position.copy(flights[i].getPoint(ft));
        const s = Math.sin(Math.PI * ft);
        o.rotation.set(-0.12 * (1 - ft) - 0.35 * s, [0.16, 0, -0.16][i] * (1 - ft) + 0.5 * sx * s, -0.22 * sx * s);
        o.scale.setScalar(lerp(1, 1.55, ft));
        c.el.style.opacity = '1';
        trails[i].geometry.setDrawRange(0, Math.floor(ft * 161));
      }
      if (i === PATH_BOX) {
        // On the way into its container the ticket rises to sit above the agent's screen.
        const t = ease(range(p, HOLDS[2][1] + 0.01, HOLDS[3][0] - 0.005));
        if (t > 0) {
          o.position.lerp(notePos(), t);
          o.rotation.set(o.rotation.x * (1 - t), 0.0, 0);
          o.scale.setScalar(lerp(1.55, 0.8, t));
        }
      }
    });
    // Fade the path box's front wall as the camera passes through it.
    const fz = BOX.z + BOX.d / 2;
    boxes[PATH_BOX].front.element.style.setProperty('--o', clamp01((camera.position.z - fz - 120) / 900).toFixed(3));

    // Scrubbed panel content
    for (const s of scrub) {
      const lp = range(p, s.a, s.b);
      for (const it of s.items) {
        const t = Math.round(range(lp, it.s, it.e) * 1000) / 1000;
        if (t !== it.last) { it.el.style.setProperty('--t', t); it.el.classList.toggle('on', t >= 1); it.last = t; }
      }
    }

    // HUD: fade out mid-travel, swap copy, fade back in.
    let hi, hv;
    if (cp.hold != null) { hi = STEP_OF_HOLD[cp.hold]; hv = 1; } else {
      const t = cp.travel;
      hi = STEP_OF_HOLD[t < 0.5 ? cp.from : cp.from + 1];
      hv = clamp01(Math.abs(t - 0.5) * 3.4 - 0.35);
    }
    hud.style.setProperty('--hud', hv.toFixed(3));
    if (hi !== lastHud) {
      const s = steps[hi - 1];
      hud.querySelector('.rp-hud-n span').textContent = s.n.padStart(2, '0');
      hud.querySelector('.rp-hud-t').textContent = s.t;
      hud.querySelector('.rp-hud-p').textContent = s.p;
      [...rail.children].forEach((li, j) => { li.className = j + 1 === hi ? 'on' : j + 1 < hi ? 'done' : ''; });
      lastHud = hi;
    }

    // Group fades by scroll window, times a soft distance fog so far panels sink into the dark.
    const win = ([a, b, c, d]) => Math.min(range(p, a - 1e-6, b), 1 - range(p, c, d + 1e-6));
    const fog = (o) => clamp01((7200 - camera.position.distanceTo(o.getWorldPosition(tmp))) / 2400);
    const wb = win(SHOW.boxes), wl = win(SHOW.late), wr = win(SHOW.report);
    boxes.forEach((b) => b.g.children.forEach((w) => w.element.style.setProperty('--fog', (wb * fog(w)).toFixed(3))));
    for (const o of [...diffs, harness, judge]) o.element.style.opacity = (wl * fog(o)).toFixed(3);
    report.element.style.opacity = (wr * fog(report)).toFixed(3);
    agent.element.style.opacity = (wb * fog(agent)).toFixed(3);
    jira.element.style.opacity = fog(jira).toFixed(3);

    // Hide CSS objects behind or right against the lens.
    scene.traverse((o) => {
      if (!o.isCSS3DObject) return;
      tmp.setFromMatrixPosition(o.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      o.visible = tmp.z < -60 && o.element.style.opacity !== '0.000' && o.element.style.getPropertyValue('--fog') !== '0.000';
    });
    scene.updateMatrixWorld();

    gl.render(glScene, camera);
    css.render(scene, camera);
  }

  // ---- sizing, scroll, loop ----
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    gl.setSize(w, h, false);
    css.setSize(w, h);
    document.documentElement.style.setProperty('--sbw', `${innerWidth - document.documentElement.clientWidth}px`);
    measure();
    layout();
    render(cur);
  }
  const progress = () => {
    const r = track.getBoundingClientRect();
    return clamp01(-r.top / (r.height - stage.clientHeight));
  };
  let target = 0, cur = 0, raf = 0, last = 0, onScreen = true;
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    cur += (target - cur) * (1 - Math.exp(-dt * 9));
    if (Math.abs(target - cur) < 0.00005) cur = target; else kick();
    render(cur);
    root.dataset.settled = cur === target ? '1' : '0';
    if (cur === target) last = 0;
  }
  function kick() { if (!raf && onScreen) raf = requestAnimationFrame(tick); }
  const onScroll = () => { target = progress(); kick(); };
  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; if (onScreen) onScroll(); }, { rootMargin: '200px 0px' });
  io.observe(track);

  css.render(scene, camera); // attach the DOM so it can be measured
  cur = target = progress();
  resize();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', resize);
  root.dispatchEvent(new CustomEvent('replay:ready'));

  // Teardown: put every panel back where it came from and return to the static layout.
  return () => {
    removeEventListener('scroll', onScroll);
    removeEventListener('resize', resize);
    io.disconnect();
    cancelAnimationFrame(raf);
    for (const [el, parent, next] of moved) {
      el.removeAttribute('style');
      parent.insertBefore(el, next);
    }
    rows.forEach((r) => { r.el.style.transform = ''; r.el.classList.remove('ghost'); r.el.classList.add(...(r.card >= 0 ? ['pick'] : [])); });
    scrub.forEach((s) => s.items.forEach((it) => { it.el.style.removeProperty('--t'); it.el.classList.remove('on'); }));
    css.domElement.remove();
    gl.dispose();
    root.classList.remove('is-3d');
  };
}
