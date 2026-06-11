# Careers Scraper

Scrape job listings from company career pages, score how well they match your resume with AI, and email you the best fits.

## How it works

1. **Scrape** — Reads your `careerPages` array and pulls jobs from Greenhouse, Lever, Ashby, or generic career pages
2. **Match** — Sends each job + your resume to OpenAI and gets a fit score (0–5) with a brief explanation
3. **Email** — If score > `minFitScore` (default **2.5/5**), sends you an email with the role, why you fit, and the apply link

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Copy config files
cp config.example.json config.json
cp resume.example.md resume.md
cp .env.example .env

# 3. Edit config.json — add your career page URLs
# 4. Edit resume.md — paste your resume
# 5. Edit .env — add OpenAI + SMTP credentials

# 6. Test scraping only (no API calls)
npm run scrape

# 7. Full run — scrape, match, email
npm start
```

## Configuration

### `config.json`

```json
{
  "careerPages": [
    "https://boards.greenhouse.io/stripe",
    "https://jobs.lever.co/spotify",
    "https://jobs.ashbyhq.com/openai",
    "https://careers.yourcompany.com/jobs"
  ],
  "minFitScore": 2.5,
  "maxJobsPerPage": 50,
  "engineeringOnly": true
}
```

**`engineeringOnly`** (default `true`) — filters to engineering roles by job title and department before GPT scoring, saving tokens. Set to `false` to score all roles.

**`preferences`** — filters jobs before GPT scoring and guides the AI matcher:

```json
"preferences": {
  "enabled": true,
  "roles": ["frontend", "fullstack"],
  "minYearsExperience": 0,
  "maxYearsExperience": 4,
  "locations": {
    "india": true,
    "remote": true
  }
}
```

**Supported career page formats:**

| Platform   | Example URL                              |
|-----------|-------------------------------------------|
| Greenhouse | `https://boards.greenhouse.io/company`   |
| Lever      | `https://jobs.lever.co/company`          |
| Ashby      | `https://jobs.ashbyhq.com/company`       |
| Other      | Any careers page with job listing links  |

### `.env`

| Variable         | Description                          |
|-----------------|--------------------------------------|
| `OPENAI_API_KEY` | OpenAI API key for resume matching  |
| `SMTP_HOST`      | e.g. `smtp.gmail.com`               |
| `SMTP_PORT`      | e.g. `587`                          |
| `SMTP_USER`      | Your email address                  |
| `SMTP_PASS`      | App password (not your login password)|
| `EMAIL_TO`       | Where to send match alerts          |

**Gmail setup:** Enable 2FA, then create an [App Password](https://myaccount.google.com/apppasswords) and use it as `SMTP_PASS`.

## CLI flags

```bash
node src/index.js --dry-run    # Scrape only, no AI or email
node src/index.js --no-email   # Scrape + score, skip email
```

## Daily email (deploy)

### GitHub Actions (recommended)

Push this repo to GitHub, then add these **repository secrets** (`Settings → Secrets → Actions`):

| Secret | Value |
|--------|-------|
| `RESUME_MD` | Full contents of your `resume.md` |
| `OPENAI_API_KEY` | OpenAI API key |
| `SMTP_HOST` | e.g. `smtp.gmail.com` |
| `SMTP_PORT` | e.g. `587` |
| `SMTP_USER` | Your email |
| `SMTP_PASS` | App password |
| `EMAIL_FROM` | Sender address |
| `EMAIL_TO` | Where to receive matches |

The workflow in `.github/workflows/daily.yml` runs **every day at 8:00 AM IST** and emails your matches. Career page URLs are loaded from tracked `career-pages.json`; preferences from `config.example.json`.

Trigger manually anytime: **Actions → Daily job matches → Run workflow**.

### Local cron (alternative)

```bash
# Every day at 8am IST
30 2 * * * cd /path/to/careers-scraper && /usr/local/bin/node src/index.js >> scraper.log 2>&1
```

## Project structure

```
src/
  index.js          # Main entry point
  config.js         # Load config, resume, env
  matcher.js        # OpenAI resume scoring
  emailer.js        # HTML email builder + sender
  filters/
    engineering.js  # Engineering role keyword filter
    preferences.js  # YOE, role, location preferences
  scraper/
    index.js        # Orchestrates scraping
    detect.js       # Detect ATS platform from URL
    greenhouse.js   # Greenhouse API scraper
    lever.js        # Lever API scraper
    ashby.js        # Ashby API scraper
    generic.js      # Fallback HTML scraper
```
