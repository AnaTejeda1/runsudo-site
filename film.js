/* The replay: a scroll-driven, one-take film of one backtest.
 *
 * One world, one camera. Every scene sits on a single large plane (.fm-world):
 * the Jira list, the flight paths, the three sandboxes, the agent's workspace,
 * the comparison bench, the judge and the report. Scroll never moves anything
 * inside the page; it moves a virtual camera (a 3D transform on the world) and
 * the objects' own motion. ScrollTrigger scrubs a single timeline, Lenis smooths
 * the wheel. With prefers-reduced-motion the same timeline is frozen at each
 * hold and rendered as a column of stills.
 *
 * Shot list. World px; the camera frames a box (w x h) centred on (x, y) and
 * zooms to fit it. Tilt is rotateX, spin is rotateZ, both in degrees.
 * t is in timeline units; the pin maps one unit to about 0.8 viewport heights.
 *
 *  #  beat     centre       frame        tilt/spin  move ease               hold  what happens
 *  1  find     board        board+8%     0 / 0      (entry)                 0.8   raw Jira list, 90 days of closed tickets
 *  2  rank     board→fit    board+2%     0 / 0      power2.inOut, 1.3       0.7   fit column fills, rows re-sort, top three marked
 *  3  pick     board        wide         50 / -22   cam.settle, 1.2         0.6   board tips into 2.5D, three rows lift out
 *  -  flight   1800,760     3300x2000    56 / -12   power2.inOut, 1.0       -     cards fly on motion paths, camera follows the lead
 *  4  seal     yard         2050x1250    46 / -8    cam.settle, 1.1         0.7   three Docker-blue sandboxes, shields close
 *  5  solve    sandbox 02   its floor    0 / 0      cam.dive, 1.3           1.4   repo rewinds to a41c9e2, agent writes its patch
 *  -  rise     2900,1250    2400x1500    34 / 6     power2.inOut, 0.8       -     camera climbs out, a line runs down to the bench
 *  6  test     bench        bench+6%     0 / 0      cam.settle, 0.9         1.1   diff vs diff, harness runs the selected tests on both
 *  7  judge    judge        judge+8%     0 / 0      cam.settle, 0.9         1.0   blind judge scores, prefers A, then authorship is revealed
 *  -  reveal   3800,1200    4300x2700    40 / -10   power2.inOut, 0.9       -     pull back: all three paths converge on the report
 *  8  report   report       report+8%    0 / 0      cam.settle, 1.0         1.1   the report, failures first
 *
 * Holds drift the camera a few px sideways only. Changing zoom during a hold
 * would make Chrome re-raster text at an odd scale and the pause would look soft.
 */
