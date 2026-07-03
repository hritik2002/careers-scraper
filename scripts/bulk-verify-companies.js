import { readFileSync, writeFileSync, existsSync } from "fs";
import { probeAllPlatforms } from "./ats-patterns.js";
import { slugCandidates, slugify } from "../lib/slugs.js";
import { discoverAtsFromPage, discoverAtsFromCareersSite } from "../lib/discover-ats.js";
import { loadCareers, saveCareers, getCareerUrls, getPlatform } from "../lib/careers.js";
import { scrapeCareerPages } from "../src/scraper/index.js";
import { root } from "../lib/paths.js";

const DEFAULT_SEEDS = root + "/data/company-batch-2.json";
const OUTPUT_PATH = root + "/data/verify-results.json";

const SKIP_HOSTS = /linkedin\.com|wellfound\.com|instahyre\.com|glassdoor\.com|indeed\.com/i;
const TRUST_PROBE_ATS = /greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com|kula\.ai|rippling\.com|jobvite\.com|dover\.(com|io)/i;
const KNOWN_ATS = /greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|smartrecruiters\.com|myworkdayjobs\.com|myworkdaysite\.com|kula\.ai|rippling\.com|bamboohr\.com|darwinbox\.in|talentrecruit\.com|zwayam\.com|freshteam\.com|zohorecruit\.in|jobvite\.com|icims\.com|dover\.(com|io)/i;

function parseArgs() {
  const args = process.argv.slice(2);
  let input = DEFAULT_SEEDS;
  let limit = Infinity;
  let offset = 0;
  let add = false;
  let resume = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--add") add = true;
    else if (args[i] === "--resume") resume = true;
    else if (args[i] === "--input") input = args[++i];
    else if (args[i] === "--limit") limit = Number(args[++i]);
    else if (args[i] === "--offset") offset = Number(args[++i]);
  }

  return { input, limit, offset, add, resume };
}

function guessDomains(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!slug) return [];
  return [`${slug}.com`, `${slug}.in`];
}

async function testBoardUrl(url) {
  try {
    const jobs = await scrapeCareerPages([url], {
      maxJobsPerPage: 2,
      engineeringOnly: false,
      silent: true,
    });
    return jobs.length > 0 ? { url, jobs: jobs.length, platform: getPlatform(url) } : null;
  } catch {
    return null;
  }
}

async function validateCandidate({ boardUrl, method, jobCount }) {
  if (method === "ats-probe" && jobCount > 0 && TRUST_PROBE_ATS.test(boardUrl)) {
    return { url: boardUrl, jobs: jobCount, platform: getPlatform(boardUrl) };
  }
  return testBoardUrl(boardUrl);
}

const GENERIC_SLUGS = new Set([
  "solutions",
  "careers",
  "jobs",
  "company",
  "group",
  "labs",
  "tech",
  "software",
  "india",
  "global",
  "cosmos",
  "digital",
  "services",
  "systems",
  "health",
  "media",
  "data",
  "cloud",
  "team",
  "inc",
  "technology",
  "system",
]);

function slugMatchesCompany(slug, name) {
  if (GENERIC_SLUGS.has(slug) || slug.length < 4) return false;
  const companySlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!companySlug) return false;
  if (companySlug.includes(slug) || slug.includes(companySlug)) return true;

  const aliases = slugCandidates(name).filter((s) => s !== slugify(name));
  return aliases.includes(slug);
}

