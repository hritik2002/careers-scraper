import * as cheerio from "cheerio";
import { fetchText, normalizeUrl, truncate, uniqueBy } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeRippling(boardSlug, sourceUrl, { maxJobs, engineeringOnly }) {
  const html = await fetchText(sourceUrl);
  const company = boardSlugToCompany(boardSlug);

  let jobs = parseRipplingNextData(html, sourceUrl, company);
  if (!jobs.length) {
    jobs = parseRipplingHtmlLinks(html, sourceUrl, boardSlug, company);
  }

  if (jobs.length === 0) {
    throw new Error(`No job listings found on ${sourceUrl}`);
  }

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  if (jobs.length === 0) {
    throw new Error(`No matching jobs found on ${sourceUrl}`);
  }

  const pageText = cheerio.load(html)("body").text().replace(/\s+/g, " ").trim();
  return jobs.slice(0, maxJobs).map((job) => ({
    ...job,
    description: truncate(`${job.title}\n\n${pageText}`, 6000),
  }));
}

/** Rippling is a Next.js SPA — jobs are embedded in __NEXT_DATA__. */
export function parseRipplingNextData(html, sourceUrl, company) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return [];

  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const queries = data.props?.pageProps?.dehydratedState?.queries || [];
  const items = [];

  for (const query of queries) {
    const list = query.state?.data?.items;
    if (!Array.isArray(list)) continue;

    for (const item of list) {
      if (!item?.name || !item?.url?.includes("/jobs/")) continue;
      items.push({
        title: item.name.trim(),
        company,
        location: formatRipplingLocation(item.locations),
        department: item.department?.name || "",
        team: "",
        url: normalizeUrl(item.url, sourceUrl) || item.url,
        description: item.name.trim(),
        sourceUrl,
      });
    }
  }

  return uniqueBy(items, (job) => job.url);
}

function parseRipplingHtmlLinks(html, sourceUrl, boardSlug, company) {
  const $ = cheerio.load(html);
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

  return uniqueBy(candidates, (job) => job.url);
}

function formatRipplingLocation(locations) {
  if (!Array.isArray(locations) || locations.length === 0) return "Not specified";
  return locations
    .map((loc) => loc.name || [loc.city, loc.state, loc.country].filter(Boolean).join(", "))
    .filter(Boolean)
    .join(" · ") || "Not specified";
}

function boardSlugToCompany(boardSlug) {
  return boardSlug
    .replace(/-careers$/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Count jobs from a Rippling board page (for probing). */
export function countRipplingJobs(html) {
  return parseRipplingNextData(html, "", "").length;
}
