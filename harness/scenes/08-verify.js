/* /harness/scenes/08-verify.js — Step 08 · Verify (pause frame).
 * Before/after, side by side in depth: baseline 3,803 total / 3,693 passed, then the same
 * frozen command with our patch: 3,804 / 3,696 / 99 skipped / 74.3 s. The focal beat is
 * "0 newly broken". The re-run rule is shown as a rule ("if a new failure appears"), with
 * neither outcome lit: #15169 had no new failure. verify/verify.json is written last.
 * Pure function of p. Key beats happen inside the hold (api.hold). */
(() => {
  const H = window.Harness;
  if (!H) return;

  let S = null;
  const GRID = 72; // cells in each mini grid (illustrative density, not one per test)
  const BASE_BAD = [9, 23, 31, 44, 58, 66]; // cells tinted for the 11 already failing at base

  function card(api, o, cls, html) {
    const pl = api.plane(Object.assign({ cls: 'vf-car' }, o));
    const c = api.el('div', 'h-card ' + cls, html, pl);
    return { pl, c, o };
  }
  function grid(after) {
    let s = '<div class="vf-grid">';
    // the after grid carries the same already-failing cells as the base: nothing new
    for (let i = 0; i < GRID; i++) s += `<i class="${BASE_BAD.includes(i) ? 'b' : ''}"></i>`;
    return s + '</div>';
  }
  function panel(kind) {
    const after = kind === 'after';
    return (
      `<div class="h-card-head"><span class="path">${after ? 'post run' : 'baseline.json'}</span><span>${after ? 'base + our patch' : 'base dd3f2731…'}</span></div>` +
      '<div class="h-card-body">' +
      `<p class="vf-eye">${after ? 'After' : 'Before'}</p>` +
      `<div class="vf-big"><span class="vf-num">${after ? '0' : '3,803'}</span><span class="vf-unit">tests</span></div>` +
      grid(after) +
      (after
        ? '<dl class="kv vf-kv"><dt>passed</dt><dd class="vf-pass">0</dd><dt>skipped</dt><dd class="vf-skip">99</dd><dt>duration_s</dt><dd class="vf-dur">74.3</dd></dl>'
        : '<dl class="kv vf-kv"><dt>passed</dt><dd>3,693</dd><dt>already failing</dt><dd class="vf-badt">11</dd><dt>command</dt><dd>frozen</dd></dl>') +
      '</div>'
    );
  }

  H.registerScene({
    id: '08-verify',
    mount(root, api) {
      const m = api.mobile;
      S = { m };

      S.before = card(api, m ? { x: -92, y: -170, z: -40, w: 176 } : { x: -205, y: -150, z: -70, ry: 9, w: 300 }, 'vf-panel vf-before', panel('before'));
      S.after = card(api, m ? { x: 92, y: -170, z: 0, w: 176 } : { x: 168, y: -150, z: 10, ry: -7, w: 320 }, 'vf-panel vf-after', panel('after'));
      S.afterHalo = api.halo(S.after.c, 'good');
      S.num = S.after.c.querySelector('.vf-num');
      S.pass = S.after.c.querySelector('.vf-pass');
      S.cellsA = [...S.after.c.querySelectorAll('.vf-grid i')];
      S.cellsB = [...S.before.c.querySelectorAll('.vf-grid i')];

      // the bridge: same frozen command on both sides
      S.bridgePl = api.plane(m ? { x: 0, y: -290, z: 20, cls: 'vf-car' } : { x: -18, y: -296, z: 30, cls: 'vf-car' });
      S.bridge = api.el('div', 'vf-bridge', '<i class="h-diamond"></i>same tests · same image · baseline/test-spec.json', S.bridgePl);

      // focal: 0 newly broken
      S.zeroPl = api.plane(m ? { x: 0, y: 10, z: 70, cls: 'vf-car' } : { x: -190, y: 55, z: 80, cls: 'vf-car' });
      S.zero = api.el(
        'div',
        'vf-zero',
        '<span class="vf-z-n">0</span><span class="vf-z-l"><b>newly broken</b><span>before any model opinion</span></span>',
        S.zeroPl
      );
      S.zeroGlow = api.el('i', 'vf-z-glow', null, S.zero);

      // verify.json
      S.json = card(
        api,
        m ? { x: 0, y: 150, z: 20, w: 330 } : { x: 190, y: 62, z: 20, ry: -7, w: 340 },
        'json-card vf-json',
        '<div class="h-card-head"><span class="path">verify/verify.json</span><span class="kind">artifact</span></div><pre>' +
          [
            '{ <span class="tk-p">"verdict"</span>: <span class="tk-s">"clean"</span>,',
            '  <span class="tk-p">"report"</span>: { <span class="tk-p">"total"</span>: <span class="tk-n">3804</span>, <span class="tk-p">"passed"</span>: <span class="tk-n">3696</span>,',
            '    <span class="tk-p">"skipped"</span>: <span class="tk-n">99</span>, <span class="tk-p">"duration_s"</span>: <span class="tk-n">74.3</span> },',
            '  <span class="tk-p">"baseline_failed"</span>: [<span class="tk-c">…</span>],',
            '  <span class="tk-p">"post_failed"</span>: [<span class="tk-c">…</span>] }',
          ]
            .map((l) => `<span class="ln">${l}</span>`)
            .join('') +
          '</pre>'
      );
      S.jl = [...S.json.c.querySelectorAll('.ln')];

      // re-run rule strip
      S.loop = card(
        api,
        m ? { x: 0, y: 140, z: 30, w: 340 } : { x: -10, y: 222, z: 40, w: 640 },
        'vf-loop',
        '<span class="vf-l-h"><span class="tk-f">rerun_suffix</span><span class="tk-o">(…)</span> · the rule, if a new failure appears</span>' +
          '<span class="vf-l-row">' +
          '<span class="vf-node n0">new failure</span><i class="vf-wire w0"><b></b></i>' +
          '<span class="vf-node n1">re-run 1</span><i class="vf-wire w1"><b></b></i>' +
          '<span class="vf-node n2">re-run 2</span><i class="vf-wire w2"><b></b></i>' +
          '<span class="vf-out"><span class="vf-node ok">passes · flaky, not counted</span><span class="vf-node no">fails again · automatic loss</span></span>' +
          '</span>'
      );
      S.nodes = [...S.loop.c.querySelectorAll('.vf-node')];
      S.wires = [...S.loop.c.querySelectorAll('.vf-wire b')];

      // background: the code, and our patch going in
      if (!m) {
        S.fn = card(
          api,
          { x: -470, y: -330, z: -380, ry: 14, w: 330 },
          'fn-card vf-fn',
          '<div class="h-card-head"><span class="path">bt/verify.py</span></div><pre>' +
            '<span class="ln"><span class="tk-k">def</span> <span class="tk-f">verify_ticket</span><span class="tk-o">(…)</span></span>' +
            '<span class="ln"><span class="tk-k">def</span> <span class="tk-f">load_verify</span><span class="tk-o">(…)</span></span>' +
            '<span class="ln hl"><span class="tk-k">def</span> <span class="tk-f">rerun_suffix</span><span class="tk-o">(…)</span></span>' +
            '<span class="ln tk-c"># bt/mandate.py → "contested" when every failure</span>' +
            '<span class="ln tk-c"># is in a test the human fix itself rewrote</span></pre>'
        );
      }
      S.diff = card(
        api,
        m ? { x: 0, y: -60, z: -200, w: 260 } : { x: 470, y: -330, z: -340, ry: -14, w: 300 },
        'diff-card vf-diff',
        '<div class="h-card-head"><span class="path">solve/patch</span><span class="stat"><span>2,070 B</span></span></div><pre>' +
          '<span class="dl hunk"><span class="g"></span>@@ … @@</span>' +
          '<span class="dl ctx"><span class="g">·</span><i class="vf-bar" style="width:62%"></i></span>' +
          '<span class="dl del"><span class="g">-</span><i class="vf-bar" style="width:54%"></i></span>' +
          '<span class="dl add"><span class="g">+</span><i class="vf-bar" style="width:70%"></i></span>' +
          '<span class="dl add"><span class="g">+</span><i class="vf-bar" style="width:46%"></i></span>' +
          '<span class="dl ctx"><span class="g">·</span><i class="vf-bar" style="width:38%"></i></span>' +
          '</pre>'
      );
      S.ents = [S.diff, S.fn, S.before, S.after, S.json, S.loop].filter(Boolean);
    },

    update(p, api) {
      if (!S) return;
      const e = api.ease;
      const m = S.m;
      const h = api.hold(p);
      const lv = e.inCubic(api.leave(p));

      // entrances (approach), exits (leave)
      S.ents.forEach((cd, i) => {
        const s0 = 0.03 + i * 0.04;
        const sp = e.softSpring(api.range(p, s0, s0 + 0.24));
        const a = e.outCubic(api.range(p, s0, s0 + 0.14));
        api.opacity(cd.c, a * (1 - lv * 0.7));
        const spread = (cd.o.x || 0) >= 0 ? 1 : -1;
        api.place(cd.pl, {
          x: cd.o.x + spread * lv * 120,
          y: cd.o.y + (1 - sp) * 120 + lv * 40,
          z: cd.o.z - (1 - sp) * 260 - lv * 120,
          rx: (1 - sp) * 18,
          ry: (cd.o.ry || 0) + spread * lv * -10,
        });
      });

      // the patch flies into the "after" panel just before the hold
      const ap = e.inOutCubic(api.range(p, 0.16, 0.3));
      if (S.diff) {
        const to = S.after.o;
        const fr = S.diff.o;
        const sp = e.softSpring(api.range(p, 0.03, 0.2));
        api.place(S.diff.pl, {
          x: api.lerp(fr.x, to.x, ap),
          y: api.lerp(fr.y + (1 - sp) * 120, to.y, ap),
          z: api.lerp(fr.z - (1 - sp) * 200, to.z + 30, ap),
          ry: api.lerp(fr.ry || 0, 0, ap),
          s: api.lerp(1, 0.55, ap),
        });
        api.opacity(S.diff.c, e.outCubic(api.range(p, 0.03, 0.14)) * (1 - e.inCubic(api.range(p, 0.24, 0.31))));
      }
      const flash = api.bump(p, 0.27, 0.3, 0.3, 0.4, e.outCubic);

      // bridge label
      api.opacity(S.bridge, api.seg(p, 0.22, 0.32) * (1 - lv));

      // after: counts up through the first part of the hold
      const run = e.inOutCubic(api.range(h, 0.0, 0.4));
      if (run <= 0) api.text(S.num, '–');
      else api.count(S.num, Math.round(3804 * run));
      api.count(S.pass, Math.round(3696 * run));
      const nA = S.cellsA.length;
      S.cellsA.forEach((c, i) => {
        const on = api.range(run * (nA + 4) - i, 0, 4);
        api.opacity(c, 0.12 + 0.88 * on);
      });

      // the rule: a pulse walks the wires; both outcomes stay equally lit (none happened here)
      api.opacity(S.nodes[0], 0.35 + 0.65 * api.bump(h, 0.24, 0.3, 0.9, 1));
      S.wires.forEach((w, i) => {
        const a0 = 0.3 + i * 0.1;
        const t = e.inOutCubic(api.range(h, a0, a0 + 0.1));
        api.transform(w, `scaleX(${t.toFixed(4)})`);
      });
      api.opacity(S.nodes[1], 0.35 + 0.65 * api.seg(h, 0.38, 0.42));
      api.opacity(S.nodes[2], 0.35 + 0.65 * api.seg(h, 0.48, 0.52));
      const outs = 0.4 + 0.3 * api.seg(h, 0.58, 0.64);
      api.opacity(S.nodes[3], outs);
      api.opacity(S.nodes[4], outs);

      // focal: 0 newly broken lands after the loop resolves
      const z = api.range(h, 0.6, 0.78);
      const zs = e.spring(z, 0.55, 12);
      api.opacity(S.zero, e.outCubic(api.range(z, 0, 0.4)) * (1 - Math.min(1, lv * 3)));
      api.transform(S.zero, `translate3d(0,${((1 - zs) * 24).toFixed(2)}px,0) scale(${(0.86 + 0.14 * zs).toFixed(4)})`);
      api.opacity(S.zeroGlow, api.bump(h, 0.62, 0.76, 1.2, 1.3) * (1 - Math.min(1, lv * 3)));
      api.opacity(S.afterHalo, Math.max(flash * 0.6, api.seg(h, 0.62, 0.8) * 0.7) * (1 - lv));

      // verify.json lines write in
      S.jl.forEach((l, i) => api.opacity(l, api.stagger(h, i, S.jl.length, 0.66, 0.96, 0.4)));
      api.opacity(S.json.c, api.seg(h, 0.6, 0.7) * (1 - lv * 0.7));
      if (m) {
        api.opacity(S.json.c, api.seg(h, 0.6, 0.7) * (1 - lv));
        api.opacity(S.loop.c, api.bump(h, 0.15, 0.25, 0.58, 0.66) * (1 - lv));
      }
    },
  });
})();
