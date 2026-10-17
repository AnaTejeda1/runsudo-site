/* /harness/scenes/10-publish.js — Step 10 · Count + publish (pause frame).
 * Approach: compute_counts(…) tallies the 30 tickets of run-20261013-011256 into better / par /
 * worse / error stacks (28 / 0 / 2 / 0). `bt export-site` types out, the public chart stands up,
 * and the tallied stacks fly into its newest column.
 * Hold: the earlier Hugo runs rise left to right (9 → 13 → 20 → 25 → 26 → 28 → 27), a playhead
 * sweeps them and the run panel follows, landing on 28 of 30. The 2 worse stay lit and listed.
 * Then pydantic 14 → 27 and vuejs/core 13 → 24 join as a secondary card; index.json closes it.
 * All numbers are the published runs in data/backtests/index.json. Pure function of p. */
(() => {
  const H = window.Harness;
  if (!H) return;

  // date label, run id, better, par, worse, error (gohugoio/hugo, published)
  const HUGO = [
    ['Sep 17', 'run-20260917-015623', 9, 3, 16, 2],
    ['Sep 22', 'run-20260922-141813', 13, 1, 14, 2],
    ['Sep 30', 'run-20260930-140149', 20, 2, 6, 2],
    ['Oct 2', 'run-20261002-200313', 25, 0, 4, 1],
    ['Oct 5', 'run-20261005-133023', 26, 0, 3, 1],
    ['Oct 7', 'run-20261007-020926', 28, 0, 2, 0],
    ['Oct 9', 'run-20261009-153657', 27, 0, 3, 0],
    ['Oct 13', 'run-20261013-011256', 28, 0, 2, 0],
  ];
  // [day offset from Sep 17, better of 30]
  const LINES = {
    hugo: [[0, 9], [5, 13], [13, 20], [15, 25], [18, 26], [20, 28], [22, 27], [26, 28]],
    pydantic: [[6, 14], [12, 12], [13, 20], [13.5, 25], [15, 25], [16, 26], [18, 28], [20, 25], [22, 26], [26, 27]],
    vue: [[13.6, 13], [15, 18], [16.5, 27], [18, 25], [18.5, 25], [20, 25], [22, 24], [26, 24]],
  };
  const KINDS = ['better', 'par', 'worse', 'error'];
  const LAST = HUGO[HUGO.length - 1];
  // the last run's 30 verdicts as a stacking order (2 worse); positions are illustrative, not ticket ids
  const VERDICTS = Array.from({ length: 30 }, (_, i) => (i === 11 || i === 23 ? 2 : 0));

  let S = null;

  function card(api, o, cls, html, parent) {
    const pl = api.plane(Object.assign({ cls: 'pb-car' }, o), parent);
    const c = api.el('div', cls, html, pl);
    return { pl, c, o };
  }

  function metrics(m) {
    return m
      ? { W: 360, Hh: 456, colW: 20, pitch: 36, unit: 6, cell: 4, left0: 44, top: 150, rows: 30 }
      : { W: 760, Hh: 462, colW: 34, pitch: 58, unit: 8, cell: 6, left0: 70, top: 136, rows: 30 };
  }

  function chartHtml(M, m) {
    const colH = M.rows * M.unit;
    let cols = '';
    HUGO.forEach((r, i) => {
      const x = M.left0 + i * M.pitch;
      const last = i === HUGO.length - 1;
      let segs = '';
      if (!last) {
        KINDS.forEach((k, j) => {
          const n = r[2 + j];
          if (n) segs += `<i class="pb-seg is-${k}" style="height:${n * M.unit}px"></i>`;
        });
      }
      cols +=
        `<div class="pb-col${last ? ' is-last' : ''}" style="left:${x}px;top:${M.top}px;width:${M.colW}px;height:${colH}px">` +
        `<div class="pb-colin">${segs}</div></div>` +
        `<span class="pb-n${last ? ' is-last' : ''}" style="left:${x + M.colW / 2}px;top:${M.top - 22}px">${r[2]}</span>` +
        `<span class="pb-d${last ? ' is-last' : ''}" style="left:${x + M.colW / 2}px;top:${M.top + colH + 8}px">${r[0]}</span>`;
    });
    let axis = '';
    for (const v of [0, 10, 20, 30]) {
      const y = M.top + colH - v * M.unit;
      axis += `<span class="pb-ax" style="top:${y}px;left:${M.left0 - 12}px">${v}</span>` +
        `<i class="pb-grid" style="top:${y}px;left:${M.left0 - 6}px;width:${(HUGO.length - 1) * M.pitch + M.colW + 12}px"></i>`;
    }
    const panel =
      '<div class="pb-panel">' +
      '<p class="pb-eye">Run</p>' +
      `<p class="pb-run">${HUGO[0][1]}</p>` +
      '<p class="pb-big"><span class="pb-bn">9</span><span class="pb-bu">/ 30 better</span></p>' +
      '<dl class="pb-rows">' +
      '<dt><i class="sw par"></i>par</dt><dd class="pb-r-par">3</dd>' +
      '<dt><i class="sw worse"></i>worse</dt><dd class="pb-r-worse">16</dd>' +
      '<dt><i class="sw error"></i>error</dt><dd class="pb-r-error">2</dd>' +
      '</dl>' +
      '<p class="pb-listed"><i class="h-diamond"></i>2 worse, still listed. Each links to both patches and the judge\'s words.</p>' +
      '</div>';
    return (
      '<div class="h-card pb-chart">' +
      '<div class="h-card-head pb-url"><span class="pb-dots"><i></i><i></i><i></i></span><span class="pb-addr">runsudo.dev/backtests/hugo/</span><span class="pb-pub">public</span></div>' +
      '<div class="pb-title"><b>gohugoio/hugo</b><span>Better of 30, per run · judged blind</span></div>' +
      axis +
      cols +
      `<i class="pb-head" style="top:${M.top - 8}px;height:${colH + 16}px"></i>` +
      panel +
      '<div class="counts pb-legend"><span class="better"><i></i>better</span><span class="par"><i></i>par</span><span class="worse"><i></i>worse</span><span class="error"><i></i>no scorable attempt</span></div>' +
      '</div>'
    );
  }

  function linesHtml() {
    const W = 300, Hh = 120, ml = 8, mr = 8, mt = 8, mb = 8;
    const x = (d) => ml + (d / 26) * (W - ml - mr);
    const y = (b) => mt + (1 - b / 30) * (Hh - mt - mb);
    const poly = (k) => LINES[k].map(([d, b]) => `${x(d).toFixed(1)},${y(b).toFixed(1)}`).join(' ');
    const dots = (k) => LINES[k].map(([d, b]) => `<circle cx="${x(d).toFixed(1)}" cy="${y(b).toFixed(1)}" r="2.6"/>`).join('');
    let grid = '';
    for (const v of [0, 15, 30]) grid += `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/>`;
    return (
      '<div class="h-card pb-lines">' +
      '<div class="h-card-head"><span class="path">/backtests/</span><span>better of 30</span></div>' +
      '<div class="pb-lines-leg"><span class="hugo"><i></i>hugo 9 → 28</span><span class="pyd"><i></i>pydantic 14 → 27</span><span class="vue"><i></i>vuejs/core 13 → 24</span></div>' +
      '<div class="pb-lines-body">' +
      `<svg viewBox="0 0 ${W} ${Hh}" width="${W}" height="${Hh}" aria-hidden="true">` +
      `<g class="g">${grid}</g>` +
      `<g class="s vue"><polyline points="${poly('vue')}"/>${dots('vue')}</g>` +
      `<g class="s pyd"><polyline points="${poly('pydantic')}"/>${dots('pydantic')}</g>` +
      `<g class="s hugo"><polyline points="${poly('hugo')}"/>${dots('hugo')}</g>` +
      '</svg><i class="pb-wipe"></i></div>' +
      '</div>'
    );
  }

  H.registerScene({
    id: '10-publish',
    mount(root, api) {
      const m = api.mobile;
      const M = metrics(m);
      S = { m, M };

      /* ---- the public chart (focal) */
      S.Gpos = m ? { x: 0, y: -50, z: 0 } : { x: 36, y: 6, z: 0 };
      S.G = api.group(Object.assign({}, S.Gpos));
      S.chart = card(api, { x: 0, y: 0, z: 0, w: M.W }, 'pb-wrap' + (m ? ' is-m' : ''), chartHtml(M, m), S.G);
      S.chartEl = S.chart.c.querySelector('.pb-chart');
      S.chartEl.style.height = M.Hh + 'px';
      S.cols = [...S.chartEl.querySelectorAll('.pb-colin')];
      S.ns = [...S.chartEl.querySelectorAll('.pb-n')];
      S.ds = [...S.chartEl.querySelectorAll('.pb-d')];
      S.headEl = S.chartEl.querySelector('.pb-head');
      S.run = S.chartEl.querySelector('.pb-run');
      S.bn = S.chartEl.querySelector('.pb-bn');
      S.rPar = S.chartEl.querySelector('.pb-r-par');
      S.rWorse = S.chartEl.querySelector('.pb-r-worse');
      S.rError = S.chartEl.querySelector('.pb-r-error');
      S.listed = S.chartEl.querySelector('.pb-listed');
      S.panel = S.chartEl.querySelector('.pb-panel');
      S.pub = S.chartEl.querySelector('.pb-pub');
      S.chartHalo = api.halo(S.chartEl, 'good');

      // newest column: an empty slot (the tallied stacks land in it) plus its glow
      const colH = M.rows * M.unit;
      const lastX = M.left0 + (HUGO.length - 1) * M.pitch + M.colW / 2 - M.W / 2;
      const colTop = M.top - M.Hh / 2;
      S.slotPos = { x: lastX, y: colTop + colH / 2 };
      S.slot = card(api, { x: lastX, y: colTop + colH / 2, z: 0.6, w: M.colW + 10, h: colH + 10, fog: false }, 'pb-slot', null, S.G);
      S.slotHalo = api.halo(S.slot.c, 'good');

      /* ---- compute_counts tally (approach) */
      S.Tpos = m ? { x: 0, y: -250, z: -40 } : { x: -40, y: -262, z: -60 };
      S.Tend = m ? { x: 0, y: -430, z: -320 } : { x: -60, y: -470, z: -360 };
      S.T = api.group(Object.assign({}, S.Tpos));
      const stackGap = m ? 44 : 70;
      S.stackX = (k) => (k - 1.5) * stackGap + (m ? 0 : 40);
      S.stackBase = m ? 96 : 120;
      S.tallyLbl = KINDS.map((k, i) =>
        card(api, { x: S.stackX(i), y: S.stackBase + (m ? 18 : 22), z: 0 }, 'pb-tl is-' + k,
          `<b>${i === 0 ? 28 : i === 2 ? 2 : 0}</b><span>${k === 'error' ? 'error' : k}</span>`, S.T)
      );
      S.tallyNum = S.tallyLbl.map((q) => q.c.querySelector('b'));
      S.tallyHead = card(api, m ? { x: 0, y: -150, z: 0 } : { x: 40, y: -150, z: 0 }, 'pb-th',
        '<span class="tk-f">compute_counts</span><span class="tk-o">(…)</span> <span class="pb-th-run">· ' + LAST[1] + '</span>', S.T);

      if (!m) {
        S.fn = card(api, { x: -360, y: -10, z: 30, ry: 14, w: 300 }, 'h-card fn-card pb-fn',
          '<div class="h-card-head"><span class="path">bt/summarize.py</span><span>code counts</span></div><pre>' +
            '<span class="ln"><span class="tk-k">def</span> <span class="tk-f">classify_ticket</span><span class="tk-o">(…)</span>:</span>' +
            '<span class="ln tk-c">    # better · par · worse · error</span>' +
            '<span class="ln"> </span>' +
            '<span class="ln hl"><span class="tk-k">def</span> <span class="tk-f">compute_counts</span><span class="tk-o">(…)</span>:</span>' +
            '<span class="ln tk-c">    # every ticket counted, none dropped</span>' +
            '</pre>', S.T);
        // field names only: the per-ticket values live on the published page for this run
        S.tix = card(api, { x: 420, y: -6, z: 10, ry: -16, w: 290 }, 'h-card json-card pb-tix',
          '<div class="h-card-head"><span class="path">tickets.json</span><span class="kind">one row per ticket</span></div><pre>' +
            '{ <span class="tk-p">"number"</span>: <span class="tk-n">15169</span>,\n' +
            '  <span class="tk-p">"verdict"</span>: <span class="tk-s">"better"</span>,\n' +
            '  <span class="tk-p">"pr"</span>: <span class="tk-c">…</span>, <span class="tk-p">"judge"</span>: <span class="tk-c">{…}</span>,\n' +
            '  <span class="tk-p">"solve"</span>: <span class="tk-c">{…}</span>, <span class="tk-p">"tests"</span>: <span class="tk-c">{…}</span>,\n' +
            '  <span class="tk-p">"lines"</span>: <span class="tk-c">{…}</span>, <span class="tk-p">"audit"</span>: <span class="tk-c">{…}</span>,\n' +
            '  <span class="tk-p">"patches"</span>: <span class="tk-c">{…}</span> }</pre>', S.T);
      }

      /* ---- 30 ticket slabs: scattered → tally stacks → newest chart column */
      const rand = api.rng(1013011256);
      const per = [0, 0, 0, 0];
      // final column order: better at the bottom, then par, worse, error (same as the chart)
      const order = [];
      VERDICTS.forEach((v, i) => order.push({ i, v }));
      const colIdx = {};
      let cnt = 0;
      for (const kind of [0, 1, 2, 3]) for (const q of order) if (q.v === kind) colIdx[q.i] = cnt++;
      S.tiles = VERDICTS.map((v, i) => {
        const j = per[v]++;
        const pl = api.plane({ cls: 'pb-car', x: 0, y: 0, z: 0, w: M.colW, h: M.cell });
        const c = api.el('i', 'pb-tile is-' + KINDS[v], null, pl);
        return {
          pl, c, v,
          from: { x: (rand() - 0.5) * (m ? 520 : 1300), y: -420 - rand() * 380, z: -500 - rand() * 600, rz: (rand() - 0.5) * 90 },
          j, // index in its tally stack
          k: colIdx[i], // index in the final column (0 = bottom)
          d: rand(),
        };
      });

      /* ---- export-site terminal (approach) */
      S.term = card(api, m ? { x: 0, y: 70, z: -140, w: 330 } : { x: 360, y: -262, z: -90, ry: -12, w: 420 }, 'h-card term-card pb-term',
        '<div class="h-card-head"><span class="dots"><i></i><i></i><i></i></span><span>bt</span></div><pre>' +
          '<span class="pr">$</span> <span class="pb-t1"></span>\n' +
          '<span class="out pb-t2"></span>\n' +
          '<span class="pr">$</span> <span class="pb-t3"></span>\n' +
          '<span class="ok pb-t4"></span></pre>');
      S.t = [1, 2, 3, 4].map((i) => S.term.c.querySelector('.pb-t' + i));
      S.tStr = [
        m ? 'bt export-site RUN_ID --notes "…"' : 'bt export-site ' + LAST[1] + ' --notes "..."',
        m ? '  scan: host paths, tokens, email' : '  scanned for host paths, tokens, email',
        'node scripts/build-backtests.mjs',
        m ? '  → GitHub Pages' : '  → GitHub Pages · runsudo.dev/backtests/hugo/',
      ];

      if (!m) {
        /* ---- secondary repos + index.json (late hold) */
        S.lines = card(api, { x: 360, y: -350, z: -250, ry: -12, w: 300 }, 'pb-lwrap', linesHtml());
        S.wipe = S.lines.c.querySelector('.pb-wipe');
        S.idx = card(api, { x: -150, y: 300, z: 70, w: 420 }, 'h-card json-card pb-idx',
          '<div class="h-card-head"><span class="path">data/backtests/index.json</span><span class="kind">published row</span></div><pre>' +
            '{ <span class="tk-p">"id"</span>: <span class="tk-s">"run-20261013-011256"</span>, <span class="tk-p">"tickets"</span>: <span class="tk-n">30</span>,\n  ' +
            '<span class="tk-p">"better"</span>: <span class="tk-n">28</span>, <span class="tk-p">"par"</span>: <span class="tk-n">0</span>, ' +
            '<span class="tk-p">"worse"</span>: <span class="tk-n">2</span>, <span class="tk-p">"error"</span>: <span class="tk-n">0</span> }</pre>');
      }

      // contact shadow under the chart
      S.shadow = api.plane({ cls: 'h-shadow', x: 0, y: M.Hh / 2 + 70, z: -40, rx: 90, w: M.W * 1.1, h: 200 }, S.G);
    },

    update(p, api) {
      if (!S) return;
      const E = api.ease, m = S.m, M = S.M;
      const lerp = api.lerp, seg = api.seg;
      const pz = api.pause || { start: 0.34, end: 0.72 };
      const h = api.hold(p);
      const lv = api.leave(p);

      /* tally group: in place for the approach, then recedes up and back as the chart takes over */
      const tr = seg(p, 0.19, 0.3, E.inOutCubic);
      const Tp = { x: lerp(S.Tpos.x, S.Tend.x, tr), y: lerp(S.Tpos.y, S.Tend.y, tr), z: lerp(S.Tpos.z, S.Tend.z, tr), rx: lerp(0, 10, tr) };
      api.place(S.T, Tp);
      const tIn = seg(p, 0.0, 0.1, E.outCubic);
      S.tallyLbl.forEach((q, i) => {
        api.opacity(q.c, api.stagger(p, i, 4, 0.04, 0.14, 0.5) * (1 - 0.92 * tr));
      });
      api.opacity(S.tallyHead.c, tIn * (1 - 0.95 * tr));
      if (S.fn) {
        const a = seg(p, 0.0, 0.08, E.outCubic), b = seg(p, 0.13, 0.2, E.inCubic);
        api.opacity(S.fn.c, a * (1 - b));
        api.transform(S.fn.c, `translate3d(${(1 - a) * -60 - b * 80}px,${(1 - a) * 24}px,0)`);
        // tickets.json hands its spot to the export terminal
        const c = seg(p, 0.03, 0.12, E.outCubic) * (1 - seg(p, 0.135, 0.17, E.inCubic));
        api.opacity(S.tix.c, c);
        api.transform(S.tix.c, `translate3d(${(1 - c) * 60}px,${(1 - c) * 24}px,0)`);
      }

      /* tiles: land in their stacks (0.03–0.22), then fly into the newest column (0.28–0.40) */
      const st = Tp; // tally group position; its small rx tilt is applied to the stack slots below
      const cosr = Math.cos((Tp.rx * Math.PI) / 180), sinr = Math.sin((Tp.rx * Math.PI) / 180);
      const G = S.Gpos;
      let landed = [0, 0, 0, 0];
      S.tiles.forEach((q, i) => {
        const a = api.stagger(p, i, 30, 0.03, 0.17, 0.32, E.outCubic);
        const b = E.inOutCubic(api.range(p, 0.29 + q.k * 0.0016, 0.37 + q.k * 0.0016));
        if (a > 0.98) landed[q.v]++;
        // stack slot (tally-local) → root
        const lx = S.stackX(q.v), ly = S.stackBase - (q.j + 0.5) * M.unit;
        const sx = st.x + lx, sy = st.y + ly * cosr, sz = st.z + ly * sinr;
        // column slot → root (chart group is upright by then)
        const cx = G.x + S.slotPos.x, cy = G.y + S.slotPos.y + (M.rows / 2 - q.k - 0.5) * M.unit, cz = G.z + 1.2;
        const ax = lerp(q.from.x, sx, a), ay = lerp(q.from.y, sy, a), az = lerp(q.from.z, sz, a);
        // the flight to the chart arcs forward in z
        const arc = Math.sin(b * Math.PI) * (m ? 80 : 140);
        api.place(q.pl, {
          x: lerp(ax, cx, b), y: lerp(ay, cy, b), z: lerp(az, cz, b) + arc,
          rz: lerp(q.from.rz, 0, E.outCubic(a)) , rx: lerp(0, -20, Math.sin(b * Math.PI)),
        });
        api.opacity(q.c, seg(p, 0.02 + i * 0.0045, 0.06 + i * 0.0045, E.outCubic));
      });
      // counts tick up as tiles land
      if (p < 0.2) {
        api.text(S.tallyNum[0], landed[0]);
        api.text(S.tallyNum[1], landed[1]);
        api.text(S.tallyNum[2], landed[2]);
        api.text(S.tallyNum[3], landed[3]);
      } else {
        api.text(S.tallyNum[0], 28); api.text(S.tallyNum[1], 0); api.text(S.tallyNum[2], 2); api.text(S.tallyNum[3], 0);
      }

      /* terminal: types the publish path, then sinks back */
      const tm = seg(p, 0.175, 0.21, E.outCubic);
      const tOut = seg(p, 0.29, 0.35, E.inOutCubic);
      api.opacity(S.term.c, tm * (1 - (m ? 0.6 : 1) * tOut));
      api.transform(S.term.c, `translate3d(0,${((1 - tm) * 30 - tOut * 40).toFixed(2)}px,0)`);
      api.type(S.t[0], S.tStr[0], api.range(p, 0.185, 0.225));
      api.type(S.t[1], S.tStr[1], api.range(p, 0.225, 0.24));
      api.type(S.t[2], S.tStr[2], api.range(p, 0.24, 0.26));
      api.type(S.t[3], S.tStr[3], api.range(p, 0.26, 0.272));

      /* chart: stands up out of the floor (0.2–0.34) */
      const ci = seg(p, 0.23, 0.34, E.outQuart);
      api.place(S.G, { x: G.x, y: G.y + (1 - ci) * 160, z: G.z - (1 - ci) * 240, rx: (1 - ci) * 62 });
      api.opacity(S.chart.c, seg(p, 0.23, 0.29, E.outCubic));
      api.opacity(S.shadow, 0.9 * ci);
      api.opacity(S.pub, seg(p, 0.27, 0.31));
      // slot outline visible until the stacks land in it
      const landedCol = seg(p, 0.36, 0.42);
      api.opacity(S.slot.c, seg(p, 0.26, 0.3) * (1 - 0.65 * landedCol));

      /* hold: history columns rise left to right, playhead + run panel follow */
      const nHist = HUGO.length - 1;
      // the earlier runs grow as the window lands, so the chart is never empty
      const rise = [];
      S.cols.forEach((col, i) => {
        if (i === nHist) return;
        const r = E.outCubic(api.range(p, 0.27 + i * 0.017, 0.33 + i * 0.017));
        rise[i] = r;
        api.transform(col, `translate3d(0,${((1 - r) * 100).toFixed(2)}%,0)`);
        api.opacity(S.ns[i], api.range(r, 0.5, 1));
      });
      // hold: the playhead walks the runs and reaches the newest early, so most of the hold shows 28
      const sweep = api.range(h, 0.02, 0.32);
      let cur = -1;
      for (let i = 0; i < nHist; i++) if (h > 0 && sweep * (nHist + 1) >= i + 0.35) cur = i;
      const lastOn = api.range(sweep * (nHist + 1), nHist + 0.1, nHist + 0.7);
      if (lastOn > 0) cur = nHist;
      api.opacity(S.ns[nHist], lastOn);
      // playhead
      const hx = M.left0 + Math.min(sweep * (nHist + 1), nHist + 0.5) * M.pitch - 6;
      api.transform(S.headEl, `translate3d(${hx.toFixed(1)}px,0,0)`);
      api.opacity(S.headEl, api.bump(h, 0.0, 0.04, 0.38, 0.48));
      // run panel shows the column under the playhead
      const r = HUGO[Math.max(0, cur)];
      api.text(S.run, r[1]);
      api.text(S.bn, cur < 0 ? '—' : r[2]);
      api.text(S.rPar, cur < 0 ? '—' : r[3]);
      api.text(S.rWorse, cur < 0 ? '—' : r[4]);
      api.text(S.rError, cur < 0 ? '—' : r[5]);
      const fin = seg(h, 0.3, 0.42, E.outCubic);
      S.panel.classList.toggle('is-final', cur === nHist);
      api.opacity(S.panel, seg(p, 0.3, 0.36));
      api.opacity(S.listed, seg(h, 0.38, 0.5, E.outCubic));
      api.transform(S.listed, `translate3d(0,${(1 - seg(h, 0.38, 0.5, E.outCubic)) * 8}px,0)`);
      // newest column bloom; dates fade in with their columns
      S.ds.forEach((d, i) => api.opacity(d, i === nHist ? 0.5 + 0.5 * fin : 0.25 + 0.75 * (rise[i] || 0)));
      api.opacity(S.slotHalo, fin * (1 - 0.5 * lv));
      api.opacity(S.chartHalo, 0.5 * fin * (1 - lv));
      S.tiles.forEach((q) => q.c.classList.toggle('is-lit', fin > 0.5));

      /* secondary repos + index.json */
      if (S.lines) {
        const la = seg(h, 0.5, 0.68, E.outCubic);
        api.opacity(S.lines.c, la);
        api.transform(S.lines.c, `translate3d(${(1 - la) * 40}px,${(1 - la) * -20}px,0)`);
        api.transform(S.wipe, `translate3d(${(seg(h, 0.54, 0.84, E.inOutCubic) * 100).toFixed(2)}%,0,0)`);
        const ia = seg(h, 0.66, 0.84, E.outCubic);
        api.opacity(S.idx.c, ia);
        api.transform(S.idx.c, `translate3d(0,${(1 - ia) * 34}px,0)`);
      }

      /* light: accent on the tally, then good on the newest column */
      const lg = seg(p, 0.26, 0.4);
      const lx = lerp(S.Tpos.x + 40, G.x + S.slotPos.x * 0.6, lg), ly = lerp(S.Tpos.y + 40, G.y + S.slotPos.y * 0.5, lg);
      api.setLight({ x: lx, y: ly, z: 40, colors: { accent: 1 - lg, good: lg } });
    },
  });
})();
