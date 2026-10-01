# runsudo.dev

The company site for sudo. Static files served by GitHub Pages at the custom domain in
`CNAME`. No build step on GitHub's side: everything committed is what gets served.

- `index.html` is the homepage. `styles.css` holds the shared theme used by every page.
- The waitlist form posts to Formspree: form ID lives in the form action in `index.html`.
- `backtests/` is generated. Don't edit it by hand. It is built from `data/backtests/` by
  `node scripts/build-backtests.mjs` (or `npm run build`), which needs Node and no packages.
  See `data/backtests/README.md` for how to add a run.
- To preview locally with the same URLs as production, run `node scripts/serve.mjs` and open
  `http://localhost:8080/backtests/`. Opening the HTML files straight from disk won't load the
  stylesheet, because pages use root-relative paths.
