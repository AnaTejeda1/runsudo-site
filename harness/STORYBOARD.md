# /harness/ storyboard

One sudo backtest, top to bottom, as a scroll-driven 2.5D motion graphic. The viewer rides a camera
through a dark, lit space; each harness stage is a little set of real artifacts floating at its own
spot in that space. Sources of truth: `.briefs/design.md` (look and voice) and `.briefs/lifecycle.md`
(names, artifacts, numbers). Never invent function names, parameters, numbers, GitHub labels or costs.
Show functions as `name(…)` (we don't publish signatures). No `$` anywhere.

## Global art direction

- **Base**: near-black stage (`#0a0a0a` with a soft `#121212` lift at 50%/42%), the site's flat cards
  brought into 3D and lit. Cards use `.h-card` (#131313 to #0d0d0d gradient, 1px `--line` border,
  r12, one deep drop shadow, a hairline top rim light).
- **Light**: one focus light per scene, a screen-blended radial blob plus a thin anamorphic
  streak, projected onto the scene's light anchor. Intensity follows the caption envelope: about
  0.3 on arrival, 1.0 during a hold, 0.42 for light scenes. Colours come from the tokens only:
  `accent` #f5e900 (the harness itself: steps, seeds, the box), `good` (clean, passed, better),
  `bad` (worse, refused, contaminated), `add` (time, git history, blue diffs), `warn` (no scorable
  attempt), `white` (neutral).
- **Bloom recipe** (cheap, opacity-only): (1) `api.halo(card, colour)` adds a span with a 4-layer
  box-shadow (1px ring, 16px, 54px, 130px). Animate only its opacity. (2) `.lum`/`.lum-good`/
  `.lum-bad`/`.lum-add` give luminous text through a layered text-shadow. (3) `.is-lit*` are static
  lit borders. (4) The engine's focus light adds the haze. Keep at most 1–2 elements fully lit at a
  time. Yellow is a highlight, never a fill for big areas.
- **Depth fog**: the engine sets opacity on every plane from its camera distance. Planes fade in
  from 4.0·P (far) to 1.3·P and fade out again when closer than 0.45·P (P = perspective, about
  965px at 900px viewport height). Scenes outside the current one are dimmed to 26%. Dust motes (140,
  about 16% accent) and a giant hairline step numeral behind each step scene give parallax.
- **Grain + vignette + top/bottom fog bands**: static overlays. The grain jitters at 5 steps/0.9s
  on the compositor.
- **Motion**: nothing linear. The camera path is a monotone cubic through keyframes (no overshoot),
  with zero velocity at holds, smoothed again by a critically damped scroll spring (0.3s desktop,
  0.2s mobile). In scenes use `api.ease.*` (`outCubic`, `inOutCubic`, `outQuint`, `spring`,
  `softSpring`, `outBack`…). Make entrances overlap with `api.stagger`.
- **Type**: Inter for headlines and numbers, mono for metadata (paths, IDs, JSON, eyebrows).
  Sentence-case headlines. Uppercase plus .04em letter-spacing only on eyebrows and labels.

## Pause frames

Pause scenes declare `pause: {at, dwell, drift}`. `at` is the fraction of the scene's travel where the
camera stops, `dwell` is the hold length in screens of scroll, and `drift` is a small camera delta
across the hold so it breathes rather than freezing. The camera eases to zero velocity into the hold
and eases out of it. The caption fades in from blur (eyebrow, then headline, then body) just before
the hold, sits fully readable through it, and fades out after it. The side scrim darkens behind it.
During the hold, local `p` keeps advancing (`api.hold(p)` runs 0→1), so the scene should play its key
beat inside the hold: counting, the reveal, the box sealing.

Light scenes get a smaller caption at the bottom left, visible over p 0.14–0.86.

## Composition budget

- Desktop (k = min(W/1440, H/900), clamped 0.7–1.2): at the hold pose the scene anchor is
  drawn at 62% of the width (`sx: .12`). Keep the main content within local x ∈ [-420, 420] and
  y ∈ [-280, 280]. The caption owns the left ~32% of the screen and the rail the right 120px.
- Light scenes use `sx: .06`. Their caption sits at the bottom left, so keep content above y ≈ 200.
- Mobile (≤760px, `api.mobile`): k = W/420, rotations ×0.55, positive dolly ×0.6, no `sx`, and the
  image is shifted up 10% of the height. The caption is a bottom sheet over the lower ~40%. Build a
  narrower layout in `mount` when `api.mobile`: content within x ∈ [-190, 190], y ∈ [-260, 160].
  Fewer planes, and no per-frame blur.
- Text renders crisp. Never put `will-change` on anything in the world: it freezes raster scale and
  blurs text on push-ins. Animate only transform, opacity and (sparingly) filter.

## Scene table

World units are CSS px (+x right, +y down, +z toward the viewer). `pos`/`rot` place the scene
anchor. Camera keys are scene-local: `x,y,z` is the look-at offset from the anchor (rotated with the
scene), `rx,ry,rz` are degrees added to the scene rotation (0 means facing it squarely), `dolly` is
px toward the target (negative pulls back), `fov` defaults to 50, and `sx/sy` shift the image by a
fraction of the viewport. Sign check: `rx<0` looks down onto the scene (its top edge recedes),
`ry>0` orbits to the scene's right (its right edge comes nearer), `rz>0` rolls the image
counter-clockwise. `u` runs 0..1 along travel with the dwell excluded. The key marked hold sits at
`u = pause.at`. Transit between scenes is the spline from one scene's last key to the next scene's
first key.

Timeline (t, 0..1) at the stock settings. Total about 34.9 screens of scroll:

| id | t range | screens (travel + dwell) | pause hold (local p / global t) | light |
|---|---|---|---|---|
| 00-intro | 0.0000–0.0401 | 1.4 | — | accent |
| 01-clone | 0.0401–0.0946 | 1.9 | — | white |
| 02-recipe | 0.0946–0.1519 | 2.0 | — | add |
| 03-funnel | 0.1519–0.2665 | 2.4 + 1.6 | p 0.300–0.700 / t 0.1862–0.2321 | accent |
| 04-rewind | 0.2665–0.3754 | 2.4 + 1.4 | p 0.392–0.760 / t 0.3091–0.3492 | add |
| 05-baseline | 0.3754–0.4269 | 1.8 | — | white |
| 06-sandbox | 0.4269–0.5473 | 2.6 + 1.6 | p 0.340–0.721 / t 0.4679–0.5138 | accent |
| 07-audit | 0.5473–0.5989 | 1.8 | — | good |
| 08-verify | 0.5989–0.7077 | 2.4 + 1.4 | p 0.316–0.684 / t 0.6332–0.6734 | good |
| 09-judge | 0.7077–0.8395 | 2.8 + 1.8 | p 0.365–0.757 / t 0.7559–0.8074 | accent, then good at reveal |
| 10-publish | 0.8395–0.9599 | 2.6 + 1.6 | p 0.340–0.721 / t 0.8805–0.9264 | good |
| 11-outro | 0.9599–1.0000 | 1.4 | — | accent |

These numbers move if a scene overrides `travel` or `pause`. `Harness.timeline()` is always current.

---

### 00-intro: "one run" (light caption)
- pos (0, 0, 0), rot (0, 0, 0). Camera: u0 dolly -760 rx 12 ry -8 y -40 → u.45 dolly -170 rx 4 ry -2
  → u.92 dolly 140 rx -6 ry 10 x 160 y 90 rz 2 (a slow push-in from far, then it banks right and
  dives toward 01).
- Content: a constellation of the 30 sampled Hugo tickets as small mono ticket chips (`#15169` is
  one of them and the only one lit), spread across 3 depth layers so the push-in reads as parallax. A
  repo header card `gohugoio/hugo` sits at the centre. Toward u .8 the other 29 dim and #15169 holds
  its glow. That's the ticket we follow. Don't invent the other 29 numbers: show them as blank or
  `#·····` chips.
- Caption: eyebrow `gohugoio/hugo · one run`. Headline "Thirty closed Hugo issues, replayed
  blind." Body "This is the path every ticket takes through our backtest harness, from a bare clone
  to a public verdict. The function names, files and numbers are real."

### 01-clone: STEP 01 · CLONE (light)
- pos (1150, 950, -1400), rot (0, -24, 0). Camera: u.16 dolly -520 ry -20 rz -5 x -220 → u.5 dolly -50
  ry -6 rz -1 sx .06 → u.88 dolly 90 ry 8 rx -8 y 140 rz 3. It arrives banked from the left and
  levels out.
- Content: a terminal card that types `bt run gohugoio/hugo --count 30 --lane foreman`, then
  `run.ensure_cache()` → `data/gohugoio-hugo/cache.git`. Behind it is a stack of thin commit slabs
  (full history) receding in z. A small `run-status.json` card shows
  `{"stage":"clone","started_at":"08:17:56Z","ended_at":"08:17:58Z"}`.
- Caption: `Step 01 · Clone`. "A bare copy, full history." "We take a bare copy of the repo with its
  whole history. Every checkout after this one is cloned from it."

### 02-recipe: STEP 02 · LEARN TO BUILD (light)
- pos (-250, 1950, -2650), rot (0, 22, 0). Camera: u.15 dolly -580 ry 18 rx 8 rz 5 → u.52 dolly -40 ry 4
  sx .06 → u.88 dolly 70 rx -18 y 220 ry -4. It sweeps in from the right, then pitches down to start the
  dive into 03.
- Content: an `fn-card` for bt/setup_agent.py (`setup_repo(…)`, `verify_recipe(…)`,
  `ensure_image(…)`), a `json-card` for setup/recipe.json, a Dockerfile line
  `FROM --platform=linux/amd64 golang:1.27-bookworm`, and a counter that runs up to **3,778** tests
  (`verified.json {"attempts":2,"tests_ran":3778}`). Accent-lit while it verifies, good tint once
  it's verified.
- Caption: `Step 02 · Learn to build`. "An agent writes the recipe. Code proves it." "Once per repo,
  an agent works out how to install and test it. Then code runs the full suite, 3,778 tests, before
  a single ticket is scored."

### 03-funnel: STEP 03 · DISCOVER (PAUSE: at .5, dwell 1.6, drift dolly +50)
- pos (450, 3350, -3650), rot (0, 0, 0). Camera dives in from above: u.1 dolly -680 rx -38 y -220 →
  u.3 dolly -260 rx -14 y -60 → **hold** u.5 dolly -20 rx -3 sx .12 → u.88 dolly 110 rx 6 ry 16 x 320 rz -3.
- Content: a funnel built from stacked tiers in depth. 186 listed collapse to 62 scoreable
  (93 out of window and 31 excluded peel off to the sides as counted rejects, still visible and dimmed
  with their reason, e.g. `{"number":15360,"reason":"unresolved","detail":"no usable linked
  fix"}`). Then 30 are drawn, with `"seed": 3676299815` lit in accent. Real cards: `run.json` funnel
  JSON, `bt/discover.py` (`discover(…)`, `fresh_seed(…)`), `bt/gh.py` (`resolve_fix(…)`,
  `closing_commit(…)`, `closes_issue(…)`). Counters tick 186 → 62 → 30 during the hold.
- Caption: `Step 03 · Discover`. "186 issues listed. 62 scoreable. 30 drawn." "We keep only issues
  whose real fix we can identify, and count every one we drop with its reason. The 30 are drawn with
  a recorded seed, so anyone can replay the draw."

### 04-rewind: STEP 04 · REWIND (PAUSE: at .62, dwell 1.4, drift dolly -30 z +30)
- pos (1550, 4250, -2750), rot (0, -18, 0). Note that z is *shallower* than 03, so the transit runs
  backwards. Camera: u.12 z -1000 dolly 80 ry -10 rz 7 → u.38 z -460 ry 5 rz -3 → **hold** u.62 z 0
  dolly -60 sx .12 → u.9 dolly -220 rx -12 y 170 ry -10. The camera retreats along -z → +z, rewinding.
- Content: a commit timeline laid along local z (newest at z ≈ -1000, older toward z = 0). The fix
  commit sits deep in z and dissolves as we pass it. It doesn't exist in the checkout, so it goes
  away rather than being blurred out. We settle on base `dd3f2731…`. The ticket card for **#15169**
  "resources/jsconfig: Address VS Code linting notice in jsconfig.json" sits there with labels that
  are harness facts only (`sampled`, `fix identified`). Next to it is `ticket.md`: title and body, with
  comments struck out. Also show `{"stage":"snapshot","base_sha":"dd3f2731…","ticket":"15169"}`,
  `bt/snapshot.py` (`snapshot_ticket(…)`, `first_parent(…)`, `write_ticket_md(…)`), and the
  volume `bt-ws-<run>-<ticket>` cloned over file://. human.patch: "not written until solve
  finishes". `add` (blue) light for time.
- Caption: `Step 04 · Rewind`. "The fix doesn't exist yet." "Each ticket gets a checkout from just
  before the fix landed. Not hidden: absent. The agent reads the title and body, never the comments
  or anything that came after."

### 05-baseline: STEP 05 · BASELINE (light)
- pos (700, 5250, -4350), rot (0, 12, 0). Camera: u.15 dolly -440 ry 14 rx -8 rz -4 → u.5 dolly -40 ry 4
  sx .06 → u.88 dolly 60 ry -14 x -240 y 130 rz 3.
- Content: a test-grid wall (small cells) filling in. The counter runs to **3,803** total with
  **3,693** passed, and the 11 cells already failing at base are tinted `bad` and kept. A
  `baseline.json` card, `baseline/test-spec.json` "frozen" (a lock/diamond stamp), and
  `bt/prepare.py run_prepare(…)` with `bt/selection.py select_tests(…)` (note: "chosen by a
  script, not a model").
- Caption: `Step 05 · Baseline`. "Tests on untouched code. Command frozen." "3,803 tests run on the
  base commit, 11 of them already failing. The exact command is frozen, so the after run is
  identical."

### 06-sandbox: STEP 06 · SOLVE BLIND (PAUSE: at .55, dwell 1.6, drift ry -10 dolly -70)
- pos (-550, 6350, -5650), rot (0, 0, 0). Camera orbits the box: u.1 dolly -680 ry -42 rx -20 → u.32
  dolly -330 ry -30 rx -13 → **hold** u.55 dolly -110 ry -18 rx -10 sx .12 → u.9 dolly 60 ry 20 rx -4 y 160.
- Content: a sealed container, a real 3D box built from 6 `h-plane` faces in an `api.group`, with
  hairline edges and an accent glow from inside. `prompt.md` is frozen (stamped) before the box closes,
  the agent goes in, and the lid seals. Two outbound lines leave the box and reach lit chips
  `api.anthropic.com` and `platform.claude.com` (good). Other attempts (`github.com`, the web) hit the
  wall and turn `bad`: refused, since the guard fails closed. A `bt/egress.py ALLOWED_HOSTS` fn-card
  sits beside it. On exit, the record
  `{"stage":"foreman","state":"done","steps":1,"verdicts":["continue"],"patch_bytes":2070,"duration_s":625.0}`
  with `transcript.jsonl` and `patch` sliding out. Optionally a `sudo-solver v0.5.1` chip (pinned
  in foreman.lock.json).
- Caption: `Step 06 · Solve blind`. "Alone in a locked box." "The agent works in a sealed container
  that can reach the model API and nothing else: no GitHub, no web, no fix. Its prompt is frozen to
  disk before it starts."

### 07-audit: STEP 07 · AUDIT (light)
- pos (-1550, 7250, -6450), rot (0, 28, 0). Camera: u.15 dolly -480 ry 34 rz -6 → u.5 dolly -40 ry 6 rz -1
  sx .06 → u.86 dolly 80 ry -6 rx -10 y 170 rz 3.
- Content: a scan line sweeps a transcript card (`transcript.jsonl` rows) while 4 finding checks tick
  through (`path_findings`, `egress_findings`, `mention_findings`, `write_fix_record`). Then a
  stamp, `audit.json {"audit":{"verdict":"clean"}}`, glows good. Terminal:
  `bt audit gohugoio/hugo run-20260930-081756`. A ghost "contaminated" lane stays visible (dim, `bad`
  outline) labelled "stays in the total, never scored".
- Caption: `Step 07 · Audit`. "Stamped clean or contaminated, by code." "Code reads everything the
  agent did. A contaminated ticket stays in the total and is never scored."

### 08-verify: STEP 08 · VERIFY (PAUSE: at .5, dwell 1.4, drift dolly +35)
- pos (-650, 8250, -7850), rot (0, -10, 0). Camera: u.14 dolly -580 rx -16 ry -12 y -130 → **hold** u.5
  dolly -30 sx .12 → u.88 dolly 120 rx -10 y 190 ry 8.
- Content: before/after, side by side in depth. BEFORE: 3,803 total / 3,693 passed (base). AFTER:
  3,804 / 3,696 passed / 99 skipped / 74.3 s with our patch. A "new failures: 0" counter is the
  luminous good beat. A small diff-card of our patch (blue/pink rows, generic `+`/`-` bars, no
  invented code). The re-run loop graphic: "a new failure is re-run twice", "confirmed = automatic
  loss". `verify/verify.json`, `bt/verify.py` (`verify_ticket(…)`, `load_verify(…)`,
  `rerun_suffix(…)`), `bt/mandate.py` "contested". Accent text "before any model opinion".
- Caption: `Step 08 · Verify`. "Same tests, now with our patch." "3,803 tests before, 3,804 after,
  nothing newly broken. A new failure is re-run twice to rule out flakiness, and a confirmed one is
  an automatic loss, before any model gives an opinion."

### 09-judge: STEP 09 · BLIND JUDGE (PAUSE: at .6, dwell 1.8, drift dolly +130 fov -2). Emotional peak.
- pos (200, 9350, -9250), rot (0, 0, 0). Camera: a **tight push-in**. u.12 dolly -720 rx -6 → u.4 dolly
  -250 rx -2 → **hold** u.6 dolly 170 sx .12 fov 46 → (drift to dolly 300, fov 44) → u.9 dolly -320 rx -8 y 150.
- Content: two patch cards labelled only **A** and **B** (diff-cards, sizes 2,070 B vs 1,095 B but
  unlabelled as to author). Tells are scrubbed (issue URLs → `<link>`, versions → `<version>`).
  `bt/judge.py judge_ticket(…)`, `scrub_tells(…)`, model `claude-opus-5-5`. Within the hold: the
  judge's reasoning types out ("Patch A fixes the root cause exactly as VS Code's message suggests
  ('Did you forget a leading ./?')… Patch B instead just skips the root==dir entry… only masks the
  reported single-* symptom"), then `"verdict":"better"`, and then the reveal: `judge/order.json
  {"A":"agent","B":"human"}` (written only after the reply) flips A to "ours" with a good halo
  bloom and B to "merged fix". Switch the light to good at the reveal with
  `api.setLight({colors:{accent:1-r, good:r}})`.
- Caption: `Step 09 · Blind judge`. "Patch A or patch B. Then the reveal." "The judge sees two
  patches in random order with the tells scrubbed, and picks one without knowing which is ours. On
  #15169 it picked A. A was ours."

### 10-publish: STEP 10 · PUBLISH (PAUSE: at .55, dwell 1.6, drift dolly -60)
- pos (0, 10550, -10650), rot (0, 0, 0). Camera: u.12 dolly -220 rx -22 y -220 (looking down as it
  descends) → **hold** u.55 dolly -120 sx .12 → u.9 dolly -430 rx 6 y 120 (wide pull-out).
- Content: the published chart, styled like the site's `.chart`. Hugo runs as stacked
  better/par/worse/error bars: run-20260917-015623 **9/3/16/2** climbing to run-20261013-011256
  **28/0/2/0**. The 2 worse stay visible and listed ("failures go on page one"). Optional faint
  companions: pydantic 14 → 27, vuejs/core 13 → 24. Supporting cards: `bt/summarize.py`
  (`classify_ticket(…)`, `compute_counts(…)`), `bt export-site RUN_ID --notes "..."` →
  `node scripts/build-backtests.mjs` → GitHub Pages, and an `index.json` row
  `{"id":"run-20261013-011256","tickets":30,"better":28,"par":0,"worse":2,"error":0}`.
- Caption: `Step 10 · Publish`. "Hugo went from 9 better of 30 to 28." "Code does the counting; a
  model only writes the prose. The 2 worse verdicts are published too, each linked to both patches
  and the judge's exact words."

### 11-outro: "Your repo · next" (end caption: stays on and has clickable CTAs)
- pos (0, 11550, -11850), rot (0, 0, 0). Camera: u.2 dolly -620 rx -6 → u.62 dolly -90 → u.98 dolly -70.
- Content: quiet. A single lit diamond (the logo motif), with the 10 step names as a faint ring or line
  receding behind it. Leave the left 40% clear for the caption and its buttons.
- Caption: `Your repo · next`. "Run a backtest on your repo." "Same harness, your last 90 days of
  closed tickets, failures on page one. You pay per merged PR, after the backtest." Buttons: Request a
  backtest (/#backtest), See our backtests (/backtests/).

## Builder rules

- Touch only `scenes/NN-id.js` and `scenes/NN-id.css`. Scope CSS to `[data-scene="NN-id"]`.
  If the static fallback in index.html really needs a change, edit only inside your own
  `<section data-scene>` block, between its `<!-- === NN-id -->` comment markers.
- Guard with `const H = window.Harness; if (!H) return;` and call `H.registerScene({...})` once.
- `update(p, api)` must be a pure function of p (no timers, no CSS transitions on scroll-driven
  props, no reading layout). Write through `api.place/opacity/transform/text/count` (they skip
  unchanged writes).
- Verify with `node /Users/romij/.harness-scroll-tools/shot.mjs http://localhost:PORT /tmp/out ID@0.2 ID#0.5 ID@0.9`
  plus `--mobile`, and check there are no console errors.

## Integration notes

- **Scroll warp.** Scroll no longer maps linearly to t. Each `LAYOUT` entry has `enter` / `exit` (local p). The stretch from one scene's `exit` to the next scene's `enter` gets 0.38x scroll per unit of t, so the camera moves quickly between stages and slowly where there is something to read. Use `Harness.scrollFrac(t)` / `Harness.timeAt(sf)` to convert. The rail positions are in scroll space.
- **Flight path.** The engine lays small accent "runway lights" along the camera's look-at track inside each transition. They are only visible between stages.
- **Entry framing.** Entry dollies were pulled in (about -400 to -540) so each stage arrives larger.
- **Streak.** The anamorphic light streak dims by 85% while a caption is up.
- **`api.dim`.** This is the engine's scene dim factor (0.26..1), for planes made with `fog:false`.
- **`camera`.** It may be a function `({mobile}) => keys`.
- **09-judge.** The hold drift is `{dolly: 50, fov: -1}` (set in the scene), not +130 / -2.
