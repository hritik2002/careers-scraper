import { detectPlatform } from "../src/scraper/detect.js";
import { matchesPreferences } from "../src/filters/preferences.js";
import { isEngineeringJob } from "../src/filters/engineering.js";

const ATS_HOST_PATTERNS = [
  /jobs\.ashbyhq\.com/i,
  /greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /icims\.com/i,
  /jobvite\.com/i,
  /myworkdayjobs\.com/i,
  /bamboohr\.com/i,
  /smartrecruiters\.com/i,
  /apply\.jazz\.co/i,
  /workable\.com/i,
  /kula\.ai/i,
  /rippling\.com/i,
  /jobs\.gem\.com/i,
];

const NOISE_URL = [/google\.com/i, /linkedin\.com/i, /glassdoor\.com/i, /indeed\.com/i, /wikipedia\.org/i];

export function isAtsJobUrl(url) {
  try {
    const parsed = new URL(url);
    if (NOISE_URL.some((p) => p.test(parsed.hostname))) return false;
    return ATS_HOST_PATTERNS.some((p) => p.test(parsed.hostname));
  } catch {
    return false;
  }
}

export function extractBoardUrl(jobUrl) {
  try {
    const parsed = new URL(jobUrl);
    const host = parsed.hostname;
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (host.includes("ashbyhq.com") && parts.length >= 1) {
      return `https://jobs.ashbyhq.com/${parts[0]}`;
    }

    if (host.includes("greenhouse.io") && parts.length >= 1) {
      const slug = parts[0];
      return host.includes("job-boards")
        ? `https://job-boards.greenhouse.io/${slug}`
        : `https://job-boards.greenhouse.io/${slug}`;
    }

    if (host.includes("lever.co") && parts.length >= 1) {
      const slug = parts[0] === "jobs" ? parts[1] : parts[0];
      return slug ? `https://jobs.lever.co/${slug}` : null;
    }

    if (host.includes("workable.com") && parts.length >= 1) {
      return `https://apply.workable.com/${parts[0]}/`;
    }

    if (host.includes("smartrecruiters.com") && parts.length >= 1) {
      return `https://jobs.smartrecruiters.com/${parts[0]}`;
    }

    if (host.includes("kula.ai") && parts.length >= 1) {
      return `https://careers.kula.ai/${parts[0]}?jobs=true`;
    }

    if (host.includes("rippling.com") && parts.length >= 1) {
      const slug = parts[0];
      return `https://ats.rippling.com/${slug}/jobs`;
    }

    if (host.includes("jobs.gem.com") && parts.length >= 1) {
      return `https://jobs.gem.com/${parts[0]}`;
    }

    if (host.includes("myworkdayjobs.com")) {
      return jobUrl.split("/job/")[0] || jobUrl;
    }

    return null;
  } catch {
    return null;
  }
}

export function searchHitToJob(hit, sourceQuery) {
  const { platform, company } = detectPlatform(hit.url);
  const text = `${hit.title} ${hit.snippet}`.toLowerCase();

  return {
    title: cleanTitle(hit.title),
    company: company || guessCompanyFromUrl(hit.url) || "Unknown",
    location: guessLocation(hit.snippet) || "Not specified",
    department: "",
    team: "",
    url: hit.url,
    description: hit.snippet || hit.title,
    sourceUrl: sourceQuery,
    platform,
    _searchText: text,
  };
}

export function filterSearchJobs(jobs, { preferences, engineeringOnly }) {
  return jobs.filter((job) => {
    if (!isAtsJobUrl(job.url)) return false;
    if (engineeringOnly && !isEngineeringJob(job)) return false;
    return matchesPreferences(job, preferences);
  });
}

function cleanTitle(title) {
  return title
    .replace(/\s*[-|–]\s*.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guessCompanyFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length === 0) return null;
    const slug = parts[0] === "jobs" ? parts[1] : parts[0];
    return slug
      ?.replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return null;
  }
}

function guessLocation(snippet) {
  if (!snippet) return null;
  const lower = snippet.toLowerCase();
  const cities = [
    "bangalore",
    "bengaluru",
    "mumbai",
    "delhi",
    "hyderabad",
    "pune",
    "chennai",
    "gurgaon",
    "gurugram",
    "noida",
    "india",
    "remote",
  ];
  const found = cities.filter((c) => lower.includes(c));
  if (found.includes("remote")) return "Remote";
  if (found.includes("india")) return "India";
  if (found.length) return found[0].replace(/\b\w/g, (c) => c.toUpperCase());
  return null;
}
