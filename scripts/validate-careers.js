import { scrapeCareerPages } from "../src/scraper/index.js";
import { loadCareers, saveCareers, getPlatform } from "../lib/careers.js";

const careers = loadCareers();
const pages = careers.pages || [];

console.log(`Validating ${pages.length} career pages...\n`);

const updated = [];
let ok = 0;
let broken = 0;

for (let i = 0; i < pages.length; i++) {
  const { url } = pages[i];
  try {
    const jobs = await scrapeCareerPages([url], { maxJobsPerPage: 5, engineeringOnly: false });
    if (jobs.length > 0) {
      updated.push({
        url,
        status: "ok",
        jobs: jobs.length,
        platform: getPlatform(url),
        checkedAt: new Date().toISOString(),
      });
      ok++;
      console.log(`[${i + 1}/${pages.length}] ✓ ${url} — ${jobs.length} job(s)`);
    } else {
      updated.push({
        url,
        status: "empty",
        jobs: 0,
        platform: getPlatform(url),
        reason: "0 jobs",
        checkedAt: new Date().toISOString(),
      });
      broken++;
      console.log(`[${i + 1}/${pages.length}] ✗ ${url} — 0 jobs`);
    }
  } catch (err) {
    updated.push({
      url,
      status: "broken",
      platform: getPlatform(url),
      reason: err.message,
      checkedAt: new Date().toISOString(),
    });
    broken++;
    console.log(`[${i + 1}/${pages.length}] ✗ ${url} — ${err.message}`);
  }

  await new Promise((r) => setTimeout(r, 250));
}

saveCareers({ pages: updated });

console.log(`\nSummary: ${ok}/${pages.length} working, ${broken} broken/empty`);
console.log(`Updated careers.json with validation status`);
