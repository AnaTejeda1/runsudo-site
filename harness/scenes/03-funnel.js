/* /harness/scenes/03-funnel.js — STEP 03 · DISCOVER (pause frame).
 * 186 listed tickets rain into a grid while the camera dives in. During the hold the funnel plays out:
 * 93 out_of_window and 31 excluded peel away into dim side piles that stay counted, 62 scoreable drop
 * into the second tier, and 30 are drawn into the front tier with "seed": 3676299815 lit. #15169 is one of
 * them. Labels are the real run.json funnel keys; the counters tick as tiles land. */
(() => {
  const H = window.Harness;
  if (!H) return;

  const SEED = '3676299815';
  let S = null;

  function beam(api, a, b, cls) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const L = Math.hypot(dx, dy, dz) || 1;
    const pl = api.plane({
      x: a.x, y: a.y, z: a.z, w: L, h: 1, center: false, fog: false,
      rz: (Math.asin(dy / L) * 180) / Math.PI,
      ry: (Math.atan2(-dz, dx) * 180) / Math.PI,
    });
    return { pl, inner: api.el('div', 'f-beam ' + (cls || ''), null, pl) };
  }

  /* grid slot positions, centred on (cx, cy); a short last row is centred too */
  function grid(n, cols, tw, th, gap, cx, cy, z) {
    const rows = Math.ceil(n / cols);
    const W = cols * (tw + gap) - gap, Hh = rows * (th + gap) - gap;
    const out = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = r === rows - 1 ? n - r * cols : cols;
      const rowW = inRow * (tw + gap) - gap;
      out.push({ x: cx - rowW / 2 + c * (tw + gap) + tw / 2, y: cy - Hh / 2 + r * (th + gap) + th / 2, z });
    }
    return { pts: out, W, H: Hh, left: cx - W / 2, top: cy - Hh / 2, right: cx + W / 2, bottom: cy + Hh / 2, cx, cy, z, tw, th };
  }

  function config(m) {
    if (m)
      return {
        A: grid(186, 18, 8, 6, 2.5, -72, -196, -10),
        OUT: grid(93, 9, 6, 5, 2, 112, -190, -90),
        EXC: grid(31, 8, 6, 5, 2, 112, -86, -90),
        B: grid(62, 16, 8, 6, 2.5, -72, -78, 10),
        C: grid(30, 5, 56, 19, 5, 0, 88, 50),
        exCard: null,
        bg: false,
        lbl: 10,
      };
    return {
      A: grid(186, 31, 15, 11, 3, -30, -214, -150),
      OUT: grid(93, 12, 10, 8, 3, 352, -196, -210),
      EXC: grid(31, 8, 10, 8, 3, 352, -30, -210),
      B: grid(62, 16, 15, 11, 3, -30, -42, -50),
      C: grid(30, 5, 72, 23, 7, -30, 150, 60),
      exCard: { x: 330, y: 104, z: -70, w: 290 },
      bg: true,
      lbl: 13,
    };
  }

  function label(api, x, y, z, html, cls) {
    const pl = api.plane({ x, y, z, center: false });
    const c = api.el('div', 'f-lbl ' + (cls || ''), html, pl);
    return { pl, c, n: c.querySelector('.f-n') };
  }

  H.registerScene({
    id: '03-funnel',
    mount(root, api) {
      const m = api.mobile;
      const C = config(m);
      const rand = api.rng(186);
      S = { C, tiles: [], chips: [] };

      // ---- who goes where (deterministic): 93 out of window, 31 excluded, 62 scoreable, 30 drawn
      const idx = Array.from({ length: 186 }, (_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      const fate = new Array(186);
      idx.forEach((a, k) => { fate[a] = k < 93 ? ['out', k] : k < 124 ? ['exc', k - 93] : ['score', k - 124]; });
      // order inside each destination follows the source order so the motion reads as a sweep
      const byDest = { out: [], exc: [], score: [] };
      for (let a = 0; a < 186; a++) byDest[fate[a][0]].push(a);
      const slotOf = new Array(186);
      for (const d in byDest) byDest[d].forEach((a, k) => (slotOf[a] = k));
      const sRand = api.rng(3676299815);
      const sIdx = Array.from({ length: 62 }, (_, i) => i);
      for (let i = sIdx.length - 1; i > 0; i--) { const j = Math.floor(sRand() * (i + 1)); [sIdx[i], sIdx[j]] = [sIdx[j], sIdx[i]]; }
      const drawn = new Map(); // B slot -> C slot
      sIdx.slice(0, 30).sort((a, b) => a - b).forEach((b, k) => drawn.set(b, k));
      S.FOCUS_C = m ? 7 : 8;

      // ---- background code cards (parallax layer)
      if (C.bg) {
        S.disc = api.plane({ x: -560, y: 350, z: -560, w: 300, rz: -2 });
        S.discC = api.el(
          'div',
          'h-card fn-card f-bg',
          `<div class="h-card-head"><span class="path">bt/discover.py</span></div>
<pre><span class="ln f-d0"><span class="tk-k">def</span> <span class="tk-f">discover</span><span class="tk-o">(…)</span></span><span class="ln f-d1"><span class="tk-k">def</span> <span class="tk-f">fresh_seed</span><span class="tk-o">(…)</span></span></pre>`,
          S.disc
        );
        S.gh = api.plane({ x: 500, y: 330, z: -560, w: 300, rz: 2 });
        S.ghC = api.el(
          'div',
          'h-card fn-card f-bg',
          `<div class="h-card-head"><span class="path">bt/gh.py</span></div>
<pre><span class="ln f-g0"><span class="tk-k">def</span> <span class="tk-f">resolve_fix</span><span class="tk-o">(…)</span></span><span class="ln f-g1"><span class="tk-k">def</span> <span class="tk-f">closing_commit</span><span class="tk-o">(…)</span></span><span class="ln f-g2"><span class="tk-k">def</span> <span class="tk-f">closes_issue</span><span class="tk-o">(…)</span></span></pre>`,
          S.gh
        );
        S.d0 = S.discC.querySelector('.f-d0');
        S.d1 = S.discC.querySelector('.f-d1');
        S.g0 = S.ghC.querySelector('.f-g0');
      }

      // ---- ghost slots: where tickets were listed / scored (they stay as outlines)
      const ghost = (G, cls) => {
        const pl = api.plane({ x: G.cx, y: G.cy, z: G.z - 1, w: G.W, h: G.H, fog: false });
        const g = api.el('div', 'f-ghost ' + cls, null, pl);
        g.style.width = G.W + 'px';
        g.style.height = G.H + 'px';
        for (const q of G.pts) {
          const s = api.el('i', null, null, g);
          s.style.left = (q.x - G.tw / 2 - G.left).toFixed(1) + 'px';
          s.style.top = (q.y - G.th / 2 - G.top).toFixed(1) + 'px';
          s.style.width = G.tw + 'px';
          s.style.height = G.th + 'px';
        }
        return g;
      };
      S.ghostA = ghost(C.A, 'is-a');
      S.ghostB = ghost(C.B, 'is-b');
      S.ghostO = ghost(C.OUT, 'is-o');
      S.ghostE = ghost(C.EXC, 'is-e');

      // ---- funnel edges (A → B → C)
      const bz = 0;
      S.beams = [
        beam(api, { x: C.A.left, y: C.A.bottom + 6, z: C.A.z }, { x: C.B.left - 4, y: C.B.top - 6, z: C.B.z }, ''),
        beam(api, { x: C.A.right, y: C.A.bottom + 6, z: C.A.z }, { x: C.B.right + 4, y: C.B.top - 6, z: C.B.z }, 'is-r'),
        beam(api, { x: C.B.left - 4, y: C.B.bottom + 6, z: C.B.z }, { x: C.C.left - 6, y: C.C.top - 8, z: C.C.z + bz }, 'is-acc'),
        beam(api, { x: C.B.right + 4, y: C.B.bottom + 6, z: C.B.z }, { x: C.C.right + 6, y: C.C.top - 8, z: C.C.z + bz }, 'is-acc is-r'),
      ];

      // ---- labels: the real run.json keys
      const ly = (G) => G.top - (m ? 17 : 24);
      S.lA = label(api, C.A.left, ly(C.A), C.A.z, `<span class="f-k">"listed"</span><span class="f-o">: </span><b class="f-n">0</b>`, 'is-a');
      S.lO = label(api, C.OUT.left, ly(C.OUT), C.OUT.z, `<span class="f-k">"out_of_window"</span><span class="f-o">: </span><b class="f-n">0</b>`, 'is-o');
      S.lE = label(api, C.EXC.left, ly(C.EXC), C.EXC.z, `<span class="f-k">"excluded"</span><span class="f-o">: </span><b class="f-n">0</b>`, 'is-e');
      S.lB = label(api, C.B.left, ly(C.B), C.B.z, `<span class="f-k">"scoreable"</span><span class="f-o">: </span><b class="f-n">0</b>`, 'is-b');
      S.lC = label(api, C.C.left, ly(C.C) - (m ? 0 : 2), C.C.z, `<b class="f-n">0</b><span class="f-o"> drawn with </span><span class="f-seed"><span class="f-k">"seed"</span><span class="f-o">: </span><span class="f-sv">${SEED}</span></span>`, 'is-c');
      S.seed = S.lC.c.querySelector('.f-seed');
      S.seedHalo = api.halo(S.seed, 'accent');
      S.note = label(api, C.OUT.left, C.EXC.bottom + (m ? 8 : 12), C.EXC.z, m ? 'counted, never dropped' : 'Counted in the total, never dropped.', 'is-note');

      // exclusion record (desktop) — the reason travels with the count
      if (C.exCard) {
        const X = C.exCard;
        S.ex = api.plane({ x: X.x, y: X.y, z: X.z, w: X.w });
        S.exC = api.el(
          'div',
          'h-card json-card f-ex',
          `<div class="h-card-head"><span class="path">run.json · exclusion</span><span class="kind">counted</span></div>
<pre>{ <span class="tk-p">"number"</span>: <span class="tk-n">15360</span>,
  <span class="tk-p">"reason"</span>: <span class="tk-s">"unresolved"</span>,
  <span class="tk-p">"detail"</span>: <span class="tk-s">"no usable linked fix"</span> }</pre>`,
          S.ex
        );
        S.exHalo = api.halo(S.exC, 'bad');
      }

      // ---- the 186 tiles
      for (let a = 0; a < 186; a++) {
        const [dest] = fate[a];
        const k = slotOf[a];
        const A0 = C.A.pts[a];
        const D = dest === 'out' ? C.OUT.pts[k] : dest === 'exc' ? C.EXC.pts[k] : C.B.pts[k];
        const pl = api.plane({ x: A0.x, y: A0.y, z: A0.z, fog: false });
        const t = api.el('i', 'f-tile', null, pl);
        t.style.width = C.A.tw + 'px';
        t.style.height = C.A.th + 'px';
        S.tiles.push({
          pl, t, a, dest, k, A0, D,
          sd: dest === 'score' ? 1 : dest === 'out' ? C.OUT.tw / C.A.tw : C.EXC.tw / C.A.tw,
          drop: { x: A0.x + (rand() - 0.5) * 140, y: A0.y - 420 - rand() * 260, z: A0.z + 160 + rand() * 220 },
          ph: rand(),
          cs: dest === 'score' && drawn.has(k) ? drawn.get(k) : -1,
          cls: '',
        });
      }
      // ---- the 30 drawn chips
      const scoreTiles = S.tiles.filter((q) => q.cs >= 0).sort((x, y) => x.cs - y.cs);
      scoreTiles.forEach((q) => {
        const P = C.C.pts[q.cs];
        const pl = api.plane({ x: P.x, y: P.y, z: P.z, fog: false });
        const focus = q.cs === S.FOCUS_C;
        const c = api.el('div', 'f-chip' + (focus ? ' is-focus' : ''), `<i></i>${focus ? '#15169' : '#·····'}`, pl);
        c.style.width = C.C.tw + 'px';
        c.style.height = C.C.th + 'px';
        const ch = { pl, c, P, from: q.D, i: q.cs, tile: q };
        if (focus) S.focusHalo = api.halo(c, 'accent');
        S.chips.push(ch);
      });
    },

    update(p, api) {
      if (!S) return;
      const e = api.ease;
      const C = S.C;
      const ps = api.pause ? api.pause.start : 0.3, pe = api.pause ? api.pause.end : 0.7;
      const Hh = (h) => ps + (pe - ps) * h; // hold fraction → local p
      const PI = Math.PI;

      // beat windows (local p)
      const LIST = [0.02, 0.27];
      const OUTW = [Hh(0.02), Hh(0.3)];
      const EXCW = [Hh(0.2), Hh(0.44)];
      const SCOW = [Hh(0.42), Hh(0.6)];
      const SAMW = [Hh(0.62), Hh(0.84)];

      let nA = 0, nO = 0, nE = 0, nB = 0, nC = 0;
      const unDim = e.inOutSine(api.range(p, SAMW[0] + 0.02, SAMW[1]));

      for (const q of S.tiles) {
        // arrival (listing): rain down from above in a row-major sweep
        const arr = api.stagger(p, q.a, 186, LIST[0], LIST[1], 0.28, e.outQuint);
        if (arr >= 0.5) nA++;
        let x = api.lerp(q.drop.x, q.A0.x, arr), y = api.lerp(q.drop.y, q.A0.y, arr), z = api.lerp(q.drop.z, q.A0.z, arr);
        let rx = (1 - arr) * 70, ry = 0, s = 1, op = arr;
        let cls = 'is-listed';
        // departure to its destination
        const W = q.dest === 'out' ? OUTW : q.dest === 'exc' ? EXCW : SCOW;
        const n = q.dest === 'out' ? 93 : q.dest === 'exc' ? 31 : 62;
        const f = api.stagger(p, q.k, n, W[0], W[1], q.dest === 'score' ? 0.45 : 0.32, e.inOutCubic);
        if (f > 0) {
          const arc = Math.sin(f * PI);
          x = api.lerp(q.A0.x, q.D.x, f);
          y = api.lerp(q.A0.y, q.D.y, f) - arc * (q.dest === 'score' ? 18 : 40);
          z = api.lerp(q.A0.z, q.D.z, f) + arc * (q.dest === 'score' ? 50 : 150);
          rx = arc * (q.dest === 'score' ? -30 : -70) * (q.ph > 0.5 ? 1 : -1);
          ry = arc * (q.dest === 'score' ? 0 : 50);
          s = api.lerp(1, q.sd, f);
          if (f >= 0.55) cls = q.dest === 'out' ? 'is-out' : q.dest === 'exc' ? 'is-exc' : 'is-score';
          if (f >= 0.5) { if (q.dest === 'out') nO++; else if (q.dest === 'exc') nE++; else nB++; }
        }
        // drawn tiles hand over to their chip; the rest of the scoreable tier dims (still counted)
        if (q.dest === 'score' && q.cs >= 0) {
          const g = api.stagger(p, q.cs, 30, SAMW[0], SAMW[1], 0.4, e.inOutCubic);
          op *= 1 - api.range(g, 0, 0.25);
        } else if (q.dest === 'score') {
          op *= 1 - 0.55 * unDim;
        }
        if (cls !== q.cls) { q.cls = cls; q.t.className = 'f-tile ' + cls; }
        api.place(q.pl, { x, y, z, rx, ry, s });
        api.opacity(q.t, op);
      }

      for (const ch of S.chips) {
        const g = api.stagger(p, ch.i, 30, SAMW[0], SAMW[1], 0.4, e.outCubic);
        if (g >= 0.5) nC++;
        const arc = Math.sin(g * PI);
        api.place(ch.pl, {
          x: api.lerp(ch.from.x, ch.P.x, g),
          y: api.lerp(ch.from.y, ch.P.y, g),
          z: api.lerp(ch.from.z, ch.P.z, g) + arc * 90,
          s: api.lerp(C.A.tw / C.C.tw, 1, e.outBack(g, 1.2)),
          rx: arc * -25,
        });
        api.opacity(ch.c, api.range(g, 0, 0.2));
      }

      // focus ticket: lights after the draw and keeps its glow on the way out
      const fl = e.inOutSine(api.range(p, SAMW[1] - 0.01, SAMW[1] + 0.05));
      if (S.focusHalo) api.opacity(S.focusHalo, fl);
      S.chips[S.FOCUS_C] && S.chips[S.FOCUS_C].c.classList.toggle('is-lit', fl > 0.5);

      // counters + labels
      api.count(S.lA.n, nA);
      api.count(S.lO.n, nO);
      api.count(S.lE.n, nE);
      api.count(S.lB.n, nB);
      api.count(S.lC.n, nC);
      api.opacity(S.lA.c, e.outCubic(api.range(p, LIST[0], LIST[0] + 0.06)));
      api.opacity(S.lO.c, e.outCubic(api.range(p, OUTW[0], OUTW[0] + 0.03)));
      api.opacity(S.lE.c, e.outCubic(api.range(p, EXCW[0], EXCW[0] + 0.03)));
      api.opacity(S.lB.c, e.outCubic(api.range(p, SCOW[0], SCOW[0] + 0.03)));
      api.opacity(S.lC.c, e.outCubic(api.range(p, SAMW[0] - 0.02, SAMW[0] + 0.02)));
      api.opacity(S.note.c, 0.85 * e.outCubic(api.range(p, EXCW[1] - 0.02, EXCW[1] + 0.03)));
      const seedOn = e.inOutSine(api.range(p, SAMW[0] - 0.02, SAMW[0] + 0.03));
      api.opacity(S.seedHalo, seedOn * (1 - 0.6 * api.range(p, SAMW[1] + 0.04, pe + 0.1)));
      S.seed.classList.toggle('is-lit', seedOn > 0.5);
      S.lA.c.classList.toggle('is-active', p < OUTW[1]);
      S.lB.c.classList.toggle('is-active', p >= SCOW[0] && p < SAMW[0]);

      // ghosts
      api.opacity(S.ghostA, 0.9 * e.outCubic(api.range(p, LIST[0], LIST[1] * 0.6)));
      api.opacity(S.ghostO, e.outCubic(api.range(p, OUTW[0], OUTW[0] + 0.04)));
      api.opacity(S.ghostE, e.outCubic(api.range(p, EXCW[0], EXCW[0] + 0.04)));
      api.opacity(S.ghostB, e.outCubic(api.range(p, SCOW[0], SCOW[0] + 0.04)));

      // funnel edges draw in as the scoreable tier fills, then the draw
      const b1 = e.inOutCubic(api.range(p, SCOW[0] - 0.02, SCOW[1]));
      const b2 = e.inOutCubic(api.range(p, SAMW[0] - 0.02, SAMW[1] - 0.04));
      S.beams.forEach((b, i) => {
        const v = i < 2 ? b1 : b2;
        api.transform(b.inner, `scaleX(${v.toFixed(4)})`);
        api.opacity(b.inner, v);
      });

      // exclusion record
      if (S.exC) {
        const xi = e.outCubic(api.range(p, Hh(0.34), Hh(0.46)));
        api.opacity(S.exC, xi);
        api.place(S.ex, { y: C.exCard.y + (1 - xi) * 30, rx: (1 - xi) * -24, z: C.exCard.z - (1 - xi) * 80 });
        api.opacity(S.exHalo, 0.45 * api.bump(p, Hh(0.36), Hh(0.44), Hh(0.56), Hh(0.68)));
      }

      // background cards: highlight the function doing the work
      if (S.discC) {
        const bgOut = 1 - e.inOutSine(api.range(p, pe + 0.02, pe + 0.14));
        api.opacity(S.discC, e.outCubic(api.range(p, 0.0, 0.2)) * bgOut);
        api.opacity(S.ghC, e.outCubic(api.range(p, 0.08, 0.28)) * bgOut);
        S.d0.classList.toggle('hl', p > LIST[0] && p < LIST[1] + 0.02);
        S.g0.classList.toggle('hl', p > OUTW[0] && p < SCOW[1]);
        S.d1.classList.toggle('hl', p > SAMW[0] - 0.02 && p < SAMW[1] + 0.03);
        api.place(S.disc, { y: 350 + api.lerp(30, -30, p) });
        api.place(S.gh, { y: 330 + api.lerp(-30, 30, p) });
      }

      // light: tier A while listing → piles while peeling → tier B → front tier with the seed
      const toPile = e.inOutCubic(api.range(p, OUTW[0], OUTW[0] + 0.08)) * (1 - e.inOutCubic(api.range(p, SCOW[0] - 0.04, SCOW[0] + 0.04)));
      const toB = e.inOutCubic(api.range(p, SCOW[0] - 0.04, SCOW[0] + 0.04));
      const toC = e.inOutCubic(api.range(p, SAMW[0] - 0.03, SAMW[0] + 0.06));
      let lx = C.A.cx, ly = C.A.cy;
      lx = api.lerp(lx, (C.A.cx + C.OUT.cx) / 2, toPile); ly = api.lerp(ly, (C.A.cy + C.EXC.cy) / 2, toPile);
      lx = api.lerp(lx, C.B.cx, toB); ly = api.lerp(ly, C.B.cy, toB);
      lx = api.lerp(lx, C.C.cx, toC); ly = api.lerp(ly, C.C.cy, toC);
      api.setLight({ x: lx, y: ly, z: 30, colors: { accent: 1 - 0.5 * toPile, bad: 0.35 * toPile, white: 0.3 * toPile } });
    },
  });
})();
