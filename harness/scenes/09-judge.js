/* /harness/scenes/09-judge.js — Step 09 · Blind judge (pause frame, the emotional peak).
 * Two patches labelled only A and B. scrub_tells(…) masks issue URLs and versions. Inside the
 * hold the judge's reasoning types out, the verdict lands ("better"), then judge/order.json
 * (written only after the reply) flips the cards: A = agent (ours), B = human (merged fix).
 * The light switches from accent to good at the reveal. Pure function of p. */
(() => {
  const H = window.Harness;
  if (!H) return;

  const QUOTE =
    "“Patch A fixes the root cause exactly as VS Code's message suggests ('Did you forget a leading ./?')… " +
    'Patch B instead just skips the root==dir entry… only masks the reported single-* symptom.”';
  const URL = 'github.com/gohugoio/hugo/issues/15169';

  let S = null;

  function card(api, o, cls, html) {
    const pl = api.plane(Object.assign({ cls: 'jd-car' }, o));
    const c = api.el('div', 'h-card ' + cls, html, pl);
    return { pl, c, o };
  }

  function bars(rows) {
    return rows
      .map(([k, w]) =>
        k === 'hunk'
          ? '<span class="dl hunk"><span class="g"></span>@@ resources/jsconfig/… @@</span>'
          : `<span class="dl ${k}"><span class="g">${k === 'add' ? '+' : k === 'del' ? '-' : '·'}</span><i class="jd-bar" style="width:${w}%"></i></span>`
      )
      .join('');
  }

  function patch(letter, size, who, whoCls, rows) {
    return (
      '<div class="ab-top">' +
      `<span class="ab-letter">${letter}</span>` +
      `<span class="ab-meta">Patch ${letter}<br>${size}</span>` +
      '</div>' +
      '<div class="jd-who"><span class="jd-flip">' +
      '<span class="jd-face jd-front"><i></i>author hidden</span>' +
      `<span class="jd-face jd-back ${whoCls}">${who}</span>` +
      '</span></div>' +
      `<pre class="jd-diff">${bars(rows)}</pre>`
    );
  }

  H.registerScene({
    id: '09-judge',
    // gentler drift than the stock +130 so the reveal frame (order.json above, A/B, judge below) stays composed
    pause: { drift: { dolly: 50, fov: -1 } },
    mount(root, api) {
      const m = api.mobile;
      S = { m };
      const cw = m ? 158 : 262;

      S.A = card(
        api,
        m ? { x: -84, y: -150, z: 0, w: cw } : { x: -136, y: -86, z: 0, w: cw },
        'ab-card diff-card jd-ab jd-a',
        patch('A', '2,070 B', '<b>ours</b> · agent', 'is-ours', [
          ['hunk'],
          ['ctx', 58],
          ['del', 44],
          ['add', 72],
          ['add', 64],
          ['add', 38],
          ['ctx', 50],
          ['add', 56],
        ])
      );
      S.B = card(
        api,
        m ? { x: 84, y: -150, z: 0, w: cw } : { x: 146, y: -86, z: 0, w: cw },
        'ab-card diff-card jd-ab jd-b',
        patch('B', '1,095 B', '<b>merged fix</b> · human', 'is-human', [
          ['hunk'],
          ['ctx', 62],
          ['add', 48],
          ['add', 30],
          ['ctx', 44],
        ])
      );
      for (const X of [S.A, S.B]) {
        X.flip = X.c.querySelector('.jd-flip');
        X.halo = api.halo(X.c, 'accent');
        X.haloG = api.halo(X.c, 'good');
        X.letter = X.c.querySelector('.ab-letter');
      }

      // scrub_tells(…): live masking, approach only
      S.scrub = card(
        api,
        m ? { x: 0, y: 70, z: 40, w: 330 } : { x: 5, y: 140, z: 40, w: 470 },
        'fn-card jd-scrub',
        '<div class="h-card-head"><span class="path">bt/judge.py</span><span>before the judge reads</span></div>' +
          '<pre><span class="ln"><span class="tk-f">scrub_tells</span><span class="tk-o">(…)</span></span>' +
          '<span class="ln jd-sl"><span class="tk-c">issue URLs</span> <span class="tk-o">→</span> <span class="jd-m"><span class="jd-raw">' +
          URL +
          '</span><span class="jd-tok">&lt;link&gt;</span></span></span>' +
          '<span class="ln jd-sl"><span class="tk-c">versions</span>   <span class="tk-o">→</span> <span class="jd-m"><span class="jd-raw jd-raw2">version strings</span><span class="jd-tok">&lt;version&gt;</span></span></span>' +
          '<span class="ln jd-sl"><span class="tk-c">order</span>      <span class="tk-o">→</span> <span class="tk-s">random</span><span class="tk-c">, A/B only</span></span>' +
          '</pre>'
      );
      S.raws = [...S.scrub.c.querySelectorAll('.jd-raw')];
      S.toks = [...S.scrub.c.querySelectorAll('.jd-tok')];

      // the judge
      S.J = card(
        api,
        m ? { x: 0, y: 80, z: 30, w: 330 } : { x: 5, y: 176, z: 30, w: 560 },
        'jd-judge',
        '<div class="h-card-head"><span class="path"><span class="tk-f">judge_ticket</span><span class="tk-o">(…)</span></span><span class="jd-model">claude-opus-5-5</span></div>' +
          '<div class="jd-body"><p class="jd-q"><span class="jd-qt"></span><span class="caret jd-caret"></span></p>' +
          '<p class="jd-v"><span><span class="tk-p">"verdict"</span><span class="tk-o">:</span></span><span class="pill better jd-pill">"better"</span>' +
          '<span class="jd-ai"><span class="tk-p">"agent_is"</span><span class="tk-o">:</span> <span class="tk-s jd-ai-v">"A"</span></span></p></div>'
      );
      S.qt = S.J.c.querySelector('.jd-qt');
      S.caret = S.J.c.querySelector('.jd-caret');
      S.vline = S.J.c.querySelector('.jd-v');
      S.pill = S.J.c.querySelector('.jd-pill');
      S.ai = S.J.c.querySelector('.jd-ai');
      S.jHalo = api.halo(S.J.c, 'accent');

      // order.json: written only after the reply
      S.O = card(
        api,
        m ? { x: 0, y: -120, z: 120, w: 290 } : { x: 5, y: -262, z: 60, w: 360 },
        'json-card jd-order',
        '<div class="h-card-head"><span class="path">judge/order.json</span><span class="kind">written after the reply</span></div>' +
          '<pre>{ <span class="tk-p">"A"</span>: <span class="tk-s lum-good">"agent"</span>, <span class="tk-p">"B"</span>: <span class="tk-s">"human"</span> }</pre>'
      );
      S.oHalo = api.halo(S.O.c, 'good');

      // contact shadows on a floor plane below the cards (depth cue)
      if (!m) {
        S.shadow = api.plane({ cls: 'h-shadow', w: 760, h: 200, x: 5, y: 310, z: -40, rx: 90, fog: true });
      }
    },

    update(p, api) {
      if (!S) return;
      const e = api.ease;
      const m = S.m;
      const h = api.hold(p);
      const lv = e.inOutCubic(api.leave(p));
      const ps = api.pause ? api.pause.start : 0.365;

      // A / B enter from depth, opposite sides, overlapping springs
      [S.A, S.B].forEach((X, i) => {
        const s0 = 0.04 + i * 0.05;
        const sp = e.softSpring(api.range(p, s0, s0 + 0.24));
        const side = i ? 1 : -1;
        api.opacity(X.c, e.outCubic(api.range(p, s0, s0 + 0.12)));
        X.base = {
          x: X.o.x + side * (1 - sp) * 260,
          y: X.o.y + (1 - sp) * 40,
          z: X.o.z - (1 - sp) * 380,
          ry: side * -(1 - sp) * 38,
        };
      });

      // scrub card (approach), then it gives its place to the judge
      const scrIn = e.softSpring(api.range(p, 0.1, 0.24));
      const scrOut = e.inOutCubic(api.range(p, ps - 0.07, ps + 0.01));
      api.opacity(S.scrub.c, e.outCubic(api.range(p, 0.1, 0.18)) * (1 - scrOut));
      api.place(S.scrub.pl, {
        y: S.scrub.o.y + (1 - scrIn) * 90 + scrOut * 60,
        z: S.scrub.o.z - (1 - scrIn) * 200 - scrOut * 260,
        rx: (1 - scrIn) * 20 + scrOut * 26,
      });
      S.raws.forEach((r, i) => {
        const k = api.range(p, 0.2 + i * 0.04, 0.27 + i * 0.04);
        api.opacity(r, 1 - e.inOutCubic(k));
        api.opacity(S.toks[i], e.outCubic(api.range(k, 0.45, 1)));
        r.classList.toggle('is-strike', k > 0.05);
      });

      // judge card rises into the frame as the hold begins
      const jIn = e.softSpring(api.range(p, ps - 0.05, ps + 0.06));
      api.opacity(S.J.c, e.outCubic(api.range(p, ps - 0.05, ps + 0.01)));
      api.place(S.J.pl, {
        y: S.J.o.y + (1 - jIn) * 110 + lv * 30,
        z: S.J.o.z - (1 - jIn) * 220 - lv * 60,
        rx: (1 - jIn) * -22,
      });

      // reasoning types, then verdict
      const ty = api.range(h, 0.02, 0.46);
      api.type(S.qt, QUOTE, ty);
      api.opacity(S.caret, h > 0 && h < 0.5 ? 1 : 0);
      const v = api.range(h, 0.48, 0.58);
      api.opacity(S.vline, e.outCubic(v));
      const vs = e.spring(v, 0.5, 12);
      api.transform(S.pill, `scale(${(1.6 - 0.6 * vs).toFixed(4)})`);
      api.opacity(S.ai, api.seg(h, 0.74, 0.82));
      api.opacity(S.jHalo, api.bump(h, 0.48, 0.56, 0.66, 0.76) * 0.8);

      // A wins: accent focus on A during the verdict
      const pick = api.bump(h, 0.5, 0.58, 0.68, 0.76);
      api.opacity(S.A.halo, pick);
      api.opacity(S.B.halo, 0);

      // order.json drops in, then the cards flip to reveal who wrote what
      const o = api.range(h, 0.62, 0.74);
      const os = e.spring(o, 0.6, 11);
      // phone: order.json lands in front of the cards, then clears so the flip reads
      const oOut = m ? e.inOutCubic(api.range(h, 0.84, 0.97)) : 0;
      api.opacity(S.O.c, e.outCubic(api.range(o, 0, 0.5)) * (1 - lv * 0.6) * (1 - oOut));
      api.place(S.O.pl, { y: S.O.o.y - (1 - os) * 90 - lv * 40, z: S.O.o.z + (1 - os) * 160 });
      api.opacity(S.oHalo, api.bump(h, 0.66, 0.74, 0.86, 1.2) * 0.75);

      const fA = e.inOutBack(api.range(h, 0.7, 0.8));
      const fB = e.inOutBack(api.range(h, 0.74, 0.84));
      api.transform(S.A.flip, `rotateX(${(fA * 180).toFixed(2)}deg)`);
      api.transform(S.B.flip, `rotateX(${(fB * 180).toFixed(2)}deg)`);

      const rv = e.outCubic(api.range(h, 0.76, 0.9));
      api.opacity(S.A.haloG, rv * (1 - lv * 0.4));
      S.A.c.classList.toggle('is-won', h >= 0.78);
      S.B.c.classList.toggle('is-lost', h >= 0.82);
      api.opacity(S.B.c, e.outCubic(api.range(p, 0.09, 0.21)) * (1 - 0.42 * e.outCubic(api.range(h, 0.8, 0.95))));

      // A lifts toward the camera on the reveal; both drift apart on leave
      const lift = e.softSpring(api.range(h, 0.76, 0.96));
      api.place(S.A.pl, {
        x: S.A.base.x - lv * 60,
        y: S.A.base.y + lv * 20,
        z: S.A.base.z + lift * 24 - lv * 40,
        ry: S.A.base.ry + lv * 8,
      });
      api.place(S.B.pl, {
        x: S.B.base.x + lv * 60,
        y: S.B.base.y + lv * 20,
        z: S.B.base.z - lift * 20 - lv * 80,
        ry: S.B.base.ry - lv * 8,
      });

      // light: accent through the deliberation, good after the reveal
      api.setLight({ x: 0, y: -20, z: 0, colors: { accent: 1 - rv, good: rv } });
    },
  });
})();
