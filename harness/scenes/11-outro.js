/* /harness/scenes/11-outro.js — "Your repo · next" (end caption with CTAs).
 * The camera starts close on the last stage and pulls back, revealing the whole lifecycle laid out
 * in space: a constellation whose nodes sit where each stage sits in the world (H.LAYOUT, scaled),
 * joined by the path the ticket took. A comet runs the path from the first node to the last and
 * lights each stage as it passes, then a new lit diamond (your repo) settles at the end.
 * The left of the frame stays clear for the end caption and its buttons. Pure function of p. */
(() => {
  const H = window.Harness;
  if (!H) return;

  // one real fact per stage (from the brief; nothing invented)
  const FACTS = {
    '00-intro': ['', 'Start', '30 Hugo issues'],
    '01-clone': ['01', 'Clone', 'cache.git'],
    '02-recipe': ['02', 'Build', '3,778 tests ran'],
    '03-funnel': ['03', 'Discover', '186 → 62 → 30'],
    '04-rewind': ['04', 'Rewind', 'base dd3f2731…'],
    '05-baseline': ['05', 'Baseline', '3,803 tests'],
    '06-sandbox': ['06', 'Solve blind', '2 allowed hosts'],
    '07-audit': ['07', 'Audit', 'clean'],
    '08-verify': ['08', 'Verify', '0 newly broken'],
    '09-judge': ['09', 'Blind judge', 'A was ours'],
    '10-publish': ['10', 'Publish', '28 of 30 better'],
  };
  const PAUSES = { '03-funnel': 1, '04-rewind': 1, '06-sandbox': 1, '08-verify': 1, '09-judge': 1, '10-publish': 1 };

  const isMobile = () => (typeof innerWidth === 'number' ? innerWidth <= 760 : false);

  /* constellation coordinates: the stages' real world anchors, squashed into a viewable volume */
  function nodes() {
    const L = (H.LAYOUT || []).filter((q) => FACTS[q.id]);
    const out = L.map((q) => ({
      id: q.id,
      x: q.pos[0] * 0.22,
      y: (q.pos[1] - 5775) * 0.05,
      z: -(q.pos[2] + 5925) * 0.026, // mirrored: later stages sit nearer the viewer
    }));
    // the first three stages sit close together in the world; spread their labels apart
    const nudge = { '00-intro': [-40, -46], '02-recipe': [-20, 34] };
    out.forEach((q) => { const d = nudge[q.id]; if (d) { q.x += d[0]; q.y += d[1]; } });
    // the next stage: your repo, a step past Publish along the same heading
    const a = out[out.length - 2], b = out[out.length - 1];
    if (a && b) out.push({ id: 'you', x: b.x + (b.x - a.x) * 0.6 + 90, y: b.y + 70, z: b.z + 60 });
    // centre the whole set on the anchor
    const cx = out.reduce((s, q) => s + q.x, 0) / out.length;
    const cy = (Math.min(...out.map((q) => q.y)) + Math.max(...out.map((q) => q.y))) / 2;
    const cz = out.reduce((s, q) => s + q.z, 0) / out.length;
    out.forEach((q) => { q.x -= cx; q.y -= cy; q.z -= cz; });
    return out;
  }
  const NODES = nodes();
  const YOU = NODES[NODES.length - 1] || { x: 0, y: 0, z: 0 };
  const PUB = NODES[NODES.length - 2] || YOU;

  let S = null;

  H.registerScene({
    id: '11-outro',
    // Camera: start close on Publish → your repo, then pull back to reveal the whole path.
    get camera() {
      const m = isMobile();
      const sc = m ? 0.62 : 1;
      return [
        { u: 0.06, x: PUB.x * sc, y: (PUB.y - 30) * sc, z: PUB.z * sc, dolly: 360, rx: -10, ry: -16, rz: 2 },
        { u: 0.5, x: 0, y: m ? 30 : 10, z: 0, dolly: m ? -480 : -330, rx: -8, ry: 12, rz: -1, sx: 0.12 },
        { u: 0.98, x: 0, y: m ? 30 : 10, z: 0, dolly: m ? -540 : -400, rx: -6, ry: 18, sx: 0.13 },
      ];
    },
    light: { x: YOU.x, y: YOU.y, z: YOU.z, color: 'accent' },
    radius: 1400,

    mount(root, api) {
      const m = api.mobile;
      S = { m, nodes: [], segs: [] };
      S.G = api.group({ s: m ? 0.62 : 1 });

      NODES.forEach((q, i) => {
        const you = q.id === 'you';
        const f = FACTS[q.id];
        const pause = !!PAUSES[q.id];
        const pl = api.plane({ cls: 'ot-car', x: q.x, y: q.y, z: q.z, center: false }, S.G);
        const html = you
          ? '<i class="ot-dia is-you"></i><span class="ot-lbl"><b>Your repo</b><span>next</span></span>'
          : `<i class="ot-dia${pause ? ' is-pause' : ''}"></i><span class="ot-lbl">${f[0] ? `<em>${f[0]}</em>` : ''}<b>${f[1]}</b><span>${f[2]}</span></span>`;
        const c = api.el('div', 'ot-node' + (you ? ' is-you' : '') + (pause ? ' is-pause' : '') + (i % 2 && !m && !you ? ' is-left' : ''), html, pl);
        const halo = you ? api.el('i', 'ot-bloom', null, c) : null;
        S.nodes.push({ q, pl, c, dia: c.querySelector('.ot-dia'), lbl: c.querySelector('.ot-lbl'), halo, you });
      });

      // hairline segments between consecutive nodes, oriented in 3D
      for (let i = 0; i < NODES.length - 1; i++) {
        const a = NODES[i], b = NODES[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        const L = Math.hypot(dx, dy, dz);
        const ry = (Math.atan2(-dz, dx) * 180) / Math.PI;
        const rz = (Math.asin(dy / L) * 180) / Math.PI;
        const pl = api.plane({ cls: 'ot-car', x: a.x, y: a.y, z: a.z, ry, rz, center: false, w: L, h: 1 }, S.G);
        const base = api.el('i', 'ot-seg' + (NODES[i + 1].id === 'you' ? ' is-next' : ''), null, pl);
        const lit = api.el('i', 'ot-seg-lit', null, pl);
        S.segs.push({ a, b, L, pl, base, lit });
      }
      // total path length for the comet
      S.total = S.segs.reduce((s, q) => s + q.L, 0);

      // the comet (a lit point travelling the path)
      S.comet = api.plane({ cls: 'ot-car ot-cometpl', x: NODES[0].x, y: NODES[0].y, z: NODES[0].z, w: 200, h: 200, fog: false }, S.G);
      S.cometDot = api.el('i', 'ot-comet', null, S.comet);
    },

    update(p, api) {
      if (!S) return;
      const E = api.ease;
      // reveal: nodes fade in from the far end backwards as the camera pulls back
      const reveal = 0.3 + 0.7 * api.seg(p, 0.0, 0.45, E.outCubic); // the last stages already glow as we arrive
      // comet runs the path
      const run = api.seg(p, 0.12, 0.74, E.inOutCubic);
      const dist = run * S.total;
      let acc = 0, pos = NODES[0];
      S.segs.forEach((g) => {
        const f = api.clamp((dist - acc) / g.L);
        api.transform(g.lit, `scaleX(${f.toFixed(4)})`);
        api.opacity(g.base, reveal * 0.9);
        if (f > 0 && f < 1) pos = { x: g.a.x + (g.b.x - g.a.x) * f, y: g.a.y + (g.b.y - g.a.y) * f, z: g.a.z + (g.b.z - g.a.z) * f };
        else if (f >= 1) pos = g.b;
        g.f = f;
        acc += g.L;
      });
      api.place(S.comet, { x: pos.x, y: pos.y, z: pos.z });
      api.opacity(S.cometDot, api.bump(p, 0.1, 0.16, 0.72, 0.8));

      const n = S.nodes.length;
      S.nodes.forEach((nd, i) => {
        // nodes appear far → near order of the pull-back: the last stages first
        const vis = api.stagger(reveal, n - 1 - i, n, 0, 1, 0.45, E.outCubic);
        const passed = i === 0 ? run > 0.001 : S.segs[i - 1].f >= 1;
        if (nd.you) {
          const lit = api.seg(p, 0.7, 0.86, E.outCubic);
          api.opacity(nd.c, Math.max(vis * 0.6, lit));
          api.opacity(nd.halo, lit);
          api.transform(nd.dia, `rotate(45deg) scale(${(0.7 + 0.3 * E.outBack(lit)).toFixed(3)})`);
          nd.c.classList.toggle('is-lit', lit > 0.5);
          return;
        }
        api.opacity(nd.c, vis * (passed ? 1 : 0.55));
        nd.c.classList.toggle('is-lit', passed);
      });

      // light follows the comet, then rests on your repo
      const rest = api.seg(p, 0.72, 0.86);
      const sc = S.m ? 0.62 : 1;
      api.setLight({ x: (pos.x + (YOU.x - pos.x) * rest) * sc, y: (pos.y + (YOU.y - pos.y) * rest) * sc, z: (pos.z + (YOU.z - pos.z) * rest) * sc, color: 'accent' });
    },
  });
})();
