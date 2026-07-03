import { scrapeGemBoard, extractGemSlug } from "../../lib/gem-api.js";
import * as cheerio from "cheerio";
import { fetchText, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

/** Scrape a Gem board via the public Job Board API (jobs.gem.com/{slug}). */
export async function scrapeGem(sourceUrl, options) {
  const slug = extractGemSlug(sourceUrl);
  if (slug) {
    return scrapeGemBoard(slug, sourceUrl, {
      ...options,
      indiaOrRemoteOnly: options.indiaOrRemoteOnly ?? false,
    });
  }

  // Fallback: company careers page linking to Gem job posts
  return scrapeGemCareersPage(sourceUrl, options);
}

async function scrapeGemCareersPage(sourceUrl, { maxJobs, engineeringOnly }) {
  const html = await fetchText(sourceUrl);
  const $ = cheerio.load(html);
  const boardSlug = $('a[href*="jobs.gem.com/"]')
    .attr("href")
    ?.match(/jobs\.gem\.com\/([^/]+)/)?.[1];

  if (boardSlug) {
    return scrapeGemBoard(boardSlug, sourceUrl, { maxJobs, engineeringOnly });
  }

  const candidates = [];
  $('a[href*="jobs.gem.com"]').each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !text) return;

    candidates.push({
      title: text.split(/San Francisco|Remote|Full Time|United States|India/i)[0].trim(),
      company: new URL(sourceUrl).hostname.replace(/^www\./, "").split(".")[0],
      location: extractLocation(text),
      department: "",
      team: "",
      url: href.startsWith("http") ? href : `https://jobs.gem.com${href}`,
      description: truncate(text),
      sourceUrl,
    });
  });

  let jobs = dedupeByUrl(candidates.filter((j) => j.title));
  if (jobs.length === 0) throw new Error(`No job listings found on ${sourceUrl}`);
  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  return jobs.slice(0, maxJobs);
}

function extractLocation(text) {
  const match = text.match(/(India|Remote|Bengaluru|Bangalore|Mumbai|Worldwide)[^·]*/i);
  return match ? match[0].trim() : "Not specified";
}

function dedupeByUrl(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    if (seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });
}
