# Company career page data

Public, curated career page URLs for Indian startups and VC portfolio companies.

| File | Purpose |
|------|---------|
| [`../companies.json`](../companies.json) | Master list of company names (~172) |
| [`../career-pages.json`](../career-pages.json) | Company → career page URL mapping |
| [`../scrape-validation.json`](../scrape-validation.json) | Last validation run (working vs broken) |
| [`../COMPANIES.md`](../COMPANIES.md) | Human-readable table (auto-generated) |
| `known-ats-urls.json` | Manual ATS URL overrides (contributions welcome) |
| `careers-fallbacks.json` | Custom `/careers` pages used when no ATS board is found |
| `sources/vc-portfolio.json` | VC portfolio input list (Titan, Nexus, Elevation, Peak XV, AUM) |
| `sources/startups.json` | Additional AI/startup companies |

## Contributing a career page URL

1. Find the company's ATS board (Greenhouse, Lever, Ashby, etc.) or scrapeable careers page.
2. Add it to `known-ats-urls.json` under the company name.
3. Run `npm run fix-known-ats` to verify and apply.
4. Run `npm run generate-companies-md` to refresh the public list.
5. Open a PR.

## Maintenance scripts

```bash
npm run add-vc-portfolio       # Re-probe all companies for ATS boards
npm run fix-known-ats          # Apply known-ats-urls.json overrides
npm run validate-scrape-targets  # Test which URLs return jobs
npm run generate-companies-md  # Regenerate COMPANIES.md
npm run check-coverage         # Report coverage gaps
```
