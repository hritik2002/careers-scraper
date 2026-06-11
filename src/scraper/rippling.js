import * as cheerio from "cheerio";
import { fetchText, normalizeUrl, truncate, uniqueBy } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeRippling(boardSlug, sourceUrl, { maxJobs, engineeringOnly }) {
  const html = await fetchText(sourceUrl);
  const $ = cheerio.load(html);
  const company = boardSlugToCompany(boardSlug);
  const candidates = [];

  $(`a[href*="/${boardSlug}/jobs/"]`).each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || !title || title.toLowerCase() === "view job") return;

    const url = normalizeUrl(href, sourceUrl);
    if (!url) return;

    candidates.push({
      title,
      company,
      location: "Not specified",
      department: "",
      team: "",
      url,
      description: title,
      sourceUrl,
    });
  });

  let jobs = uniqueBy(candidates, (job) => job.url);
  if (jobs.length === 0) {
    throw new Error(`No job listings found on ${sourceUrl}`);
  }

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  if (jobs.length === 0) {
    throw new Error(`No matching jobs found on ${sourceUrl}`);
  }

  const pageText = $("body").text().replace(/\s+/g, " ").trim();
  return jobs.slice(0, maxJobs).map((job) => ({
    ...job,
    description: truncate(`${job.title}\n\n${pageText}`, 6000),
  }));
}

function boardSlugToCompany(boardSlug) {
  return boardSlug
    .replace(/-careers$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
