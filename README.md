# Careers Scraper

## No bullshit guide

```bash
npm install
npm run setup   # creates config.json, resume.md, and .env from templates

# Edit resume.md, config.json, and .env (OPENAI_API_KEY, SMTP, SERPER_API_KEY)
npm start       # scrape + discover + match + email (single command)
```

This is how the email looks like every morning from this repo:
<img width="1104" height="625" alt="Screenshot 2026-06-15 at 2 45 36 AM" src="https://github.com/user-attachments/assets/2fc3ee34-f768-459d-ab7f-95b9e18e545a" />


Scrape job listings from career pages, score how well they match your resume with AI, and email you the best fits.

**Career page list:** [`careers.json`](careers.json) is the single source of truth — 82 curated URLs. See [`CAREERS.md`](CAREERS.md) for a browsable table.

## How it works

1. **Scrape** — Reads URLs from `careers.json` and pulls jobs from Greenhouse, Lever, Ashby, Rippling, Kula, and other ATS boards
2. **Match** — Sends each job + your resume to OpenAI for a fit score (0–5)
3. **Email** — Sends alerts for jobs above `minFitScore` (default 2.5)


`npm run setup` only copies the templates — it never overwrites files you've
already edited, so it's safe to re-run.

Prefer a no-email dry run first to see what gets scraped:

```bash
npm run scrape   # lists matching jobs, no AI scoring or email
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

## ATS job discovery (Google site: dorks)

Find less-competitive India engineering roles directly on ATS boards (Ashby, Greenhouse, Lever, etc.) instead of LinkedIn.

```bash
# Print ready-to-paste Google queries (no API key needed)
npm run discover-jobs -- --print-queries

# Automated search — add SERPER_API_KEY to .env (https://serper.dev)
npm run discover-jobs

# Search specific sites and add new boards to careers.json
npm run discover-jobs -- --sites ashby,greenhouse,lever --add-boards
```

Queries are built from your `config.json` preferences: software/frontend/full-stack/backend roles, 2–4 YOE, India/remote, plus skills (react, typescript, etc.).

Results save to `discovered-jobs.json` with job URLs and extracted board URLs.

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm start` | **Full pipeline:** scrape careers.json + ATS discovery + GPT match + email |
| `npm run scrape` | Dry run — list jobs without scoring or email |
| `npm run check-coverage` | List all career URLs and status |
| `npm run validate-careers` | Test each URL; update status in careers.json |
| `npm run generate-careers-md` | Regenerate CAREERS.md |
| `npm run probe-companies -- Twilio Zepto` | Probe ATS platforms and add working boards. Add `--platform rippling` to target one ATS, `--scan-careers` to also scan the company `/careers` page |
| `npm run verify-companies` | Bulk-verify companies from a seed file (`--input <file>`, `--add` to append) |
| `npm run discover-jobs` | Google site: dork search for India engineering roles on ATS boards |
| `npm run discover-jobs -- --add-boards` | Discover jobs and add new board URLs to careers.json |
| `npm run discover-gem` | Discover Gem-hosted boards (`--add` to append) |

## Supported ATS platforms

Greenhouse, Ashby, Lever, Kula, Rippling, Workable, SmartRecruiters, Workday, Zwayam, Darwinbox, TalentRecruit, and generic `/careers` fallbacks.

**Lever:** boards use the public JSON API (`https://api.lever.co/v0/postings/{slug}?mode=json`) — no HTML scraping. You can add either `https://jobs.lever.co/gohighlevel` or the API URL directly to `careers.json`. During ATS discovery, individual Lever search hits are expanded to full board listings via this API.

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
  index.js            # Main pipeline (scrape → discover → match → email)
  config.js           # Loads careers.json + local config + env
  matcher.js          # OpenAI resume-fit scoring
  emailer.js          # SMTP match emails
  check-coverage.js   # List all career URLs and their status
  filters/            # Engineering-role and preference filters
  scraper/            # ATS platform scrapers (greenhouse, lever, ashby, …)
lib/
  careers.js          # Read/write careers.json
  discover-jobs.js    # ATS dork discovery pipeline
  dork-queries.js     # Build Google site: queries from preferences
  parse-search-hits.js# Normalize search hits → board URLs
  search-providers.js # Serper / Google CSE search
  ats-sites.js        # ATS hosts to search
  lever-api.js        # Lever public JSON API client
  gem-api.js          # Gem board client
scripts/
  validate-careers.js # Test each URL; update status in careers.json
  generate-careers-md.js
  probe-companies.js  # Probe ATS platforms for a company; add boards
  bulk-verify-companies.js
  discover-ats-jobs.js
  discover-gem-boards.js
  ats-patterns.js     # ATS probe helpers (for probe-companies / bulk-verify)
  ci-setup.js         # Writes resume.md from RESUME_MD secret in CI
```
