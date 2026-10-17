/* /harness/scenes/05-baseline.js — STEP 05 · BASELINE (light).
 * A wall of 3,803 test cells fills in on the untouched base commit; 3,693 pass, the 11 already
 * failing at base are tinted bad and kept. baseline.json lands, and baseline/test-spec.json gets
 * locked: the exact command is frozen so the after run is identical. Pure function of p. */
(() => {
  const H = window.Harness;
  if (!H) return;
  const ID = '05-baseline';
  const TOTAL = 3803, PASSED = 3693, FAILED = 11;

  let S = null;

  const GRID_HEAD =
    '<div class="h-card-head"><span class="path">go test -json · base dd3f2731…</span><span class="bl-live"><i></i><b class="bl-state">running</b></span></div>';

  const COUNT_HTML =
    '<div class="h-card bl-counts">' +
    '<div class="counter bl-total"><span class="num">0</span><span class="lbl">tests on the base commit</span></div>' +
    '<div class="bl-split">' +
    '<div class="counter is-good bl-pass"><span class="num">0</span><span class="lbl">passed</span></div>' +
    '<div class="counter is-bad bl-fail"><span class="num">0</span><span class="lbl">failing at base</span></div>' +
    '</div>' +
    '<p class="bl-kept"><i></i>kept in the record</p>' +
    '</div>';

  const JSON_HTML =
    '<div class="h-card json-card bl-json">' +
    '<div class="h-card-head"><span class="path">baseline/baseline.json</span><span class="kind">artifact</span></div>' +
    '<pre>{ <span class="tk-p">"kind"</span>: <span class="tk-s">"go-test-json"</span>,\n' +
    '  <span class="tk-p">"total"</span>: <span class="tk-n">3803</span>, <span class="tk-p">"passed"</span>: <span class="tk-n">3693</span> }</pre>' +
    '</div>';

  const SPEC_HTML =
    '<div class="h-card bl-spec">' +
    '<div class="h-card-head"><span class="path">baseline/test-spec.json</span><span class="bl-stamp">frozen</span></div>' +
    '<div class="bl-spec-body">' +
    '<div class="bl-lock" aria-hidden="true"><i class="bl-shackle"></i><i class="bl-lbody"><b></b></i></div>' +
    '<div class="bl-spec-txt"><p class="bl-spec-h">Exact command, frozen</p>' +
    '<p class="bl-spec-s">The after run replays it unchanged.</p></div>' +
    '</div></div>';

  const FN_HTML =
    '<div class="h-card fn-card bl-fn">' +
    '<div class="h-card-head"><span class="path">bt/prepare.py · bt/selection.py</span></div>' +
    '<pre><span class="ln hl"><span class="tk-k">def</span> <span class="tk-f">run_prepare</span><span class="tk-o">(…)</span></span>' +
    '<span class="ln"><span class="tk-k">def</span> <span class="tk-f">select_tests</span><span class="tk-o">(…)</span></span>' +
    '<span class="ln"><span class="tk-c"># test choice: made by a script, not a model</span></span></pre>' +
    '</div>';

  function buildCells(cols, rows) {
    const n = cols * rows;
    const rand = H.rng(3803);
    const keys = [];
    for (let i = 0; i < TOTAL; i++) {
      const c = i % cols, r = Math.floor(i / cols);
      // a diagonal wavefront with a little noise, so the wall fills like a sweep, not a typewriter
      keys.push({ i, k: c / cols + (r / rows) * 0.42 + rand() * 0.07 });
    }
    keys.sort((a, b) => a.k - b.k);
    const order = keys.map((q) => q.i);
    // status per cell index: 0 pass, 1 fail, 2 skipped
    const status = new Uint8Array(TOTAL);
    const pick = (cnt, val) => {
      let k = 0;
      while (k < cnt) {
        const j = Math.floor(rand() * TOTAL);
        if (status[j] === 0) { status[j] = val; k++; }
      }
    };
    pick(FAILED, 1);
    pick(TOTAL - PASSED - FAILED, 2);
    // running tallies along the fill order
    const passAt = new Uint16Array(TOTAL + 1), failAt = new Uint16Array(TOTAL + 1);
    for (let j = 0; j < TOTAL; j++) {
      const st = status[order[j]];
      passAt[j + 1] = passAt[j] + (st === 0 ? 1 : 0);
      failAt[j + 1] = failAt[j] + (st === 1 ? 1 : 0);
    }
    return { cols, rows, n, order, status, passAt, failAt };
  }

  function draw(n) {
    const G = S.G, ctx = S.ctx, pitch = S.pitch, size = S.cell, dpr = S.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S.cw, S.ch);
    // empty slots
    ctx.fillStyle = '#171717';
    for (let i = 0; i < TOTAL; i++) {
      const c = i % G.cols, r = (i / G.cols) | 0;
      ctx.fillRect(c * pitch, r * pitch, size, size);
    }
    const fresh = Math.max(1, Math.round(TOTAL * 0.05));
    const fails = [];
    for (let j = 0; j < n; j++) {
      const i = G.order[j];
      const st = G.status[i];
      const c = i % G.cols, r = (i / G.cols) | 0;
      if (st === 1) { fails.push([c, r]); continue; }
      const age = n - j;
      if (st === 2) ctx.fillStyle = '#3a3a3a';
      else if (age < fresh) ctx.fillStyle = age < fresh * 0.35 ? 'rgba(235,255,240,.95)' : 'rgba(170,235,195,.9)';
      else ctx.fillStyle = 'rgba(143,217,168,.62)';
      ctx.fillRect(c * pitch, r * pitch, size, size);
    }
    // failing-at-base cells: drawn last, with a glow
    ctx.shadowColor = 'rgba(240,150,143,.95)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#f0968f';
    for (const [c, r] of fails) ctx.fillRect(c * pitch - 0.5, r * pitch - 0.5, size + 1, size + 1);
    ctx.shadowBlur = 0;
  }

  function mount(root, api) {
    const m = api.mobile;
    S = { m, items: [] };
    const cols = m ? 76 : 89, rows = Math.ceil(TOTAL / cols);
    S.pitch = m ? 4 : 5;
    S.cell = m ? 3 : 4;
    S.G = buildCells(cols, rows);
    S.cw = cols * S.pitch - (S.pitch - S.cell);
    S.ch = rows * S.pitch - (S.pitch - S.cell);
    S.dpr = Math.min(3, Math.max(2, window.devicePixelRatio || 1));

    const add = (key, o, html, enter) => {
      const pl = api.plane(Object.assign({ html }, o));
      const it = { key, pl, card: pl.firstChild, o, enter };
      S.items.push(it);
      S['i_' + key] = it;
      return it;
    };

    const gridHtml =
      '<div class="h-card bl-grid">' + GRID_HEAD +
      '<div class="bl-canvas-wrap"><canvas class="bl-canvas"></canvas><i class="bl-sweep"></i></div>' +
      '<div class="bl-legend"><span><i class="is-pass"></i>passed</span><span><i class="is-fail"></i>failing at base</span><span><i class="is-skip"></i>skipped</span><span class="bl-n">1 cell = 1 test</span></div>' +
      '</div>';

    if (!m) {
      add('fn', { x: -380, y: -250, z: -170, ry: 12, w: 330 }, FN_HTML, 0);
      add('grid', { x: -70, y: -58, z: 0, ry: 4, w: S.cw + 34 }, gridHtml, 1);
      add('counts', { x: 296, y: -100, z: 60, ry: -8, w: 262 }, COUNT_HTML, 2);
      add('json', { x: 0, y: 214, z: 40, ry: 3, w: 380 }, JSON_HTML, 3);
      add('spec', { x: 300, y: 172, z: 90, ry: -10, w: 290 }, SPEC_HTML, 4);
    } else {
      add('grid', { x: 0, y: -168, z: 0, w: S.cw + 28 }, gridHtml, 1);
      add('counts', { x: 0, y: 52, z: 40, w: 340, cls: 'bl-m' }, COUNT_HTML, 2);
      add('spec', { x: 0, y: 156, z: 70, w: 340, cls: 'bl-m' }, SPEC_HTML, 4);
    }

    const cv = S.items.find((q) => q.key === 'grid').card.querySelector('.bl-canvas');
    cv.width = Math.round(S.cw * S.dpr);
    cv.height = Math.round(S.ch * S.dpr);
    cv.style.width = S.cw + 'px';
    cv.style.height = S.ch + 'px';
    S.ctx = cv.getContext('2d');
    S.lastN = -1;
    const g = S.items.find((q) => q.key === 'grid').card;
    S.sweep = g.querySelector('.bl-sweep');
    S.state = g.querySelector('.bl-state');
    S.live = g.querySelector('.bl-live');
    const c = S.items.find((q) => q.key === 'counts').card;
    S.nTotal = c.querySelector('.bl-total .num');
    S.nPass = c.querySelector('.bl-pass .num');
    S.nFail = c.querySelector('.bl-fail .num');
    S.kept = c.querySelector('.bl-kept');
    S.failC = c.querySelector('.bl-fail');
    const sp = S.items.find((q) => q.key === 'spec').card;
    S.shackle = sp.querySelector('.bl-shackle');
    S.stamp = sp.querySelector('.bl-stamp');
    S.lock = sp.querySelector('.bl-lock');
    S.specHalo = api.halo(sp, 'accent');
    S.gridHalo = api.halo(g, 'good');
    S.spec = sp;
  }

  function update(p, api) {
    if (!S) return;
    const e = api.ease;

    // Entrances: each card swings up into place on a soft spring, staggered.
    const starts = { fn: 0.1, grid: 0.02, counts: 0.2, json: 0.4, spec: 0.44 };
    for (const it of S.items) {
      const a0 = starts[it.key];
      const a = e.outCubic(api.range(p, a0, a0 + 0.14));
      const sp = e.softSpring(api.range(p, a0, a0 + 0.2));
      api.opacity(it.card, a);
      api.place(it.pl, {
        y: it.o.y + (1 - sp) * 60,
        z: (it.o.z || 0) - (1 - sp) * 120,
        rx: (1 - sp) * 24,
      });
    }

    // Fill the wall and count, eased so it accelerates then lands.
    const f = e.inOutCubic(api.range(p, 0.12, 0.5));
    const n = Math.round(f * TOTAL);
    if (n !== S.lastN) {
      S.lastN = n;
      draw(n);
    }
    const G = S.G;
    api.count(S.nTotal, n);
    api.count(S.nPass, G.passAt[n]);
    api.count(S.nFail, G.failAt[n]);
    const done = n >= TOTAL;
    api.text(S.state, done ? 'done' : n > 0 ? 'running' : 'queued');
    S.live.classList.toggle('is-done', done);
    const sw = api.range(p, 0.12, 0.5);
    api.opacity(S.sweep, sw > 0 && sw < 1 ? Math.sin(sw * Math.PI) * 0.9 : 0);
    api.transform(S.sweep, `translateX(${(f * (S.cw + 30) - 20).toFixed(1)}px)`);
    api.opacity(S.gridHalo, api.bump(p, 0.46, 0.52, 0.6, 0.75) * 0.6);
    S.failC.classList.toggle('is-hot', G.failAt[n] >= FAILED);
    api.opacity(S.kept, e.outCubic(api.range(p, 0.48, 0.56)));

    // Freeze: the shackle drops, the stamp lands, a short accent bloom.
    const lk = e.spring(api.range(p, 0.54, 0.64), 0.5, 12);
    api.transform(S.shackle, `translateY(${((1 - lk) * -7).toFixed(2)}px)`);
    S.lock.classList.toggle('is-locked', lk > 0.9);
    const st = api.range(p, 0.58, 0.66);
    api.opacity(S.stamp, e.outCubic(st));
    api.transform(S.stamp, `rotate(-6deg) scale(${(1.6 - 0.6 * e.outBack(st)).toFixed(3)})`);
    api.opacity(S.specHalo, api.bump(p, 0.57, 0.63, 0.7, 0.86) * 0.9 + 0.25 * api.range(p, 0.63, 0.7) * (1 - api.range(p, 0.86, 1)));
    S.spec.classList.toggle('is-frozen', p > 0.6);
  }

  H.registerScene({
    id: ID,
    light: { x: 60, y: -40, z: 40, color: 'white' },
    mount,
    update,
  });
})();
