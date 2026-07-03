import { writeFileSync } from "fs";
import { ATS_SEARCH_SITES, getSearchSites } from "./ats-sites.js";
import { buildAllDorkQueries } from "./dork-queries.js";
import { runSearch, hasSearchProvider } from "./search-providers.js";
import {
  searchHitToJob,
  filterSearchJobs,
  extractBoardUrl,
  isAtsJobUrl,
} from "./parse-search-hits.js";
import { addCareerUrl, getCareerUrls } from "./careers.js";
import { paths } from "./paths.js";
import { sleep, uniqueBy } from "../src/utils.js";
import { expandLeverDiscoverJobs, extractLeverSlug } from "./lever-api.js";

/**
 * Discover India engineering jobs on ATS boards via Google site: dorks.
 * Returns job objects compatible with the main scraper pipeline.
 */
export async function discoverAtsJobs(config, options = {}) {
  const {
    siteFilter = null,
    resultsPerSite = config.search?.resultsPerSite ?? 10,
    engineeringOnly = config.engineeringOnly ?? true,
    addBoards = false,
    saveOutput = true,
    outputPath = paths.discoveredJobs,
    onProgress,
  } = options;

  if (!hasSearchProvider()) {
    return { jobs: [], boards: [], queries: [], skipped: true };
  }

  const searchConfig = config.search || {};
  const sites = getSearchSites(siteFilter?.length ? siteFilter : null);
  const dorks = buildAllDorkQueries(sites, config.preferences, searchConfig);
  const allHits = [];
  const existingBoards = new Set(getCareerUrls());

  for (let i = 0; i < dorks.length; i++) {
    const dork = dorks[i];
    onProgress?.({ phase: "discover", current: i + 1, total: dorks.length, label: dork.label });

    try {
      const results = await runSearch(dork.query, { maxResults: resultsPerSite });
      const jobs = results
        .filter((r) => isAtsJobUrl(r.url))
        .map((r) => searchHitToJob(r, dork.query));

      const filtered = filterSearchJobs(jobs, {
        preferences: config.preferences,
        engineeringOnly,
      });

      allHits.push(
        ...filtered.map((j) => ({
          ...j,
          source: "discover",
          site: dork.site,
          siteLabel: dork.label,
        }))
      );
    } catch {
      /* continue with next site */
    }

    await sleep(400);
  }

  let uniqueJobs = uniqueBy(allHits, (j) => j.url);

  if (uniqueJobs.some((j) => extractLeverSlug(j.url))) {
    onProgress?.({ phase: "lever-api", label: "Expanding Lever boards via JSON API..." });
    uniqueJobs = uniqueBy(
      await expandLeverDiscoverJobs(uniqueJobs, { engineeringOnly, preferences: config.preferences }),
      (j) => j.url
    );
  }

  const boards = new Map();

  for (const job of uniqueJobs) {
    const board = extractBoardUrl(job.url);
    if (board && !existingBoards.has(board)) {
      boards.set(board, { url: board, platform: job.platform, sampleJob: job.title });
    }
  }

  const boardList = [...boards.values()];

  if (addBoards) {
    for (const board of boardList) {
      addCareerUrl(board.url, { status: "unverified" });
    }
  }

  const output = {
    discoveredAt: new Date().toISOString(),
    preferences: config.preferences,
    sites: sites.map((s) => s.id),
    jobCount: uniqueJobs.length,
    boardCount: boardList.length,
    jobs: uniqueJobs,
    boards: boardList,
    queries: dorks.map((d) => ({ site: d.site, query: d.query, googleUrl: d.googleUrl })),
  };

  if (saveOutput) {
    writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  }

  return {
    jobs: uniqueJobs,
    boards: boardList,
    queries: dorks,
    skipped: false,
  };
}

export { hasSearchProvider, ATS_SEARCH_SITES };
