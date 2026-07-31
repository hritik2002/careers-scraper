# AGENTS.md — careers-scraper

Context for AI agents working in this repo. Read this first instead of exploring from scratch. If your change touches architecture, data flow, file layout, or gotchas described below, **update this file in the same commit** — stale agent context costs more tokens than it saves.

## What this is

Node ESM CLI (`npm start`) that: scrapes ~280 ATS career pages listed in `careers.json` → optionally discovers more via Google `site:` dorks → scores each job against `resume.md` with OpenAI → emails matches above `minFitScore`. Runs daily via `.github/workflows/daily.yml` (GitHub Actions, fresh checkout each run — no persistent disk).

## Pipeline (`src/index.js`, single entry point)

1. `scrapeCareerPages` (`src/scraper/index.js`) — dispatches each `careers.json` URL to a per-ATS scraper by `detectPlatform()` (`src/scraper/detect.js`). One file per ATS in `src/scraper/*.js` (greenhouse, lever, ashby, kula, workable, rippling, workday, smartrecruiters, zwayam, darwinbox, talentrecruit, gem, generic fallback). Each caps output at `config.maxJobsPerPage` (default 50) and applies `filterEngineeringJobs` if `engineeringOnly`.
2. Optional ATS discovery (`lib/discover-jobs.js` + `lib/dork-queries.js` + `lib/search-providers.js`) — only runs if `SERPER_API_KEY` is set.
3. Dedup by URL (`uniqueBy`, `src/utils.js`) → `filterByPreferences` (`src/filters/preferences.js`, roles/YOE/location).
4. **Cross-run send history** (`lib/sent-jobs.js`, backed by tracked `sent-jobs.json` at repo root): jobs whose URL is already in this file are filtered out *before* scoring, so OpenAI isn't re-billed for jobs already emailed. Only updated *after* a successful `sendMatchEmail` call — `--no-email`/dry runs never write to it.
5. `matchJobs` (`src/matcher.js`) — OpenAI scores each remaining job 0–5 against `resume.md`; keeps only `score > minFitScore`.
6. `sendMatchEmail` (`src/emailer.js`) — HTML/text email grouped by company.

## Why `sent-jobs.json` exists (read before touching the pipeline)

Originally there was **no** cross-run dedup: every day the same career pages scored the same standing jobs above threshold and re-emailed them, so daily emails looked near-identical. Fix: `lib/sent-jobs.js` persists emailed job URLs, checked in step 4 above. Because CI (`daily.yml`) checks out a fresh repo each run, this file **must be a git-tracked root file** (not under `data/`, which is entirely gitignored) and the workflow has a "Persist sent-jobs history" step that commits it back after a run with `permissions: contents: write`. If you change this mechanism, keep that commit-back step in sync or the fix silently stops working in CI.

## Key files

- `careers.json` — source of truth for career page URLs (tracked, `{url, status, jobs, platform}`), maintained by `scripts/validate-careers.js` / `scripts/probe-companies.js` / discovery scripts with `--add-boards`.
- `config.json` (gitignored, personal) / `config.example.json` (CI uses this via `CONFIG_PATH`) — `minFitScore`, `maxJobsPerPage`, `engineeringOnly`, `preferences`.
- `resume.md` (gitignored, personal) — fed to the matcher; CI generates it from the `RESUME_MD` secret via `scripts/ci-setup.js`.
- `sent-jobs.json` (tracked) — flat JSON array of already-emailed job URLs. Never hand-edit; delete it to reset history (will re-email everything currently matching).
- `data/` — entirely gitignored scratch/seed input for discovery scripts (seed lists, verify logs). Nothing here is read by the main pipeline.
- `lib/*.js` — shared logic used by both the main pipeline and one-off `scripts/*.js` (discovery, verification, board probing).

## Conventions

- Every ATS scraper module exports one `scrape<Platform>(company, sourceUrl, { maxJobs, engineeringOnly })` returning `{title, company, location, department, team, url, description, sourceUrl}[]`.
- `detectPlatform()` is the single place that maps a URL to a platform — add new ATS support there plus a new `src/scraper/<platform>.js`, not by special-casing in `src/scraper/index.js`.
- No test framework in this repo (removed deliberately — see git history); validation happens via `npm run scrape` (dry run) and `npm run validate-careers`.
