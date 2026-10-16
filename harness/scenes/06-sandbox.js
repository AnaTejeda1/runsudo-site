/* /harness/scenes/06-sandbox.js — STEP 06 · SOLVE BLIND (pause).
 * A sealed glass container in 3D. solve/prompt.md is frozen to disk, drops in, the lid seals.
 * During the hold the agent works (transcript streams, the clock runs to 625 s) and reaches out:
 * api.anthropic.com and platform.claude.com pass (accent); github.com, pypi.org and any other host
 * hit the wall and are refused (bad). On exit the foreman record slides out with the patch.
 * Pure function of p. */
(() => {
  const H = window.Harness;
  if (!H) return;
  const ID = '06-sandbox';
  const DEG = 180 / Math.PI;

  let S = null;

  const PROMPT_HTML =
    '<div class="h-card sb-prompt">' +
    '<div class="h-card-head"><span class="path">solve/prompt.md</span><span class="sb-frz">frozen</span></div>' +
    '<div class="sb-prompt-body">' +
    '<p class="sb-p-h"><span class="tk-c">#</span> resources/jsconfig: Address VS Code linting notice in jsconfig.json</p>' +
    '<div class="sb-sk"><i style="width:92%"></i><i style="width:76%"></i><i style="width:84%"></i></div>' +
    '<p class="sb-p-f">freeze_prompt(…) · written before spawn</p>' +
    '</div></div>';

  const ROWS = [
    ['k', '{"type":"user","content":"<solve/prompt.md>"}'],
    ['a', '{"type":"assistant","message":{…}}'],
    ['t', '{"type":"tool_use","name":"Read",…}'],
    ['r', '{"type":"tool_result",…}'],
    ['t', '{"type":"tool_use","name":"Grep",…}'],
    ['r', '{"type":"tool_result",…}'],
    ['a', '{"type":"assistant","message":{…}}'],
    ['t', '{"type":"tool_use","name":"Edit",…}'],
    ['t', '{"type":"tool_use","name":"Bash","input":"./bt-test …"}'],
    ['r', '{"type":"tool_result",…}'],
    ['a', '{"type":"assistant","message":{…}}'],
    ['t', '{"type":"tool_use","name":"Edit",…}'],
    ['t', '{"type":"tool_use","name":"Bash","input":"./bt-test …"}'],
    ['r', '{"type":"tool_result",…}'],
    ['a', '{"type":"assistant","message":{…}}'],
  ];
  const TRANS_HTML =
    '<div class="h-card sb-trans">' +
    '<div class="h-card-head"><span class="path">transcript.jsonl</span><span class="sb-live"><i></i>live</span></div>' +
    '<div class="sb-rows"><div class="sb-rows-in">' +
    ROWS.map(([k, t]) => `<span class="sb-row is-${k}">${t.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`).join('') +
    '</div></div></div>';

  const FN_HTML =
    '<div class="h-card fn-card sb-fn">' +
    '<div class="h-card-head"><span class="path">bt/egress.py</span><span>bt/guard.py · fail-closed</span></div>' +
    '<pre><span class="ln hl"><span class="tk-b">ALLOWED_HOSTS</span> <span class="tk-o">=</span> {</span>' +
    '<span class="ln">    <span class="tk-s">"api.anthropic.com"</span>,</span>' +
    '<span class="ln">    <span class="tk-s">"platform.claude.com"</span>,</span>' +
    '<span class="ln">}</span></pre></div>';

  const REC_HTML = (m) =>
    '<div class="h-card json-card sb-rec">' +
    '<div class="h-card-head"><span class="path">foreman record · #15169</span><span class="kind">done</span></div>' +
    '<pre>{ <span class="tk-p">"stage"</span>: <span class="tk-s">"foreman"</span>, <span class="tk-p">"state"</span>: <span class="tk-s">"done"</span>,' + (m ? '\n ' : '') + ' <span class="tk-p">"steps"</span>: <span class="tk-n">1</span>,\n' +
    '  <span class="tk-p">"verdicts"</span>: [<span class="tk-s">"continue"</span>],\n' +
    '  <span class="tk-p">"patch_bytes"</span>: <span class="tk-n">2070</span>,' + (m ? '\n ' : '') + ' <span class="tk-p">"duration_s"</span>: <span class="tk-n">625.0</span> }</pre>' +
    '<div class="sb-out"><span class="chip is-solid">transcript.jsonl</span><span class="chip is-solid">patch · 2,070 B</span><span class="chip is-accent">sudo-solver v0.5.1</span></div>' +
    '</div>';

  const FRONT_HTML = (m) =>
    '<div class="sb-glass-in">' +
    '<div class="sb-fl sb-fl-tl">' + (m ? 'bt/solve.py' : 'bt/solve.py · box_argv(…)') + '</div>' +
    '<div class="sb-fl sb-fl-tr"><span class="sb-state is-open">open</span><span class="sb-state is-sealed">sealed</span></div>' +
    '<div class="sb-fl sb-fl-bl">' + (m ? 'foreman lane' : 'foreman lane · sudo-solver v0.5.1') + '</div>' +
    '<div class="sb-fl sb-fl-br"><b class="sb-clock">0</b> s</div>' +
    '</div>';

  const hostHtml = (name, kind) =>
    `<div class="sb-host is-${kind}"><i class="sb-ico"></i><span class="sb-hn">${name}</span><b class="sb-hs">${kind === 'allow' ? 'allowed' : 'refused'}</b></div>`;

  // where a ray from the box centre toward (x, y) leaves the box outline (in the z = 0 slice)
  function wallHit(x, y, hw, hh) {
    const tx = x !== 0 ? hw / Math.abs(x) : Infinity;
    const ty = y !== 0 ? hh / Math.abs(y) : Infinity;
    const t = Math.min(tx, ty);
    return [x * t, y * t];
  }

  function mount(root, api) {
    const m = api.mobile;
    S = { m };
    const BW = m ? 230 : 300, BH = m ? 170 : 220, BD = m ? 200 : 250;
    S.dim = { BW, BH, BD };

    // ---- shadow + floor glow
    S.shadow = api.plane({ x: 0, y: BH / 2 + 26, z: 0, rx: 90, w: BW * 1.9, h: BD * 1.3, cls: 'h-shadow sb-shadow', html: '<i class="sb-floorglow"></i>' });
    S.floorGlow = S.shadow.firstChild;

    // ---- the box
    const box = api.group({ x: 0, y: 0, z: 0 });
    S.box = box;
    const face = (o, extra = '', html = '') => {
      const f = api.plane(Object.assign({ cls: 'sb-face' + (extra ? ' ' + extra : ''), html: '<i class="sb-edge"></i>' + html }, o), box);
      return f;
    };
    S.faces = [
      face({ z: -BD / 2, ry: 180, w: BW, h: BH }, 'is-back'),
      face({ x: -BW / 2, ry: -90, w: BD, h: BH }, 'is-side'),
      face({ x: BW / 2, ry: 90, w: BD, h: BH }, 'is-side'),
      face({ y: BH / 2, rx: 90, w: BW, h: BD }, 'is-floor'),
    ];
    // inner core glow (sits inside, faces the viewer)
    S.core = api.plane({ x: 0, y: 6, z: -BD * 0.1, w: BW * 1.5, h: BH * 1.5, cls: 'sb-core', html: '<i></i>' }, box);
    S.coreIn = S.core.firstChild;

    // contents
    S.prompt = api.plane({ x: 0, y: 0, z: 0, w: m ? 210 : 250, html: PROMPT_HTML }, box);
    S.promptCard = S.prompt.firstChild;
    S.frz = S.promptCard.querySelector('.sb-frz');
    S.promptHalo = api.halo(S.promptCard, 'accent');
    S.trans = api.plane({ x: m ? 14 : 34, y: m ? 0 : -2, z: BD * 0.16, w: m ? 180 : 224, html: TRANS_HTML }, box);
    S.transCard = S.trans.firstChild;
    S.rowsIn = S.transCard.querySelector('.sb-rows-in');
    S.rowEls = [...S.transCard.querySelectorAll('.sb-row')];

    // front glass, last so it sorts in front
    S.front = face({ z: BD / 2, w: BW, h: BH }, 'is-front', FRONT_HTML(m));
    S.faces.push(S.front);
    S.clock = S.front.querySelector('.sb-clock');
    S.stOpen = S.front.querySelector('.sb-state.is-open');
    S.stSealed = S.front.querySelector('.sb-state.is-sealed');

    // lid on a hinge at the back top edge
    S.hinge = api.group({ x: 0, y: -BH / 2, z: -BD / 2 }, box);
    S.lid = api.plane({ x: 0, y: 0, z: BD / 2, rx: 90, w: BW, h: BD, cls: 'sb-face is-lid', html: '<i class="sb-edge"></i><i class="sb-seam"></i>' }, S.hinge);
    S.faces.push(S.lid);
    S.edges = S.faces.map((f) => f.querySelector('.sb-edge'));

    // ---- hosts + rays (in the z = 0 slice through the box centre)
    const hw = BW / 2, hh = BH / 2;
    const HOSTS = m
      ? [
          { name: 'api.anthropic.com', kind: 'allow', x: 92, y: -232 },
          { name: 'platform.claude.com', kind: 'allow', x: 92, y: -190 },
          { name: 'github.com', kind: 'deny', x: -104, y: 150 },
          { name: 'pypi.org', kind: 'deny', x: 104, y: 150 },
        ]
      : [
          { name: 'api.anthropic.com', kind: 'allow', x: 362, y: -172, w: 210 },
          { name: 'platform.claude.com', kind: 'allow', x: 378, y: -84, w: 226 },
          { name: 'github.com', kind: 'deny', x: -268, y: -200, w: 170 },
          { name: 'pypi.org', kind: 'deny', x: -290, y: -60, w: 150 },
          { name: 'any other host', kind: 'deny', x: -250, y: 128, w: 190 },
        ];
    S.hosts = HOSTS.map((h, i) => {
      const pl = api.plane({ x: h.x, y: h.y, z: 0, html: hostHtml(h.name, h.kind) });
      const card = pl.firstChild;
      // ray target: the chip's near edge
      const half = (h.w || 170) / 2;
      const tx = m ? h.x * 0.6 : h.x + (h.x > 0 ? -half : half);
      const ty = m ? h.y + (h.y < 0 ? 16 : -16) : h.y;
      const L = Math.hypot(tx, ty);
      const ang = Math.atan2(ty, tx) * DEG;
      const wall = wallHit(tx, ty, hw, hh);
      const Lw = Math.hypot(wall[0], wall[1]);
      const ray = api.plane({
        x: 0, y: 0, z: 0, rz: ang, center: false, w: L, h: 2, cls: 'sb-ray is-' + h.kind,
        html: `<i class="sb-ray-line" style="width:${(h.kind === 'allow' ? L : Lw).toFixed(1)}px"></i>` +
          (h.kind === 'deny' ? `<i class="sb-ray-ghost" style="left:${Lw.toFixed(1)}px;width:${(L - Lw).toFixed(1)}px"></i>` : '') +
          '<i class="sb-ray-dot"></i><i class="sb-ray-dot is-2"></i>',
      });
      const o = { h, pl, card, ray, L, Lw, i,
        line: ray.querySelector('.sb-ray-line'), ghost: ray.querySelector('.sb-ray-ghost'),
        dots: [...ray.querySelectorAll('.sb-ray-dot')] };
      if (h.kind === 'deny') {
        o.hit = api.plane({ x: wall[0], y: wall[1], z: 0, w: 34, h: 34, cls: 'sb-hit', html: '<i></i><b>✕</b>' });
      } else {
        o.halo = api.halo(card, 'accent');
      }
      return o;
    });
    let a = 0, d = 0;
    for (const o of S.hosts) o.order = o.h.kind === 'allow' ? a++ : d++;

    // ---- side cards
    if (!m) {
      S.fn = api.plane({ x: 300, y: 196, z: 50, ry: -8, w: 330, html: FN_HTML });
      S.fnCard = S.fn.firstChild;
    }
    S.rec = api.plane({ x: m ? 0 : -110, y: m ? 112 : 210, z: m ? 200 : 190, w: m ? 340 : 470, html: REC_HTML(m) });
    S.recCard = S.rec.firstChild;
    S.recHalo = api.halo(S.recCard, 'accent');
  }

  function update(p, api) {
    if (!S) return;
    const e = api.ease;
    const { BW, BH, BD } = S.dim;
    const m = S.m;
    const hp = api.hold(p);
    const ps = api.pause ? api.pause.start : 0.34;
    const pe = api.pause ? api.pause.end : 0.72;
    const lv = api.range(p, pe, 1); // leaving

    // ---- box assembles (faces fade in) and the floor glow follows the seal
    const boxIn = e.outCubic(api.range(p, 0.0, 0.12));

    // ---- prompt.md: frozen outside the box, then dropped in through the open lid
    const frz = api.range(p, 0.05, 0.12);
    api.opacity(S.frz, e.outCubic(frz));
    api.transform(S.frz, `rotate(-5deg) scale(${(1.7 - 0.7 * e.outBack(frz)).toFixed(3)})`);
    api.opacity(S.promptHalo, api.bump(p, 0.06, 0.1, 0.13, 0.2) * 0.9);
    const drop = e.inOutCubic(api.range(p, 0.13, 0.26));
    const P0 = m ? [-30, -250, 40] : [-70, -300, 60];
    const P1 = m ? [-40, -10, -BD * 0.24] : [-62, -14, -BD * 0.24];
    const lift = Math.sin(drop * Math.PI) * -40;
    api.place(S.prompt, {
      x: api.lerp(P0[0], P1[0], drop),
      y: api.lerp(P0[1], P1[1], drop) + lift,
      z: api.lerp(P0[2], P1[2], drop),
      rx: api.lerp(-8, 0, drop) + Math.sin(drop * Math.PI) * 20,
      s: api.lerp(1, m ? 0.7 : 0.74, drop),
    });
    api.opacity(S.promptCard, e.outCubic(api.range(p, 0.0, 0.07)) * (1 - 0.35 * api.range(p, 0.34, 0.42)));

    // ---- lid closes on a spring, then the seal flashes along every edge
    const close = e.spring(api.range(p, 0.22, 0.33), 0.55, 12);
    api.place(S.hinge, { rx: (1 - close) * 108 });
    const sealed = p > 0.3;
    const flash = api.bump(p, 0.29, 0.32, 0.34, 0.46, e.outCubic);
    const sealGlow = api.seg(p, 0.29, 0.36) * (1 - 0.5 * lv);
    for (const ed of S.edges) api.opacity(ed, boxIn * (0.22 + 0.78 * Math.max(flash, sealGlow * 0.4)));
    api.opacity(S.coreIn, 0.28 + 0.72 * sealGlow * (0.85 + 0.15 * Math.sin(hp * Math.PI * 6)));
    api.opacity(S.floorGlow, 0.3 + 0.7 * sealGlow);
    api.opacity(S.stOpen, sealed ? 0 : 1);
    api.opacity(S.stSealed, sealed ? 1 : 0);
    S.front.classList.toggle('is-sealed', sealed);

    // ---- transcript streams through the hold; the clock runs to 625 s
    api.opacity(S.transCard, e.outCubic(api.range(p, 0.3, 0.38)));
    const rowH = 16.5;
    const vis = m ? 4 : 6;
    const shown = api.range(p, 0.32, pe - 0.02) * S.rowEls.length;
    const scroll = Math.max(0, shown - vis) * rowH;
    api.transform(S.rowsIn, `translateY(${(-scroll).toFixed(1)}px)`);
    for (let i = 0; i < S.rowEls.length; i++) api.opacity(S.rowEls[i], api.clamp(shown - i));
    const clk = e.inOutSine(api.range(p, 0.32, pe));
    api.text(S.clock, clk >= 1 ? '625.0' : api.fmt(Math.max(0, Math.round(clk * 625)), 0));

    // ---- egress: allowed hosts pass, refused ones hit the wall
    let refusedFlash = 0;
    for (const o of S.hosts) {
      const allow = o.h.kind === 'allow';
      const t0 = allow ? 0.02 + o.order * 0.1 : 0.26 + o.order * 0.11;
      const g = e.outCubic(api.range(hp, t0, t0 + 0.1));
      const chipIn = e.outCubic(api.range(p, 0.08 + o.i * 0.025, 0.2 + o.i * 0.025));
      const fade = 1 - 0.75 * e.inOutCubic(api.range(p, pe + 0.02, pe + 0.14));
      api.opacity(o.card, chipIn);
      const lineLen = allow ? o.L : o.Lw;
      api.transform(o.line, `scaleX(${g.toFixed(4)})`);
      api.opacity(o.line, (g > 0 ? 1 : 0) * fade);
      const reached = g > 0.98 && hp > 0;
      if (allow) {
        o.card.classList.toggle('is-on', reached || p > pe);
        api.opacity(o.halo, (reached ? api.bump(hp, t0 + 0.09, t0 + 0.14, 0.9, 1.0) * 0.8 : 0) * fade);
        // packets running out and back along the ray while the agent works
        for (let k = 0; k < o.dots.length; k++) {
          const ph = (hp * 3.2 + k * 0.5 + o.order * 0.23) % 1;
          const on = reached && p < pe ? Math.sin(ph * Math.PI) : 0;
          api.opacity(o.dots[k], on);
          api.transform(o.dots[k], `translateX(${(ph * lineLen).toFixed(1)}px)`);
        }
      } else {
        const hitT = api.range(hp, t0 + 0.09, t0 + 0.2);
        const hitOn = g > 0.98;
        o.card.classList.toggle('is-refused', hitOn || p > pe);
        api.opacity(o.ghost, (hitOn ? 0.9 : 0) * fade);
        api.opacity(o.hit.firstChild, hitT > 0 && hitT < 1 ? Math.sin(hitT * Math.PI) : 0);
        api.transform(o.hit.firstChild, `scale(${(0.4 + 1.6 * e.outCubic(hitT)).toFixed(3)})`);
        api.opacity(o.hit.lastChild, (hitOn ? 1 : 0) * fade);
        refusedFlash = Math.max(refusedFlash, hitT > 0 && hitT < 1 ? Math.sin(hitT * Math.PI) : 0);
        const dot = o.dots[0];
        api.opacity(dot, g > 0 && g < 1 ? 1 : 0);
        api.transform(dot, `translateX(${(g * lineLen).toFixed(1)}px)`);
        api.opacity(o.dots[1], 0);
      }
    }
    api.setLight({ colors: { accent: 1, bad: refusedFlash * 0.7 } });

    // ---- side card + record sliding out of the box on exit
    if (S.fn) {
      const a = api.stagger(p, 0, 1, ps - 0.08, ps + 0.06, 1, e.outCubic);
      const sp = e.softSpring(api.range(p, ps - 0.08, ps + 0.1));
      api.opacity(S.fnCard, a * (1 - 0.6 * api.range(p, pe + 0.04, pe + 0.16)));
      api.place(S.fn, { y: 196 + (1 - sp) * 50, rx: (1 - sp) * 18 });
    }
    const out = e.softSpring(api.range(p, pe + 0.02, pe + 0.16));
    const outA = e.outCubic(api.range(p, pe + 0.02, pe + 0.1));
    const R0 = m ? [0, 0, 0] : [0, 0, 0];
    const R1 = m ? [0, 112, 200] : [-110, 210, 190];
    api.opacity(S.recCard, outA);
    api.place(S.rec, {
      x: api.lerp(R0[0], R1[0], out), y: api.lerp(R0[1], R1[1], out), z: api.lerp(R0[2], R1[2], out),
      s: api.lerp(0.45, 1, out), rx: (1 - out) * -20,
    });
    api.opacity(S.recHalo, api.bump(p, pe + 0.06, pe + 0.12, 0.9, 1) * 0.75);
  }

  H.registerScene({
    id: ID,
    light: { x: 0, y: -10, z: 0, color: 'accent' },
    mount,
    update,
  });
})();
