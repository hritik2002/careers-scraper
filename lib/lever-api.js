import { fetchJson, truncate } from "../src/utils.js";
import { filterEngineeringJobs } from "../src/filters/engineering.js";
import { matchesPreferences } from "../src/filters/preferences.js";

/** Public Lever JSON API — no auth required. */
export function leverApiUrl(slug) {
  return `https://api.lever.co/v0/postings/${slug}?mode=json`;
}

export function leverBoardUrl(slug) {
  return `https://jobs.lever.co/${slug}`;
}

export function extractLeverSlug(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "api.lever.co") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const idx = parts.indexOf("postings");
      return idx >= 0 ? parts[idx + 1] : null;
    }
    if (parsed.hostname.includes("lever.co")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (parts[0] === "jobs" || parts[0] === "careers") return parts[1] || null;
      return parts[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchLeverPostings(slug) {
  const data = await fetchJson(leverApiUrl(slug));
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected Lever API response for ${slug}`);
  }
  return data;
}

export function mapLeverPosting(posting, { company, sourceUrl }) {
  return {
    title: posting.text,
    company,
    location: formatLeverLocation(posting),
    department: posting.categories?.department || "",
    team: posting.categories?.team || "",
    url: posting.hostedUrl || posting.applyUrl,
    description: truncate(buildLeverDescription(posting)),
    sourceUrl,
    platform: "lever",
  };
}

export async function scrapeLeverBoard(slug, sourceUrl, { maxJobs, engineeringOnly } = {}) {
  const postings = await fetchLeverPostings(slug);
  let jobs = postings.map((posting) =>
    mapLeverPosting(posting, { company: slug, sourceUrl: sourceUrl || leverBoardUrl(slug) })
  );

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  if (maxJobs) jobs = jobs.slice(0, maxJobs);
  return jobs;
}

/**
 * Replace sparse Lever search hits with full board listings from the JSON API.
 */
export async function expandLeverDiscoverJobs(jobs, { engineeringOnly, preferences } = {}) {
  const slugs = new Set();
  for (const job of jobs) {
    const slug = extractLeverSlug(job.url);
    if (slug) slugs.add(slug);
  }

  if (slugs.size === 0) return jobs;

  const nonLever = jobs.filter((job) => !extractLeverSlug(job.url));
  const expanded = [];

  for (const slug of slugs) {
    try {
      const postings = await fetchLeverPostings(slug);
      const sourceUrl = leverBoardUrl(slug);

      let boardJobs = postings.map((posting) =>
        mapLeverPosting(posting, { company: slug, sourceUrl })
      );

      if (engineeringOnly) boardJobs = filterEngineeringJobs(boardJobs);
      if (preferences?.enabled !== false) {
        boardJobs = boardJobs.filter((job) => matchesPreferences(job, preferences));
      }

      expanded.push(
        ...boardJobs.map((job) => ({
          ...job,
          source: "discover",
          site: "lever",
          siteLabel: slug,
        }))
      );
    } catch {
      /* keep original hits for this slug if API fails */
      expanded.push(...jobs.filter((job) => extractLeverSlug(job.url) === slug));
    }
  }

  return [...expanded, ...nonLever];
}

function formatLeverLocation(posting) {
  const { categories = {}, workplaceType, country } = posting;
  const locations = categories.allLocations?.length
    ? categories.allLocations
    : [categories.location].filter(Boolean);

  const parts = [...locations];
  if (workplaceType) parts.push(workplaceType);
  if (country && !parts.some((p) => p?.includes(country))) {
    parts.push(country);
  }
  if (categories.commitment) parts.push(categories.commitment);

  return parts.length ? [...new Set(parts)].join(" · ") : "Not specified";
}

function buildLeverDescription(posting) {
  const sections = [];
  const body = posting.descriptionPlain || posting.descriptionBodyPlain;
  if (body) sections.push(body);
  else if (posting.description) sections.push(stripHtml(posting.description));

  if (posting.lists) {
    for (const list of posting.lists) {
      const content = list.content ? stripHtml(list.content) : "";
      sections.push(`${list.text}: ${content}`);
    }
  }

  const extra = posting.additionalPlain || posting.additional;
  if (extra) sections.push(typeof extra === "string" && extra.includes("<") ? stripHtml(extra) : extra);

  return sections.join("\n\n");
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
