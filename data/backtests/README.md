# Backtest data

Everything under `/backtests/` on runsudo.dev is generated from the files in this folder by
`scripts/build-backtests.mjs`. There is no backend and nothing to edit by hand in the
generated pages.

## Files

- `index.json`: the list of repos, their runs (with counts and notes), and the chart events.
- `<repo>/<run-id>/tickets.json`: one entry per ticket for that run, straight from the
  harness export. The folder is named after the run's `id` in `index.json`
  (e.g. `pydantic/run-20260930-144322/`), never after the date.

## Adding a run

1. Drop the new `tickets.json` into `data/backtests/<repo>/<run-id>/`.
2. Add the run's entry to `index.json` under that repo's `runs`, with its `id` (the harness
   run id, e.g. `run-20260930-144322`), its `date` (`YYYY-MM-DD`, the day it ran), its
   `notes` (free text, e.g. "Updated to Opus 5.5") and an optional `footnote`. Newest first
   is conventional, but the build sorts by date, then by id, anyway.
3. If it is a major date, add an event to `events` in `index.json`. It shows as a dashed line
   with its label on the chart. `kind` (`product` or `measurement`) is kept in the data but not shown.
4. Run `node scripts/build-backtests.mjs` from the repo root.
5. Commit the data and the generated `backtests/` folder, then push. GitHub Pages redeploys.

## Addressing rules

- Runs are addressed by `id`, not by date. URLs are `/backtests/<repo>/<run-id>/` and
  `/backtests/<repo>/<run-id>/<ticket>/`, so a repo can have any number of runs on one day.
- `id` must be unique within a repo and contain only letters, digits, `.`, `_` and `-`.
  The build fails if an `id` is missing or repeated.
- `date` is display only. It sets where the run sits on the chart's x-axis and the date shown
  on its pages. When the id looks like `run-YYYYMMDD-HHMMSS`, the time part spreads same-day
  runs along the axis; the date part of the id is never used, so `date` can differ from it
  (for example when the id is in UTC and the run started the evening before locally).
- A run whose `tickets.json` is still in a date-named folder gets a build warning saying
  where to move it.

## Counting rules

- `tickets` is the size of the sample. `better + par + worse + error` must equal it.
- A ticket that produced no patch is counted as `error`. In `tickets.json` it can carry
  `verdict: "no_patch"` (or `"no-patch"`); the build displays it as an error.
- When a run's `tickets.json` exists, the build recounts verdicts from it and warns if the
  counts in `index.json` disagree. The page shows the recounted numbers.
- A repo with `"status": "pending"` or no runs shows "Rerun scheduled" and no numbers.