(() => {
  const film = document.querySelector('[data-film]');
  if (!film || !window.gsap || !window.ScrollTrigger || !window.MotionPathPlugin || !window.CustomEase) return;
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin, CustomEase);

  CustomEase.create('cam.settle', 'M0,0 C0.34,0 0.16,0.9 0.56,1.006 0.74,1.016 0.88,1 1,1');
  CustomEase.create('cam.dive', 'M0,0 C0.55,0 0.32,0.62 0.56,0.88 0.72,1.005 0.86,1 1,1');
  CustomEase.create('fly', 'M0,0 C0.46,0 0.24,1 1,1');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const steps = [...film.querySelectorAll('.fm-steps li')].map(li => ({ k: li.querySelector('b').textContent, text: li.lastChild.textContent.trim() }));

  // ---------- Illustrative data ----------
  const PEOPLE = { MK: ['Maya K.', '#6E5DC6'], JB: ['Jonas B.', '#1F845A'], PS: ['Priya S.', '#C25100'], LT: ['Leo T.', '#0055CC'], AR: ['Ana R.', '#AE2E24'], SW: ['Sam W.', '#5E4DB2'] };
  // key, type, summary, assignee, resolved, replayability (0-100)
  const ROWS = [
    ['API-511', 'bug', 'Webhook retries duplicate deliveries on 5xx', 'MK', 'Oct 9, 2026', 71],
    ['API-509', 'task', 'Update onboarding copy on billing page', 'AR', 'Oct 6, 2026', 12],
    ['API-503', 'bug', 'Flaky CSV import on files with a UTF-8 BOM', 'JB', 'Sep 30, 2026', 88],
    ['API-501', 'task', 'Bump Node to 22 in the CI image', 'LT', 'Sep 26, 2026', 20],
    ['API-497', 'bug', 'Pagination off by one on CSV exports', 'PS', 'Sep 19, 2026', 91],
    ['API-494', 'story', 'Audit log export for workspace admins', 'SW', 'Sep 12, 2026', 55],
    ['API-490', 'task', 'Investigate slow dashboard queries', 'MK', 'Sep 3, 2026', 31],
    ['API-486', 'bug', 'Rate limiter ignores per-key overrides', 'JB', 'Aug 27, 2026', 79],
    ['API-482', 'bug', 'Race in session refresh on token expiry', 'PS', 'Aug 4, 2026', 94],
    ['API-478', 'task', 'Design review for new settings layout', 'AR', 'Jul 30, 2026', 5],
    ['API-475', 'story', 'Retry budget for outbound email', 'LT', 'Jul 24, 2026', 64],
    ['API-471', 'bug', 'Timezone drift in the weekly digest', 'SW', 'Jul 21, 2026', 83],
  ];
  const RANK = ROWS.map((r, i) => i).sort((a, b) => ROWS[b][5] - ROWS[a][5]);
  const rankOf = i => RANK.indexOf(i);
  const PICKS = RANK.slice(0, 3); // API-482, API-497, API-503
  const ROW_H = 40;

  // Sandboxes: index into PICKS for each container, left to right.
  const YARD = [{ left: 2000, pick: 1 }, { left: 2620, pick: 0 }, { left: 3240, pick: 2 }];
  const CTR = { top: 560, w: 520, h: 340, wall: 84 };
  const ctrCentre = c => ({ x: c.left + CTR.w / 2, y: CTR.top + CTR.h / 2 });

  // ---------- Markup ----------
  const icon = t => `<i class="ji ji-${t}" aria-hidden="true"></i>`;
  const avatar = p => `<i class="jav" style="background:${PEOPLE[p][1]}">${p}</i>`;
  const rowCells = r => `${icon(r[1])}<span class="jk">${r[0]}</span><span class="js">${r[2]}</span><span><b class="jl">Done</b></span><span class="ja">${avatar(r[3])}${PEOPLE[r[3]][0]}</span><span class="jd">${r[4]}</span><span class="jf"><i><b style="width:${r[5]}%"></b></i><em>${r[5]}</em></span>`;
  const shield = `<svg class="fm-shield" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.2 4.2 5.1v6.1c0 4.9 3.3 9.1 7.8 10.6 4.5-1.5 7.8-5.7 7.8-10.6V5.1z" fill="currentColor"/><path d="m8.4 12.1 2.5 2.5 4.8-5" fill="none" stroke="#0b1d44" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const lines = (arr) => arr.map(([c, s]) => `<span class="${c}">${s.replace(/</g, '&lt;')}</span>`).join('');

  const CODE = [
    ['c', '41  export async function getSession(req) {'],
    ['c', '42    const s = await store.load(req.sid);'],
    ['c', '43    if (!isExpired(s.token)) return s;'],
    ['r', '44 -  s.token = await refresh(s.refreshToken);'],
    ['r', '45 -  await store.save(s);'],
    ['a', '44 +  return withLock(`refresh:${s.sid}`, async () => {'],
    ['a', '45 +    const fresh = await store.load(req.sid);'],
    ['a', '46 +    if (!isExpired(fresh.token)) return fresh;'],
    ['a', '47 +    fresh.token = await refresh(fresh.refreshToken);'],
    ['a', '48 +    await store.save(fresh);'],
    ['a', '49 +    return fresh;'],
    ['a', '50 +  });'],
    ['c', '51  }'],
  ];
  const TERM = [
    ['p', '$ factory solve API-482 --sealed'],
    ['m', '  repo      acme/api @ a41c9e2'],
    ['m', '  network   model API only'],
    ['l', '› reading the ticket and recent history'],
    ['l', '› reproduced: two concurrent refreshes, second request gets 401'],
    ['l', '› editing src/auth/session.ts  (+7 −2)'],
    ['l', '› adding test/session.refresh.concurrent.test.ts'],
    ['l', '› running affected tests'],
    ['ok', '✓ 15 passed · patch ready · 41 min'],
  ];
  const PATCH_A = [
    ['f', 'src/auth/session.ts'], ['h', '@@ -41,7 +41,10 @@ export async function getSession'],
    ['c', '   const s = await store.load(req.sid);'], ['c', '   if (!isExpired(s.token)) return s;'],
    ['r', '-  s.token = await refresh(s.refreshToken);'], ['r', '-  await store.save(s);'],
    ['a', '+  return withLock(`refresh:${s.sid}`, async () => {'], ['a', '+    const fresh = await store.load(req.sid);'],
    ['a', '+    if (!isExpired(fresh.token)) return fresh;'], ['a', '+    fresh.token = await refresh(fresh.refreshToken);'],
    ['a', '+    await store.save(fresh);'], ['a', '+    return fresh;'], ['a', '+  });'],
    ['f', 'test/session.refresh.concurrent.test.ts  (new)'], ['a', '+  it("refreshes once under concurrency", …)'],
  ];
  const PATCH_B = [
    ['f', 'src/auth/session.ts'], ['h', '@@ -12,6 +12,7 @@'], ['a', '+const refreshMutex = new Mutex();'],
    ['h', '@@ -40,7 +41,9 @@ export async function getSession'],
    ['r', '-  const s = await store.load(req.sid);'], ['a', '+  return refreshMutex.runExclusive(async () => {'],
    ['a', '+    const s = await store.load(req.sid);'], ['c', '     if (!isExpired(s.token)) return s;'],
    ['c', '     s.token = await refresh(s.refreshToken);'], ['c', '     await store.save(s);'],
    ['a', '+    return s;'], ['a', '+  });'],
  ];
  const TESTS = [
    ['session.refresh › refreshes an expired token', 1, 1],
    ['session.refresh › keeps a valid token', 1, 1],
    ['session.store › saves after refresh', 1, 1],
    ['middleware.auth › rejects revoked sessions', 1, 1],
    ['middleware.auth › 401 on missing session', 1, 1],
    ['session.refresh.concurrent › refreshes once (new in A)', 1, 0],
  ];
  const testRows = side => TESTS.map(t => {
    const has = side === 'a' ? t[1] : t[2];
    return `<li><span>${t[0]}</span>${has ? '<b class="fm-t" data-t><span class="q">queued</span><span class="p">passed</span></b>' : '<b class="fm-t na">not in patch</b>'}</li>`;
  }).join('') + `<li class="more"><span>+ 9 more selected tests</span><b class="fm-t" data-t><span class="q">queued</span><span class="p">passed</span></b></li>`;

  const commits = ['3c0e1a7', '77b2d90', 'e41f0c3', '5aa9d12', 'c08b6e4', 'a41c9e2', '9f3c1e0', '2d7714b', 'f6a03e8', 'b13c5d9'];

  const worldHTML = () => `
  <div class="fm-ground"></div>
  <svg class="fm-lines" viewBox="-1200 -800 7800 4200" width="7800" height="4200" aria-hidden="true">
    <g class="fm-contours">
      <ellipse cx="800" cy="680" rx="900" ry="640"/><ellipse cx="800" cy="680" rx="1060" ry="780"/>
      <ellipse cx="2880" cy="740" rx="1180" ry="560"/><ellipse cx="2880" cy="740" rx="1340" ry="700"/>
      <ellipse cx="3560" cy="1960" rx="1700" ry="700"/><ellipse cx="3560" cy="1960" rx="1880" ry="860"/>
      <ellipse cx="5000" cy="780" rx="760" ry="640"/><ellipse cx="5000" cy="780" rx="920" ry="780"/>
    </g>
    <g class="fm-trails"></g>
    <path class="fm-pipe" pathLength="1" d="M2880 912 C2880 1120 2880 1260 2880 1490"/>
    <path class="fm-pipe" pathLength="1" d="M3594 1940 C3680 1940 3720 1940 3792 1940"/>
    <path class="fm-pipe fm-pipe-r" pathLength="1" d="M4250 1550 C4250 1340 4600 1300 4800 1188"/>
    <path class="fm-pipe fm-pipe-r" pathLength="1" d="M2260 548 C2260 260 3200 120 4490 520"/>
    <path class="fm-pipe fm-pipe-r" pathLength="1" d="M3500 548 C3560 420 3980 380 4490 640"/>
  </svg>

  <div class="jira" style="left:200px;top:300px">
    <div class="j-top">
      <span class="j-logo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.2 11.3 12.7 1.8 12 1 4.9 8.2 1.8 11.3a1 1 0 0 0 0 1.4l6.5 6.5L12 23l7.1-7.1.1-.1 3-3a1 1 0 0 0 0-1.5ZM12 15.2 8.8 12 12 8.8l3.2 3.2Z" fill="#579DFF"/></svg>Jira</span>
      <span class="j-nav"><span>Your work</span><span class="on">Projects</span><span>Filters</span><span>Dashboards</span><span>Teams</span></span>
      <span class="j-create">Create</span>
      <span class="j-search">Search</span>
      <i class="jav" style="background:#5E4DB2">RC</i>
    </div>
    <div class="j-body">
      <aside class="j-side">
        <div class="j-proj"><i></i><div><b>API Platform</b><small>Software project</small></div></div>
        <p class="j-sh">Planning</p>
        <span>Summary</span><span>Timeline</span><span>Backlog</span><span>Board</span><span class="on">List</span><span>Reports</span>
        <p class="j-sh">Development</p>
        <span>Code</span><span>Releases</span>
      </aside>
      <main class="j-main">
        <div class="j-crumb">Projects / API Platform</div>
        <div class="j-h">List</div>
        <div class="j-jql"><code>project = API AND status = Done AND resolved &gt;= -90d<span class="j-q2">&nbsp;AND "Linked PR" is not EMPTY</span></code><span class="j-count"><b class="c1">214 issues</b><b class="c2">61 replayable</b></span></div>
        <div class="j-chips"><span>Type</span><span>Status: Done</span><span>Resolved: last 90 days</span><span>Assignee</span><span class="j-sudo">Ranked by sudo · replayability</span></div>
        <div class="j-table">
          <div class="j-th"><span></span><span>Key</span><span>Summary</span><span>Status</span><span>Assignee</span><span>Resolved</span><span class="jf-h">Replayability</span></div>
          <div class="j-rows">${ROWS.map((r, i) => `<div class="jr" data-i="${i}">${rowCells(r)}</div>`).join('')}</div>
        </div>
      </main>
    </div>
  </div>

  ${PICKS.map((ri, n) => { const r = ROWS[ri]; return `
  <div class="fm-tk" data-n="${n}">
    <div class="tk-row">${rowCells(r)}</div>
    <div class="tk-card">
      <p>${r[2]}</p>
      <div class="tk-meta">${icon(r[1])}<span class="jk">${r[0]}</span><b class="jl">Done</b><span class="tk-fit">${r[5]}</span>${avatar(r[3])}</div>
    </div>
  </div>`; }).join('')}

  ${YARD.map((c, n) => { const r = ROWS[PICKS[c.pick]]; return `
  <div class="fm-ctr" data-c="${n}" style="left:${c.left}px;top:${CTR.top}px">
    <div class="ctr-floor">
      <span class="ctr-tag">sandbox 0${n + 1} · ${r[0]}</span>
      ${n === 1 ? workspaceHTML() : ''}
    </div>
    <div class="ctr-wall n"></div><div class="ctr-wall e"></div><div class="ctr-wall w"></div>
    <div class="ctr-wall s"><span class="ctr-seal">${shield}<span><b>sandbox 0${n + 1}</b><small>net: model API only · no real fix</small></span></span></div>
  </div>`; }).join('')}

  <div class="fm-cmp" style="left:2180px;top:1490px">
    <div class="cmp-head">
      <div><p class="fm-eb">Blind comparison · API-482</p><h3>Race in session refresh on token expiry</h3></div>
      <div class="cmp-harness"><p class="fm-eb">Harness</p><p><b data-count>0</b> of 15 selected tests run on each patch</p><i class="cmp-bar"><b></b></i></div>
    </div>
    <p class="cmp-note">Tests are picked from the import graph of every file either patch touches, then run on both. Labels are shuffled so nothing downstream knows which patch is ours.</p>
    <div class="cmp-cols">
      ${['a', 'b'].map(s => `
      <div class="cmp-col" data-side="${s}">
        <div class="fm-patch"><div class="ph"><span>Patch ${s.toUpperCase()}</span><span class="pm">${s === 'a' ? '<span class="a">+9</span> <span class="r">−2</span> · 2 files' : '<span class="a">+6</span> <span class="r">−1</span> · 1 file'}</span></div>
          <pre class="diff">${lines(s === 'a' ? PATCH_A : PATCH_B)}</pre></div>
        <ul class="fm-tests">${testRows(s)}</ul>
        <p class="cmp-sum" data-sum><span class="q">waiting for harness</span><span class="p">${s === 'a' ? '15 of 15 passed' : '14 of 14 passed'}</span></p>
      </div>`).join('')}
    </div>
  </div>

  <div class="fm-judge" style="left:3800px;top:1560px">
    <div class="jd-head"><div><p class="fm-eb">Judge · LLM · blind to authorship</p><h3>Which patch would you merge?</h3></div>
      <svg class="jd-scale" viewBox="0 0 120 80" aria-hidden="true"><path d="M60 14v56M40 72h40" stroke="#555" stroke-width="2.5" stroke-linecap="round"/><g class="jd-beam"><path d="M18 22h84" stroke="#9a9a9a" stroke-width="2.5" stroke-linecap="round"/><path d="M18 22 8 44h20zM102 22 92 44h20z" fill="none" stroke="#666" stroke-width="2" stroke-linejoin="round"/><text x="18" y="58" text-anchor="middle">A</text><text x="102" y="58" text-anchor="middle">B</text></g><circle cx="60" cy="14" r="4" fill="#f5e900"/></svg>
    </div>
    <ol class="jd-crit">
      <li><span>Fixes the reported race</span><b class="pill par">both</b><small>Both serialize the refresh; both pass every selected test.</small></li>
      <li><span>Scope of the change</span><b class="pill good">A</b><small>A locks only around the refresh. B serializes every session read.</small></li>
      <li><span>Regression coverage</span><b class="pill good">A</b><small>A adds a test that reproduces the double refresh.</small></li>
      <li><span>Readability</span><b class="pill par">even</b><small>Similar size, similar clarity.</small></li>
    </ol>
    <div class="jd-verdict">
      <p class="fm-eb">Verdict</p>
      <p class="jd-big">Prefers patch A</p>
      <div class="jd-reveal"><span><b>A</b> software factory</span><span><b>B</b> your engineer, merged Aug 4</span><span class="pill good">better</span></div>
    </div>
  </div>

  <div class="fm-rep" style="left:4500px;top:380px">
    <div class="top"><span>backtest · acme/api · 90 days · 3 tickets</span><span>illustrative</span></div>
    <div class="strip"><p class="k">Report headline</p><div class="pills"><span class="pill good">1 better</span><span class="pill par">1 par</span><span class="pill bad">1 worse</span><span class="pill warn">0 no scorable attempt</span></div></div>
    <div class="sec">Page one · failures first</div>
    <div class="rr"><span class="id">API-503</span><span class="t">Flaky CSV import on files with a UTF-8 BOM<small>Our patch fails 2 of 14 tests · engineer patch passes</small></span><span class="pill bad">worse</span></div>
    <div class="rr"><span class="id">API-497</span><span class="t">Pagination off by one on CSV exports<small>Both pass · judge calls it equivalent</small></span><span class="pill par">par</span></div>
    <div class="rr"><span class="id">API-482</span><span class="t">Race in session refresh on token expiry<small>Both pass · judge prefers ours: narrower lock, adds regression test</small></span><span class="pill good">better</span></div>
    <div class="foot">Illustrative. A real report covers every replayable ticket in the window, with diffs, test runs and the judge's reasoning for each.</div>
  </div>`;

  function workspaceHTML() {
    return `
      <div class="fm-ws">
        <div class="ws-rail">
          <p class="fm-eb">acme/api · main</p>
          <div class="ws-track">
            ${commits.map((c, i) => `<i class="ws-c${i > 5 ? ' fut' : ''}${i === 6 ? ' fix' : ''}" style="left:${i * 11}%"></i>`).join('')}
            <span class="ws-lab parent" style="left:${5 * 11}%">a41c9e2<small>parent of the fix</small></span>
            <span class="ws-lab fix" style="left:${6 * 11}%">9f3c1e0<small>the real fix, never shown</small></span>
            <span class="ws-lab head" style="left:${9 * 11}%">HEAD<small>today</small></span>
            <span class="ws-mark" style="left:${9 * 11}%"></span>
          </div>
        </div>
        <div class="ws-grid">
          <div class="ws-ticket">
            <p class="fm-eb">API-482 · bug</p>
            <h4>Race in session refresh on token expiry</h4>
            <p>Two requests that arrive together can both see an expired token and refresh it. The second refresh invalidates the first and the user gets a 401.</p>
            <ul class="ws-facts">
              <li>${shield}Network: model API only</li>
              <li>${shield}Real fix: not in this checkout</li>
              <li>${shield}Repo: acme/api at a41c9e2</li>
            </ul>
          </div>
          <div class="ws-right">
            <div class="ws-ed"><div class="ws-tabs"><span class="on">src/auth/session.ts</span><span>test/session.refresh.concurrent.test.ts</span></div>
              <pre class="ws-code">${lines(CODE)}</pre></div>
            <pre class="ws-term">${lines(TERM)}<span class="cur"></span></pre>
          </div>
        </div>
      </div>`;
  }

  // ---------- Film ----------
  const at = (el, root) => { let x = 0, y = 0; while (el && el !== root) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x, y }; };
  const box = (el, root, mx = 1.08, my = mx) => { const p = at(el, root); return { x: p.x + el.offsetWidth / 2, y: p.y + el.offsetHeight / 2, w: el.offsetWidth * mx, h: el.offsetHeight * my }; };

  function build(stage, world, hud) {
    world.innerHTML = worldHTML();
    const q = s => world.querySelector(s), qa = s => [...world.querySelectorAll(s)];
    const C = { x: 0, y: 0, z: 1, rx: 0, rz: 0 };
    let vw = 1, vh = 1, safe = { t: 0, r: 0, b: 0, l: 0 };
    const measure = () => {
      vw = stage.clientWidth || 1; vh = stage.clientHeight || 1;
      stage.style.perspective = Math.round(Math.max(vw, vh * 1.5) * 1.25) + 'px';
      // Keep framed scenes clear of the HUD: tag on top, caption below, progress on the right.
      safe = hud ? (vw >= 760 ? { t: 68, r: 120, b: 128, l: 40 } : { t: 104, r: 12, b: 150, l: 12 }) : { t: 0, r: 0, b: 0, l: 0 };
    };
    // Zoom that fits a frame into the safe area, capped so 1:1 scenes never
    // blow up past their designed size. Narrow portrait screens crop sideways
    // rather than shrink the scene to nothing.
    const fit = f => {
      const w = vw - safe.l - safe.r, h = vh - safe.t - safe.b;
      let s = Math.min(w / f.w, h / f.h);
      if (vw < 760 && vh > vw) s = Math.min(h / f.h, s * 1.25);
      return Math.min(s * (f.k || 1), f.max || 9);
    };
    const render = () => {
      const cx = safe.l + (vw - safe.l - safe.r) / 2, cy = safe.t + (vh - safe.t - safe.b) / 2;
      world.style.transform = `translate3d(${cx}px,${cy}px,0) rotateX(${C.rx}deg) rotateZ(${C.rz}deg) scale3d(${C.z},${C.z},${C.z}) translate3d(${-C.x}px,${-C.y}px,0)`;
    };
    measure();

    // Frames, measured from the world's own layout.
    const board = box(q('.jira'), world, 1.05, 1.06);
    const yardC = ctrCentre(YARD[1]);
    const floor2 = box(q('.fm-ctr[data-c="1"] .ctr-floor'), world, 1.04, 1.04);
    const F = {
      find: { ...board, max: 1 },
      rank: { ...board, x: board.x + 20, w: board.w * 0.96, h: board.h * 0.96, max: 1.06 },
      pick: { x: board.x + 110, y: board.y + 60, w: 1250, h: 980, rx: 50, rz: -20 },
      fly: { x: 1750, y: 720, w: 2700, h: 1700, rx: 54, rz: -12 },
      seal: { x: yardC.x, y: yardC.y - 40, w: 2050, h: 1250, rx: 46, rz: -8 },
      solve: floor2,
      rise: { x: 2900, y: 1250, w: 2400, h: 1500, rx: 34, rz: 6 },
      test: { ...box(q('.fm-cmp'), world, 1.04, 1.06), max: 1.1 },
      judge: { ...box(q('.fm-judge'), world, 1.1, 1.1), max: 1.05 },
      reveal: { x: 3800, y: 1200, w: 4300, h: 2700, rx: 40, rz: -10 },
      report: { ...box(q('.fm-rep'), world, 1.12, 1.14), max: 1.05 },
    };
    Object.assign(C, { x: F.find.x, y: F.find.y, z: fit(F.find) });

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: render });
    const shot = (f, t, dur, ease = 'cam.settle', dip = 0, from) => {
      tl.to(C, { x: f.x, y: f.y, rx: f.rx || 0, rz: f.rz || 0, duration: dur, ease }, t);
      if (dip) {
        tl.to(C, { z: () => Math.min(fit(from), fit(f)) * dip, duration: dur * 0.45, ease: 'sine.inOut' }, t);
        tl.to(C, { z: () => fit(f), duration: dur * 0.55, ease: 'cam.settle' }, t + dur * 0.45);
      } else {
        tl.to(C, { z: () => fit(f), duration: dur, ease }, t);
      }
    };
    const hold = (f, t, dur, dx = 8, dy = 0) => tl.to(C, { x: f.x + dx, y: f.y + dy, duration: dur, ease: 'sine.inOut' }, t);
    const holds = [];
    let t = 0;

    // Jira geometry for the lift-out.
    const rowsEl = q('.j-rows'), rowsAt = at(rowsEl, world), rowW = rowsEl.offsetWidth;
    const rowCentre = rank => ({ x: rowsAt.x + rowW / 2, y: rowsAt.y + rank * ROW_H + ROW_H / 2 });
    const jr = qa('.jr');
    jr.forEach((el, i) => gsap.set(el, { y: i * ROW_H }));
    const cards = qa('.fm-tk');
    cards.forEach((el, n) => gsap.set(el, { xPercent: -50, yPercent: -50, ...rowCentre(n), width: rowW, height: ROW_H, z: 0, autoAlpha: 0 }));
    gsap.set(qa('.tk-card'), { autoAlpha: 0 });

    // 1 · find
    holds.push(0.4);
    hold(F.find, t, 0.8, 6); t += 0.8;

    // 2 · rank
    shot(F.rank, t, 1.3, 'power2.inOut');
    tl.fromTo(q('.j-q2'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.45, ease: 'steps(14)' }, t);
    tl.fromTo(q('.j-sudo'), { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.25 }, t + 0.3);
    tl.fromTo(q('.j-count .c1'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.15 }, t + 0.45);
    tl.fromTo(q('.j-count .c2'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15 }, t + 0.55);
    tl.fromTo(q('.jf-h'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, t + 0.35);
    tl.fromTo(qa('.j-rows .jf'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, stagger: 0.015 }, t + 0.4);
    tl.fromTo(qa('.j-rows .jf b'), { scaleX: 0 }, { scaleX: 1, duration: 0.3, stagger: 0.015, ease: 'power2.out' }, t + 0.42);
    jr.forEach((el, i) => tl.to(el, { y: rankOf(i) * ROW_H, duration: 0.6, ease: 'power3.inOut' }, t + 0.7 + Math.abs(rankOf(i) - i) * 0.008));
    jr.forEach((el, i) => {
      if (rankOf(i) >= 3) tl.to(el, { opacity: 0.32, duration: 0.25 }, t + 1.05);
      else tl.fromTo(el, { '--hl': 0 }, { '--hl': 1, duration: 0.25 }, t + 1.05);
    });
    t += 1.3;
    holds.push(t + 0.35);
    hold(F.rank, t, 0.7, 6); t += 0.7;

    // 3 · pick
    shot(F.pick, t, 1.2);
    // Rows lift off the list, then fold into cards hovering over the board.
    const fan = n => ({ x: rowsAt.x + rowW / 2 + [0, -330, 330][n], y: rowsAt.y + 300 + [0, 24, 24][n] });
    cards.forEach((el, n) => {
      const row = jr[PICKS[n]], d0 = t + 0.3 + n * 0.08;
      tl.set(el, { autoAlpha: 1 }, t + 0.3);
      tl.to(row, { '--slot': 1, duration: 0.2 }, t + 0.3);
      tl.to(el, { z: 60, duration: 0.35, ease: 'power2.out' }, d0);
      tl.to(el, { ...fan(n), width: 300, height: 112, duration: 0.6, ease: 'power3.inOut' }, d0 + 0.3);
      tl.to(el, { z: 190, duration: 0.6, ease: 'back.out(1.4)' }, d0 + 0.3);
      tl.to(el.querySelector('.tk-row'), { autoAlpha: 0, duration: 0.2 }, d0 + 0.35);
      tl.to(el.querySelector('.tk-card'), { autoAlpha: 1, duration: 0.2 }, d0 + 0.45);
    });
    t += 1.2;
    holds.push(t + 0.3);
    hold(F.pick, t, 0.6, 10); t += 0.6;

    // flight → 4 · seal
    shot(F.fly, t, 1.0, 'power2.inOut', 0, F.pick);
    shot(F.seal, t + 1.0, 1.1, 'cam.settle');
    const trails = q('.fm-trails');
    const PATHS = [
      [[2150, 290], [2620, 420]],
      [[1420, 820], [1880, 980]],
      [[1640, 1060], [2560, 1180], [3260, 1010]],
    ];
    cards.forEach((el, n) => {
      const s = fan(n), cIdx = YARD.findIndex(c => c.pick === n), dst = ctrCentre(YARD[cIdx]);
      const pts = [s, ...PATHS[n].map(([x, y]) => ({ x, y })), dst];
      const d = MotionPathPlugin.rawPathToString(MotionPathPlugin.arrayToRawPath(pts, { curviness: 1.3 }));
      const trail = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      trail.setAttribute('d', d); trail.setAttribute('pathLength', '1'); trail.setAttribute('class', 'fm-trail');
      trails.appendChild(trail);
      const d0 = t + n * 0.14, dur = 1.55;
      tl.to(el, { motionPath: { path: d }, duration: dur, ease: 'fly' }, d0);
      tl.to(el, { z: 340 + n * 40, rotationX: -14, rotationY: n === 2 ? 10 : -8, duration: dur * 0.48, ease: 'power2.out' }, d0);
      tl.to(el, { z: 3, rotationX: 0, rotationY: 0, duration: dur * 0.52, ease: 'power3.inOut' }, d0 + dur * 0.48);
      tl.fromTo(trail, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: dur, ease: 'fly' }, d0);
      const ctr = q(`.fm-ctr[data-c="${cIdx}"]`);
      tl.fromTo(ctr.querySelector('.fm-shield'), { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'back.out(2.2)' }, d0 + dur - 0.05);
      tl.to(ctr, { '--lit': 1, duration: 0.3 }, d0 + dur - 0.1);
    });
    t += 2.1;
    holds.push(t + 0.35);
    hold(F.seal, t, 0.7, 14); t += 0.7;

    // 5 · solve
    shot(F.solve, t, 1.3, 'cam.dive');
    const ws = q('.fm-ws'), lead = cards[0];
    tl.fromTo(ws, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, t + 0.75);
    const seal2 = q('.fm-ctr[data-c="1"] .ctr-seal');
    tl.to([seal2, q('.fm-ctr[data-c="1"] .ctr-tag')], { autoAlpha: 0, duration: 0.2 }, t + 0.55);
    tl.to(lead, { autoAlpha: 0, duration: 0.25 }, t + 0.6);
    tl.fromTo(q('.ws-mark'), { x: 0 }, { x: () => -(4 * 0.11) * q('.ws-track').offsetWidth, duration: 0.55, ease: 'power2.inOut' }, t + 1.0);
    tl.to(qa('.ws-c.fut, .ws-lab.fix, .ws-lab.head'), { opacity: 0.22, duration: 0.3 }, t + 1.25);
    t += 1.3;
    holds.push(t + 1.15);
    tl.fromTo(qa('.ws-code span'), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.07, stagger: 0.06, ease: 'steps(18)' }, t);
    tl.fromTo(qa('.ws-term span'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04, stagger: 0.1 }, t + 0.1);
    hold(F.solve, t, 1.4, 3, 2); t += 1.4;

    // rise → 6 · test
    shot(F.rise, t, 0.8, 'power2.inOut', 0);
    tl.to(seal2, { autoAlpha: 1, duration: 0.2 }, t + 0.2);
    shot(F.test, t + 0.8, 0.9, 'cam.settle');
    const pipes = qa('.fm-pipe');
    tl.fromTo(pipes[0], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut' }, t + 0.3);
    t += 1.7;
    holds.push(t + 0.95);
    const counter = { n: 0 }, countEl = q('[data-count]');
    tl.fromTo(q('.cmp-bar b'), { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power1.inOut' }, t);
    tl.fromTo(counter, { n: 0 }, { n: 15, duration: 0.8, ease: 'power1.inOut', onUpdate: () => { countEl.textContent = Math.round(counter.n); } }, t);
    ['a', 'b'].forEach((s, si) => {
      const cells = qa(`.cmp-col[data-side="${s}"] [data-t]`);
      cells.forEach((c, i) => tl.to(c, { '--pass': 1, duration: 0.08 }, t + 0.1 + i * 0.1 + si * 0.04));
      tl.to(q(`.cmp-col[data-side="${s}"] [data-sum]`), { '--pass': 1, duration: 0.1 }, t + 0.85);
    });
    hold(F.test, t, 1.1, 8); t += 1.1;

    // 7 · judge
    shot(F.judge, t, 0.9, 'cam.settle');
    tl.fromTo(pipes[1], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4 }, t);
    tl.fromTo(qa('.jd-crit li'), { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.2, stagger: 0.12 }, t + 0.45);
    t += 0.9;
    holds.push(t + 0.75);
    tl.fromTo(q('.jd-beam'), { rotation: 0, svgOrigin: '60 22' }, { rotation: -9, svgOrigin: '60 22', duration: 0.35, ease: 'back.out(2)' }, t + 0.05);
    tl.fromTo(q('.jd-big'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.2 }, t + 0.1);
    tl.fromTo(q('.jd-reveal'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.2 }, t + 0.45);
    hold(F.judge, t, 1.0, 6); t += 1.0;

    // reveal → 8 · report
    shot(F.reveal, t, 0.9, 'power2.inOut');
    shot(F.report, t + 0.9, 1.0, 'cam.settle');
    pipes.slice(2).forEach((p, i) => tl.fromTo(p, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut' }, t + 0.35 + i * 0.12));
    tl.fromTo(qa('.fm-rep .rr'), { autoAlpha: 0.15 }, { autoAlpha: 1, duration: 0.2, stagger: 0.15 }, t + 1.2);
    tl.fromTo(q('.fm-rep .pills'), { autoAlpha: 0.15 }, { autoAlpha: 1, duration: 0.25 }, t + 1.65);
    t += 1.9;
    holds.push(t + 0.6);
    hold(F.report, t, 1.1, 6); t += 1.1;

    render();
    return { tl, render, measure, holds, total: t };
  }

  const stageHTML = () => '<div class="fm-world"></div><div class="fm-vignette"></div>';

  if (reduce) {
    // Stills: the same world, frozen at the middle of each hold.
    film.classList.add('is-stills');
    const lede = document.querySelector('#replay .fm-lede');
    if (lede) lede.textContent = lede.textContent.replace('Scroll to replay it.', 'Here it is in eight stills.');
    const grid = document.createElement('div');
    grid.className = 'fm-stills';
    film.appendChild(grid);
    const shots = steps.map((s, i) => {
      const fig = document.createElement('figure');
      fig.className = 'fm-still';
      fig.innerHTML = `<div class="fm-stage" aria-hidden="true">${stageHTML()}</div><figcaption><span class="n">0${i + 1} · ${s.k}</span>${s.text}</figcaption>`;
      grid.appendChild(fig);
      const stage = fig.querySelector('.fm-stage');
      return { stage, f: build(stage, stage.querySelector('.fm-world'), false), i };
    });
    const draw = () => shots.forEach(({ f, i }) => { f.measure(); f.tl.invalidate(); f.tl.seek(f.holds[i], false); f.render(); });
    draw();
    new ResizeObserver(() => draw()).observe(grid);
    if (document.fonts) document.fonts.ready.then(draw);
    return;
  }

  // Live: pin the stage and scrub the timeline.
  film.classList.add('is-live');
  const stage = document.createElement('div');
  stage.className = 'fm-stage';
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = stageHTML() + `
    <div class="fm-hud">
      <p class="fm-tag"><span>replay · acme/api · last 90 days</span><span class="fm-ill">illustrative</span></p>
      <ol class="fm-dots">${steps.map(s => `<li><span>${s.k}</span></li>`).join('')}</ol>
      <div class="fm-caps">${steps.map((s, i) => `<p class="fm-cap"><span class="n">0${i + 1} · ${s.k}</span>${s.text}</p>`).join('')}</div>
    </div>`;
  film.appendChild(stage);
  const f = build(stage, stage.querySelector('.fm-world'), true);

  // Captions and progress follow the holds: each caption owns the span between
  // the midpoints of its neighbouring holds.
  const caps = [...stage.querySelectorAll('.fm-cap')], dots = [...stage.querySelectorAll('.fm-dots li')];
  f.holds.forEach((h, i) => {
    const a = i === 0 ? -1 : (f.holds[i - 1] + h) / 2, b = i === f.holds.length - 1 ? f.total + 1 : (h + f.holds[i + 1]) / 2;
    if (i > 0) f.tl.fromTo(caps[i], { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.18 }, a);
    if (i < f.holds.length - 1) f.tl.to(caps[i], { autoAlpha: 0, y: -10, duration: 0.14 }, b - 0.16);
    f.tl.fromTo(dots[i], { '--on': 0 }, { '--on': 1, duration: 0.1 }, Math.max(0, a));
  });
  gsap.set(caps.slice(1), { autoAlpha: 0 });

  const lenis = window.Lenis ? new Lenis({ lerp: 0.09, anchors: true }) : null;
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  ScrollTrigger.create({
    trigger: film,
    start: 'top top',
    end: () => '+=' + Math.round(f.total * window.innerHeight * 0.8),
    pin: true,
    scrub: 1,
    animation: f.tl,
    invalidateOnRefresh: true,
    onRefreshInit: () => f.measure(),
    onRefresh: () => f.render(),
  });
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  film.dataset.holds = f.holds.map(h => (h / f.total).toFixed(4)).join(' '); // hold positions as timeline progress
})();
