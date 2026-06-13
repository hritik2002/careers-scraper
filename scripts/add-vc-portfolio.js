import { ATS_PATTERNS } from "./ats-patterns.js";
import { probeAllAts, isAtsUrl } from "./preferred-ats.js";
import { scrapeCareerPages } from "../src/scraper/index.js";
import {
  loadCareerPagesData,
  saveCareerPagesData,
  saveCompanyNames,
  loadCareersFallbacks,
  loadVcPortfolio,
  loadStartups,
  isStaleUrl,
} from "../lib/companies.js";
import { slugCandidates } from "../lib/slugs.js";

async function urlHasJobs(url) {
  try {
    const jobs = await scrapeCareerPages([url], { maxJobsPerPage: 3, engineeringOnly: false });
    return jobs.length > 0;
  } catch {
    return false;
  }
}

async function resolveCompany(name, existingUrl, fallbacks) {
  for (const slug of slugCandidates(name)) {
    const ats = await probeAllAts(slug, ATS_PATTERNS);
    if (ats && (ats.jobCount > 0 || (await urlHasJobs(ats.url)))) {
      return { company: name, url: ats.url, source: ats.platform, slug: ats.slug };
    }
  }

  const careersUrl = fallbacks[name];
  if (careersUrl && !isAtsUrl(careersUrl) && (await urlHasJobs(careersUrl))) {
    return { company: name, url: careersUrl, source: "careers" };
  }

  if (existingUrl && !isStaleUrl(existingUrl) && (await urlHasJobs(existingUrl))) {
    return { company: name, url: existingUrl, source: "existing" };
  }

  return { company: name, url: null, source: "unresolved" };
}

async function main() {
  const vcCompanies = loadVcPortfolio();
  const priorStartups = loadStartups();
  const fallbacks = loadCareersFallbacks();

  const allCompanies = [...new Set([...vcCompanies, ...priorStartups])]
    .filter((c) => c !== "SynthioLabs")
    .sort((a, b) => a.localeCompare(b));

  console.log(
    `Resolving career pages for ${allCompanies.length} companies (${vcCompanies.length} VC portfolio)...`
  );
  console.log(
    "Strategy: ATS boards first (GH/Ashby/Workable/SR/Jobvite/Workday/ICIMS/Dover), then /careers\n"
  );

  const data = loadCareerPagesData();
  const mapping = { ...data.mapping };
  const resolved = [];
  const unresolved = [];

  for (let i = 0; i < allCompanies.length; i++) {
    const company = allCompanies[i];
    process.stdout.write(`\r[${i + 1}/${allCompanies.length}] ${company.padEnd(40).slice(0, 40)}`);

    const result = await resolveCompany(company, mapping[company], fallbacks);
    if (result.url) {
      mapping[company] = result.url;
      resolved.push(result);
      console.log(`\r[${i + 1}/${allCompanies.length}] ✓ ${company} → ${result.url} (${result.source})`);
    } else {
      delete mapping[company];
      unresolved.push(company);
      console.log(`\r[${i + 1}/${allCompanies.length}] ✗ ${company}`);
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  saveCompanyNames(allCompanies);
  saveCareerPagesData({
    ...data,
    mapping,
    vcPortfolio: {
      addedAt: new Date().toISOString(),
      total: vcCompanies.length,
      resolved: resolved.filter((r) => vcCompanies.includes(r.company)).length,
      unresolved: unresolved.filter((c) => vcCompanies.includes(c)),
    },
  });

  console.log(`\n\nDone.`);
  console.log(`Total companies:  ${allCompanies.length}`);
  console.log(`With career URL:  ${resolved.length}`);
  console.log(`Unresolved:       ${unresolved.length}`);
  if (unresolved.length) {
    console.log(`\nUnresolved companies:`);
    unresolved.forEach((c) => console.log(`  • ${c}`));
  }
}

main().catch(console.error);