async function collectCandidates({ name, url }) {
  const candidates = [];
  const slugs = slugCandidates(name)
    .filter((slug) => slugMatchesCompany(slug, name))
    .sort((a, b) => b.length - a.length);

  for (const slug of slugs.slice(0, 4)) {
    const probed = await probeAllPlatforms(slug);
    if (probed?.url && probed.jobCount !== 0) {
      candidates.push({ boardUrl: probed.url, method: "ats-probe", jobCount: probed.jobCount, slug });
      return candidates;
    }
  }

  if (url) {
    if (KNOWN_ATS.test(url)) {
      candidates.push({ boardUrl: url, method: "provided", jobCount: 0 });
    } else {
      for (const hit of await discoverAtsFromPage(url)) {
        candidates.push({ boardUrl: hit.url, method: "page-scan", jobCount: 0 });
      }
      if (candidates.length === 0) {
        candidates.push({ boardUrl: url, method: "provided", jobCount: 0 });
      }
    }
    return candidates;
  }

  for (const domain of guessDomains(name)) {
    for (const hit of await discoverAtsFromCareersSite(domain)) {
      candidates.push({ boardUrl: hit.url, method: "domain-scan", jobCount: 0 });
      if (candidates.length) return candidates;
    }
  }

  return candidates;
}

async function verifyCompany(seed, existing) {
  const candidates = await collectCandidates(seed);

  for (const candidate of candidates) {
    const { boardUrl, method } = candidate;
    if (existing.has(boardUrl)) {
      return { ...seed, status: "existing", boardUrl, url: boardUrl, method };
    }

    const result = await validateCandidate(candidate);
    if (result) {
      return { ...seed, status: "verified", ...result, method };
    }
  }

  return { ...seed, status: "failed", reason: "no scrapeable board found" };
}

function loadResults() {
  if (!existsSync(OUTPUT_PATH)) return { verifiedAt: null, results: [] };
  return JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
}

function saveResults(data) {
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + "\n");
}

function appendToCareers(result) {
  const careers = loadCareers();
  const pages = [...(careers.pages || [])];
  if (pages.some((p) => p.url === result.url)) return false;

  pages.push({
    url: result.url,
    status: "verified",
    platform: result.platform,
    jobs: result.jobs,
    source: result.name,
    checkedAt: new Date().toISOString(),
  });
  saveCareers({ pages });
  return true;
}

async function main() {
  const { input, limit, offset, add, resume } = parseArgs();
  const seeds = JSON.parse(readFileSync(input, "utf-8"));
  const slice = seeds.slice(offset, offset + limit);

  const prior = resume ? loadResults() : { results: [] };
  const doneNames = new Set(prior.results.map((r) => r.name.toLowerCase()));
  const results = [...prior.results];
  const existingUrls = new Set(getCareerUrls());

  let verified = 0;
  let skipped = 0;
  let failed = 0;
  let alreadyIn = 0;
  let added = 0;

  console.log(`Verifying ${slice.length} companies (offset ${offset}, total seeds ${seeds.length})...\n`);

  for (let i = 0; i < slice.length; i++) {
    const seed = slice[i];
    if (resume && doneNames.has(seed.name.toLowerCase())) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${offset + i + 1}/${seeds.length}] ${seed.name}... `);

    try {
      const result = await verifyCompany(seed, existingUrls);
      results.push(result);
      doneNames.add(seed.name.toLowerCase());

      if (result.status === "verified") {
        verified++;
        existingUrls.add(result.url);
        console.log(`✓ ${result.platform} — ${result.url} (${result.jobs} jobs)`);
        if (add && appendToCareers(result)) added++;
      } else if (result.status === "existing") {
        alreadyIn++;
        console.log(`↷ ${result.boardUrl}`);
      } else {
        failed++;
        console.log(`✗ ${result.reason}`);
      }
    } catch (err) {
      failed++;
      results.push({ ...seed, status: "failed", reason: err.message });
      console.log(`✗ ${err.message}`);
    }

    saveResults({ verifiedAt: new Date().toISOString(), results });
    await new Promise((r) => setTimeout(r, 50));
  }

  const allVerified = results.filter((r) => r.status === "verified");
  console.log(`\nBatch: ${verified} new, ${alreadyIn} existing, ${failed} failed, ${skipped} skipped`);
  console.log(`Total verified in results: ${allVerified.length}`);
  if (add) console.log(`Added ${added} board(s) to careers.json (${getCareerUrls().length} total)`);
  console.log(`Results → ${OUTPUT_PATH}`);
}

main().catch(console.error);
