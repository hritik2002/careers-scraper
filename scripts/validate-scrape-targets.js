import { readFileSync, writeFileSync, existsSync } from "fs";
import { scrapeCareerPages } from "../src/scraper/index.js";
import {
  loadCompanyNames,
  loadCareerPagesData,
  saveScrapeValidation,
} from "../lib/companies.js";
import { paths } from "../lib/paths.js";

const companies = loadCompanyNames();
const data = loadCareerPagesData();

const working = [];
const broken = [];

console.log(`Validating ${companies.length} company career pages...\n`);

for (let i = 0; i < companies.length; i++) {
  const company = companies[i];
  const url = data.mapping[company];
  if (!url) {
    broken.push({ company, url: null, reason: "no URL" });
    console.log(`[${i + 1}/${companies.length}] ✗ ${company} — no URL`);
    continue;
  }

  try {
    const jobs = await scrapeCareerPages([url], { maxJobsPerPage: 5, engineeringOnly: false });
    if (jobs.length > 0) {
      working.push({ company, url, jobs: jobs.length });
      console.log(`[${i + 1}/${companies.length}] ✓ ${company} — ${jobs.length} job(s)`);
    } else {
      broken.push({ company, url, reason: "0 jobs" });
      console.log(`[${i + 1}/${companies.length}] ✗ ${company} — 0 jobs (${url})`);
    }
  } catch (err) {
    broken.push({ company, url, reason: err.message });
    console.log(`[${i + 1}/${companies.length}] ✗ ${company} — ${err.message}`);
  }

  await new Promise((r) => setTimeout(r, 250));
}

saveScrapeValidation({ checkedAt: new Date().toISOString(), working, broken });

if (existsSync(paths.config)) {
  const config = JSON.parse(readFileSync(paths.config, "utf-8"));
  config.careerPages = working.map((entry) => entry.url);
  writeFileSync(paths.config, JSON.stringify(config, null, 2) + "\n");
  console.log(`\nSummary: ${working.length}/${companies.length} scrape successfully`);
  console.log(`config.json updated with ${config.careerPages.length} verified career page URLs`);
} else {
  console.log(`\nSummary: ${working.length}/${companies.length} scrape successfully`);
  console.log(`(config.json not found — validation saved to scrape-validation.json only)`);
}
if (broken.length) {
  console.log(`\nBroken (${broken.length}):`);
  broken.forEach(({ company, url, reason }) => console.log(`  • ${company} — ${reason}${url ? ` (${url})` : ""}`));
}
