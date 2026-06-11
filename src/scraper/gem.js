import * as cheerio from "cheerio";
import { fetchText, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeGem(sourceUrl, { maxJobs, engineeringOnly }) {
  const html = await fetchText(sourceUrl);
  const $ = cheerio.load(html);
  const boardSlug = extractGemBoardSlug(sourceUrl, $);

  const candidates = [];
  $('a[href*="jobs.gem.com"]').each((_, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !text) return;

    const title = text.split(/San Francisco|Remote|Full Time|United States/i)[0].trim();
    if (!title) return;

    candidates.push({
      title,
      company: boardSlugToCompany(boardSlug),
      location: extractLocation(text),
      department: "",
      team: "",
      url: href.startsWith("http") ? href : `https://jobs.gem.com${href}`,
      description: title,
      sourceUrl,
    });
  });

  let jobs = dedupeByUrl(candidates);
  if (jobs.length === 0) {
    throw new Error(`No job listings found on ${sourceUrl}`);
  }

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);

  if (jobs.length === 0) {
    throw new Error(`No matching jobs found on ${sourceUrl}`);
  }

  return jobs.slice(0, maxJobs).map((job) => ({
    ...job,
    description: truncate(job.description),
  }));
}

function extractGemBoardSlug(sourceUrl, $) {
  const fromLink = $('a[href*="jobs.gem.com/"]')
    .attr("href")
    ?.match(/jobs\.gem\.com\/([^/]+)/)?.[1];
  if (fromLink) return fromLink;

  const fromUrl = sourceUrl.match(/jobs\.gem\.com\/([^/]+)/)?.[1];
  if (fromUrl) return fromUrl;

  return new URL(sourceUrl).hostname.replace(/^www\./, "").split(".")[0];
}

function boardSlugToCompany(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractLocation(text) {
  const match = text.match(/(San Francisco|Remote|India|Bengaluru|Bangalore|Mumbai)[^·]*/i);
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
