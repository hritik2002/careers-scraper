# Careers Scraper

This is how the email looks like every morning from this repo:
<img width="1104" height="625" alt="Screenshot 2026-06-15 at 2 45 36 AM" src="https://github.com/user-attachments/assets/2fc3ee34-f768-459d-ab7f-95b9e18e545a" />


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

## GitHub Actions (recommended)

Runs daily at **10:00 AM IST** via [`.github/workflows/daily.yml`](.github/workflows/daily.yml). Career URLs load from tracked `careers.json`; preferences from `config.example.json`.

### 1. Add repository secrets

GitHub → your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|-------|
| `RESUME_MD` | Full contents of your `resume.md` |
| `OPENAI_API_KEY` | OpenAI API key |
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | e.g. `587` |
| `SMTP_USER` | Your email |
| `SMTP_PASS` | Gmail App Password (not your login password) |
| `EMAIL_FROM` | Sender address |
| `EMAIL_TO` | Where to receive match emails |

Optional variable (**Settings → Secrets and variables → Actions → Variables**): `OPENAI_MODEL` (default `gpt-4o-mini`).

### 2. Enable Actions

**Settings → Actions → General** → allow actions for the repository.

### 3. Test manually

**Actions → Daily job matches → Run workflow**. Check the run log; you should get an email if matches are found.

Scheduled runs only work on the **default branch** (`master`/`main`) and may be delayed by a few minutes on free tier.

### Local cron (alternative)

If you prefer running on your machine instead of GitHub:

```bash
# 10:00 AM IST daily
30 4 * * * cd /path/to/careers-scraper && /usr/local/bin/node src/index.js >> scraper.log 2>&1
```

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
