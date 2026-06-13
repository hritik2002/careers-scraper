import { readFileSync, writeFileSync, existsSync } from "fs";
import { scrapeCareerPages } from "../src/scraper/index.js";
import {
  loadCompanyNames,
  loadCareerPagesData,
  saveCareerPagesData,
  loadKnownAtsUrls,
  isStaleUrl,
} from "../lib/companies.js";
import { paths } from "../lib/paths.js";

async function urlWorks(url) {
  try {
    const jobs = await scrapeCareerPages([url], { maxJobsPerPage: 2, engineeringOnly: false });
    return jobs.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const companies = loadCompanyNames();
  const data = loadCareerPagesData();
  const knownAtsUrls = loadKnownAtsUrls();
  const mapping = { ...data.mapping };

  let fixed = 0;
  for (const company of companies) {
    if (isStaleUrl(mapping[company])) {
      delete mapping[company];
    }

    const candidate = knownAtsUrls[company] || mapping[company];
    if (!candidate) continue;

    if (await urlWorks(candidate)) {
      if (mapping[company] !== candidate) {
        mapping[company] = candidate;
        fixed++;
        console.log(`✓ ${company} → ${candidate}`);
      }
    } else if (knownAtsUrls[company]) {
      console.log(`✗ ${company} — known URL failed: ${candidate}`);
    }
  }

  saveCareerPagesData({ ...data, mapping });

  const workingUrls = companies.map((c) => mapping[c]).filter(Boolean);
  if (existsSync(paths.config)) {
    const config = JSON.parse(readFileSync(paths.config, "utf-8"));
    config.careerPages = [...new Set(workingUrls)];
    writeFileSync(paths.config, JSON.stringify(config, null, 2) + "\n");
  }

  console.log(`\nFixed/verified ${fixed} URLs. ${workingUrls.length}/${companies.length} companies have career pages.`);
}

main().catch(console.error);
