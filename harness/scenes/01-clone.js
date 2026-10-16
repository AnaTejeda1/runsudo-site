/* /harness/scenes/01-clone.js — STEP 01 · CLONE (light caption).
 * A terminal types `bt run gohugoio/hugo --count 30 --lane foreman`; run.ensure_cache() materializes the bare
 * cache.git as a deck of commit slabs receding in depth (oldest first), threaded by one blue history line;
 * run-status.json records the clone's start and end. */
(() => {
  const H = window.Harness;
  if (!H) return;

  const CMD = 'bt run gohugoio/hugo --count 30 --lane foreman';
  let S = null;

  function beam(api, a, b, cls) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const L = Math.hypot(dx, dy, dz) || 1;
    const pl = api.plane({
      x: a.x, y: a.y, z: a.z, w: L, h: 1, center: false,
      rz: (Math.asin(dy / L) * 180) / Math.PI,
      ry: (Math.atan2(-dz, dx) * 180) / Math.PI,
    });
    return { pl, inner: api.el('div', 'c-beam ' + (cls || ''), null, pl) };
  }

  H.registerScene({
    id: '01-clone',
    mount(root, api) {
      const m = api.mobile;
      S = { slabs: [] };
      const L = m
        ? { term: [0, -150, 20], termW: 360, slab0: [30, -10, -190], step: [12, -9, -58], n: 8, slabW: 210, slabH: 118, status: [0, 92, 70], statusW: 320 }
        : { term: [-165, -95, 20], termW: 560, slab0: [300, -60, -40], step: [34, -34, -64], n: 12, slabW: 270, slabH: 146, status: [110, 140, 95], statusW: 340 };
      S.L = L;

      // ---- commit slabs: the bare clone, full history (index 0 = newest, front)
      for (let i = L.n - 1; i >= 0; i--) {
        const x = L.slab0[0] + L.step[0] * i, y = L.slab0[1] + L.step[1] * i, z = L.slab0[2] + L.step[2] * i;
        const pl = api.plane({ x, y, z, w: L.slabW, h: L.slabH });
        const front = i === 0;
        const c = api.el(
          'div',
          'c-slab' + (front ? ' is-front' : ''),
          front
            ? `<div class="c-slab-head"><span>cache.git</span><span class="c-bare">newest</span></div>
               <div class="c-slab-body"><p class="c-path">data/gohugoio-hugo/cache.git</p><p class="c-sub">bare repo · full history</p></div>`
            : `<div class="c-slab-head"><span>commit</span><span class="c-hash">·······</span></div><div class="c-slab-body"><i></i><i></i><i class="s"></i></div>`,
          pl
        );
        api.el('b', 'c-node', null, c);
        S.slabs.push({ pl, c, i, x, y, z });
      }
      S.slabs.sort((a, b) => a.i - b.i);
      S.frontHalo = api.halo(S.slabs[0].c, 'add');
      // the history line through every slab's node (front → back)
      const nodeAt = (s) => ({ x: s.x - L.slabW / 2 + 16, y: s.y + L.slabH / 2 - 18, z: s.z + 1 });
      S.line = beam(api, nodeAt(S.slabs[L.n - 1]), nodeAt(S.slabs[0]), '');

      // ---- terminal
      S.term = api.plane({ x: L.term[0], y: L.term[1], z: L.term[2], w: L.termW });
      S.termC = api.el(
        'div',
        'h-card term-card c-term',
        `<div class="h-card-head"><span class="dots"><i></i><i></i><i></i></span>~/backtest-harness</div>
<pre><span class="ln"><span class="pr">$</span> <span class="c-cmd"></span><span class="caret c-caret"></span></span><span class="ln c-l1 out">run      run-20260930-081756</span><span class="ln c-l2"><span class="out">stage    </span>clone   <span class="tk-f">run.ensure_cache</span><span class="tk-o">()</span></span><span class="ln c-l3"><span class="out">         → </span><span class="lum-add">data/gohugoio-hugo/cache.git</span></span><span class="ln c-l4"><span class="out">         bare · full history </span><span class="c-bar"><i></i></span></span><span class="ln c-l5"><span class="ok">✓</span> <span class="out">clone   08:17:56Z → 08:17:58Z</span></span></pre>`,
        S.term
      );
      S.cmd = S.termC.querySelector('.c-cmd');
      S.caret = S.termC.querySelector('.c-caret');
      S.lines = ['.c-l1', '.c-l2', '.c-l3', '.c-l4', '.c-l5'].map((q) => S.termC.querySelector(q));
      S.bar = S.termC.querySelector('.c-bar i');
      S.termHalo = api.halo(S.termC, 'white');

      // ---- run-status.json
      S.status = api.plane({ x: L.status[0], y: L.status[1], z: L.status[2], w: L.statusW });
      S.statusC = api.el(
        'div',
        'h-card json-card c-status',
        `<div class="h-card-head"><span class="path">run-status.json</span><span class="kind">artifact</span></div>
<pre>{
  <span class="tk-p">"stage"</span>: <span class="tk-s">"clone"</span>,
  <span class="tk-p">"started_at"</span>: <span class="tk-s c-st"></span>,
  <span class="tk-p">"ended_at"</span>: <span class="tk-s c-en"></span>
}</pre>`,
        S.status
      );
      S.st = S.statusC.querySelector('.c-st');
      S.en = S.statusC.querySelector('.c-en');
      S.statusHalo = api.halo(S.statusC, 'good');
    },

    update(p, api) {
      if (!S) return;
      const e = api.ease;
      const L = S.L;

      // terminal swings in from the left as the camera banks in
      const tIn = e.outQuint(api.range(p, 0.02, 0.26));
      api.opacity(S.termC, tIn);
      api.place(S.term, { x: L.term[0] - (1 - tIn) * 160, z: L.term[2] - (1 - tIn) * 180, ry: (1 - tIn) * 28 + api.lerp(2, -3, p), rx: api.lerp(3, -2, p) });

      // the command types; output lines follow
      const typed = api.range(p, 0.12, 0.3);
      api.type(S.cmd, CMD, e.inOutSine(typed));
      const lineAt = [0.32, 0.36, 0.42, 0.45, 0.64];
      S.lines.forEach((ln, i) => {
        const a = e.outCubic(api.range(p, lineAt[i], lineAt[i] + 0.05));
        api.opacity(ln, a);
        api.transform(ln, `translate3d(${((1 - a) * -8).toFixed(2)}px,0,0)`);
      });
      api.opacity(S.caret, p < 0.32 ? 1 : 1 - api.range(p, 0.32, 0.34));
      const clone = api.range(p, 0.44, 0.63);
      api.transform(S.bar, `scaleX(${e.inOutCubic(clone).toFixed(4)})`);
      api.opacity(S.termHalo, 0.28 * api.bump(p, 0.1, 0.2, 0.4, 0.55));

      // slabs materialize oldest → newest, sliding forward out of the dark
      const n = S.slabs.length;
      for (const s of S.slabs) {
        const order = n - 1 - s.i; // back first
        const a = api.stagger(p, order, n, 0.42, 0.64, 0.3, e.outQuint);
        api.opacity(s.c, a * (s.i === 0 ? 1 : 0.92 - 0.04 * s.i));
        api.place(s.pl, { z: s.z - (1 - a) * 320, y: s.y + (1 - a) * 30, ry: (1 - a) * -12, s: 0.92 + 0.08 * a });
      }
      const line = e.inOutCubic(api.range(p, 0.44, 0.66));
      api.transform(S.line.inner, `scaleX(${line.toFixed(4)})`);
      api.opacity(S.line.inner, line);
      api.opacity(S.frontHalo, 0.75 * api.bump(p, 0.6, 0.66, 0.8, 0.95) + 0.25 * api.range(p, 0.62, 0.7));

      // run-status.json: written when the clone starts, closed when it ends
      const sIn = e.outCubic(api.range(p, 0.36, 0.48));
      api.opacity(S.statusC, sIn);
      api.place(S.status, { y: L.status[1] + (1 - sIn) * 40, z: L.status[2] - (1 - sIn) * 120, rx: (1 - sIn) * -20 });
      api.type(S.st, '"08:17:56Z"', api.range(p, 0.4, 0.46));
      api.type(S.en, '"08:17:58Z"', api.range(p, 0.62, 0.67));
      api.opacity(S.statusHalo, 0.45 * api.bump(p, 0.62, 0.67, 0.78, 0.92));

      // light: on the terminal while it types, then on the deck as it lands
      const lf = e.inOutCubic(api.range(p, 0.38, 0.62));
      api.setLight({
        x: api.lerp(L.term[0], L.slab0[0], lf),
        y: api.lerp(L.term[1], L.slab0[1], lf),
        z: 60,
        colors: { white: 1 - lf * 0.6, add: lf * 0.8 },
      });
    },
  });
})();
