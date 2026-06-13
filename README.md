# Careers Scraper

Scrape job listings from career pages, score how well they match your resume with AI, and email you the best fits.

**Career page list:** [`careers.json`](careers.json) is the single source of truth — 82 curated URLs. See [`CAREERS.md`](CAREERS.md) for a browsable table.

## How it works

1. **Scrape** — Reads URLs from `careers.json` and pulls jobs from Greenhouse, Lever, Ashby, Rippling, Kula, and other ATS boards
2. **Match** — Sends each job + your resume to OpenAI for a fit score (0–5)
3. **Email** — Sends alerts for jobs above `minFitScore` (default 2.5)

## Quick start

```bash
npm install
cp config.example.json config.json
cp resume.example.md resume.md
cp .env.example .env

# Edit resume.md and .env
# Career URLs load from careers.json automatically

npm run scrape   # test scraping
npm start        # scrape + match + email
```

## careers.json (single source of truth)

All career page URLs live in one file:

```json
{
  "updatedAt": "2026-06-13T...",
  "pages": [
    { "url": "https://boards.greenhouse.io/postman" },
    { "url": "https://jobs.lever.co/meesho" }
  ]
}
```

After validation, entries include `status`, `jobs`, and `platform`:

```json
{ "url": "https://...", "status": "ok", "jobs": 16, "platform": "greenhouse" }
```

**To add a URL:** append to `pages` in `careers.json`, then run `npm run validate-careers`.

## config.json (local, gitignored)

Personal settings only — no URLs duplicated here:

```json
{
  "minFitScore": 2.5,
  "maxJobsPerPage": 50,
  "engineeringOnly": true,
  "preferences": {
    "enabled": true,
    "roles": ["software", "frontend", "fullstack", "backend"],
    "minYearsExperience": 2,
    "maxYearsExperience": 4,
    "locations": { "india": true, "remote": true }
  }
}
```

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Full pipeline: scrape + GPT match + email |
| `npm run scrape` | Scrape only |
| `npm run check-coverage` | List all career URLs and status |
| `npm run validate-careers` | Test each URL; update status in careers.json |
| `npm run generate-careers-md` | Regenerate CAREERS.md |
| `npm run probe-rippling -- Swiggy Zepto` | Find Rippling boards and add to careers.json |

## Supported ATS platforms

Greenhouse, Ashby, Lever, Kula, Rippling, Workable, SmartRecruiters, Workday, and generic `/careers` fallbacks.

## GitHub Actions

Daily run at 8:00 AM IST. Loads URLs from tracked `careers.json`. Set secrets: `RESUME_MD`, `OPENAI_API_KEY`, `SMTP_*`, `EMAIL_*`.

## Project structure

```
careers.json          # Single source of truth — all career page URLs
src/
  index.js            # Main pipeline
  config.js           # Loads careers.json + local config
  scraper/            # ATS platform scrapers
lib/
  careers.js          # Read/write careers.json
scripts/
  validate-careers.js
  generate-careers-md.js
  ats-patterns.js     # ATS probe helpers (for probe-rippling)
```
