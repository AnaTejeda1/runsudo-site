# Backtest data

Everything under `/backtests/` on runsudo.dev is generated from the files in this folder by
`scripts/build-backtests.mjs`. There is no backend and nothing to edit by hand in the
generated pages.

## Files

- `index.json`: the list of repos, their runs (with counts and notes), and the chart events.
- `<repo>/<run-date>/tickets.json`: one entry per ticket for that run, straight from the
  harness export.

## Adding a run

1. Drop the new `tickets.json` into `data/backtests/<repo>/<run-date>/`.
2. Add the run's entry to `index.json` under that repo's `runs`, with its `notes`
   (free text, e.g. "Updated to Opus 5.5") and an optional `footnote`. Newest first is
   conventional, but the build sorts by date anyway.
3. If it is a major date, add an event to `events` in `index.json`. It shows as a dashed line
   with its label on the chart. `kind` (`product` or `measurement`) is kept in the data but not shown.
4. Run `node scripts/build-backtests.mjs` from the repo root.
5. Commit the data and the generated `backtests/` folder, then push. GitHub Pages redeploys.

## Counting rules

- `tickets` is the size of the sample. `better + par + worse + error` must equal it.
- A ticket that produced no patch is counted as `error`. In `tickets.json` it can carry
  `verdict: "no_patch"` (or `"no-patch"`); the build displays it as an error.
- When a run's `tickets.json` exists, the build recounts verdicts from it and warns if the
  counts in `index.json` disagree. The page shows the recounted numbers.
- A repo with `"status": "pending"` or no runs shows "Rerun scheduled" and no numbers.

## Sample data

The two pydantic runs currently checked in (`2026-09-30` and `2026-09-29`) are
**placeholder files** that match the schema exactly. Ticket titles, diffs, judge text and
issue bodies are invented. Replace them with the harness export before showing the section
to anyone outside the team. Nothing on the page labels them as samples.
