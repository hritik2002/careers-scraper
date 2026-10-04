import { filterEngineeringJobs } from "../filters/engineering.js";
import { matchesPreferences } from "../filters/preferences.js";
import { uniqueBy } from "../utils.js";
import { createSourceContext } from "./crawl.js";
import { canonicalJobUrl } from "./parse.js";
import { scrapeYc, scrapeCosign } from "./boards.js";
import { scrapeBreakout, scrapeLenny, scrapeRamp } from "./directories.js";
import { scrapeNewsletter } from "./newsletters.js";
import { scrapeHn } from "./hn.js";

export const JOB_SOURCES = [
  { id: "yc", label: "YC job board", url: "https://www.ycombinator.com/jobs", scrape: scrapeYc },
  { id: "lenny", label: "Lenny's Jobs (public Lenny 100 employers)", url: "https://www.lennysjobs.com/lenny100", scrape: scrapeLenny },
  { id: "breakout", label: "Breakout List", url: "https://breakoutlist.com/", scrape: scrapeBreakout },
  { id: "hn", label: "HN Who's Hiring", url: "https://news.ycombinator.com/submitted?id=whoishiring", scrape: scrapeHn },
  { id: "founders-ysk", label: "Founders You Should Know", url: "https://newsletter.foundersysk.com/feed", scrape: scrapeNewsletter },
  { id: "ramp", label: "Ramp vendor reports", url: "https://ramp.com/vendors", scrape: scrapeRamp },
  { id: "a16z-build", label: "a16z Build newsletter", url: "https://a16zbuild.substack.com/feed", scrape: scrapeNewsletter },
  { id: "next-play", label: "Next Play newsletter", url: "https://nextplayso.substack.com/feed", scrape: scrapeNewsletter },
  { id: "cosign", label: "Cosign (public jobs)", url: "https://cosign.co/jobs", scrape: scrapeCosign },
];

const DEFAULTS = {
  enabled: true, maxJobsPerSource: 100, maxCompaniesPerSource: 25, maxPagesPerCompany: 3,
  maxFeedItems: 5, maxAgeDays: 60, hnThreads: 2, hnMaxComments: 300, requestTimeoutMs: 15000,
};

export function sourceSettings(config = {}) {
  const input = config.additionalSources || {};
  const settings = { ...DEFAULTS, ...input };
  for (const key of Object.keys(DEFAULTS).filter((key) => key !== "enabled")) {
    if (!Number.isInteger(settings[key]) || settings[key] < 1) throw new Error(`additionalSources.${key} must be a positive integer`);
  }
  const ids = settings.sources ?? JOB_SOURCES.map((source) => source.id);
  if (!Array.isArray(ids)) throw new Error("additionalSources.sources must be an array of source IDs");
  const unknown = ids.filter((id) => !JOB_SOURCES.some((source) => source.id === id));
  if (unknown.length) throw new Error(`Unknown additional job sources: ${unknown.join(", ")}`);
  return { ...settings, sources: [...new Set(ids)] };
}

export async function scrapeAdditionalSources(config, options = {}) {
  const settings = sourceSettings(config);
  if (!settings.enabled) return { jobs: [], reports: [] };
  const reports = [];
  const allJobs = [];
  const ctx = createSourceContext(settings, config, options);
  for (const source of JOB_SOURCES.filter((item) => settings.sources.includes(item.id))) {
    options.onProgress?.(source);
    try {
      let jobs = uniqueBy((await source.scrape(source, ctx)).map((job) => ({
        ...job, url: canonicalJobUrl(job.url),
      })).filter((job) => job.url && job.title && job.company), (job) => job.url);
      if (config.engineeringOnly) jobs = filterEngineeringJobs(jobs);
      // Enrich only plausible candidates, then let the main pipeline apply preferences again.
      jobs = jobs.filter((job) => config.preferences?.enabled === false || matchesPreferences(job, config.preferences));
      jobs = jobs.slice(0, settings.maxJobsPerSource);
      const enriched = [];
      for (const job of jobs) {
        enriched.push({ ...await ctx.enrich(job), source: source.id, sourceLabel: source.label,
          discoveryUrl: source.url });
      }
      allJobs.push(...enriched);
      reports.push({ id: source.id, label: source.label, status: "ok", count: enriched.length });
    } catch (error) {
      reports.push({ id: source.id, label: source.label, status: "error", count: 0, error: error.message });
    }
    options.onResult?.(reports.at(-1));
  }
  return { jobs: uniqueBy(allJobs, (job) => job.url), reports };
}
