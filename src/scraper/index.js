import { detectPlatform } from "./detect.js";
import { scrapeGreenhouse } from "./greenhouse.js";
import { scrapeLever } from "./lever.js";
import { scrapeAshby } from "./ashby.js";
import { scrapeKula } from "./kula.js";
import { scrapeWorkable } from "./workable.js";
import { scrapeRippling } from "./rippling.js";
import { scrapeGem } from "./gem.js";
import { scrapeWorkday } from "./workday.js";
import { scrapeSmartRecruiters } from "./smartrecruiters.js";
import { scrapeGeneric } from "./generic.js";
import { uniqueBy, sleep } from "../utils.js";

export async function scrapeCareerPages(careerPages, options = {}) {
  const { maxJobsPerPage = 50, engineeringOnly = true } = options;
  const allJobs = [];

  for (const pageUrl of careerPages) {
    try {
      const jobs = await scrapeCareerPage(pageUrl, { maxJobs: maxJobsPerPage, engineeringOnly });
      const label = engineeringOnly ? "engineering job(s)" : "job(s)";
      console.log(`  ✓ ${pageUrl} — ${jobs.length} ${label}`);
      allJobs.push(...jobs);
    } catch (err) {
      console.error(`  ✗ ${pageUrl} — ${err.message}`);
    }
    await sleep(500);
  }

  return uniqueBy(allJobs, (j) => j.url);
}

async function scrapeCareerPage(pageUrl, options) {
  const { platform, company } = detectPlatform(pageUrl);

  switch (platform) {
    case "greenhouse":
      if (!company) throw new Error("Could not detect Greenhouse company slug from URL");
      return scrapeGreenhouse(company, pageUrl, options);
    case "lever":
      if (!company) throw new Error("Could not detect Lever company slug from URL");
      return scrapeLever(company, pageUrl, options);
    case "ashby":
      if (!company) throw new Error("Could not detect Ashby company slug from URL");
      return scrapeAshby(company, pageUrl, options);
    case "kula":
      if (!company) throw new Error("Could not detect Kula company slug from URL");
      return scrapeKula(company, pageUrl, options);
    case "workable":
      if (!company) throw new Error("Could not detect Workable account slug from URL");
      return scrapeWorkable(company, pageUrl, options);
    case "rippling":
      if (!company) throw new Error("Could not detect Rippling board slug from URL");
      return scrapeRippling(company, pageUrl, options);
    case "workday":
      return scrapeWorkday(pageUrl, options);
    case "smartrecruiters":
      if (!company) throw new Error("Could not detect SmartRecruiters company slug from URL");
      return scrapeSmartRecruiters(company, pageUrl, options);
    case "gem":
      return scrapeGem(pageUrl, options);
    default:
      return scrapeGeneric(pageUrl, options);
  }
}
