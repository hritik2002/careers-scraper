#!/usr/bin/env node
/**
 * Standalone ATS job discovery via Google site: dorks.
 * For the full pipeline (scrape + discover + match + email), use: npm start
 */

import dotenv from "dotenv";
import { loadConfig } from "../src/config.js";
import { discoverAtsJobs, hasSearchProvider } from "../lib/discover-jobs.js";
import { buildAllDorkQueries } from "../lib/dork-queries.js";
import { getSearchSites } from "../lib/ats-sites.js";
import { formatPreferencesSummary } from "../src/filters/preferences.js";
import { paths } from "../lib/paths.js";

dotenv.config();

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(name);
}

function option(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1 || !args[idx + 1]) return fallback;
  return args[idx + 1];
}

async function main() {
  const config = loadConfig();
  const siteFilter = option("--sites", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const sites = getSearchSites(siteFilter.length ? siteFilter : null);
  const printQueries = flag("--print-queries") || !hasSearchProvider();

  console.log("ATS job discovery (Google site: dorks)\n");
  console.log(`Profile:  ${formatPreferencesSummary(config.preferences)}`);
  console.log(`Sites:    ${sites.map((s) => s.label).join(", ")}\n`);

  const dorks = buildAllDorkQueries(sites, config.preferences, config.search || {});

  if (printQueries) {
    console.log("Google queries:\n");
    for (const dork of dorks) {
      console.log(`# ${dork.label}`);
      console.log(dork.query);
      console.log(dork.googleUrl);
      console.log();
    }
    if (!hasSearchProvider()) {
      console.log("Tip: add SERPER_API_KEY to .env for automated search (https://serper.dev)\n");
      return;
    }
    if (flag("--print-queries")) return;
  }

  const { jobs, boards } = await discoverAtsJobs(config, {
    siteFilter: siteFilter.length ? siteFilter : null,
    resultsPerSite: Number(option("--limit", config.search?.resultsPerSite || 10)),
    engineeringOnly: !flag("--all-roles"),
    addBoards: flag("--add-boards"),
    outputPath: option("--output", paths.discoveredJobs),
    onProgress: ({ current, total, label }) => {
      process.stdout.write(`\r[${current}/${total}] ${label}...`.padEnd(50));
    },
  });

  console.log(`\n\nSaved ${jobs.length} job(s) → ${paths.discoveredJobs}`);

  for (const job of jobs.slice(0, 15)) {
    console.log(`  • ${job.title} @ ${job.company}`);
    console.log(`    ${job.url}\n`);
  }

  if (boards.length && !flag("--add-boards")) {
    console.log(`${boards.length} new board URL(s) — run with --add-boards to add to careers.json`);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
