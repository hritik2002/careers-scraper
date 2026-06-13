import { ATS_PATTERNS } from "./ats-patterns.js";
import { slugCandidates } from "../lib/slugs.js";
import { loadCareers, saveCareers, getCareerUrls } from "../lib/careers.js";
import { scrapeCareerPages } from "../src/scraper/index.js";

const existing = new Set(getCareerUrls());
const probe = ATS_PATTERNS.rippling.probe;

/** Slugs to probe — pass as CLI args or edit this list. */
const seeds = process.argv.slice(2);

async function urlHasJobs(url) {
  try {
    const jobs = await scrapeCareerPages([url], { maxJobsPerPage: 2, engineeringOnly: false });
    return jobs.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  if (!seeds.length) {
    console.log("Usage: npm run probe-rippling -- Swiggy Zepto Razorpay");
    console.log("Probes ats.rippling.com for slug variants and adds working boards to careers.json.");
    process.exit(1);
  }

  const careers = loadCareers();
  const pages = [...(careers.pages || [])];
  let found = 0;

  for (const name of seeds) {
    for (const slug of slugCandidates(name)) {
      const result = await probe(slug);
      if (!result?.url || existing.has(result.url)) continue;
      if (result.jobCount === 0) continue;
      if (!(await urlHasJobs(result.url))) continue;

      pages.push({ url: result.url, status: "unverified" });
      existing.add(result.url);
      found++;
      console.log(`✓ ${name} → ${result.url}`);
      break;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  if (found) {
    saveCareers({ pages });
    console.log(`\nAdded ${found} Rippling board(s) to careers.json`);
  } else {
    console.log("\nNo new Rippling boards found.");
  }
}

main().catch(console.error);
