# Careers Scraper

Scrape job listings from company career pages, score how well they match your resume with AI, and email you the best fits.

**Browse 170+ Indian startup career pages:** see [`COMPANIES.md`](COMPANIES.md) — a curated, shareable list of VC portfolio and AI startup job boards (Greenhouse, Lever, Ashby, Kula, Rippling, and more).

## How it works

1. **Scrape** — Pulls jobs from ATS boards and career pages listed in [`career-pages.json`](career-pages.json)
2. **Match** — Sends each job + your resume to OpenAI and gets a fit score (0–5) with a brief explanation
3. **Email** — If score > `minFitScore` (default **2.5/5**), sends you an email with the role, why you fit, and the apply link

## Quick start

```bash
npm install
cp config.example.json config.json
cp resume.example.md resume.md
cp .env.example .env

# Edit resume.md and .env (OpenAI + SMTP)
# Career pages load automatically from career-pages.json

npm run scrape   # test scraping only
npm start        # full run: scrape + match + email
```

## Company career pages (public data)

This repo includes a curated registry of **172 Indian startups and VC portfolio companies** (Titan Capital, Nexus, Elevation, Peak XV, AUM Ventures) plus AI/startup additions.

| Resource | Description |
|----------|-------------|
| [`COMPANIES.md`](COMPANIES.md) | Human-readable table — verified, broken, and unresolved URLs |
| [`career-pages.json`](career-pages.json) | Machine-readable company → URL mapping |
| [`data/known-ats-urls.json`](data/known-ats-urls.json) | Manual ATS overrides — **contributions welcome** |
| [`data/README.md`](data/README.md) | Data model and contribution guide |

To refresh the public list after updating URLs:

```bash
npm run validate-scrape-targets   # test which URLs return jobs (~30 min)
npm run generate-companies-md     # regenerate COMPANIES.md
```

## Configuration

### `config.json` (local, gitignored)

Personal runtime settings. Career page URLs are loaded from `career-pages.json` when `careerPages` is empty.

```json
{
  "careerPages": [],
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

**Supported ATS platforms:**

| Platform | Example URL |
|----------|-------------|
| Greenhouse | `https://boards.greenhouse.io/company` |
| Ashby | `https://jobs.ashbyhq.com/company` |
| Lever | `https://jobs.lever.co/company` |
| Kula | `https://careers.kula.ai/company?jobs=true` |
| Rippling | `https://ats.rippling.com/company/jobs` |
| Workable | `https://apply.workable.com/company/` |
| SmartRecruiters | `https://jobs.smartrecruiters.com/company` |
| Workday | `https://company.wd1.myworkdayjobs.com/en-US/Careers` |
| Custom /careers | Fallback when no ATS board is found |

Resolution tries **ATS boards first**, then scrapeable `/careers` sites.

### `.env`

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for resume matching |
| `SMTP_HOST` / `SMTP_PORT` | e.g. `smtp.gmail.com` / `587` |
| `SMTP_USER` / `SMTP_PASS` | Email credentials (use Gmail App Password) |
| `EMAIL_TO` | Where to send match alerts |

## CLI flags

```bash
node src/index.js --dry-run    # Scrape only, no AI or email
node src/index.js --no-email     # Scrape + score, skip email
```

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Full pipeline: scrape + GPT match + email |
| `npm run scrape` | Scrape only (`--dry-run`) |
| `npm run check-coverage` | Report which companies have career URLs |
| `npm run add-vc-portfolio` | Re-probe all companies for ATS boards |
| `npm run fix-known-ats` | Apply `data/known-ats-urls.json` overrides |
| `npm run validate-scrape-targets` | Test URLs; update validation + config |
| `npm run generate-companies-md` | Regenerate `COMPANIES.md` |
| `npm test` | Run tests |

## Daily email (deploy)

### GitHub Actions

Push to GitHub and add secrets (`Settings → Secrets → Actions`):

| Secret | Value |
|--------|-------|
| `RESUME_MD` | Full contents of your `resume.md` |
| `OPENAI_API_KEY` | OpenAI API key |
| `SMTP_*` / `EMAIL_*` | Email credentials |

The workflow runs **daily at 8:00 AM IST**. Career pages load from tracked `career-pages.json` via `CAREER_PAGES_FROM_JSON=1`.

### Local cron

```bash
30 2 * * * cd /path/to/careers-scraper && node src/index.js >> scraper.log 2>&1
```

## Project structure

```
lib/                    # Shared modules (paths, slugs, company data)
data/                   # Public company URL registry + sources
src/
  index.js              # Main pipeline
  config.js             # Config + career page loading
  matcher.js            # OpenAI resume scoring
  emailer.js            # HTML email builder
  check-coverage.js     # Coverage report CLI
  filters/              # Engineering + preference filters
  scraper/              # ATS platform scrapers + generic fallback
scripts/                # URL resolution and validation tools
test/                   # Unit tests
```
