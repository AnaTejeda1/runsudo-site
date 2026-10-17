// Scroll-driven walkthrough of one backtest (homepage #replay).
// Everything is laid out in a 1200x720 design frame and scaled to fit the stage.
// render(p) is a pure function of scroll progress, so any moment can be reproduced.
// Reduced motion, narrow screens and no-JS get the static storyboard in index.html instead.
(() => {
  const root = document.getElementById('rp');
  if (!root) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 760px)');

  // ---------- helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const eout = t => 1 - Math.pow(1 - t, 3);
  const sub = (t, a, b) => clamp((t - a) / (b - a));
  const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const D2R = Math.PI / 180;

  // ---------- timeline (units of scroll) ----------
  const SEG = [
    ['h1', .8], ['sort', 1.4], ['tilt', 1.2], ['h2', .8], ['fly', 2], ['seal', .7], ['h3', .8],
    ['zoom', 1.2], ['rewind', .8], ['write', 1.4], ['h4', .8], ['toDiff', 1], ['h5', .9],
    ['toTests', 1], ['run', 1], ['h6', .8], ['toJudge', 1], ['judge', 1.1], ['h7', .9], ['out', 1.6], ['h8', 1],
  ];
  const T = {}; let TOTAL = 0;
  for (const [n, d] of SEG) { T[n] = [TOTAL, TOTAL + d]; TOTAL += d; }
  const loc = (p, n) => clamp((p - T[n][0]) / (T[n][1] - T[n][0]));
  const UNIT_VH = 46;

  const CHAPTERS = [
    ['h1', 'Find', 'We pull every ticket your team closed in the last 90 days.'],
    ['sort', 'Pick', 'We keep the ones we can replay: a merged fix, with tests that touch it. Three are followed here.'],
    ['fly', 'Seal', 'Each ticket gets its own sealed container. No network beyond the model API, no access to the real fix.'],
    ['zoom', 'Solve', 'Inside, the repo is checked out at the commit before the fix landed. The agent solves the ticket blind.'],
    ['toDiff', 'Compare', 'Its patch is set beside the one your engineer actually merged.'],
    ['toTests', 'Test', 'The harness picks the tests that touch either change and runs them against both patches.'],
    ['toJudge', 'Judge', 'A judge that cannot tell which patch is ours compares them and explains its pick.'],
    ['out', 'Report', 'Every ticket lands in one report, failures first, including the ones we lose.'],
  ];

  // ---------- data (illustrative) ----------
  const PEOPLE = { MR: ['Maya R.', '#8F7EE7'], JT: ['Jon T.', '#2898BD'], AK: ['Ana K.', '#E06C00'], SL: ['Sam L.', '#22A06B'], DP: ['Dev P.', '#C9372C'] };
  // order: resolved desc (as Jira shows it). to: index after sorting.
  const ROWS = [
    { key: 'ACME-519', type: 'story', title: 'Add CSV export for the audit log', who: 'MR', pri: 'med', date: 'Oct 14', ok: true, to: 3 },
    { key: 'ACME-511', type: 'bug', title: 'Webhook retries duplicate deliveries on 5xx', who: 'JT', pri: 'high', date: 'Oct 6', ok: true, to: 4 },
    { key: 'ACME-503', type: 'bug', title: 'Flaky CSV import on files with a UTF-8 BOM', who: 'AK', pri: 'med', date: 'Sep 22', ok: true, to: 2, pick: 2 },
    { key: 'ACME-501', type: 'task', title: 'Update onboarding copy in the README', who: 'SL', pri: 'low', date: 'Sep 18', why: 'docs only', to: 6 },
    { key: 'ACME-497', type: 'bug', title: 'Pagination off by one on CSV exports', who: 'DP', pri: 'med', date: 'Sep 3', ok: true, to: 1, pick: 1 },
    { key: 'ACME-490', type: 'task', title: 'Rotate staging API keys', who: 'JT', pri: 'high', date: 'Aug 29', why: 'no code change', to: 7 },
    { key: 'ACME-488', type: 'story', title: 'Rate limit requests per API token', who: 'MR', pri: 'med', date: 'Aug 26', ok: true, to: 5 },
    { key: 'ACME-482', type: 'bug', title: 'Race in session refresh on token expiry', who: 'SL', pri: 'high', date: 'Aug 15', ok: true, to: 0, pick: 0 },
    { key: 'ACME-476', type: 'task', title: 'Bump eslint to v9', who: 'AK', pri: 'low', date: 'Aug 2', why: 'lockfile only', to: 8 },
    { key: 'ACME-469', type: 'bug', title: 'Timezone drift in the nightly report', who: 'DP', pri: 'med', date: 'Jul 24', why: 'no linked fix', to: 9 },
  ];
  const PICKS = [7, 4, 2].map(i => ROWS[i]);
  const PR = ['#4821 merged Aug 15', '#4890 merged Sep 3', '#4952 merged Sep 22'];
  const VERDICT = [['good', 'better'], ['par', 'par'], ['bad', 'worse']];

  // ---------- world geometry ----------
  const DW = 1200, DH = 720;
  const BOARD = { x: 600, y: 360, w: 1040, h: 640 };
  const ROW_H = 40, BODY_TOP = 204;
  const rowY = i => BODY_TOP + i * ROW_H + ROW_H / 2 - BOARD.h / 2; // row centre, relative to board centre
  const CT = [{ x: 1980, y: 400 }, { x: 2340, y: 350 }, { x: 2700, y: 410 }];
  const CT_W = 290, CT_H = 180;
  const TILT_A = 52, TILT_B = -26, TILT_S = .84;
  const FAN = [{ x: -330, y: -120 }, { x: 0, y: -150 }, { x: 330, y: -120 }];
  const LIFT = 150;
  const PATHS = [
    [[600, 360], [900, -260], [1500, 980], [CT[0].x, CT[0].y - 118]],
    [[600, 360], [1150, 820], [1750, -260], [CT[1].x, CT[1].y - 118]],
    [[600, 360], [700, -520], [2300, 1060], [CT[2].x, CT[2].y - 118]],
  ];

  // ---------- markup ----------
  const icon = {
    bug: '<svg viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#E2483D"/><circle cx="8" cy="8" r="3.2" fill="#fff"/></svg>',
    story: '<svg viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#22A06B"/><path d="M5 4h6v8.5L8 10.5 5 12.5z" fill="#fff"/></svg>',
    task: '<svg viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#388BFF"/><path d="M4.6 8.2l2.3 2.3 4.6-4.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    high: '<svg viewBox="0 0 16 16"><path d="M3.5 9.5L8 5l4.5 4.5" fill="none" stroke="#F87168" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    med: '<svg viewBox="0 0 16 16"><path d="M3.5 6.5h9M3.5 9.5h9" stroke="#FEA362" stroke-width="2" stroke-linecap="round"/></svg>',
    low: '<svg viewBox="0 0 16 16"><path d="M3.5 6.5L8 11l4.5-4.5" fill="none" stroke="#579DFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7.5 2.8v5.9c0 4.7-3.2 8.8-7.5 10.3-4.3-1.5-7.5-5.6-7.5-10.3V5.3z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path class="ck" d="M8.6 12.1l2.4 2.4 4.4-4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const avatar = id => `<span class="jav" style="background:${PEOPLE[id][1]}">${id}</span>`;
  const rowInner = r => `<span class="jt">${icon[r.type]}</span><span class="jk">${r.key}</span><span class="js">${r.title}</span>` +
    `<span class="jw">${avatar(r.who)}${PEOPLE[r.who][0]}</span><span class="jp">${icon[r.pri]}</span><span class="jl">Done</span><span class="jd">${r.date}</span>`;

  const board = `
    <div class="jb" style="width:${BOARD.w}px;height:${BOARD.h}px;left:${-BOARD.w / 2}px;top:${-BOARD.h / 2}px">
      <div class="jb-top"><span class="jb-grid"></span><span class="jb-app">A</span><span class="jb-nav"><b>Your work</b><b>Projects</b><b>Filters</b><b>Dashboards</b></span><span class="jb-create">Create</span><span class="jb-search">Search</span>${avatar('MR')}</div>
      <div class="jb-head"><div><p>Projects / ACME API</p><h4>Search issues</h4></div><span class="jb-btns"><b>Share</b><b>Export</b></span></div>
      <div class="jb-jql"><span class="jb-seg"><i>Basic</i><i class="on">JQL</i></span><code><em>project</em> = ACME <u>AND</u> <em>status</em> = Done <u>AND</u> <em>resolved</em> &gt;= -90d <u>ORDER BY</u> <em>resolved</em> DESC</code><span class="jb-n">87 issues</span></div>
      <div class="jb-th"><span></span><span>Key</span><span>Summary</span><span>Assignee</span><span>P</span><span>Status</span><span>Resolved</span><span>Replay</span></div>
      <div class="jb-body"><div class="jb-scan"></div>${ROWS.map(r => `<div class="jr${r.pick !== undefined ? ' pick' : ''}">${rowInner(r)}<span class="jx ${r.ok ? 'ok' : ''}">${r.ok ? 'replayable' : r.why}</span></div>`).join('')}</div>
      <div class="jb-foot"><span>1–10 of 87</span><span class="jb-pg"><i class="on">1</i><i>2</i><i>3</i><i>…</i><i>9</i></span></div>
    </div>`;

  const cards = PICKS.map((r, j) => `
    <div class="jc" data-j="${j}">
      <div class="jc-row">${rowInner(r)}<span class="jx ok">replayable</span></div>
      <div class="jc-card"><div class="jc-h"><span class="jt">${icon[r.type]}</span><span class="jk">${r.key}</span><span class="jl">Done</span></div><p>${r.title}</p><div class="jc-f"><span>PR ${PR[j]}</span><span class="jc-pick">picked</span></div></div>
    </div>`).join('');

  const trailPts = PATHS.map((P, j) => {
    // approximate 2D projection of the card centre along its flight
    const a = TILT_A * D2R, b = TILT_B * D2R, pts = [];
    for (let k = 0; k <= 48; k++) {
      const f = k / 48, g = 1 - f;
      const ox = FAN[j].x * g, oy = (rowY(j) + (FAN[j].y)) * g, oz = LIFT * g;
      const rx = ox * Math.cos(b) - oy * Math.sin(b), ry = ox * Math.sin(b) + oy * Math.cos(b);
      const s = lerp(TILT_S, 1, f);
      const x = bez(P[0][0], P[1][0], P[2][0], P[3][0], f) + rx * s;
      const y = bez(P[0][1], P[1][1], P[2][1], P[3][1], f) + (ry * Math.cos(a) - oz * Math.sin(a)) * s;
      pts.push(x.toFixed(1) + ',' + y.toFixed(1));
    }
    return pts.join(' ');
  });

  const ground = [
    [1240, 90, '87 closed tickets', 'last 90 days · acme/api'],
    [1430, 700, '62 replayable', 'merged fix · tests touch it'],
    [1690, 160, '3 followed here', 'a real backtest replays all 62'],
  ];

  const outer = `
    <div class="rp-land"></div>
    <svg class="rp-trails" width="1" height="1" overflow="visible">${trailPts.map((d, j) => `<polyline points="${d}" pathLength="1" class="tr${j === 0 ? ' lead' : ''}"/>`).join('')}</svg>
    ${ground.map(([x, y, a, b]) => `<div class="rp-gl" style="left:${x}px;top:${y}px"><b>${a}</b><span>${b}</span></div>`).join('')}
    ${CT.map((c, j) => `<div class="ct-pad" style="left:${c.x - 210}px;top:${c.y + 40}px"></div><div class="ct-top" style="left:${c.x - CT_W / 2}px;top:${c.y - CT_H / 2 - 30}px"><i></i></div>`).join('')}
    <div class="rp-3d">${board}${cards}</div>
    ${CT.map((c, j) => `
      <div class="ct-side" style="left:${c.x + CT_W / 2}px;top:${c.y - CT_H / 2}px;height:${CT_H}px"></div>
      <div class="ct-lid" style="left:${c.x - CT_W / 2}px;top:${c.y - CT_H / 2 - 30}px"></div>
      <div class="ct" style="left:${c.x - CT_W / 2}px;top:${c.y - CT_H / 2}px;width:${CT_W}px;height:${CT_H}px">
        <div class="ct-h">${icon.shield}<span>container 0${j + 1}</span></div>
        <div class="ct-k">${PICKS[j].key}</div>
        <div class="ct-f">sealed · no network · model API only</div>
      </div>
      <div class="ct-v pill ${VERDICT[j][0]}" style="left:${c.x}px;top:${c.y - CT_H / 2 - 74}px">${VERDICT[j][1]}</div>`).join('')}
    <div class="rp-rep report" style="left:${2340 - 450}px;top:${590}px;width:900px">
      <div class="top"><span>backtest · acme/api · 3 tickets followed</span><span>illustrative</span></div>
      <div class="strip"><p class="k">Report headline</p><div class="pills"><span class="pill good">1 better</span><span class="pill par">1 par</span><span class="pill bad">1 worse</span></div></div>
      <div class="sec">Page one · failures first</div>
      <div class="row"><span class="id">ACME-503</span><span class="t">Flaky CSV import on files with a UTF-8 BOM<small>Our patch fails 2 of 11 affected tests · engineer patch passes</small></span><span class="pill bad">worse</span></div>
      <div class="row"><span class="id">ACME-497</span><span class="t">Pagination off by one on CSV exports<small>Both pass 7 of 7 · judge calls them equivalent</small></span><span class="pill par">par</span></div>
      <div class="row"><span class="id">ACME-482</span><span class="t">Race in session refresh on token expiry<small>Both pass 9 of 9 · judge prefers ours: lock scoped per session, adds a regression test</small></span><span class="pill good">better</span></div>
    </div>`;

  // inner world: inside container 01
  const COMMITS = ['a0c71e4', '5d19b2f', 'c84e0aa', '3f2a9c1', '9be41d0', '71fd3c8', 'e2a6b19', '0bd4f75', '8c3e2d1', 'f4719aa', '2b8e6c0'];
  const C_TARGET = 3, C_X = i => 140 + i * 92;
  const LOG = [
    ['00:04', 'read ticket ACME-482'], ['00:19', 'search refreshToken, expiresAt'], ['01:02', 'write a failing test for concurrent refresh'],
    ['01:40', 'run tests · 1 failing'], ['03:15', 'patch src/session/refresh.ts'], ['03:58', 'run tests · 14 passing'], ['04:10', 'submit patch'],
  ];
  const CODE = [
    ['a', "import { withLock } from '../lib/lock';"], ['c', ''],
    ['c', 'export async function getSession(store: Store, id: string) {'], ['c', '  const s = await store.get(id);'], ['c', '  if (s.expiresAt > Date.now()) return s;'],
    ['r', '  const fresh = await refresh(s.refreshToken);'], ['r', '  await store.set(id, fresh);'], ['r', '  return fresh;'],
    ['a', '  return withLock(`refresh:${id}`, async () => {'], ['a', '    const cur = await store.get(id);'], ['a', '    if (cur.expiresAt > Date.now()) return cur;'],
    ['a', '    const fresh = await refresh(cur.refreshToken);'], ['a', '    await store.set(id, fresh);'], ['a', '    return fresh;'], ['a', '  });'], ['c', '}'],
  ];
  const ADD_CHARS = CODE.filter(l => l[0] === 'a').reduce((n, l) => n + l[1].length, 0);
  const OURS = [
    ['f', 'src/session/refresh.ts'], ['h', '@@ -1,9 +1,14 @@'], ['a', "+ import { withLock } from '../lib/lock';"], ['c', '  export async function getSession(store, id) {'], ['c', '    const s = await store.get(id);'], ['c', '    if (s.expiresAt > Date.now()) return s;'],
    ['r', '-   const fresh = await refresh(s.refreshToken);'], ['r', '-   await store.set(id, fresh);'], ['r', '-   return fresh;'],
    ['a', '+   return withLock(`refresh:${id}`, async () => {'], ['a', '+     const cur = await store.get(id);'], ['a', '+     if (cur.expiresAt > Date.now()) return cur;'], ['a', '+     const fresh = await refresh(cur.refreshToken);'], ['a', '+     await store.set(id, fresh);'], ['a', '+     return fresh;'], ['a', '+   });'],
    ['f', 'test/session.test.ts'], ['h', '@@ -48,0 +48,6 @@'], ['a', "+ it('refreshes once under concurrent calls', async () => {"], ['a', '+   const calls = await Promise.all([get(), get(), get()]);'], ['a', '+   expect(refresh).toHaveBeenCalledTimes(1);'], ['a', '+ });'],
  ];
  const THEIRS = [
    ['f', 'src/session/refresh.ts'], ['h', '@@ -1,9 +1,12 @@'], ['a', '+ const inflight = new Map<string, Promise<Session>>();'], ['c', '  export async function getSession(store, id) {'], ['c', '    const s = await store.get(id);'], ['c', '    if (s.expiresAt > Date.now()) return s;'],
    ['r', '-   const fresh = await refresh(s.refreshToken);'], ['r', '-   await store.set(id, fresh);'], ['r', '-   return fresh;'],
    ['a', '+   if (!inflight.has(id)) inflight.set(id,'], ['a', '+     refresh(s.refreshToken)'], ['a', '+       .then(async f => { await store.set(id, f); return f; })'], ['a', '+       .finally(() => inflight.delete(id)));'], ['a', '+   return inflight.get(id)!;'],
  ];
  const diffHtml = lines => lines.map(([k, t]) => `<span class="${k}">${esc(t)}</span>`).join('');
  const TESTS = [
    ['session/refresh', 'returns cached session before expiry'], ['session/refresh', 'refreshes an expired session'], ['session/refresh', 'persists the refreshed token'],
    ['session/store', 'get returns the latest write'], ['session/store', 'set overwrites expiry'], ['auth/middleware', 'attaches session to request'],
    ['auth/middleware', 'rejects a revoked token'], ['api/me', 'returns the current user'], ['api/logout', 'clears the session'],
  ];
  const TILE_N = 120, TILE_PICK = [5, 22, 37, 43, 58, 71, 84, 90, 109];
  const RUBRIC = [['Correctness', .92, .9], ['Scope of change', .84, .8], ['Tests', .9, .34], ['Readability', .8, .83]];

  const inner = `
    <div class="iw-a">
      <div class="i-hd" style="left:80px;top:24px"><span class="eyebrow">git history · acme/api</span></div>
      <div class="cm-line" style="left:${C_X(0)}px;top:112px;width:${C_X(10) - C_X(0)}px"></div>
      ${COMMITS.map((h, i) => `<div class="cm${i === C_TARGET ? ' tgt' : ''}${i === 4 ? ' fix' : ''}" style="left:${C_X(i)}px;top:112px"><i></i><span>${h}</span></div>`).join('')}
      <div class="cm-tag head" style="left:${C_X(10)}px">HEAD · today</div>
      <div class="cm-tag fixl" style="left:${C_X(4) + 46}px">the real fix and everything after: hidden</div>
      <div class="cm-ph"><i></i><span>checkout 3f2a9c1 · Aug 14, parent of the fix</span></div>
      <div class="i-card ag" style="left:80px;top:196px;width:340px;height:480px">
        <div class="i-ch"><span class="dot"></span>agent<span class="m">model API only</span></div>
        <ol class="ag-log">${LOG.map(([t, s]) => `<li><span>${t}</span>${s}</li>`).join('')}</ol>
      </div>
      <div class="i-card ed" style="left:440px;top:196px;width:680px;height:480px">
        <div class="ed-tabs"><b class="on">src/session/refresh.ts</b><b>test/session.test.ts</b></div>
        <div class="ed-code">${CODE.map(([k, t], i) => `<div class="cl ${k}"><i></i><span class="g">${k === 'a' ? '+' : k === 'r' ? '−' : ''}</span><code data-t="${esc(t)}">${k === 'a' ? '' : esc(t)}</code></div>`).join('')}</div>
        <div class="ed-st"><span class="ed-tests">tests · not run</span><span>TypeScript · UTF-8</span></div>
      </div>
    </div>
    <div class="iw-b">
      <div class="i-hd" style="left:80px;top:842px"><span class="eyebrow">same ticket · two patches</span></div>
      <div class="patch dp" style="left:80px;top:880px;width:510px"><div class="ph">sudo · written blind<span class="pm"><span class="a">+12</span> <span class="r">−3</span></span></div><pre class="diff">${diffHtml(OURS)}</pre></div>
      <div class="patch dp" style="left:610px;top:880px;width:510px"><div class="ph">Engineer · merged PR #4821<span class="pm"><span class="a">+6</span> <span class="r">−3</span></span></div><pre class="diff">${diffHtml(THEIRS)}</pre></div>
      <div class="dvs" style="left:600px;top:1100px">vs</div>
    </div>
    <div class="iw-c">
      <div class="i-hd" style="left:80px;top:1662px"><span class="eyebrow">test harness</span></div>
      <div class="i-card ts" style="left:80px;top:1700px;width:400px;height:600px">
        <div class="i-ch">Affected test selection</div>
        <div class="tiles">${Array.from({ length: TILE_N }, (_, i) => `<i${TILE_PICK.includes(i) ? ' class="pk"' : ''}></i>`).join('')}</div>
        <p class="ts-n"><b>9</b> of 120 test files touch code changed by either patch</p>
      </div>
      <div class="i-card trn" style="left:500px;top:1700px;width:620px;height:600px">
        <div class="tr-h"><span>Affected tests</span><span>sudo</span><span>engineer</span></div>
        ${TESTS.map(([f, n]) => `<div class="tr-r"><span class="tn"><i>${f}</i>${n}</span><span class="tc"></span><span class="tc"></span></div>`).join('')}
        <div class="tr-f"><span class="pill good">sudo 9 / 9 pass</span><span class="pill good">engineer 9 / 9 pass</span><span class="tr-note">both pass, so the judge decides</span></div>
      </div>
    </div>
    <div class="iw-d">
      <div class="i-hd" style="left:80px;top:2482px"><span class="eyebrow">LLM judge · blind</span></div>
      ${['A', 'B'].map((x, k) => `<div class="i-card jpa" style="left:80px;top:${2520 + k * 300}px;width:330px;height:280px">
        <div class="i-ch">Patch ${x}<span class="m jp-who" data-who="${k ? 'engineer' : 'sudo'}">author hidden</span></div>
        <div class="jp-lines">${(k ? [1, 3, 2, 4, 3, 1, 4, 2] : [1, 3, 2, 3, 4, 4, 4, 2, 1, 4]).map((w, i) => `<i class="${i % 4 === 1 ? 'r' : 'a'}" style="width:${30 + w * 14}%"></i>`).join('')}</div>
      </div>`).join('')}
      <div class="i-card jg" style="left:430px;top:2520px;width:690px;height:580px">
        <div class="i-ch">Rubric<span class="m">A <i class="ka"></i> B <i class="kb"></i></span></div>
        ${RUBRIC.map(([n]) => `<div class="rb"><span>${n}</span><div class="rb-bars"><i class="ba"></i><i class="bb"></i></div></div>`).join('')}
        <div class="jv">
          <p class="eyebrow">Verdict</p>
          <p class="jv-t">Prefers patch A.</p>
          <p class="jv-r">Both fix the race. A scopes the lock to one session and adds a regression test for concurrent calls. B shares a map across requests and adds no test.</p>
          <div class="jv-u"><span class="mono">A = sudo · B = engineer</span><span class="pill good">better</span></div>
          <p class="jv-n">The judge sees the ticket and both diffs, authors stripped, order randomized.</p>
        </div>
      </div>
    </div>`;

  // ---------- build ----------
  let built = false, els = {};
  function build() {
    built = true;
    const track = document.createElement('div');
    track.className = 'rp-track';
    track.style.height = `calc(${(TOTAL * UNIT_VH).toFixed(1)}vh + 100vh)`;
    track.innerHTML = `
      <div class="rp-sticky"><div class="rp-stage" aria-hidden="true">
        <div class="rp-cam">${outer}</div>
        <div class="rp-in"><div class="rp-icam">${inner}</div>
          <div class="rp-frame"><span class="tl">${icon.shield}container 01 · ACME-482 · acme/api @ 3f2a9c1</span><span class="tr">network · model API only</span></div>
        </div>
        <div class="rp-hud">
          <span class="rp-ill">illustrative</span>
          <div class="rp-cap">${CHAPTERS.map(([, t, s], i) => `<div><p class="eyebrow">${String(i + 1).padStart(2, '0')} · ${t}</p><p>${s}</p></div>`).join('')}</div>
          <div class="rp-prog"><span class="rp-num">01 / 08</span><span class="rp-dots">${CHAPTERS.map(() => '<i></i>').join('')}</span></div>
        </div>
      </div></div>`;
    root.appendChild(track);
    const q = (s, r = track) => r.querySelector(s), qa = (s, r = track) => [...r.querySelectorAll(s)];
    els = {
      track, stage: q('.rp-stage'), cam: q('.rp-cam'), in: q('.rp-in'), icam: q('.rp-icam'),
      board: q('.jb'), rows: qa('.jr'), chips: qa('.jr .jx'), scan: q('.jb-scan'), cards: qa('.jc'),
      trails: qa('.rp-trails polyline'), gl: qa('.rp-gl'), cts: qa('.ct'), sides: qa('.ct-side'), lids: qa('.ct-lid'), tops: qa('.ct-top'), verdicts: qa('.ct-v'), rep: q('.rp-rep'),
      cms: qa('.cm'), ph: q('.cm-ph'), fixl: q('.cm-tag.fixl'), ag: q('.ag'), ed: q('.ed'), logs: qa('.ag-log li'),
      cls: qa('.ed-code .cl'), edTests: q('.ed-tests'),
      dps: qa('.dp'), dlines: qa('.dp').map(d => qa('.diff span', d)),
      tiles: qa('.tiles i'), tsn: q('.ts-n'), trs: qa('.tr-r'), trf: q('.tr-f'),
      jps: qa('.jpa'), jpWho: qa('.jp-who'), bars: qa('.rb'), jv: q('.jv'), jvt: q('.jv-t'), jvr: q('.jv-r'), jvu: q('.jv-u'),
      caps: qa('.rp-cap > div'), num: q('.rp-num'), dots: qa('.rp-dots i'),
    };
    els.addCode = els.cls.map(c => c.querySelector('code'));
    root.classList.add('on');
    measure();
  }

  // ---------- cameras ----------
  const OC = [
    [T.h1[0], { x: 600, y: 420, z: 1 }],
    [T.sort[1], { x: 600, y: 418, z: 1.015 }],
    [T.tilt[1], { x: 640, y: 400, z: .95 }],
    [T.h2[1], { x: 640, y: 398, z: .965 }],
    [T.fly[1], { x: 2340, y: 360, z: 1 }, { dz: .58, dy: -40 }],
    [T.h3[1], { x: 2340, y: 368, z: 1.03 }],
    [T.zoom[1], { x: CT[0].x, y: CT[0].y + 6, z: 9 }],
    [T.out[0], { x: CT[0].x, y: CT[0].y + 6, z: 9 }],
    [T.out[1], { x: 2340, y: 690, z: .79 }],
    [TOTAL, { x: 2340, y: 688, z: .805 }],
  ];
  const IC = [
    [T.rewind[0], { x: 600, y: 418, z: 1 }],
    [T.h4[1], { x: 600, y: 418, z: 1.025 }],
    [T.toDiff[1], { x: 600, y: 1180, z: 1 }, { dz: .82, dx: 120 }],
    [T.h5[1], { x: 600, y: 1180, z: 1.025 }],
    [T.toTests[1], { x: 600, y: 2071, z: 1 }, { dz: .82, dx: -120 }],
    [T.h6[1], { x: 600, y: 2071, z: 1.025 }],
    [T.toJudge[1], { x: 600, y: 2881, z: 1 }, { dz: .82, dx: 120 }],
    [T.out[0], { x: 600, y: 2881, z: 1.025 }],
  ];
  function camAt(keys, p) {
    if (p <= keys[0][0]) return { ...keys[0][1] };
    for (let i = 1; i < keys.length; i++) {
      const [t1, c1, arc] = keys[i], [t0, c0] = keys[i - 1];
      if (p > t1) continue;
      const e = ease(clamp((p - t0) / (t1 - t0 || 1)));
      // log-space zoom; position weighted so the zoom target stays put on screen
      let z = c0.z * Math.pow(c1.z / c0.z, e), w = e;
      if (Math.abs(c1.z / c0.z - 1) > .08) w = (1 / c0.z - 1 / z) / (1 / c0.z - 1 / c1.z);
      const s = Math.sin(Math.PI * e);
      return { x: lerp(c0.x, c1.x, w) + (arc?.dx || 0) * s, y: lerp(c0.y, c1.y, w) + (arc?.dy || 0) * s, z: z * (1 - (1 - (arc?.dz ?? 1)) * s) };
    }
    return { ...keys[keys.length - 1][1] };
  }

  // ---------- render ----------
  let SW = 0, SH = 0, FIT = 1;
  function measure() {
    SW = els.stage.clientWidth; SH = els.stage.clientHeight;
    FIT = Math.min(SW / DW, SH / (DH + 180)); // extra 180 keeps the caption band clear on short screens
    last = -1;
  }
  const camCss = c => `translate(${SW / 2}px,${SH / 2}px) scale(${FIT * c.z}) translate(${-c.x}px,${-c.y}px)`;
  const op = (el, v) => { el.style.opacity = v.toFixed(3); el.style.visibility = v < .002 ? 'hidden' : ''; };

  function render(p) {
    const s = loc(p, 'sort'), tl = loc(p, 'tilt'), fl = loc(p, 'fly'), sl = loc(p, 'seal'), zm = loc(p, 'zoom'), o = loc(p, 'out');
    const oc = camAt(OC, p);
    els.cam.style.transform = camCss(oc);

    // board: scan, sort, tilt
    const scan = sub(s, 0, .42);
    els.scan.style.transform = `translateY(${lerp(-ROW_H, 10 * ROW_H, scan)}px)`;
    op(els.scan, scan > 0 && scan < 1 ? Math.min(1, Math.sin(Math.PI * scan) * 3) : 0);
    const e = ease(sub(tl, 0, .6)), a = TILT_A * e, b = TILT_B * e, bs = lerp(1, TILT_S, e);
    const L = ease(sub(tl, .28, 1)), m = ease(sub(tl, .3, .75));
    ROWS.forEach((r, i) => {
      const u = ease(sub(s, .46 + r.to * .024, .76 + r.to * .024));
      const row = els.rows[i];
      row.style.transform = `translate(${Math.sin(Math.PI * u) * (r.ok ? 22 : -12)}px,${lerp(i, r.to, u) * ROW_H}px)`;
      row.style.zIndex = r.ok ? 2 : 1;
      let v = r.ok ? 1 : lerp(1, .36, u);
      if (r.pick !== undefined) {
        v *= 1 - .8 * L;
        row.classList.toggle('lit', s > .86);
      }
      row.style.opacity = v.toFixed(3);
      els.chips[i].style.opacity = clamp(scan * 10.6 - i).toFixed(3);
    });
    els.board.style.transform = `translate3d(${BOARD.x}px,${BOARD.y}px,0) rotateX(${a}deg) rotateZ(${b}deg) scale(${bs})`;
    els.board.style.opacity = (1 - .55 * ease(sub(fl, .1, .6))).toFixed(3);

    // cards: lift out of the tilted board, fly along their paths, sink into containers
    els.cards.forEach((c, j) => {
      const f = ease(sub(fl, j * .1, j * .1 + .74));
      const sink = ease(sub(sl, j * .14, j * .14 + .5));
      const vis = tl > .28 && sink < 1;
      if (!vis) { op(c, 0); return; }
      op(c, 1 - sub(sink, .55, 1));
      const g = 1 - f, P = PATHS[j];
      const w = lerp(BOARD.w - 48, 300, m), h = lerp(ROW_H, 150, m);
      c.style.width = w + 'px'; c.style.height = h + 'px'; c.style.left = -w / 2 + 'px'; c.style.top = -h / 2 + 'px';
      c.style.setProperty('--m', m.toFixed(3));
      const px = bez(P[0][0], P[1][0], P[2][0], P[3][0], f), py = bez(P[0][1], P[1][1], P[2][1], P[3][1], f) + sink * 150;
      const ox = FAN[j].x * L * g, oy = (rowY(j) + FAN[j].y * L) * g, oz = LIFT * L * g, k = .62 * L * g;
      const spin = Math.sin(Math.PI * f) * [-12, 9, -14][j], sc = lerp(1, .72, f) * (1 + .16 * Math.sin(Math.PI * f));
      c.style.transform = `translate3d(${px}px,${py}px,0) rotateX(${a * g}deg) rotateZ(${b * g}deg) scale(${lerp(bs, 1, f)}) ` +
        `translate3d(${ox}px,${oy}px,${oz}px) rotateZ(${-b * k}deg) rotateX(${-a * k}deg) rotate(${spin}deg) scale(${sc})`;
      c.style.zIndex = 10 + j;
    });
    els.trails.forEach((t, j) => {
      const f = ease(sub(fl, j * .1, j * .1 + .74));
      t.style.strokeDashoffset = (1 - f).toFixed(4);
      op(t, f > 0 ? 1 - .7 * sub(sl, .5, 1) - .3 * sub(o, 0, .3) : 0);
    });
    els.gl.forEach((g, i) => op(g, Math.sin(Math.PI * sub(fl, .05 + i * .14, .75 + i * .1)) ** .5));

    // containers
    els.cts.forEach((c, j) => {
      const appear = eout(sub(fl, .25 + j * .1, .6 + j * .1));
      const lid = ease(sub(sl, j * .14 + .42, j * .14 + .8));
      [c, els.tops[j], els.lids[j], els.sides[j]].forEach(x => { x.style.transform = `translateY(${(1 - appear) * 40}px)`; op(x, appear); });
      els.lids[j].style.clipPath = `inset(0 0 0 ${(1 - lid) * 100}%)`;
      c.classList.toggle('sealed', lid > .98);
      // container 01's labels melt away as the camera dives into it
      c.style.setProperty('--t', j ? 1 : p < T.out[0] ? (1 - sub(zm, .2, .45)).toFixed(3) : sub(o, .45, .65).toFixed(3));
      c.style.setProperty('--k', lid.toFixed(3));
      const v = eout(sub(o, .5 + j * .07, .7 + j * .07));
      op(els.verdicts[j], v);
      els.verdicts[j].style.transform = `translate(-50%,${(1 - v) * 14}px) scale(${lerp(.85, 1, v)})`;
    });
    const rr = ease(sub(o, .55, .98));
    op(els.rep, rr);
    els.rep.style.transform = `translateY(${(1 - rr) * 70}px)`;

    // inside container 01
    const inV = p < T.out[0] ? ease(sub(zm, .5, .86)) : 1 - ease(sub(o, 0, .22));
    op(els.in, inV);
    els.cam.style.visibility = inV > .999 ? 'hidden' : '';
    if (inV > 0) {
      const ic = camAt(IC, p);
      ic.z *= Math.min(1, oc.z / 9);
      els.icam.style.transform = camCss(ic);
      renderInside(p);
    }

    // hud
    let ch = 0;
    CHAPTERS.forEach(([n], i) => { if (p >= T[n][0] - .001) ch = i; });
    if (ch !== els.ch) {
      els.ch = ch;
      els.caps.forEach((c, i) => c.classList.toggle('on', i === ch));
      els.num.textContent = `${String(ch + 1).padStart(2, '0')} / 08`;
      els.dots.forEach((d, i) => { d.className = i < ch ? 'done' : i === ch ? 'on' : ''; });
    }
  }

  function renderInside(p) {
    const rw = loc(p, 'rewind'), wr = loc(p, 'write'), td = loc(p, 'toDiff'), tt = loc(p, 'toTests'), rn = loc(p, 'run'), tj = loc(p, 'toJudge'), jd = loc(p, 'judge');
    // rewind: playhead walks back from HEAD to the parent of the fix
    const r = ease(rw), hx = lerp(C_X(10), C_X(C_TARGET), r);
    els.ph.style.transform = `translateX(${hx}px)`;
    els.ph.classList.toggle('done', r > .98);
    els.cms.forEach((c, i) => { c.classList.toggle('gone', i > C_TARGET && C_X(i) > hx - 4); });
    op(els.fixl, sub(rw, .7, 1));
    [els.ag, els.ed].forEach((x, k) => { const v = eout(sub(rw, .45 + k * .12, 1)); op(x, v); x.style.transform = `translateY(${(1 - v) * 30}px)`; });
    // agent log + typed code
    els.logs.forEach((l, i) => {
      const t = i / LOG.length * .92;
      l.className = wr >= t + .92 / LOG.length || wr >= .99 ? 'done' : wr >= t ? 'now' : '';
    });
    const typed = Math.floor(ADD_CHARS * sub(wr, .12, .86));
    let left = typed, caretOn = wr > .1 && wr < .9;
    CODE.forEach(([k, t], i) => {
      const cl = els.cls[i];
      if (k === 'r') cl.classList.toggle('struck', wr > .3);
      if (k !== 'a') return;
      const n = clamp(left, 0, t.length);
      left -= t.length;
      const code = els.addCode[i];
      if (code._n !== n) { code.textContent = t.slice(0, n); code._n = n; }
      const caret = caretOn && n < t.length;
      if (caret) caretOn = false;
      cl.classList.toggle('vis', n > 0 || caret);
      cl.classList.toggle('caret', caret);
    });
    els.edTests.textContent = wr > .78 ? 'tests · 14 passing' : wr > .44 ? 'tests · 1 failing' : 'tests · not run';
    els.edTests.className = 'ed-tests' + (wr > .78 ? ' ok' : wr > .44 ? ' no' : '');
    // diff vs diff
    els.dps.forEach((d, k) => {
      const v = eout(sub(td, .35 + k * .08, .8 + k * .08)); op(d, v); d.style.transform = `translateY(${(1 - v) * 40}px)`;
      els.dlines[k].forEach((l, i) => { l.style.opacity = sub(td, .42 + i * .014 + k * .06, .56 + i * .014 + k * .06).toFixed(3); });
    });
    // harness
    els.tiles.forEach((t, i) => {
      const pk = TILE_PICK.includes(i);
      const at = .45 + (pk ? TILE_PICK.indexOf(i) * .04 : 0);
      t.classList.toggle('on', pk && tt > at);
      t.classList.toggle('dim', !pk && tt > .75);
    });
    op(els.tsn, sub(tt, .8, 1));
    els.trs.forEach((row, i) => {
      [0, 1].forEach(k => {
        const c = row.children[1 + k], t0 = .04 + i * .085 + k * .03;
        const st = rn >= t0 + .06 ? 'pass' : rn >= t0 ? 'run' : 'q';
        if (c._s !== st) { c._s = st; c.className = 'tc ' + st; c.textContent = st === 'pass' ? 'pass' : st === 'run' ? 'running' : 'queued'; }
      });
    });
    op(els.trf, sub(rn, .9, 1));
    // judge
    els.jps.forEach((x, k) => { const v = eout(sub(tj, .4 + k * .1, .85 + k * .1)); op(x, v); x.style.transform = `translateX(${(1 - v) * -30}px)`; });
    els.bars.forEach((b, i) => {
      const v = ease(sub(jd, .05 + i * .1, .35 + i * .1));
      b.querySelector('.ba').style.width = RUBRIC[i][1] * v * 100 + '%';
      b.querySelector('.bb').style.width = RUBRIC[i][2] * v * 100 + '%';
    });
    op(els.jvt, sub(jd, .55, .7)); op(els.jvr, sub(jd, .62, .78));
    const un = eout(sub(jd, .8, .95));
    op(els.jvu, un);
    els.jpWho.forEach(w => { const done = jd > .86; w.textContent = done ? w.dataset.who : 'author hidden'; w.classList.toggle('shown', done); });
  }

  // ---------- scroll loop ----------
  let target = 0, cur = 0, last = -1, raf = 0;
  function readScroll() {
    const r = els.track.getBoundingClientRect(), span = r.height - innerHeight;
    target = clamp(-r.top / span) * TOTAL;
  }
  function tick() {
    raf = 0;
    cur += (target - cur) * .14;
    if (Math.abs(target - cur) < .0005) cur = target;
    if (cur !== last) { render(cur); last = cur; }
    if (cur !== target) raf = requestAnimationFrame(tick);
  }
  const kick = () => { readScroll(); if (!raf) raf = requestAnimationFrame(tick); };

  function setup() {
    const on = !still.matches && !narrow.matches;
    if (on && !built) {
      build();
      addEventListener('scroll', kick, { passive: true });
      addEventListener('resize', () => { if (built) { measure(); kick(); } });
      readScroll(); cur = target; render(cur); last = cur;
    }
    root.classList.toggle('on', on);
    if (on && built) { measure(); kick(); }
  }
  still.addEventListener('change', setup);
  narrow.addEventListener('change', setup);
  setup();
  // for screenshots: window.__rp.seek(name, t)
  window.__rp = { T, TOTAL, seek: (n, t = 1) => { const [a, b] = T[n]; const pp = a + (b - a) * t; const r = els.track; const top = r.getBoundingClientRect().top + scrollY; scrollTo(0, top + pp / TOTAL * (r.offsetHeight - innerHeight)); cur = target = pp; render(pp); last = pp; } };
})();
