import { probeAllPlatforms, ATS_PATTERNS } from "./ats-patterns.js";
import { slugCandidates } from "../lib/slugs.js";
import { discoverAtsFromCareersSite } from "../lib/discover-ats.js";
import { loadCareers, saveCareers, getCareerUrls } from "../lib/careers.js";
import { scrapeCareerPages } from "../src/scraper/index.js";

const args = process.argv.slice(2);

function option(flag) {
  const i = args.indexOf(flag);
  if (i === -1) return null;
  return args[i + 1] ?? true;
}

const platform = option("--platform");
const scanCareers = args.includes("--scan-careers");
const seeds = args.filter((a) => !a.startsWith("--") && a !== platform);

const existing = new Set(getCareerUrls());

async function urlHasJobs(url) {
  try {
    const jobs = await scrapeCareerPages([url], { maxJobsPerPage: 2, engineeringOnly: false });
    return jobs.length > 0;
  } catch {
    return false;
  }
}

/** Probe a single ATS platform for a slug, or all platforms when none is specified. */
async function probeSlug(slug) {
  if (!platform) return probeAllPlatforms(slug);
  const probe = ATS_PATTERNS[platform]?.probe;
  if (!probe) throw new Error(`Unknown --platform "${platform}"`);
  const result = await probe(slug);
  return result && result.jobCount !== 0 ? { ...result, slug } : null;
}

/** Try ATS slug probes, then optionally scan the company's careers site. */
async function resolveCompany(name) {
  for (const slug of slugCandidates(name)) {
    const probed = await probeSlug(slug);
    if (probed?.url && !existing.has(probed.url) && (await urlHasJobs(probed.url))) {
      return { name, method: "ats-probe", ...probed };
    }
  }

  if (scanCareers) {
    const domain = guessDomain(name);
    if (domain) {
      for (const hit of await discoverAtsFromCareersSite(domain)) {
        if (existing.has(hit.url)) continue;
        if (!(await urlHasJobs(hit.url))) continue;
        return { name, method: "careers-page", platform: hit.platform, url: hit.url };
      }
    }
  }

  return null;
}

function guessDomain(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return slug ? `${slug}.com` : null;
}

async function main() {
  if (!seeds.length) {
    console.log("Usage: npm run probe-companies -- <Company...> [--platform <ats>] [--scan-careers]");
    console.log("  Probes ATS platforms for each company and adds working boards to careers.json.");
    console.log("  --platform <ats>   Restrict to one ATS (e.g. rippling, greenhouse, ashby)");
    console.log("  --scan-careers     Fall back to scanning the company's /careers page");
    process.exit(1);
  }

  const careers = loadCareers();
  const pages = [...(careers.pages || [])];
  const found = [];
  const missed = [];

  for (const name of seeds) {
    try {
      const result = await resolveCompany(name);
      if (result) {
        pages.push({ url: result.url, status: "unverified" });
        existing.add(result.url);
        found.push(result);
        console.log(`✓ ${name} → ${result.method} → ${result.url} (${result.jobCount ?? "?"} jobs)`);
      } else {
        missed.push(name);
        console.log(`✗ ${name} — no scrapeable board found`);
      }
    } catch (err) {
      missed.push(name);
      console.log(`✗ ${name} — ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  if (found.length) {
    saveCareers({ pages });
    console.log(`\nAdded ${found.length} board(s) to careers.json`);
  }
  if (missed.length) {
    console.log(`\nNot found (${missed.length}): ${missed.join(", ")}`);
  }
}

main().catch(console.error);
