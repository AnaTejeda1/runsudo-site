/* Replay walkthrough for #replay: seven posed frames, interpolated by scroll.
   No dependencies. Each pause is a pose; the engine eases between poses with
   critically damped curves and lets each pose breathe while you dwell on it. */
(() => {
  'use strict';
  const section = document.getElementById('replay');
  if (!section) return;

  /* ---------- illustrative data ---------- */
  const PEOPLE = {
    PN: ['Priya N.', '#5243AA'], MO: ['Marcus O.', '#00875A'], DK: ['Dana K.', '#DE350B'],
    LR: ['Leo R.', '#0065FF'], ST: ['Sam T.', '#FF8B00'],
  };
  const ROWS = [
    { k: 'ACME-511', ty: 'bug', s: 'Webhook retries duplicate deliveries on 5xx', a: 'MO', d: 'Oct 9', n: 6 },
    { k: 'ACME-509', ty: 'task', s: 'Rotate staging database credentials', a: 'LR', d: 'Oct 6', skip: 'ops change' },
    { k: 'ACME-506', ty: 'story', s: 'Okta SSO for workspace admins', a: 'DK', d: 'Oct 2', skip: 'spans 4 PRs' },
    { k: 'ACME-503', ty: 'bug', s: 'Flaky CSV import on files with a UTF-8 BOM', a: 'ST', d: 'Sep 29', n: 9 },
    { k: 'ACME-501', ty: 'task', s: 'Bump eslint to 9.x', a: 'LR', d: 'Sep 24', skip: 'dependency bump' },
    { k: 'ACME-497', ty: 'bug', s: 'Pagination off by one on CSV exports', a: 'MO', d: 'Sep 19', n: 11 },
    { k: 'ACME-494', ty: 'task', s: 'Update onboarding email copy', a: 'DK', d: 'Sep 12', skip: 'copy only' },
    { k: 'ACME-490', ty: 'story', s: 'Invoice PDF shows the wrong currency symbol', a: 'ST', d: 'Sep 4', n: 4 },
    { k: 'ACME-487', ty: 'task', s: 'Investigate p99 latency spike on /search', a: 'PN', d: 'Aug 27', skip: 'no fix merged' },
    { k: 'ACME-482', ty: 'bug', s: 'Race in session refresh on token expiry', a: 'PN', d: 'Aug 14', n: 14 },
  ];
  // Eligible first, by how many existing tests cover the change. The top three are the ones we follow.
  const SORTED = [...ROWS].sort((a, b) => (b.n || -1) - (a.n || -1) || ROWS.indexOf(a) - ROWS.indexOf(b));
  ROWS.forEach(r => { r.o = ROWS.indexOf(r); r.si = SORTED.indexOf(r); });
  const PICK_KEYS = ['ACME-482', 'ACME-497', 'ACME-503'];
  const CARD_W = 280, CARD_H = 112, BOX_W = 360, BOX_H = 290;

  /* ---------- poses: one table per stage shape ----------
     wide: a landscape stage, the camera pans right across the landscape.
     tall: a portrait stage (phones, portrait tablets), the camera descends instead.
     pose = card top-left and tilt in the 2.5D pop-out; box = container top-left;
     lane = waypoints the card flies through; win = its flight window inside t2. */
  const MODES = {
    wide: {
      W: 1280, H: 760, ROWH: 40, nTests: 7,
      cam1: [640, 380, 1], cam2: [640, 352, 1.02], camMid: .66, cam3: [2660, 395, 1],
      camPath: [[640, 352], [1200, 400], [1950, 410], [2660, 395]],
      tilt: { ty: 70, s: .93 },
      picks: [
        { pose: [500, 92, 0], box: [2480, 240], lane: [[1000, 410], [1520, 420], [2120, 300], [2580, 170]], win: [.07, .84] },
        { pose: [172, 176, -6], box: [2040, 240], lane: [[760, 290], [1340, 250], [1780, 190], [2140, 170]], win: [.14, .78] },
        { pose: [828, 176, 6], box: [2920, 240], lane: [[1240, 540], [1760, 560], [2440, 420], [3020, 170]], win: [0, .92] },
      ],
      gates: { axis: 0, at: [1340, 1640, 1940], from: 120 },
      wlabel: [2040, 176, 'One sealed container per ticket · repo at the commit before the fix'],
      ov: {
        ws: [40, 40, 1200, 680],
        hb5: [40, 90, 1200, 48], a5: [40, 154, 592, 510], b5: [648, 154, 592, 510], b5from: [720, 154],
        hb6: [40, 56, 1200, 48], a6: [40, 120, 592, 352], b6: [648, 120, 592, 352], judge: [40, 488, 1200, 212],
        rep: [190, 900],
      },
    },
    tall: {
      W: 560, H: 980, ROWH: 44, nTests: 5,
      cam1: [280, 370, 1.04], cam2: [280, 430, 1], camMid: .78, cam3: [280, 1881, .95],
      camPath: [[280, 430], [280, 900], [280, 1400], [280, 1881]],
      tilt: { ty: 250, s: .95 },
      picks: [
        { pose: [140, -10, 0], box: [100, 1736], lane: [[110, 680], [250, 1100], [-40, 1640], [-60, 1840]], win: [.06, .9] },
        { pose: [22, 160, -5], box: [100, 1410], lane: [[90, 640], [300, 1000], [600, 1380], [620, 1520]], win: [.12, .95] },
        { pose: [258, 190, 5], box: [100, 2062], lane: [[470, 700], [330, 1150], [460, 1700], [640, 2170]], win: [0, .84] },
      ],
      gates: { axis: 1, at: [900, 1060, 1220], from: 20 },
      wlabel: [20, 1378, 'One sealed container per ticket'],
      ov: {
        ws: [20, 20, 520, 940],
        hb5: [20, 20, 520, 64], a5: [20, 100, 520, 420], b5: [20, 532, 520, 420], b5from: [20, 640],
        hb6: [20, 20, 520, 64], a6: [20, 96, 520, 270], b6: [20, 376, 520, 250], judge: [20, 636, 520, 324],
        rep: [20, 520],
      },
    },
  };
  const GATE_LABELS = ['check out the parent commit', 'build the image', 'seal the network'];

  /* ---------- timeline: holds (pauses) and transitions, in beats ---------- */
  const SEG = [['h1', .7], ['t1', 2.3], ['h2', .9], ['t2', 2.7], ['h3', .9], ['t3', 1.5], ['h4', 1.9],
    ['t4', 1.2], ['h5', 1.0], ['t5', 1.3], ['h6', 1.1], ['t6', 1.2], ['h7', .8]];
  const S = {}; let TOTAL = 0;
  for (const [n, len] of SEG) { S[n] = [TOTAL, len]; TOTAL += len; }
  const at = (n, f = 0) => S[n][0] + S[n][1] * f;
  const HOLDS = SEG.filter(s => s[0][0] === 'h').map(s => s[0]);

  /* ---------- easing ---------- */
  // Critically damped spring step response, normalised to land exactly on 1.
  const crit = w => { const e = 1 - (1 + w) * Math.exp(-w); return x => x <= 0 ? 0 : x >= 1 ? 1 : (1 - (1 + w * x) * Math.exp(-w * x)) / e; };
  // Under-damped spring for small pops.
  const spring = (w, z) => { const d = w * Math.sqrt(1 - z * z); return x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-z * w * x) * (Math.cos(d * x) + (z * w / d) * Math.sin(d * x)); };
  const C6 = crit(6), C8 = crit(8);
  const E = {
    lin: x => x,
    heavy: x => C6(Math.pow(x, 1.5)),        // leaves gently, settles long
    glide: x => C6(Math.pow(x, 1.9)),        // for long travel
    out: C8,
    io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    pop: spring(13, .45),
  };
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const span = (T, a, b) => clamp((T - a) / (b - a)); // 0..1 progress of T through [a,b]
  const lerpv = (a, b, t) => Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], t)) : lerp(a, b, t);
  // Keyframe track: [[t, value, ease]]; values may be numbers or arrays (rects).
  // The ease shapes the segment arriving at that key.
  const ev = (keys, T) => {
    if (T <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const k = keys[i];
      if (T <= k[0]) { const p = keys[i - 1]; return lerpv(p[1], k[1], E[k[2] || 'heavy'](span(T, p[0], k[0]))); }
    }
    return keys[keys.length - 1][1];
  };
  // How much we are "resting" in a hold: 1 inside, fading over a short distance outside.
  const dwell = (T, n) => { const [a, l] = S[n]; const d = T < a ? a - T : T > a + l ? T - a - l : 0; return clamp(1 - d / .35); };

  /* ---------- Catmull-Rom path with arc-length table ---------- */
  function makePath(pts) {
    const n = pts.length - 1;
    const p = u => {
      const s = clamp(u) * n, i = Math.min(n - 1, Math.floor(s)), f = s - i;
      const P0 = pts[Math.max(0, i - 1)], P1 = pts[i], P2 = pts[i + 1], P3 = pts[Math.min(n, i + 2)];
      const c = k => .5 * (2 * P1[k] + (-P0[k] + P2[k]) * f + (2 * P0[k] - 5 * P1[k] + 4 * P2[k] - P3[k]) * f * f + (-P0[k] + 3 * P1[k] - 3 * P2[k] + P3[k]) * f * f * f);
      return [c(0), c(1)];
    };
    const N = 120, cum = [0], samp = [p(0)];
    for (let i = 1; i <= N; i++) { const q = p(i / N), r = samp[i - 1]; samp.push(q); cum.push(cum[i - 1] + Math.hypot(q[0] - r[0], q[1] - r[1])); }
    const len = cum[N];
    const arc = u => { const s = clamp(u) * N, i = Math.min(N - 1, Math.floor(s)); return lerp(cum[i], cum[i + 1], s - i) / len; };
    const d = samp.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
    return { p, arc, d };
  }

  /* ---------- markup ---------- */
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const SHIELD = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 3v5.6c0 4.6-3.1 8.6-7.5 10.4-4.4-1.8-7.5-5.8-7.5-10.4V5.5z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.6 12.2l2.4 2.4 4.4-4.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const av = id => `<i class="jr-av" style="background:${PEOPLE[id][1]}">${id}</i>`;
  const rowInner = r => `<span class="jr-ty ${r.ty}"></span><span class="jr-key">${r.k}</span><span class="jr-sum">${esc(r.s)}</span><span><b class="jr-st">Done</b></span><span class="jr-as">${av(r.a)}${PEOPLE[r.a][0]}</span><span class="jr-dt">${r.d}</span>`;
  const tag = r => r.n ? `<span class="jr-tag ok">eligible · ${r.n} tests</span>` : `<span class="jr-tag skip">skip · ${r.skip}</span>`;

  const jira = () => `
  <div class="jr">
    <div class="jr-top"><span class="jr-apps"></span><span class="jr-mark"></span><b>Jira</b>
      <span class="jr-nav">Your work<i></i></span><span class="jr-nav on">Projects<i></i></span><span class="jr-nav">Filters<i></i></span><span class="jr-nav">Dashboards<i></i></span><span class="jr-create">Create</span>
      <span class="jr-search">Search</span><span class="jr-ic"></span><span class="jr-ic"></span>${av('PN')}</div>
    <div class="jr-body">
      <aside class="jr-side"><div class="jr-proj"><span class="jr-pav"></span><div><b>ACME API</b><small>Software project</small></div></div>
        <p class="jr-grp">Planning</p><span class="jr-it">Timeline</span><span class="jr-it">Backlog</span><span class="jr-it">Board</span><span class="jr-it on">Issues</span><span class="jr-it">Reports</span><span class="jr-it">Releases</span>
        <p class="jr-grp">Development</p><span class="jr-it">Code</span><span class="jr-it">Deployments</span></aside>
      <main class="jr-main">
        <p class="jr-crumb">Projects / ACME API</p>
        <div class="jr-h"><h4>Issues</h4><span class="jr-btn">Export</span><span class="jr-btn">List view</span></div>
        <div class="jr-jql"><span class="jr-q"><em>project</em> = ACME <em>AND</em> status = Done <em>AND</em> resolved &gt;= -90d <em>ORDER BY</em> resolved DESC<i class="jr-caret"></i></span><span class="jr-go">Search</span></div>
        <div class="jr-th"><span></span><span>Key</span><span>Summary</span><span>Status</span><span>Assignee</span><span>Resolved</span><span class="jr-sudo">sudo</span></div>
        <div class="jr-tb">
          ${ROWS.map(r => `<div class="jr-row${r.n ? ' ok' : ''}" data-i="${r.o}"><div class="jr-in">${rowInner(r)}${tag(r)}</div></div>`).join('')}
          <div class="jr-scan"></div>
        </div>
        <div class="jr-foot"><span>1–10 of 87</span><span>Resolved in the last 90 days</span></div>
      </main>
    </div>
    <div class="jr-veil"></div>
  </div>`;

  const card = r => `
  <div class="sx-card">
    <div class="sx-card-row"><div class="jr-in">${rowInner(r)}${tag(r)}</div></div>
    <div class="sx-card-face"><p>${esc(r.s)}</p><div><span class="jr-ty ${r.ty}"></span><span class="ck">${r.k}</span><b class="jr-st">Done</b>${av(r.a)}</div></div>
  </div>`;

  const cont = (k, i, M) => `
  <div class="sx-box" style="transform:translate(${M.picks[i].box[0]}px,${M.picks[i].box[1]}px)">
    <div class="sx-box-ghost"></div>
    <div class="sx-box-body">
      <div class="sx-box-lid"><span class="sx-sh">${SHIELD}</span><span>sx-${k.slice(5)}</span><span class="sx-sealed">sealed</span></div>
      <div class="sx-box-term"><p><span>image</span>acme/api @ ${['7c41e9a', '3e9f02b', 'b81d4c0'][i]}^</p><p><span>network</span>model API only</p><p class="live"><span>agent</span>reading ${k}<i class="sx-cur"></i></p></div>
    </div>
    <div class="sx-badge">${SHIELD}</div>
  </div>`;

  const kw = s => `<em>${s}</em>`, st = s => `<u>${s}</u>`;
  const CODE = [
    [`${kw('import')} { tokens } ${kw('from')} ${st("'./tokens'")};`],
    [`${kw('import type')} { Session } ${kw('from')} ${st("'./types'")};`],
    [''],
    [`${kw('const')} SKEW_MS = 30_000;`],
    [''],
    [`${kw('export async function')} <b>refreshSession</b>(s: Session) {`],
    [`  ${kw('if')} (Date.now() &lt; s.expiresAt - SKEW_MS) ${kw('return')} s;`],
    ['  s.inflight ??= doRefresh(s).finally(() => (s.inflight = undefined));', 1],
    ['  return s.inflight;', 1],
    ['}', 1],
    ['', 1],
    ['async function doRefresh(s: Session) {', 1],
    [`  ${kw('const')} t = ${kw('await')} tokens.refresh(s.refreshToken);`],
    ['  s.accessToken = t.access;'],
    ['  s.expiresAt = t.expiresAt;'],
    [`  ${kw('return')} s;`],
    ['}'],
  ];
  const TYPED = CODE.filter(c => c[1]).map(c => c[0]);
  const TYPED_LEN = TYPED.reduce((a, s) => a + s.length + 4, 0);
  const LOG = [
    ['$', 'git checkout 7c41e9a^', 'Aug 14'],
    ['›', 'read ACME-482'],
    ['›', 'open src/auth/session.ts'],
    ['›', 'reproduce: 2 concurrent calls, 2 token requests'],
    ['›', 'add test: refreshes once under concurrent calls', 'fails', 'bad'],
    ['›', 'patch: one in-flight refresh per session'],
    ['›', 'run affected tests', '14 passed', 'good'],
    ['›', 'new test', 'passes', 'good'],
  ];
  const TESTS = [
    ['auth/session', 'refreshes an expired token', 41], ['auth/session', 'reuses a token inside the skew window', 8],
    ['auth/session', 'clears state when refresh fails', 12], ['auth/middleware', 'attaches the session to the request', 19],
    ['auth/middleware', 'rejects a revoked refresh token', 15], ['api/me', 'returns the current user', 27],
    ['api/me', 'responds 401 after logout', 22],
  ];
  const tests = (side, n) => `
    <div class="sx-tests">
      ${TESTS.slice(0, n).map(t => `<p class="sx-t"><i class="sx-ti"></i><span><small>${t[0]} ›</small> ${t[1]}</span><time>${t[2] + (side ? 3 : 0)}ms</time></p>`).join('')}
      <p class="sx-t more"><i class="sx-ti"></i><span>${14 - n} more in auth/ and api/</span><time></time></p>
      <div class="sx-tsum"><span class="pill good">14 passed</span><span class="pill par">0 failed</span>${side ? '<span class="sx-tnote">no tests added</span>' : '<span class="sx-tnote add">+1 test added by this patch · passes</span>'}</div>
    </div>`;
  const D = (c, s) => `<span class="${c}">${s}</span>`;
  const DIFF_A = [
    D('f', 'src/auth/session.ts<b><i>+5</i> <s>−0</s></b>'),
    D('', '  export async function refreshSession(s: Session) {'),
    D('', '    if (Date.now() &lt; s.expiresAt - SKEW_MS) return s;'),
    D('a', '+   s.inflight ??= doRefresh(s).finally(() =&gt; (s.inflight = undefined));'),
    D('a', '+   return s.inflight;'),
    D('a', '+ }'),
    D('a', '+'),
    D('a', '+ async function doRefresh(s: Session) {'),
    D('', '    const t = await tokens.refresh(s.refreshToken);'),
    D('f', 'test/auth/session.test.ts<b><i>+11</i> <s>−0</s></b>'),
    D('a', "+ it('refreshes once under concurrent calls', async () =&gt; {"),
    D('a', '+   await Promise.all([refreshSession(s), refreshSession(s)]);'),
    D('a', '+   expect(tokens.refresh).toHaveBeenCalledTimes(1);'),
  ].join('');
  const DIFF_B = [
    D('f', 'src/auth/session.ts<b><i>+6</i> <s>−1</s></b>'),
    D('a', "+ import { Mutex } from 'async-mutex';"),
    D('a', '+ const refreshLock = new Mutex();'),
    D('', ''),
    D('d', '- export async function refreshSession(s: Session) {'),
    D('a', '+ export const refreshSession = (s: Session) =&gt;'),
    D('a', '+   refreshLock.runExclusive(() =&gt; refreshUnlocked(s));'),
    D('a', '+'),
    D('a', '+ async function refreshUnlocked(s: Session) {'),
    D('', '    if (Date.now() &lt; s.expiresAt - SKEW_MS) return s;'),
    D('', '    const t = await tokens.refresh(s.refreshToken);'),
    D('', '    s.accessToken = t.access;'),
  ].join('');

  const overlay = M => `
  <div class="sx-ov">
    <div class="sx-hbar">
      <span class="sx-hb l1"><b>harness</b>14 tests selected from 1,206 by the import graph of the changed files · same image for both patches</span>
      <span class="sx-hb l2"><b>judge</b>LLM judge, blind · it sees two diffs labelled A and B, in random order</span>
      <span class="sx-ill">illustrative</span>
    </div>
    <div class="sx-p sx-pa">
      <div class="sx-ph">
        <span class="sx-hl l1"><span class="sx-sh">${SHIELD}</span><b>sx-482</b><span class="sx-sealed">sealed</span><span class="sx-muted">net: model API only</span></span>
        <span class="sx-hl l2"><span class="sx-sh">${SHIELD}</span><b>sudo patch</b><span class="sx-muted">sx-482 · solved blind</span></span>
        <span class="sx-hl l3"><b class="sx-ab">A</b><b>Patch A</b><span class="sx-who good">sudo</span></span>
        <span class="sx-rew"><span class="sx-rew-l">acme/api @ <b>HEAD</b></span><span class="sx-rail2">${'<i></i>'.repeat(16)}<em></em></span><span class="sx-rew-r">Aug 14 · before the fix</span></span>
      </div>
      <div class="sx-ly sx-ed">
        <div class="sx-tree"><p class="sx-k">acme/api</p>
          <p>src/</p><p class="d1">auth/</p><p class="d2 on">session.ts</p><p class="d2">tokens.ts</p><p class="d2">types.ts</p><p class="d1">api/</p><p class="d1">billing/</p><p>test/</p><p class="d1">auth/</p><p class="d2">session.test.ts</p><p>package.json</p></div>
        <div class="sx-code">
          <div class="sx-tabs"><span class="on">session.ts</span><span>session.test.ts</span><span>types.ts</span></div>
          <div class="sx-lines">${CODE.map((c, i) => `<p class="${c[1] ? 'ty' : ''}"><i>${i + 1}</i><span>${c[1] ? '' : c[0]}</span></p>`).join('')}</div>
        </div>
        <div class="sx-log">
          <div class="sx-tk"><p>${esc('Race in session refresh on token expiry')}</p><div><span class="jr-ty bug"></span><span class="ck">ACME-482</span><b class="jr-st">Done</b>${av('PN')}</div></div>
          <p class="sx-k"><span class="sx-live"></span>agent</p>
          ${LOG.map(l => `<p class="sx-l"><i>${l[0]}</i><span>${esc(l[1])}${l[2] ? ` <em class="${l[3] || ''}">${l[2]}</em>` : ''}</span></p>`).join('')}
        </div>
      </div>
      <div class="sx-ly sx-tl">${tests(0, M.nTests)}</div>
      <div class="sx-ly sx-dl"><pre class="sx-diff">${DIFF_A}</pre></div>
    </div>
    <div class="sx-p sx-pb">
      <div class="sx-ph">
        <span class="sx-hl l2"><span class="sx-sh">${SHIELD}</span><b>engineer patch</b><span class="sx-muted">as merged · Aug 14</span></span>
        <span class="sx-hl l3"><b class="sx-ab">B</b><b>Patch B</b><span class="sx-who par">engineer</span></span>
      </div>
      <div class="sx-ly sx-tl">${tests(1, M.nTests)}</div>
      <div class="sx-ly sx-dl"><pre class="sx-diff">${DIFF_B}</pre></div>
    </div>
    <div class="sx-judge">
      <div class="sx-jl">
        <p class="sx-k">Judge notes</p>
        <div class="sx-jg"><span></span><b>A</b><b>B</b>
          <span>Fixes the race</span><em class="y">yes</em><em class="y">yes</em>
          <span>Blast radius</span><em>one session</em><em class="n">every refresh, one lock</em>
          <span>Regression test</span><em class="y">added</em><em class="n">none</em>
          <span>Selected tests</span><em>14 of 14</em><em>14 of 14</em></div>
      </div>
      <div class="sx-jr">
        <p class="sx-k">Verdict</p>
        <p class="sx-think">Reading both diffs<i></i><i></i><i></i></p>
        <div class="sx-vd"><p class="sx-v1">Prefers A</p><p class="sx-v2">Narrower fix: concurrent refreshes share one request per session instead of queueing behind a global lock. Adds a regression test.</p>
          <p class="sx-rev"><span>A was <b>sudo</b> · B was the engineer</span><span class="pill good">better</span></p></div>
      </div>
    </div>
    <div class="sx-rep report">
      <div class="top"><span>backtest · acme/api · 90 days · 3 of 87 tickets shown</span><span>illustrative</span></div>
      <div class="strip"><p class="k">Report headline</p><div class="pills"><span class="pill good">1 better</span><span class="pill par">1 par</span><span class="pill bad">1 worse</span><span class="pill warn">0 no scorable attempt</span></div></div>
      <div class="sec">Failures first</div>
      <div class="row"><span class="id">ACME-503</span><span class="t">Flaky CSV import on files with a UTF-8 BOM<small>Our patch fails 2 of 9 tests · engineer patch passes</small></span><span class="pill bad">worse</span></div>
      <div class="row hi"><span class="id">ACME-482</span><span class="t">Race in session refresh on token expiry<small>Both pass 14 of 14 · judge prefers ours: narrower fix, adds a regression test</small></span><span class="pill good">better</span></div>
      <div class="row"><span class="id">ACME-497</span><span class="t">Pagination off by one on CSV exports<small>Both pass 11 of 11 · judge calls it equivalent</small></span><span class="pill par">par</span></div>
      <div class="foot">Illustrative. A real report covers every eligible ticket and links each verdict to both diffs and the test logs.</div>
    </div>
  </div>`;

  /* ---------- scene: builds one copy of the stage and knows how to pose it at any T ---------- */
  function createScene(canvas, M) {
    const { W, H, ROWH, ov: O } = M;
    const PICKS = M.picks.map((p, i) => ({ ...p, k: PICK_KEYS[i] }));
    const tall = M === MODES.tall;
    // The workspace's footprint inside container 482 (world coords), below the lid, at the workspace's aspect.
    const SCREEN = (() => {
      const [bx, by] = PICKS[0].box, iw = BOX_W - 24, ih = BOX_H - 64, a = O.ws[3] / O.ws[2];
      const w = iw * a <= ih ? iw : ih / a, h = w * a;
      return { x: bx + 12 + (iw - w) / 2, y: by + 52 + (ih - h) / 2, w, h };
    })();
    const paths = PICKS.map(p => makePath([[p.pose[0] + CARD_W / 2, p.pose[1] + CARD_H / 2], ...p.lane, [p.box[0] + BOX_W / 2, p.box[1] + 64 + CARD_H / 2]]));
    const camPath = makePath(M.camPath);
    const G = M.gates;

    canvas.className = 'sx-canvas ' + (tall ? 'sx-tall' : 'sx-wide');
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    canvas.innerHTML = `
      <div class="sx-world">
        <div class="sx-dots"></div>
        <svg class="sx-paths" width="3400" height="2600" viewBox="0 0 3400 2600">
          ${paths.map(p => `<path class="base" d="${p.d}"/><path class="trail" pathLength="1" d="${p.d}"/>`).join('')}
        </svg>
        ${G.at.map((v, i) => `<div class="sx-gate${G.axis ? ' h' : ''}" style="transform:translate(${G.axis ? G.from : v}px,${G.axis ? v : G.from}px)"><span class="sx-gd"></span><span class="sx-gl"><small>0${i + 1}</small>${GATE_LABELS[i]}</span></div>`).join('')}
        <p class="sx-wlabel" style="transform:translate(${M.wlabel[0]}px,${M.wlabel[1]}px)">${M.wlabel[2]}</p>
        ${jira()}
        ${PICK_KEYS.map((k, i) => cont(k, i, M)).join('')}
        ${PICK_KEYS.map(k => card(ROWS.find(r => r.k === k))).join('')}
      </div>
      ${overlay(M)}`;

    const $ = s => canvas.querySelector(s), $$ = s => [...canvas.querySelectorAll(s)];
    const world = $('.sx-world'), board = $('.jr'), veil = $('.jr-veil'), scan = $('.jr-scan'), sudoTh = $('.jr-sudo'), caret = $('.jr-caret');
    const rows = $$('.jr-row'), tags = rows.map(r => r.querySelector('.jr-tag')), rowIn = rows.map(r => r.querySelector('.jr-in'));
    const cards = $$('.sx-card'), cardRow = $$('.sx-card-row'), cardFace = $$('.sx-card-face');
    const terms = $$('.sx-box-term'), boxes = $$('.sx-box'), ghosts = $$('.sx-box-ghost'), bodies = $$('.sx-box-body'), badges = $$('.sx-badge');
    const trails = $$('.sx-paths .trail'), bases = $$('.sx-paths .base'), gates = $$('.sx-gate'), wlabel = $('.sx-wlabel');
    const ovl = $('.sx-ov'), hbar = $('.sx-hbar'), pa = $('.sx-pa'), pb = $('.sx-pb'), judge = $('.sx-judge'), rep = $('.sx-rep');
    const hb = $$('.sx-hbar .sx-hb'), hlA = $$('.sx-pa .sx-hl'), hlB = $$('.sx-pb .sx-hl'), rew = $('.sx-rew');
    const lyA = { ed: $('.sx-pa .sx-ed'), tl: $('.sx-pa .sx-tl'), dl: $('.sx-pa .sx-dl') }, lyB = { tl: $('.sx-pb .sx-tl'), dl: $('.sx-pb .sx-dl') };
    const railDots = $$('.sx-rail2 i'), railMark = $('.sx-rail2 em'), rewL = $('.sx-rew-l b'), rewR = $('.sx-rew-r');
    const typedEls = $$('.sx-lines p.ty span'), logEls = $$('.sx-l'), tk = $('.sx-tk');
    const testRows = [$$('.sx-pa .sx-t'), $$('.sx-pb .sx-t')], tsum = $$('.sx-tsum');
    const think = $('.sx-think'), vd = $('.sx-vd'), rev = $('.sx-rev'), who = $$('.sx-who'), repRows = $$('.sx-rep .row'), repStrip = $('.sx-rep .strip');
    const jgRows = $$('.sx-jg > *');
    rows.forEach(r => { r.style.height = ROWH + 'px'; });
    cardRow.forEach(r => { r.style.height = ROWH - 1 + 'px'; r.style.width = $('.jr-tb').clientWidth + 'px'; });

    // Where each picked row sits after the sort, in world coordinates (measured once, before any transform).
    const tb = $('.jr-tb');
    let ox = 0, oy = 0;
    for (let e = tb; e && e !== world; e = e.offsetParent) { ox += e.offsetLeft; oy += e.offsetTop; }
    const TBW = tb.clientWidth;
    const rowRect = PICKS.map(p => [ox, oy + ROWS.find(q => q.k === p.k).si * ROWH]);
    // The report sits centred in its pose.
    rect0(rep, O.rep[0], (H - rep.offsetHeight) / 2, O.rep[1]);
    function rect0(el, l, t, w) { el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.width = w + 'px'; }

    const cache = new Map();
    const set = (el, prop, v) => { let c = cache.get(el); if (!c) cache.set(el, c = {}); if (c[prop] !== v) { c[prop] = v; el.style[prop] = v; } };
    const op = (el, v) => { v = Math.round(clamp(v) * 1000) / 1000; set(el, 'opacity', String(v)); set(el, 'visibility', v < .002 ? 'hidden' : 'visible'); };
    const tf = (el, v) => set(el, 'transform', v);
    const px = v => v.toFixed(2) + 'px';
    const rect = (el, [l, t, w, h]) => { set(el, 'left', px(l)); set(el, 'top', px(t)); set(el, 'width', px(w)); set(el, 'height', px(h)); };
    const cls = (el, c, on) => { const k = 'c_' + c; const cc = cache.get(el) || {}; cache.set(el, cc); if (cc[k] !== on) { cc[k] = on; el.classList.toggle(c, on); } };

    // Typed code, revealed character by character, highlighted as it goes.
    const hl = s => esc(s).replace(/\b(async function|function|return|const|await|if)\b/g, '<em>$1</em>').replace(/(doRefresh)(?=\()/, '<b>$1</b>');
    let lastChars = -1;
    const typeTo = n => {
      if (n === lastChars) return; lastChars = n;
      let left = n;
      TYPED.forEach((s, i) => {
        const k = clamp(left, 0, s.length), typing = k > 0 && k < s.length || (i === 0 && n === 0);
        left -= s.length + 4;
        typedEls[i].innerHTML = hl(s.slice(0, k)) + (typing ? '<i class="sx-cur"></i>' : '');
      });
      if (n >= TYPED_LEN) typedEls[typedEls.length - 1].innerHTML = hl(TYPED[TYPED.length - 1]) + '<i class="sx-cur"></i>';
    };

    const camAt = T => {
      if (T < at('t2')) return lerpv(M.cam1, M.cam2, E.heavy(span(T, at('t1', .62), at('t1', 1))));
      if (T < at('t3')) {
        const u = span(T, at('t2'), at('t2', 1)), c = camPath.p(E.heavy(u));
        // Dolly out mid-pan to show the landscape, then settle in on the containers.
        const s = u < .5 ? lerp(M.cam2[2], M.camMid, E.io(u * 2)) : lerp(M.camMid, M.cam3[2], E.heavy((u - .5) * 2));
        return [c[0], c[1], s];
      }
      const u = E.io(span(T, at('t3'), at('t3', .9)));
      // Zoom in log space so it reads as constant speed; land exactly where SCREEN fills the workspace pose.
      return [lerp(M.cam3[0], SCREEN.x + SCREEN.w / 2, u), lerp(M.cam3[1], SCREEN.y + SCREEN.h / 2, u),
        Math.exp(lerp(Math.log(M.cam3[2]), Math.log(O.ws[2] / SCREEN.w), u))];
    };

    // Panel tracks: each pause is a rect, the engine eases between them.
    const paK = [[at('t4', 0), O.ws], [at('t4', .85), O.a5], [at('t5', .1), O.a5], [at('t5', .6), O.a6]];
    const pbK = [[at('t4', .3), [...O.b5from, O.b5[2], O.b5[3]]], [at('t4', 1), O.b5], [at('t5', .1), O.b5], [at('t5', .6), O.b6]];
    const hbK = [[at('t4', .35), [O.hb5[0], O.hb5[1] - 14, O.hb5[2], O.hb5[3]]], [at('t4', .95), O.hb5], [at('t5', .1), O.hb5], [at('t5', .6), O.hb6]];

    function render(T, tm, motion) {
      const dw = n => motion ? dwell(T, n) : 0;
      const breath = dw('h1') + dw('h2') + dw('h3');

      /* camera */
      let [cx, cy, cs] = camAt(T);
      cs *= 1 + .006 * Math.sin(tm * .55) * breath;
      cy += 3 * Math.sin(tm * .4) * breath;
      tf(world, `translate3d(${px(W / 2 - cx * cs)},${px(H / 2 - cy * cs)},0) scale(${cs.toFixed(4)})`);
      op(world, 1 - span(T, at('t3', .75), at('t3', .97)));

      if (T < at('t3', .97)) {
        /* Jira: scan, tag, sort, tilt */
        const scanY = lerp(-12, rows.length * ROWH + 4, E.io(span(T, at('t1', .03), at('t1', .34))));
        op(scan, span(T, at('t1', .01), at('t1', .05)) - span(T, at('t1', .33), at('t1', .38)));
        tf(scan, `translate3d(0,${px(scanY)},0)`);
        op(sudoTh, span(T, at('t1', .0), at('t1', .06)));
        const tilt = E.heavy(span(T, at('t1', .63), at('t1', 1)));
        tf(board, tilt < 1e-4 ? 'none' : `translate3d(0,${px(M.tilt.ty * tilt)},0) perspective(1900px) rotateX(${(50 * tilt).toFixed(2)}deg) scale(${(1 - (1 - M.tilt.s) * tilt).toFixed(4)})`);
        op(veil, .62 * tilt);
        set(caret, 'opacity', dw('h1') && Math.sin(tm * 6) > 0 ? '1' : '0');
        rows.forEach((el, i) => {
          const r = ROWS[i];
          const seen = clamp((scanY - (r.o * ROWH + ROWH / 2)) / 30);
          op(tags[i], seen);
          const y = lerp(r.o, r.si, E.heavy(span(T, at('t1', .36 + .012 * r.si), at('t1', .5 + .008 * r.si)))) * ROWH;
          tf(el, `translate3d(0,${px(y)},0)`);
          if (!r.n) op(rowIn[i], 1 - .55 * seen);
          if (PICK_KEYS.includes(r.k)) {
            cls(el, 'pick', T > at('t1', .46));
            cls(el, 'slot', T > at('t1', .57 + .03 * r.si));
            op(rowIn[i], 1 - span(T, at('t1', .56 + .03 * r.si), at('t1', .575 + .03 * r.si)));
          }
        });

        /* cards: lift out of the rows, fan out in 2.5D, then travel to their containers */
        const lead = [];
        cards.forEach((el, i) => {
          const p = PICKS[i], [rx0, ry0] = rowRect[i], pr = paths[i];
          const a = at('t1', .56 + .03 * i), b = at('t1', 1), t0 = at('t2', p.win[0]), t1 = at('t2', p.win[1]);
          if (T <= t0) { set(trails[i], 'strokeDasharray', '0 2'); set(trails[i], 'strokeDashoffset', '0'); }
          if (T < a) { op(el, 0); return; }
          let x, y, w, h, rX, rZ, sc = 1;
          if (T <= t0) {
            const u = span(T, a, b), e = E.heavy(u), m = E.out(span(T, a, a + .5)), fl = dw('h2');
            w = lerp(TBW, CARD_W, m); h = lerp(ROWH, CARD_H, m);
            // y leads x, so each card rises before it slides: an arc, not a line.
            x = lerp(rx0, p.pose[0], E.heavy(span(T, a + .1, b)));
            y = lerp(ry0, p.pose[1], C8(u)) + Math.sin(tm * 1.3 + i * 2.1) * 5 * fl;
            rX = 18 * e; rZ = p.pose[2] * e + Math.sin(tm * .9 + i) * .8 * fl;
            op(cardRow[i], 1 - span(T, a, a + .12));
            op(cardFace[i], span(T, a + .04, a + .2));
          } else {
            const u = span(T, t0, t1), g = E.glide(u), q = pr.p(g), q2 = pr.p(Math.min(1, g + .01));
            w = CARD_W; h = CARD_H; x = q[0] - CARD_W / 2; y = q[1] - CARD_H / 2;
            // Bank into the turn a little, and straighten out before landing.
            const ang = tall ? Math.atan2(q[0] - q2[0], Math.max(.001, q2[1] - q[1])) : Math.atan2(q2[1] - q[1], Math.max(.001, q2[0] - q[0]));
            const bank = clamp(ang * 57.3 * .25, -8, 8) * (1 - span(u, .75, .95));
            rX = 18 * (1 - E.heavy(span(u, 0, .45))); rZ = p.pose[2] * (1 - E.heavy(span(u, 0, .5))) + bank;
            sc = 1 + .07 * Math.sin(Math.PI * g);
            // A comet tail behind each card rather than a wire back to where it started.
            const head = pr.arc(g), tail = Math.max(0, head - .22);
            set(trails[i], 'strokeDasharray', `${(head - tail).toFixed(4)} 2`);
            set(trails[i], 'strokeDashoffset', (-tail).toFixed(4));
            op(trails[i], 1 - span(u, .88, 1));
            op(cardRow[i], 0); op(cardFace[i], 1);
            lead[i] = q;
          }
          // During the zoom the other tickets step back, and 482's own card gives way to the workspace.
          op(el, i ? 1 - .65 * span(T, at('t3', .05), at('t3', .4)) : 1 - span(T, at('t3', .1), at('t3', .3)));
          set(el, 'width', px(w)); set(el, 'height', px(h));
          tf(el, `translate3d(${px(x)},${px(y)},0) perspective(900px) rotateX(${rX.toFixed(2)}deg) rotateZ(${rZ.toFixed(2)}deg) scale(${sc.toFixed(4)})`);
        });

        /* landscape */
        const land = span(T, at('t2', .02), at('t2', .14)), rest = 1 - span(T, at('t2', .9), at('h3', .2));
        bases.forEach(b => op(b, land * (.2 + .8 * rest)));
        gates.forEach((g, i) => {
          op(g, land * (1 - span(T, at('t2', .85), at('h3'))));
          cls(g, 'lit', lead.some(q => q && q[G.axis] > G.at[i]));
        });
        op(wlabel, span(T, at('t2', .78), at('t2', .98)) * (1 - span(T, at('t3', .05), at('t3', .25))));

        /* containers: built as an outline, filled as the ticket lands, then sealed */
        boxes.forEach((bx, i) => {
          const arr = at('t2', PICKS[i].win[1]);
          op(ghosts[i], span(T, at('t2', .12), at('t2', .4)) * (1 - span(T, arr - .25, arr)));
          op(bodies[i], span(T, arr - .3, arr - .02));
          op(badges[i], span(T, arr - .05, arr + .02));
          tf(badges[i], `scale(${E.pop(span(T, arr - .05, arr + .3)).toFixed(4)})`);
          if (i) op(bx, 1 - .65 * span(T, at('t3', .05), at('t3', .4)));
          cls(bx, 'glow', dw('h3') > .5);
        });
        op(terms[0], 1 - span(T, at('t3', .08), at('t3', .25)));
      }

      /* overlay: the zoom resolves into the container's workspace */
      const inOv = T > at('t3', .05);
      op(ovl, inOv ? 1 : 0);
      if (!inOv) return;
      tf(ovl, motion ? `translate3d(0,${px(Math.sin(tm * .7) * 1.6 * (dw('h4') + dw('h5') + dw('h6') + dw('h7')))},0)` : 'none');

      const A = ev(paK, T);
      rect(pa, A);
      // The workspace is a screen inside container 482: it rides the camera in and lands at scale 1.
      const zoomed = T >= at('t3', .9), out6 = span(T, at('t6', .05), at('t6', .45));
      if (!zoomed) {
        const [ccx, ccy, ccs] = camAt(T);
        set(pa, 'transformOrigin', '0 0');
        tf(pa, `translate3d(${px((SCREEN.x - ccx) * ccs + W / 2 - O.ws[0])},${px((SCREEN.y - ccy) * ccs + H / 2 - O.ws[1])},0) scale(${(SCREEN.w / O.ws[2] * ccs).toFixed(5)})`);
      } else {
        set(pa, 'transformOrigin', '50% 0');
        tf(pa, out6 ? `scale(${lerp(1, .96, out6).toFixed(4)})` : 'none');
      }
      op(pa, span(T, at('t3', .06), at('t3', .3)) * (1 - out6));
      cls(pa, 'boxed', T < at('t4', .3));

      // header labels
      op(hlA[0], 1 - span(T, at('t4', .1), at('t4', .35)));
      op(hlA[1], span(T, at('t4', .35), at('t4', .7)) - span(T, at('t5', .25), at('t5', .45)));
      op(hlA[2], span(T, at('t5', .45), at('t5', .7)));
      op(hlB[0], 1 - span(T, at('t5', .25), at('t5', .45)));
      op(hlB[1], span(T, at('t5', .45), at('t5', .7)));
      op(rew, 1 - span(T, at('t4', .1), at('t4', .35)));

      // rewind: the checkout goes back from HEAD to the parent of the fix
      const rw = E.heavy(span(T, at('t3', .7), at('h4', .2))), mark = lerp(15, 4, rw);
      tf(railMark, `translate3d(${px(mark * 12)},0,0) rotate(45deg)`);
      railDots.forEach((d, i) => cls(d, 'gone', i > mark + .5));
      rewL.textContent = rw > .98 ? '7c41e9a^' : 'HEAD~' + Math.round(rw * 11);
      op(rewR, span(rw, .8, 1));

      // agent typing and log
      typeTo(Math.round(span(T, at('h4', .12), at('h4', .78)) * TYPED_LEN));
      logEls.forEach((l, i) => op(l, span(T, at('h4', 0) + i * .2 - .06, at('h4', 0) + i * .2 + .04)));
      op(lyA.ed, 1 - span(T, at('t4', 0), at('t4', .4)));
      op(tk, span(T, at('t3', .7), at('t3', 1)));

      // harness: B never overlaps A; it is pushed in by A's edge, then settles.
      op(lyA.tl, span(T, at('t4', .35), at('t4', .75)) - span(T, at('t5', .05), at('t5', .35)));
      op(lyB.tl, 1 - span(T, at('t5', .05), at('t5', .35)));
      const B = ev(pbK, T);
      if (tall) B[1] = Math.max(B[1], A[1] + A[3] + 12); else B[0] = Math.max(B[0], A[0] + A[2] + 16);
      rect(pb, B);
      tf(pb, out6 ? `scale(${lerp(1, .96, out6).toFixed(4)})` : 'none');
      op(pb, span(T, at('t4', .3), at('t4', .7)) * (1 - out6));
      rect(hbar, ev(hbK, T));
      op(hbar, E.heavy(span(T, at('t4', .35), at('t4', .95))) * (1 - span(T, at('t6', .05), at('t6', .4))));
      op(hb[0], 1 - span(T, at('t5', .2), at('t5', .45)));
      op(hb[1], span(T, at('t5', .45), at('t5', .75)));
      const tp = span(T, at('t4', .55), at('h5', .45));
      testRows.forEach((list, s) => list.forEach((row, i) => {
        const f = tp * (list.length + 1.5) - i - s * .5;
        cls(row, 'run', f > 0 && f < 1); cls(row, 'pass', f >= 1);
      }));
      tsum.forEach(e => op(e, span(tp, .9, 1)));

      // diffs and the judge
      op(lyA.dl, span(T, at('t5', .35), at('t5', .7)));
      op(lyB.dl, span(T, at('t5', .35), at('t5', .7)));
      rect(judge, O.judge);
      tf(judge, `translate3d(0,${px(lerp(46, 0, E.heavy(span(T, at('t5', .35), at('t5', .95)))))},0) scale(${lerp(1, .96, out6).toFixed(4)})`);
      op(judge, span(T, at('t5', .35), at('t5', .7)) * (1 - span(T, at('t6', .05), at('t6', .4))));
      jgRows.forEach((e, i) => op(e, span(T, at('t5', .55) + Math.floor(i / 3) * .1, at('t5', .7) + Math.floor(i / 3) * .1)));
      const dec = span(T, at('t5', .85), at('t5', 1));
      op(think, 1 - dec); op(vd, dec);
      op(rev, span(T, at('h6', .02), at('h6', .3)));
      who.forEach(w => op(w, span(T, at('h6', .05), at('h6', .3))));
      cls(judge, 'decided', dw('h6') > .5);

      // report
      tf(rep, `translate3d(0,${px(lerp(56, 0, E.heavy(span(T, at('t6', .3), at('t6', .95)))))},0)`);
      op(rep, span(T, at('t6', .3), at('t6', .65)));
      op(repStrip, span(T, at('t6', .45), at('t6', .7)));
      repRows.forEach((r, i) => { const v = span(T, at('t6', .55 + i * .1), at('t6', .8 + i * .1)); op(r, v); tf(r, `translate3d(0,${px(10 * (1 - E.heavy(v)))},0)`); });
      cls(rep, 'settled', dw('h7') > .5);
    }
    return { render, W, H };
  }

  /* ---------- mounting ---------- */
  const track = section.querySelector('.sx-track');
  const view = section.querySelector('.sx-view'), canvas = section.querySelector('.sx-canvas');
  const steps = [...section.querySelectorAll('.sx-steps li')], rail = [...section.querySelectorAll('.sx-rail i')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fit = (box, cv, sc) => { const s = Math.min(box.clientWidth / sc.W, box.clientHeight / sc.H); cv.style.transform = `translate(-50%,-50%) scale(${s.toFixed(4)})`; };

  if (reduce.matches || new URLSearchParams(location.search).has('stills')) {
    // A still, stacked sequence of the seven posed frames.
    section.classList.add('sx-still');
    const list = document.createElement('ol'); list.className = 'sx-stills';
    track.replaceWith(list);
    const M = section.clientWidth < 700 ? MODES.tall : MODES.wide;
    const frames = HOLDS.map((h, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="sx-frame" style="aspect-ratio:${M.W}/${M.H}"><div class="sx-canvas" aria-hidden="true"></div></div>`;
      li.append(...steps[i].cloneNode(true).childNodes);
      list.append(li);
      const f = li.firstChild, sc = createScene(f.firstChild, M);
      sc.render(at(h, .92), 0, false);
      return [f, sc];
    });
    const refit = () => frames.forEach(([f, sc]) => fit(f, f.firstChild, sc));
    refit(); addEventListener('resize', refit);
    return;
  }

  // Landscape stages get the wide choreography, portrait stages the tall one.
  const modeFor = () => view.clientWidth / Math.max(1, view.clientHeight) < .9 ? MODES.tall : MODES.wide;
  let mode = modeFor(), scene = createScene(canvas, mode);
  let beat = 1, cur = 0, vel = 0, target = 0, last = 0, running = false, step = -1;
  const layout = () => {
    beat = Math.max(360, innerHeight * .5);
    track.style.height = (TOTAL * beat + innerHeight).toFixed(0) + 'px';
    if (modeFor() !== mode) { mode = modeFor(); scene = createScene(canvas, mode); scene.render(cur, 0, true); }
    fit(view, canvas, scene);
  };
  const readScroll = () => clamp(-track.getBoundingClientRect().top / beat, 0, TOTAL);
  const setStep = T => {
    // The caption belongs to whichever pause we are nearest.
    let k = 0;
    HOLDS.forEach((h, i) => { if (i && T > at(h) - S['t' + i][1] * .5) k = i; });
    if (k === step) return; step = k;
    steps.forEach((s, i) => s.classList.toggle('on', i === k));
    rail.forEach((d, i) => { d.classList.toggle('on', i === k); d.classList.toggle('done', i < k); });
  };
  const frame = now => {
    const dt = Math.min(.05, (now - last) / 1000 || .016); last = now;
    target = readScroll();
    // Critically damped follow of the scroll position (smooth-damp, ~0.22s).
    const st = .22, o = 2 / st, x = o * dt, ex = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
    const ch = cur - target, tmp = (vel + o * ch) * dt;
    vel = (vel - o * tmp) * ex; cur = target + (ch + tmp) * ex;
    if (Math.abs(cur - target) < 1e-4 && Math.abs(vel) < 1e-4) { cur = target; vel = 0; }
    scene.render(cur, now / 1000, true);
    setStep(cur);
    if (running) requestAnimationFrame(frame);
  };
  layout();
  cur = target = readScroll();
  scene.render(cur, 0, true); setStep(cur);
  addEventListener('resize', layout);
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !running) { running = true; last = performance.now(); cur = readScroll(); requestAnimationFrame(frame); }
    else if (!e.isIntersecting) running = false;
  }, { rootMargin: '200px 0px' }).observe(track);
  reduce.addEventListener?.('change', () => location.reload());
})();
