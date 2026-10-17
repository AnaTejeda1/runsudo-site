/* /harness/scenes/04-rewind.js — STEP 04 · REWIND (pause).
 * A commit timeline laid along local z: newest deep (z ≈ -1100), the base commit near z = 0.
 * The camera retreats along +z (rewinding), passes the merged fix commit, which dissolves, and
 * settles on base dd3f2731… where ticket.md (title + body only, comments struck) is composed.
 * Everything is a pure function of p. */
(() => {
  const H = window.Harness;
  if (!H) return;
  const ID = '04-rewind';
  const isMobile = () => window.innerWidth <= 760;

  // Rail endpoints (local space): base commit near the viewer, HEAD deep in z.
  const RAIL = {
    d: { base: [-212, 150, -80], head: [-160, -780, -1120] },
    m: { base: [-40, -250, -80], head: [-10, -860, -1120] },
  };
  const railPt = (R, z) => {
    const f = (z - R.base[2]) / (R.head[2] - R.base[2]);
    return [R.base[0] + (R.head[0] - R.base[0]) * f, R.base[1] + (R.head[1] - R.base[1]) * f, z];
  };
  const FIX_Z = -500;
  const FIX_DX = -70; // the fix card sits a little left of the rail, clear of the hold cards

  const camKeys = (R, mob) => {
    const a = railPt(R, -1000), f = railPt(R, FIX_Z);
    return [
      { u: 0.12, x: a[0] + 20, y: a[1] + 30, z: -1000, dolly: mob ? 60 : 80, ry: -10, rx: 6, rz: 7 },
      // frame the fix commit dead centre, close, with a slight bank: its removal is the beat
      { u: 0.3, x: f[0] + FIX_DX, y: f[1], z: FIX_Z, dolly: 250, ry: 2, rx: 2, rz: -4 },
      { u: 0.42, x: f[0] * 0.5 + 20, y: f[1] * 0.4, z: -260, dolly: 0, ry: 5, rx: 3, rz: -2 },
      { u: 0.62, hold: true, x: mob ? 0 : 10, y: mob ? -20 : 0, z: 0, dolly: mob ? -40 : -60, sx: 0.12 },
      { u: 0.9, dolly: -220, rx: -12, y: mob ? 140 : 170, ry: -10 },
    ];
  };

  let S = null;

  const COMMITS = [
    { z: -1120, kind: 'head', sha: 'HEAD', sub: 'newest · after the fix' },
    { z: -980, kind: 'future', sha: '·······', sub: 'after the fix' },
    { z: -850, kind: 'future', sha: '·······', sub: 'after the fix' },
    { z: -720, kind: 'future', sha: '·······', sub: 'after the fix' },
    { z: FIX_Z, kind: 'fix', sha: 'fix', sub: 'the merged fix' },
    { z: -40, kind: 'base', sha: 'dd3f2731…', sub: 'base_sha = first_parent(fix)' },
  ];

  function commitHtml(c) {
    const tag =
      c.kind === 'base' ? '<span class="rw-tag is-add">checkout</span>'
      : c.kind === 'fix' ? '<span class="rw-tag is-del">fix</span>'
      : c.kind === 'head' ? '<span class="rw-tag">HEAD</span>'
      : c.kind === 'old' ? '' : '<span class="rw-tag is-dim">future</span>';
    return (
      `<div class="h-card rw-commit is-${c.kind}">` +
      `<div class="rw-c-row"><i class="rw-node"></i><span class="rw-sha">${c.kind === 'head' ? '·······' : c.sha}</span>${tag}</div>` +
      `<div class="rw-c-sub">${c.sub}</div>` +
      (c.kind === 'fix' ? '<div class="rw-slot"><span>absent from the checkout</span></div><i class="rw-scan"></i>' : '') +
      (c.kind === 'base' ? '<div class="rw-c-vol"><i class="h-diamond"></i>bt-ws-&lt;run&gt;-&lt;ticket&gt; <b>via file://</b></div>' : '') +
      '</div>'
    );
  }

  const TICKET_HTML =
    '<div class="h-card ticket-card rw-issue">' +
    '<p class="t-top"><span>gohugoio/hugo</span><span class="t-state">Closed</span></p>' +
    '<p class="t-title">resources/jsconfig: Address VS Code linting notice in jsconfig.json <span class="num">#15169</span></p>' +
    '<p class="t-meta">on GitHub: title, body, comments, the linked fix</p>' +
    '<div class="t-labels"><span class="gh-label is-accent">sampled</span><span class="gh-label is-add">fix identified</span></div>' +
    '</div>';

  const MD_HTML =
    '<div class="h-card rw-md">' +
    '<div class="h-card-head"><span class="path">ticket.md</span><span>write_ticket_md(…)</span></div>' +
    '<div class="rw-md-body">' +
    '<p class="rw-md-h"><span class="tk-c">#</span> resources/jsconfig: Address VS Code linting notice in jsconfig.json</p>' +
    '<p class="rw-md-lbl"><i class="ok"></i>title</p>' +
    '<p class="rw-md-lbl"><i class="ok"></i>body</p>' +
    '<div class="rw-sk"><i style="width:94%"></i><i style="width:81%"></i><i style="width:88%"></i><i style="width:46%"></i></div>' +
    '<div class="rw-cmts">' +
    '<p class="rw-md-lbl is-no"><i></i>comments<span class="rw-never">never included</span></p>' +
    '<div class="rw-sk is-cmt"><i style="width:72%"></i><i style="width:90%"></i><i style="width:58%"></i></div>' +
    '<span class="rw-strike"></span>' +
    '</div>' +
    '</div></div>';

  const JSON_HTML =
    '<div class="h-card json-card rw-json">' +
    '<div class="h-card-head"><span class="path">run-status.json</span><span class="kind">snapshot</span></div>' +
    '<pre>{ <span class="tk-p">"stage"</span>: <span class="tk-s">"snapshot"</span>,\n' +
    '  <span class="tk-p">"base_sha"</span>: <span class="tk-s rw-sha-lit">"dd3f2731…"</span>,\n' +
    '  <span class="tk-p">"ticket"</span>: <span class="tk-s">"15169"</span> }</pre>' +
    '</div>';

  const FN_HTML =
    '<div class="h-card fn-card rw-fn">' +
    '<div class="h-card-head"><span class="path">bt/snapshot.py</span></div>' +
    '<pre><span class="ln hl"><span class="tk-k">def</span> <span class="tk-f">snapshot_ticket</span><span class="tk-o">(…)</span></span>' +
    '<span class="ln"><span class="tk-k">def</span> <span class="tk-f">first_parent</span><span class="tk-o">(…)</span></span>' +
    '<span class="ln"><span class="tk-k">def</span> <span class="tk-f">write_ticket_md</span><span class="tk-o">(…)</span></span></pre>' +
    '</div>';

  const PATCH_HTML =
    '<div class="rw-chip is-ghost is-2"><span>human.patch</span><b>not written until solve finishes</b></div>';

  function mount(root, api) {
    const m = api.mobile;
    const R = m ? RAIL.m : RAIL.d;
    S = { m, items: [], commits: [], parts: [] };

    // ---- the rail (a hairline along the commit direction)
    const b = R.base, h = R.head;
    const dx = h[0] - b[0], dy = h[1] - b[1], dz = h[2] - b[2];
    const L = Math.hypot(dx, dy, dz);
    const ext = 200; // the rail continues past the base toward older history
    const ux = dx / L, uy = dy / L, uz = dz / L;
    // width axis: perpendicular to the rail and to the view axis, so the rail faces the camera
    const vl = Math.hypot(uy, ux) || 1;
    const vx = -uy / vl, vy = ux / vl, vz = 0;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const RL = L + ext + 120;
    S.rail = api.plane(
      { x: b[0] - ux * ext, y: b[1] - uy * ext, z: b[2] - uz * ext, center: false, cls: 'rw-rail', fog: false,
        html: '<span class="rw-rail-in"><i class="rw-rail-past"></i><i class="rw-rail-future"></i></span>' },
    );
    const f6 = (v) => v.toFixed(6);
    S.rail.firstChild.style.width = RL + 'px';
    S.rail.firstChild.style.transform = `matrix3d(${f6(ux)},${f6(uy)},${f6(uz)},0,${f6(vx)},${f6(vy)},${f6(vz)},0,${f6(nx)},${f6(ny)},${f6(nz)},0,0,0,0,1)`;
    S.railIn = S.rail.firstChild;
    S.railFuture = S.railIn.children[1];
    S.railFuture.style.left = ((ext / RL) * 100).toFixed(2) + '%';

    // ---- commits
    for (const c of COMMITS) {
      const pt = railPt(R, c.z);
      const w = c.kind === 'base' ? (m ? 250 : 270) : 230;
      const off = 0;
      const ox = c.kind === 'fix' ? FIX_DX : 0;
      pt[0] += ox;
      const pl = api.plane({ x: pt[0], y: pt[1] + off, z: pt[2], ry: c.kind === 'base' ? 0 : -6, w, html: commitHtml(c) });
      const card = pl.firstChild;
      const o = { c, pl, card, x: pt[0], y: pt[1] + off, z: pt[2] };
      if (c.kind === 'base') o.halo = api.halo(card, 'add');
      if (c.kind === 'fix') {
        o.slot = card.querySelector('.rw-slot');
        o.scan = card.querySelector('.rw-scan');
        o.inner = [card.querySelector('.rw-c-row'), card.querySelector('.rw-c-sub')];
        o.halo = api.halo(card, 'del');
        // dissolve particles
        const g = api.group({ x: pt[0], y: pt[1] + off, z: pt[2] });
        const rand = api.rng(15169);
        o.bits = [];
        for (let i = 0; i < (m ? 18 : 40); i++) {
          const e = api.el('i', 'rw-bit' + (rand() < 0.4 ? ' is-del' : rand() < 0.5 ? ' is-add' : ''), null, g);
          const sxp = (rand() - 0.5) * 210, syp = (rand() - 0.5) * 44;
          const ang = Math.atan2(syp, sxp);
          o.bits.push({ e, sx: sxp, sy: syp, vx: Math.cos(ang) * (40 + rand() * 120), vy: Math.sin(ang) * (30 + rand() * 80) - 30, vz: 40 + rand() * 260, s: 0.7 + rand() * 1.8, d: rand() * 0.3 });
        }
      }
      S.commits.push(o);
    }

    // ---- hold composition (fades in as the camera reverses into it)
    const add = (key, o, html, enter) => {
      const pl = api.plane(Object.assign({ html }, o));
      const it = { key, pl, card: pl.firstChild, o, enter };
      S.items.push(it);
      S[key] = it;
      return it;
    };
    if (!m) {
      add('issue', { x: 205, y: -246, z: -120, ry: -5, w: 400 }, TICKET_HTML, 0);
      add('md', { x: 150, y: 2, z: 40, ry: -4, w: 430 }, MD_HTML, 1);
      add('patch', { x: -232, y: -40, z: 10, w: 250 }, PATCH_HTML, 2);
      add('json', { x: 262, y: 226, z: 10, ry: -6, w: 320 }, JSON_HTML, 3);
      add('fn', { x: -24, y: 318, z: -10, ry: 5, w: 262 }, FN_HTML, 4);
    } else {
      add('md', { x: 0, y: -12, z: 40, w: 340 }, MD_HTML, 1);
    }
    S.mdHalo = api.halo(S.md.card, 'add');
    S.strike = S.md.card.querySelector('.rw-strike');
    S.cmts = S.md.card.querySelector('.rw-cmts');
    S.never = S.md.card.querySelector('.rw-never');
    S.shaLit = S.json ? S.json.card.querySelector('.rw-sha-lit') : null;
  }

  function update(p, api) {
    if (!S) return;
    const e = api.ease;
    const hp = api.hold(p);
    const ps = api.pause ? api.pause.start : 0.39;
    const pe = api.pause ? api.pause.end : 0.76;

    // Rail: fades in, the future part dims to a ghost once we're at the base.
    api.opacity(S.railIn, api.seg(p, 0.0, 0.08, e.outCubic) * (1 - 0.6 * api.seg(p, pe, 1)));
    api.opacity(S.railFuture, 1 - 0.75 * api.seg(p, ps - 0.04, ps + 0.12, e.inOutCubic));

    // Commits
    const fixP = 0.21; // the camera is framed on the fix around here
    for (let i = 0; i < S.commits.length; i++) {
      const o = S.commits[i];
      const k = o.c.kind;
      const enter = e.outCubic(api.range(p, 0.0 + i * 0.012, 0.1 + i * 0.012));
      if (k === 'fix') {
        // light up as we approach, then dissolve: absent, not hidden.
        const lit = api.bump(p, 0.08, 0.16, 0.21, 0.28);
        const dis = api.seg(p, fixP, fixP + 0.14, e.inOutCubic);
        api.opacity(o.card, enter);
        // pink pulse while it's framed, gone with it
        api.opacity(o.halo, api.bump(p, 0.12, 0.18, 0.21, 0.29) * (0.7 + 0.3 * Math.sin(api.range(p, 0.12, 0.21) * Math.PI * 2)));
        o.card.classList.toggle('is-lit-del', lit > 0.5 && dis < 0.3);
        for (const n of o.inner) {
          api.opacity(n, 1 - dis);
          api.filter(n, dis > 0.002 && dis < 0.998 && !S.m ? `blur(${(dis * 6).toFixed(2)}px)` : 'none');
          if (dis >= 0.998) api.filter(n, 'none');
        }
        api.opacity(o.slot, api.seg(p, fixP + 0.06, fixP + 0.16) * (1 - 0.4 * api.seg(p, pe, 1)));
        api.place(o.pl, { s: 1 + 0.05 * e.outCubic(dis) });
        const sc = api.range(p, fixP - 0.01, fixP + 0.1);
        api.opacity(o.scan, sc > 0 && sc < 1 ? Math.sin(sc * Math.PI) : 0);
        api.transform(o.scan, `translateX(${(e.inOutSine(sc) * 230 - 10).toFixed(1)}px)`);
        o.card.classList.toggle('is-gone', dis > 0.6);
        for (const bt of o.bits) {
          const q = api.range(dis, bt.d, Math.min(1, bt.d + 0.7));
          const f = e.outCubic(q);
          api.opacity(bt.e, q > 0 && q < 1 ? Math.sin(q * Math.PI) * 0.95 : 0);
          api.transform(bt.e, `translate3d(${(bt.sx + bt.vx * f).toFixed(1)}px,${(bt.sy + bt.vy * f).toFixed(1)}px,${(bt.vz * f).toFixed(1)}px) scale(${(bt.s * (1 - 0.6 * f)).toFixed(3)})`);
        }
        continue;
      }
      if (k === 'base') {
        const lit = api.seg(p, ps - 0.1, ps + 0.02, e.outCubic);
        const be = e.outCubic(api.range(p, ps - 0.16, ps - 0.04));
        api.opacity(o.card, be);
        api.opacity(o.halo, lit * (0.55 + 0.45 * api.bump(p, ps, ps + 0.06, pe - 0.1, pe + 0.05)) * (1 - 0.6 * api.seg(p, pe, 1)));
        o.card.classList.toggle('is-on', lit > 0.5);
        continue;
      }
      // future commits ghost out once the checkout is made; old ones stay.
      const ghost = k === 'old' ? 0 : api.seg(p, ps - 0.04, ps + 0.14, e.inOutCubic);
      api.opacity(o.card, enter * (1 - 0.82 * ghost));
      o.card.classList.toggle('is-ghost', ghost > 0.5);
    }

    // Hold composition: enters staggered as the camera reverses into place.
    const n = 5;
    for (const it of S.items) {
      // human.patch waits for the settled hold pose so it never lands under the caption
      const a = it.key === 'patch'
        ? e.outCubic(api.range(p, ps + 0.02, ps + 0.1))
        : api.stagger(p, it.enter, n, ps - 0.13, ps + 0.04, 0.55, e.outCubic);
      const sp = e.softSpring(api.range(p, ps - 0.13 + it.enter * 0.028, ps + 0.06 + it.enter * 0.028));
      api.opacity(it.card, a);
      api.place(it.pl, { y: it.o.y + (1 - sp) * 46, rx: (1 - sp) * 16, ry: (it.o.ry || 0) + (1 - sp) * -10 });
    }

    // Hold beats: comments get struck, then the json base_sha lights.
    const st = e.inOutCubic(api.range(hp, 0.08, 0.36));
    api.transform(S.strike, `scaleX(${st.toFixed(4)})`);
    api.opacity(S.cmts, 1 - 0.55 * st);
    api.opacity(S.never, e.outCubic(api.range(hp, 0.3, 0.46)));
    api.opacity(S.mdHalo, api.bump(p, ps - 0.02, ps + 0.1, pe - 0.04, pe + 0.12) * 0.75);
    if (S.shaLit) S.shaLit.classList.toggle('lum-add', hp > 0.45 && p < pe + 0.1);
  }

  H.registerScene({
    id: ID,
    get camera() {
      return isMobile() ? camKeys(RAIL.m, true) : camKeys(RAIL.d, false);
    },
    light: { x: 20, y: 0, z: 0, color: 'add' },
    radius: 1900,
    mount,
    update,
  });
})();
