/* /harness/scenes/02-recipe.js — STEP 02 · LEARN TO BUILD (light caption).
 * bt/setup_agent.py walks setup_repo(…) → verify_recipe(…) → ensure_image(…). The agent writes
 * setup/recipe.json line by line; code then runs the full suite and the counter climbs to 3,778
 * (verified.json {"attempts":2,"tests_ran":3778}); accent while verifying, good once verified. */
(() => {
  const H = window.Harness;
  if (!H) return;

  let S = null;

  const RECIPE = [
    ['{', ''],
    ['  ', '"install_cmd"', ': ', '"go mod download"', ','],
    ['  ', '"test_all_cmd"', ': ', '"go test -json -timeout 40m ./... > test-report.json"', ','],
    ['  ', '"test_report"', ': { ', '"kind"', ': ', '"go-test-json"', ' }'],
    ['}', ''],
  ];

  H.registerScene({
    id: '02-recipe',
    mount(root, api) {
      const m = api.mobile;
      S = {};
      const L = m
        ? { fn: [-60, -225, -170], fnW: 290, re: [0, -95, 0], reW: 370, dk: [40, -300, -330], dkW: 380, ct: [10, 85, 80], ctW: 300 }
        : { fn: [-260, -292, -110], fnW: 320, re: [0, -96, 0], reW: 600, dk: [-170, 92, 70], dkW: 420, ct: [282, 106, 110], ctW: 330 };
      S.L = L;

      // ---- bt/setup_agent.py
      S.fn = api.plane({ x: L.fn[0], y: L.fn[1], z: L.fn[2], w: L.fnW });
      S.fnC = api.el(
        'div',
        'h-card fn-card r-fn',
        `<div class="h-card-head"><span class="path">bt/setup_agent.py</span><span>once per repo</span></div>
<pre><span class="ln r-l0"><span class="tk-k">def</span> <span class="tk-f">setup_repo</span><span class="tk-o">(…)</span></span><span class="ln r-l1"><span class="tk-k">def</span> <span class="tk-f">verify_recipe</span><span class="tk-o">(…)</span></span><span class="ln r-l2"><span class="tk-k">def</span> <span class="tk-f">ensure_image</span><span class="tk-o">(…)</span></span></pre>`,
        S.fn
      );
      S.fnL = [0, 1, 2].map((i) => S.fnC.querySelector('.r-l' + i));

      // ---- setup/recipe.json, written by the agent
      S.re = api.plane({ x: L.re[0], y: L.re[1], z: L.re[2], w: L.reW });
      S.reC = api.el(
        'div',
        'h-card json-card r-recipe',
        `<div class="h-card-head"><span class="path">setup/recipe.json</span><span class="r-who"><i class="r-pulse"></i><span class="r-whot">agent writing</span></span></div><pre class="r-pre"></pre>`,
        S.re
      );
      const pre = S.reC.querySelector('.r-pre');
      S.reLines = RECIPE.map((parts) => {
        const ln = api.el('span', 'ln r-ln', null, pre);
        const toks = [];
        let total = 0;
        parts.forEach((t, i) => {
          if (!t) return;
          const cls = /^"/.test(t) ? (parts[i + 1] && /^:/.test(parts[i + 1]) ? 'tk-p' : 'tk-s') : 'tk-o';
          toks.push({ e: api.el('span', cls, null, ln), t, at: total });
          total += t.length;
        });
        return { ln, toks, total };
      });
      S.who = S.reC.querySelector('.r-who');
      S.whoT = S.reC.querySelector('.r-whot');
      S.reHalo = api.halo(S.reC, 'add');

      // ---- Dockerfile
      S.dk = api.plane({ x: L.dk[0], y: L.dk[1], z: L.dk[2], w: L.dkW });
      S.dkC = api.el(
        'div',
        'h-card fn-card r-docker',
        `<div class="h-card-head"><span class="path">Dockerfile</span><span>ensure_image(…)</span></div>
<pre><span class="tk-k">FROM</span> --platform=linux/amd64 golang:1.27-bookworm</pre>`,
        S.dk
      );
      S.dkHalo = api.halo(S.dkC, 'accent');

      // ---- the proof: full suite counter + verified.json
      S.ct = api.plane({ x: L.ct[0], y: L.ct[1], z: L.ct[2], w: L.ctW });
      S.ctC = api.el(
        'div',
        'h-card r-count',
        `<div class="h-card-head"><span class="path">verify_recipe(…)</span><span class="chip r-state is-accent">running</span></div>
         <div class="h-card-body">
           <div class="counter"><span class="num r-num">0</span><span class="lbl">tests ran · verify_recipe</span></div>
           <pre class="r-ver"><span class="tk-c">verified.json</span>
{ <span class="tk-p">"attempts"</span>: <span class="tk-n">2</span>, <span class="tk-p">"tests_ran"</span>: <span class="tk-n">3778</span> }</pre>
         </div>`,
        S.ct
      );
      S.num = S.ctC.querySelector('.r-num');
      S.state = S.ctC.querySelector('.r-state');
      S.ver = S.ctC.querySelector('.r-ver');
      S.ctHaloA = api.halo(S.ctC, 'accent');
      S.ctHaloG = api.halo(S.ctC, 'good');
    },

    update(p, api) {
      if (!S) return;
      const e = api.ease;
      const L = S.L;

      // entrances: swept in from the right with the camera
      const ent = (pl, c, base, i, extra) => {
        const a = api.stagger(p, i, 4, 0.0, 0.3, 0.55, e.outQuint);
        api.opacity(c, a);
        api.place(pl, Object.assign({ x: base[0] + (1 - a) * 220, z: base[2] - (1 - a) * 260, ry: (1 - a) * -34 }, extra || {}));
        return a;
      };
      const sway = e.inOutSine(p);
      ent(S.fn, S.fnC, L.fn, 0, { rx: api.lerp(4, -3, sway) });
      ent(S.re, S.reC, L.re, 1, { rx: api.lerp(3, -2, sway) });
      ent(S.dk, S.dkC, L.dk, 2, { rx: api.lerp(5, -2, sway) });
      ent(S.ct, S.ctC, L.ct, 3, { rx: api.lerp(4, -4, sway) });

      // phases: write (setup_repo) → verify (verify_recipe) → image (ensure_image)
      const W0 = 0.16, W1 = 0.42, V0 = 0.44, V1 = 0.68, I0 = 0.7, I1 = 0.86;
      const phase = p < W1 ? 0 : p < V1 + 0.01 ? 1 : 2;
      S.fnL.forEach((ln, i) => ln.classList.toggle('hl', i === phase && p > W0 - 0.02 && p < I1 + 0.06));

      // the agent writes recipe.json line by line
      // one cursor: lines are written in order, never two at once
      if (!S.reTotal) S.reTotal = S.reLines.reduce((a, L1) => a + L1.total, 0);
      let c = Math.round(e.inOutSine(api.range(p, W0, W1)) * S.reTotal);
      S.reLines.forEach((L1) => {
        const cl = Math.max(0, Math.min(L1.total, c));
        for (const tk of L1.toks) api.text(tk.e, tk.t.slice(0, Math.max(0, cl - tk.at)));
        L1.ln.classList.toggle('is-cur', c > 0 && c < L1.total || (c === L1.total && L1 === S.reLines[S.reLines.length - 1] && p < W1));
        c -= L1.total;
      });
      const writing = p >= W0 && p < W1 + 0.01;
      api.text(S.whoT, p < W1 + 0.01 ? 'agent writing' : 'written by agent');
      S.who.classList.toggle('is-on', writing);
      api.opacity(S.reHalo, 0.5 * api.bump(p, W0 - 0.04, W0 + 0.04, W1 - 0.02, W1 + 0.06));

      // verify: code runs the full suite
      const v = api.range(p, V0, V1);
      api.count(S.num, Math.round(3778 * e.inOutSine(v)) || 0);
      const done = p >= V1;
      api.text(S.state, done ? 'verified' : p >= V0 ? 'running' : 'waiting');
      S.state.className = 'chip r-state ' + (done ? 'is-good' : p >= V0 ? 'is-accent' : '');
      S.ctC.classList.toggle('is-done', done);
      const vin = e.outCubic(api.range(p, V1, V1 + 0.06));
      api.opacity(S.ver, 0.18 + 0.82 * vin);
      api.opacity(S.ctHaloA, 0.7 * api.bump(p, V0 - 0.03, V0 + 0.03, V1 - 0.01, V1 + 0.02));
      api.opacity(S.ctHaloG, 0.9 * e.outCubic(api.range(p, V1, V1 + 0.05)) * (1 - 0.55 * api.range(p, 0.8, 1)));
      const pulse = done ? 1 + 0.06 * Math.sin(Math.min(1, api.range(p, V1, V1 + 0.06)) * Math.PI) : 1;
      api.transform(S.num, `scale(${pulse.toFixed(4)})`);

      // image
      api.opacity(S.dkHalo, 0.55 * api.bump(p, I0 - 0.02, I0 + 0.04, I1 - 0.03, I1 + 0.04));

      // light follows the beat: recipe (add) → counter (accent→good) → Dockerfile
      const toCt = e.inOutCubic(api.range(p, W1 - 0.02, V0 + 0.04));
      const toDk = e.inOutCubic(api.range(p, V1 + 0.02, I0 + 0.06));
      const lx = api.lerp(api.lerp(L.re[0], L.ct[0], toCt), L.dk[0], toDk);
      const ly = api.lerp(api.lerp(L.re[1], L.ct[1], toCt), L.dk[1], toDk);
      const g = done ? 1 - toDk * 0.5 : 0;
      api.setLight({ x: lx, y: ly, z: 60, colors: { add: (1 - toCt) + toDk * 0.5, accent: toCt * (1 - g) * 0.8, good: g } });
    },
  });
})();
