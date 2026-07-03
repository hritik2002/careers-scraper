import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import { runSearch, hasSearchProvider } from "../lib/search-providers.js";
import { buildAllDorkQueries } from "../lib/dork-queries.js";
import { ATS_SEARCH_SITES } from "../lib/ats-sites.js";
import { loadCareers, saveCareers, getCareerUrls } from "../lib/careers.js";
import { discoverAtsFromPage } from "../lib/discover-ats.js";
import { paths, root } from "../lib/paths.js";
import {
  extractGemSlug,
  gemBoardUrl,
  gemBoardHiresIndiaOrRemote,
  scrapeGemBoard,
} from "../lib/gem-api.js";
import { sleep, uniqueBy } from "../src/utils.js";

const GEM_SITE = { id: "gem", label: "Gem", domain: "jobs.gem.com" };

function loadCareerPages() {
  const careers = loadCareers();
  return (careers.pages || []).map((p) => p.url).filter(Boolean);
}

function extractSlugsFromHits(hits) {
  const slugs = new Set();
  for (const hit of hits) {
    const slug = extractGemSlug(hit.url);
    if (slug && !slug.includes("?")) slugs.add(slug);
  }
  return [...slugs];
}

async function discoverFromSearch(config) {
  if (!hasSearchProvider()) return [];

  const sites = [...ATS_SEARCH_SITES, GEM_SITE];
  const dorks = buildAllDorkQueries(sites, config.preferences, config.search || {}).filter(
    (d) => d.site === "gem" || d.domain.includes("jobs.gem.com")
  );

  const extraQueries = [
    "site:jobs.gem.com india engineer",
    "site:jobs.gem.com bengaluru software",
    "site:jobs.gem.com hyderabad engineer",
    "site:jobs.gem.com gurugram software",
    "site:jobs.gem.com remote software engineer",
  ];

  const slugs = new Set();
  for (const dork of dorks) {
    try {
      const results = await runSearch(dork.query, { maxResults: config.search?.resultsPerSite ?? 15 });
      for (const slug of extractSlugsFromHits(results)) slugs.add(slug);
    } catch {
      /* continue */
    }
    await sleep(400);
  }

  for (const query of extraQueries) {
    try {
      const results = await runSearch(query, { maxResults: 15 });
      for (const slug of extractSlugsFromHits(results)) slugs.add(slug);
    } catch {
      /* continue */
    }
    await sleep(400);
  }

  return [...slugs];
}

async function discoverFromCareerPages() {
  const slugs = new Set();
  for (const pageUrl of loadCareerPages()) {
    try {
      const hits = await discoverAtsFromPage(pageUrl);
      for (const hit of hits) {
        if (hit.platform !== "gem" && !hit.url.includes("jobs.gem.com")) continue;
        const slug = extractGemSlug(hit.url);
        if (slug) slugs.add(slug);
      }
      if (!hits.length) {
        const slug = extractGemSlug(pageUrl);
        if (slug) slugs.add(slug);
      }
    } catch {
      /* continue */
    }
  }
  return [...slugs];
}

async function verifyAndAdd(slug, existing, add) {
  const boardUrl = gemBoardUrl(slug);
  if (existing.has(boardUrl)) {
    return { slug, status: "existing", url: boardUrl };
  }

  const check = await gemBoardHiresIndiaOrRemote(slug, { engineeringOnly: true });
  if (!check.ok) {
    return { slug, status: "skipped", reason: "no India/full-remote engineering roles" };
  }

  const jobs = await scrapeGemBoard(slug, boardUrl, {
    maxJobs: 3,
    engineeringOnly: true,
    indiaOrRemoteOnly: true,
  });
  if (jobs.length === 0) {
    return { slug, status: "skipped", reason: "no matching jobs after filter" };
  }

  if (add) {
    const careers = loadCareers();
    const pages = [...(careers.pages || [])];
    pages.push({
      url: boardUrl,
      status: "verified",
      platform: "gem",
      jobs: check.jobCount,
      source: jobs[0]?.company || slug,
      checkedAt: new Date().toISOString(),
    });
    saveCareers({ pages });
    existing.add(boardUrl);
  }

  return { slug, status: "verified", url: boardUrl, jobs: check.jobCount };
}

async function main() {
  const add = process.argv.includes("--add");
  const config = JSON.parse(readFileSync(paths.config, "utf-8"));

  console.log("Discovering Gem boards (India / full-remote only)...\n");

  const fromSearch = await discoverFromSearch(config);
  const fromPages = await discoverFromCareerPages();
  const slugs = uniqueBy([...fromSearch, ...fromPages], (s) => s);

  console.log(`Found ${slugs.length} unique Gem board slug(s)\n`);

  const existing = new Set(getCareerUrls());
  const results = [];

  for (const slug of slugs) {
    process.stdout.write(`  ${slug}... `);
    try {
      const result = await verifyAndAdd(slug, existing, add);
      results.push(result);
      if (result.status === "verified") {
        console.log(`✓ ${result.url} (${result.jobs} India/remote eng jobs)`);
      } else if (result.status === "existing") {
        console.log(`↷ already in careers.json`);
      } else {
        console.log(`✗ ${result.reason}`);
      }
    } catch (err) {
      console.log(`✗ ${err.message}`);
      results.push({ slug, status: "failed", reason: err.message });
    }
    await sleep(150);
  }

  const verified = results.filter((r) => r.status === "verified");
  const outputPath = `${root}/data/gem-boards.json`;
  writeFileSync(
    outputPath,
    JSON.stringify({ discoveredAt: new Date().toISOString(), results }, null, 2) + "\n"
  );

  console.log(`\nVerified: ${verified.length} | Skipped: ${results.filter((r) => r.status === "skipped").length}`);
  if (add) console.log(`careers.json: ${getCareerUrls().length} boards`);
  console.log(`Results → ${outputPath}`);
  if (!add && verified.length) console.log("\nRun with --add to append boards to careers.json");
}

main().catch(console.error);
