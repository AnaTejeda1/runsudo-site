/* /harness/scenes/01-clone.js — STUB. Replace with the real scene; see /harness/STORYBOARD.md.
 * Contract: build DOM only inside `root` via api.plane()/api.group(); animate only from p in update().
 * Scope CSS to [data-scene="01-clone"] in scenes/01-clone.css. */
(() => {
  const H = window.Harness;
  if (!H) return;
  let card, back, bar, holdBar, label;
  H.registerScene({
    id: '01-clone',
    mount(root, api) {
      const w = api.mobile ? 340 : 560;
      back = api.plane({ cls: 'h-card stub-back', w: w * 0.8, h: 200, z: -260, x: 80, y: -60 });
      card = api.plane({
        cls: 'h-card stub-card',
        w,
        html:
          '<div class="h-card-head"><span class="path">scenes/01-clone.js</span><span>placeholder</span></div>' +
          '<div class="h-card-body"><p class="stub-h"></p><div class="stub-bar"><i class="p"></i></div><div class="stub-bar is-hold"><i class="h"></i></div><p class="stub-l mono small muted"></p></div>',
      });
      const cap = api.fallback && api.fallback.querySelector('.cap-h');
      card.querySelector('.stub-h').textContent = cap ? cap.textContent : '01-clone';
      bar = card.querySelector('.p');
      holdBar = card.querySelector('.h');
      label = card.querySelector('.stub-l');
      api.halo(card, 'accent');
    },
    update(p, api) {
      const e = api.ease;
      api.place(card, { ry: api.lerp(-16, 12, e.inOutSine(p)), y: api.lerp(40, -40, e.inOutCubic(p)) });
      api.place(back, { ry: api.lerp(10, -10, p) });
      api.transform(bar, 'scaleX(' + p.toFixed(4) + ')');
      api.transform(holdBar, 'scaleX(' + api.hold(p).toFixed(4) + ')');
      api.opacity(card.querySelector('.h-halo'), api.pause ? api.bump(p, api.pause.start - 0.1, api.pause.start, api.pause.end, api.pause.end + 0.1) : 0);
      api.text(label, 'p ' + p.toFixed(3) + (api.pause ? '  ·  hold ' + api.hold(p).toFixed(2) : ''));
    },
  });
})();
