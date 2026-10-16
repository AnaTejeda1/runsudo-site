/* /harness/scenes/07-audit.js — Step 07 · Audit (light scene).
 * A scan line sweeps the agent's transcript while bt/audit.py's checks tick through,
 * then audit.json lands with a "clean" stamp. A dim contaminated lane stays in view:
 * contaminated tickets stay in the total and are never scored.
 * Pure function of p: everything below is derived from local progress. */
(() => {
  const H = window.Harness;
  if (!H) return;

  const ROWS = [
    ['user', '{"type":"user","content":"# resources/jsconfig: Address VS Code…"}'],
    ['asst', '{"type":"assistant","tool_use":"Read", …}'],
    ['res', '{"type":"tool_result", …}'],
    ['asst', '{"type":"assistant","tool_use":"Edit", …}'],
    ['asst', '{"type":"assistant","tool_use":"Bash","input":"./bt-test …"}'],
    ['res', '{"type":"tool_result", …}'],
    ['asst', '{"type":"assistant","text":"…"}'],
  ];
  const CHECKS = [
    ['path_findings', '0 findings'],
    ['egress_findings', '0 findings'],
    ['mention_findings', '0 findings'],
    ['write_fix_record', 'audit.json'],
  ];

  let S = null;

  function card(api, o, cls, html) {
    const pl = api.plane(Object.assign({ cls: 'au-car' }, o));
    const c = api.el('div', 'h-card ' + cls, html, pl);
    return { pl, c, o };
  }

  H.registerScene({
    id: '07-audit',
    mount(root, api) {
      const m = api.mobile;
      S = { m };

      // terminal: the command that runs the audit
      S.term = card(
        api,
        m ? { x: 0, y: -235, z: -40, w: 340 } : { x: -215, y: -215, z: -70, ry: 6, w: 420 },
        'term-card au-term',
        '<div class="h-card-head"><span class="dots"><i></i><i></i><i></i></span><span>zsh</span></div>' +
          '<pre><span class="pr">$</span> <span class="au-cmd"></span><span class="caret au-caret"></span>\n<span class="out au-o1">reading solve/transcript.jsonl</span>\n<span class="ok au-o2">audit.json  verdict clean</span></pre>'
      );
      S.cmd = S.term.c.querySelector('.au-cmd');
      S.caret = S.term.c.querySelector('.au-caret');
      S.o1 = S.term.c.querySelector('.au-o1');
      S.o2 = S.term.c.querySelector('.au-o2');

      // transcript being scanned
      const rows = ROWS.map(
        (r, i) =>
          `<span class="au-row au-${r[0]}"><span class="g">${i + 1}</span><span class="tx">${r[1]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')}</span><i class="au-tick"></i></span>`
      ).join('');
      S.tr = card(
        api,
        m ? { x: 0, y: -60, z: 0, w: 360 } : { x: -70, y: 10, z: 0, w: 470 },
        'au-tr',
        '<div class="h-card-head"><span class="path">solve/transcript.jsonl</span><span>#15169</span></div>' +
          `<div class="au-rows">${rows}<i class="au-scan"></i></div>`
      );
      S.rows = [...S.tr.c.querySelectorAll('.au-row')];
      S.ticks = [...S.tr.c.querySelectorAll('.au-tick')];
      S.scan = S.tr.c.querySelector('.au-scan');
      S.trHalo = api.halo(S.tr.c, 'good');

      // the four checks from bt/audit.py
      const chk = CHECKS.map(
        (c) =>
          `<span class="ln au-chk"><span><span class="tk-k">def</span> <span class="tk-f">${c[0]}</span><span class="tk-o">(…)</span></span><span class="au-st"><i class="au-spin"></i><b>${c[1]}</b></span></span>`
      ).join('');
      S.fn = card(
        api,
        m ? { x: 0, y: 110, z: 40, w: 340 } : { x: 345, y: -100, z: 70, ry: -10, w: 330 },
        'fn-card au-fn',
        '<div class="h-card-head"><span class="path">bt/audit.py</span><span>code, not a model</span></div><pre>' + chk + '</pre>'
      );
      S.chk = [...S.fn.c.querySelectorAll('.au-chk')];
      S.spins = S.chk.map((n) => n.querySelector('.au-spin'));
      S.sts = S.chk.map((n) => n.querySelector('b'));

      // audit.json result
      S.json = card(
        api,
        m ? { x: 0, y: -235, z: 40, w: 330 } : { x: 345, y: 100, z: 40, ry: -10, w: 300 },
        'json-card au-json',
        '<div class="h-card-head"><span class="path">audit.json</span><span class="kind">artifact</span></div>' +
          '<pre>{ <span class="tk-p">"audit"</span>: { <span class="tk-p">"verdict"</span>: <span class="tk-s au-v">"clean"</span> } }</pre>'
      );
      S.jsonHalo = api.halo(S.json.c, 'good');

      // the stamp
      S.stampPl = api.plane(m ? { x: -70, y: -20, z: 90, cls: 'au-car' } : { x: -110, y: 40, z: 110, cls: 'au-car' });
      S.stamp = api.el('div', 'au-stamp', '<i class="h-diamond"></i><span>clean</span>', S.stampPl);

      // ghost lane: contaminated stays in the total, never scored
      if (!m) {
        S.ghost = card(
          api,
          { x: -395, y: 150, z: -200, ry: 14, w: 250 },
          'au-ghost',
          '<span class="au-g-h"><i></i>contaminated</span><span class="au-g-b">stays in the total, never scored</span>'
        );
      }
      S.all = [S.term, S.tr, S.fn, S.json, S.ghost].filter(Boolean);
    },

    update(p, api) {
      if (!S) return;
      const e = api.ease;
      const m = S.m;

      // entrances: cards rise out of depth with a soft spring, staggered
      S.all.forEach((cd, i) => {
        const a = api.stagger(p, i, S.all.length, 0.02, 0.34, 0.55, e.outCubic);
        const sp = e.softSpring(api.range(p, 0.02 + i * 0.045, 0.3 + i * 0.045));
        const exit = e.inCubic(api.range(p, 0.86, 1));
        api.opacity(cd.c, a * (1 - exit * 0.6));
        api.place(cd.pl, {
          y: cd.o.y + (1 - sp) * 90 - exit * 30,
          z: cd.o.z - (1 - sp) * 220,
          rx: (1 - sp) * -16,
        });
      });
      if (S.ghost) api.opacity(S.ghost.c, 0.55 * api.range(p, 0.2, 0.42));

      // terminal types the command
      api.type(S.cmd, 'bt audit gohugoio/hugo run-20260930-081756', e.inOutSine(api.range(p, 0.1, 0.3)));
      api.opacity(S.caret, p < 0.32 ? 1 : 0);
      api.opacity(S.o1, api.seg(p, 0.3, 0.34));
      api.opacity(S.o2, api.seg(p, 0.66, 0.7));

      // scan line sweeps the transcript
      const sc = e.inOutCubic(api.range(p, 0.26, 0.6));
      const scanOn = api.bump(p, 0.24, 0.28, 0.58, 0.64);
      api.transform(S.scan, `translate3d(0,${(sc * 100).toFixed(2)}%,0)`);
      api.opacity(S.scan, scanOn);
      const n = S.rows.length;
      S.rows.forEach((r, i) => {
        const passed = api.range(sc * (n + 0.4) - i, 0, 0.6);
        api.opacity(S.ticks[i], passed);
        api.opacity(r, 0.55 + 0.45 * passed);
      });

      // checks tick through, staggered across the sweep
      S.chk.forEach((c, i) => {
        const a0 = 0.3 + i * 0.075;
        const spin = api.bump(p, a0 - 0.04, a0, a0 + 0.06, a0 + 0.08, e.outCubic);
        const done = api.seg(p, a0 + 0.06, a0 + 0.1, e.outCubic);
        api.opacity(S.spins[i], spin);
        api.opacity(S.sts[i], done);
        api.transform(S.sts[i], `translate3d(${((1 - done) * 8).toFixed(2)}px,0,0)`);
        c.classList.toggle('hl', p >= a0 - 0.04 && p < a0 + 0.1);
      });

      // stamp lands, then the json glows good
      const st = api.range(p, 0.63, 0.74);
      const ss = e.spring(st, 0.5, 12);
      api.opacity(S.stamp, e.outCubic(api.range(st, 0, 0.35)) * (1 - e.inCubic(api.range(p, 0.9, 1)) * 0.5));
      api.transform(S.stamp, `rotate(-8deg) scale(${(1.9 - 0.9 * ss).toFixed(4)})`);
      const glow = api.bump(p, 0.66, 0.74, 0.88, 0.98);
      api.opacity(S.jsonHalo, glow);
      api.opacity(S.trHalo, glow * 0.55);
      api.opacity(S.json.c, api.seg(p, 0.6, 0.7, e.outCubic) * (1 - e.inCubic(api.range(p, 0.86, 1)) * 0.6));
      if (m) {
        // phone: audit.json takes the terminal's slot at the top
        const sp = e.softSpring(api.range(p, 0.6, 0.78));
        api.place(S.json.pl, { y: S.json.o.y - (1 - sp) * 60, z: S.json.o.z + (1 - sp) * 120 });
        api.opacity(S.term.c, api.seg(p, 0.04, 0.2) * (1 - api.seg(p, 0.56, 0.64)));
      }
      api.place(S.stampPl, { y: (m ? -20 : 40) - e.inCubic(api.range(p, 0.86, 1)) * 30 });
    },
  });
})();
