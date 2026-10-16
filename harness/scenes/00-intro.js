/* /harness/scenes/00-intro.js — "one run": the 30 sampled Hugo tickets as a constellation in three depth
 * layers around the repo card. #15169 is the only one lit; the rest dim as the camera dives toward it.
 * The other 29 ticket numbers are deliberately blank (#·····): we only name the ticket we follow. */
(() => {
  const H = window.Harness;
  if (!H) return;

  const RUN = 'run-20260930-081756';
  const FOCUS = { x: 150, y: 92, z: 60 };
  const FOCUS_M = { x: 20, y: 96, z: 50 };

  let S = null; // per-mount state

  /* A 1px beam between two scene-local points (plane rotated so its +x axis points from a to b). */
  function beam(api, a, b, cls) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const L = Math.hypot(dx, dy, dz) || 1;
    const rz = (Math.asin(dy / L) * 180) / Math.PI;
    const ry = (Math.atan2(-dz, dx) * 180) / Math.PI;
    const pl = api.plane({ x: a.x, y: a.y, z: a.z, ry, rz, w: L, h: 1, center: false, cls: 'i-beam-pl' });
    const inner = api.el('div', 'i-beam ' + (cls || ''), null, pl);
    return { pl, inner };
  }

  function layout(mobile, rand) {
    // three depth layers; positions on loose ellipses around the repo card, with jitter
    const layers = mobile
      ? [
          { n: 11, z: -560, rx: 300, ry: 250, cy: -60, s: 1 },
          { n: 10, z: -230, rx: 220, ry: 205, cy: -50, s: 1 },
          { n: 8, z: 110, rx: 185, ry: 230, cy: -40, s: 0.9 },
        ]
      : [
          { n: 12, z: -560, rx: 640, ry: 290, cy: -70, s: 1 },
          { n: 10, z: -220, rx: 520, ry: 235, cy: -60, s: 1 },
          { n: 7, z: 150, rx: 430, ry: 205, cy: -55, s: 1 },
        ];
    const out = [];
    const F = mobile ? FOCUS_M : FOCUS;
    layers.forEach((L, li) => {
      const off = rand();
      for (let i = 0; i < L.n; i++) {
        const a = ((i + off) / L.n) * Math.PI * 2 + (rand() - 0.5) * 0.35;
        let x = Math.cos(a) * L.rx * (0.82 + rand() * 0.3);
        let y = L.cy + Math.sin(a) * L.ry * (0.82 + rand() * 0.3);
        // keep the front layer clear of the focus ticket and of the caption corner
        if (li === 2 && Math.hypot(x - F.x, y - F.y) < (mobile ? 90 : 150)) x += x > F.x ? 120 : -120;
        if (!mobile && y > 150) y = 150 - rand() * 30;
        out.push({ x, y, z: L.z + (rand() - 0.5) * 120, layer: li, ph: rand() * Math.PI * 2, s: L.s });
      }
    });
    return out;
  }

  H.registerScene({
    id: '00-intro',
    mount(root, api) {
      const m = api.mobile;
      const rand = api.rng(15169);
      S = { chips: [] };

      // ---- repo card (centre)
      const repoW = m ? 330 : 520;
      S.repo = api.plane({ x: 0, y: m ? -110 : -70, z: 0, w: repoW });
      S.repoC = api.el(
        'div',
        'h-card i-repo',
        `<div class="h-card-head"><span class="path">github.com/gohugoio/hugo</span><span>backtest</span></div>
         <div class="h-card-body">
           <div class="i-title"><span class="i-owner">gohugoio</span><span class="i-sl">/</span>hugo</div>
           <dl class="kv i-kv">
             <dt>run</dt><dd>${RUN}</dd>
             <dt>lane</dt><dd>foreman</dd>
             <dt>tickets</dt><dd><b class="i-n">0</b> closed issues, sampled</dd>
             <dt>following</dt><dd class="i-follow">#15169</dd>
           </dl>
         </div>`,
        S.repo
      );
      S.repoN = S.repoC.querySelector('.i-n');
      S.follow = S.repoC.querySelector('.i-follow');
      S.repoHalo = api.halo(S.repoC, 'white');

      // ---- 29 blank chips + the one we follow
      const pts = layout(m, rand);
      pts.forEach((q, i) => {
        const pl = api.plane({ x: q.x, y: q.y, z: q.z });
        const c = api.el('div', 'i-chip', '<i class="i-dot"></i>#·····', pl);
        S.chips.push({ pl, c, q, i });
      });
      const F = m ? FOCUS_M : FOCUS;
      S.focus = api.plane({ x: F.x, y: F.y, z: F.z });
      S.focusC = api.el(
        'div',
        'i-chip i-focus',
        `<i class="i-dot"></i><span class="i-fnum">#15169</span>
         <span class="i-ftitle"><span class="i-fstate">Closed</span>resources/jsconfig: Address VS Code linting notice in jsconfig.json</span>`,
        S.focus
      );
      S.focusTitle = S.focusC.querySelector('.i-ftitle');
      S.focusHalo = api.halo(S.focusC, 'accent');

      // beam from the repo card to the followed ticket
      const from = { x: m ? 40 : 120, y: m ? -40 : 10, z: 0 };
      S.beam = beam(api, from, { x: F.x - 6, y: F.y - 4, z: F.z }, '');
      S.F = F;
    },

    update(p, api) {
      if (!S) return;
      const e = api.ease;
      const m = api.mobile;

      // repo card: settles in with a slow tilt; counts its 30 tickets as the chips appear
      const rIn = e.outCubic(api.range(p, 0, 0.16));
      api.opacity(S.repoC, 0.6 + 0.4 * rIn);
      api.place(S.repo, { ry: api.lerp(-10, 6, e.inOutSine(p)), rx: api.lerp(6, -2, e.inOutSine(p)), z: api.lerp(-80, 0, rIn) });
      api.count(S.repoN, Math.round(30 * e.outCubic(api.range(p, 0.04, 0.4))));
      api.opacity(S.repoHalo, 0.35 * api.bump(p, 0.05, 0.3, 0.55, 0.8));

      // chips: stagger in by layer (back first), breathe, then dim as we commit to #15169
      const dimF = e.inOutCubic(api.range(p, 0.55, 0.82));
      const n = S.chips.length;
      for (const ch of S.chips) {
        const order = ch.q.layer * 10 + (ch.i % 10);
        const a = api.stagger(p, order, 30, 0.0, 0.34, 0.34, e.outQuint);
        const drift = Math.sin(ch.q.ph + p * 5.2) * 8;
        api.place(ch.pl, {
          x: ch.q.x + Math.cos(ch.q.ph + p * 3.1) * 6,
          y: ch.q.y + drift + (1 - a) * 60,
          z: ch.q.z - (1 - a) * 260,
          rz: Math.sin(ch.q.ph) * 4,
          ry: Math.cos(ch.q.ph) * 14,
        });
        api.opacity(ch.c, a * (1 - 0.72 * dimF));
      }
      void n;

      // the ticket we follow: appears with the crowd, then lights, then opens to show its title
      const fIn = api.stagger(p, 24, 30, 0.0, 0.34, 0.34, e.outQuint);
      const lit = e.inOutSine(api.range(p, 0.3, 0.6));
      const open = e.outCubic(api.range(p, 0.5, 0.72));
      api.opacity(S.focusC, fIn);
      api.place(S.focus, {
        y: S.F.y + Math.sin(p * 4) * 5 + (1 - fIn) * 60,
        z: S.F.z - (1 - fIn) * 260,
        ry: api.lerp(-14, -4, lit),
      });
      api.opacity(S.focusHalo, 0.15 + 0.85 * lit);
      S.focusC.classList.toggle('is-lit', lit > 0.5);
      api.transform(S.focusTitle, `translate3d(${((1 - open) * -10).toFixed(2)}px,${((1 - open) * -8).toFixed(2)}px,0)`);
      api.opacity(S.focusTitle, open);
      api.opacity(S.follow, 0.4 + 0.6 * lit);

      // beam: draws from the repo card to #15169
      const b = e.inOutCubic(api.range(p, 0.44, 0.66));
      api.transform(S.beam.inner, `scaleX(${b.toFixed(4)})`);
      api.opacity(S.beam.inner, b * (1 - 0.5 * e.smooth(api.range(p, 0.9, 1))));

      // focus light slides from the repo card to the ticket
      const lf = e.inOutCubic(api.range(p, 0.4, 0.75));
      api.setLight({ x: api.lerp(0, S.F.x, lf), y: api.lerp(m ? -110 : -40, S.F.y, lf), z: api.lerp(0, S.F.z, lf), color: 'accent' });
    },
  });
})();
