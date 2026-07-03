import { fetchJson, truncate } from "../src/utils.js";
import { filterEngineeringJobs } from "../src/filters/engineering.js";
import { matchesLocationPreference } from "../src/filters/preferences.js";

const INDIA_PATTERN = /\b(india|indian|mumbai|bangalore|bengaluru|delhi|gurgaon|gurugram|noida|hyderabad|pune|chennai|kolkata|ahmedabad|pan india)\b/i;
const FULL_REMOTE_PATTERN =
  /\b(worldwide|anywhere|global remote|work from anywhere|location flexible|fully remote|100% remote|remote - global|remote \(global\))\b/i;
const REMOTE_PATTERN = /\bremote\b/i;
const US_ONLY_REMOTE_PATTERN = /\b(united states|usa|u\.s\.|us only|us-remote|remote - us|remote \(us\)|san francisco|new york|seattle|austin|los angeles|chicago|boston)\b/i;

export function gemBoardUrl(slug) {
  return `https://jobs.gem.com/${slug}`;
}

export function gemApiUrl(slug) {
  return `https://api.gem.com/job_board/v0/${slug}/job_posts/`;
}

export function extractGemSlug(url) {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("jobs.gem.com")) return null;
    const slug = parsed.pathname.split("/").filter(Boolean)[0];
    return slug?.split("?")[0] || null;
  } catch {
    return null;
  }
}

export async function fetchGemPostings(slug) {
  const data = await fetchJson(gemApiUrl(slug));
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected Gem API response for ${slug}`);
  }
  return data;
}

export function formatGemOffices(offices = []) {
  return offices
    .map((office) => office.location?.name || office.name || "")
    .filter(Boolean)
    .join(" · ");
}

export function isIndiaOrFullRemoteLocation(locationText = "") {
  const text = locationText.toLowerCase();
  if (INDIA_PATTERN.test(text)) return true;
  if (FULL_REMOTE_PATTERN.test(text)) return true;
  if (REMOTE_PATTERN.test(text) && !US_ONLY_REMOTE_PATTERN.test(text)) return true;
  return false;
}

export function postingMatchesIndiaOrRemote(posting) {
  const offices = posting.offices || [];
  const locationText = [formatGemOffices(offices), posting.location?.name || ""].join(" ");
  return isIndiaOrFullRemoteLocation(locationText);
}

export function mapGemPosting(posting, { company, sourceUrl }) {
  const location = formatGemOffices(posting.offices) || posting.location?.name || "Not specified";
  return {
    title: posting.title,
    company,
    location,
    department: posting.departments?.[0]?.name || "",
    team: "",
    url: posting.absolute_url,
    description: truncate(stripHtml(posting.content || posting.title)),
    sourceUrl,
    platform: "gem",
  };
}

export async function scrapeGemBoard(slug, sourceUrl, { maxJobs, engineeringOnly, indiaOrRemoteOnly = false } = {}) {
  const postings = await fetchGemPostings(slug);
  const boardUrl = sourceUrl || gemBoardUrl(slug);
  const company = slugToCompany(slug);

  let jobs = postings.map((posting) => mapGemPosting(posting, { company, sourceUrl: boardUrl }));

  if (indiaOrRemoteOnly) {
    jobs = jobs.filter((job, i) => postingMatchesIndiaOrRemote(postings[i]));
  }

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  if (maxJobs) jobs = jobs.slice(0, maxJobs);

  return jobs;
}

/** True if the board has at least one open India or full-remote role. */
export async function gemBoardHiresIndiaOrRemote(slug, { engineeringOnly = false } = {}) {
  try {
    const postings = await fetchGemPostings(slug);
    let eligible = postings.filter(postingMatchesIndiaOrRemote);
    if (engineeringOnly) {
      eligible = eligible.filter((p) =>
        filterEngineeringJobs([{ title: p.title, description: p.content || "" }]).length > 0
      );
    }
    return { ok: eligible.length > 0, jobCount: eligible.length, total: postings.length };
  } catch {
    return { ok: false, jobCount: 0, total: 0 };
  }
}

export function filterGemBoardsByPreferences(jobs, preferences) {
  return jobs.filter((job) => matchesLocationPreference(job, preferences));
}

function slugToCompany(slug) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
