import { truncate, uniqueBy } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

const API_BASE = "https://app.api.talentrecruit.com/api/v1";
const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

export async function scrapeTalentRecruit(sourceUrl, { maxJobs, engineeringOnly }) {
  const parsed = new URL(sourceUrl);
  const domain = extractTalentRecruitDomain(parsed);
  const company = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);

  const jobs = [];
  let offset = 0;
  const limit = Math.min(Math.max(maxJobs, 10), 200);

  while (jobs.length < maxJobs) {
    const batch = await fetchTalentRecruitJobs(domain, sourceUrl, { limit, offset });
    if (!batch.length) break;

    for (const job of batch) {
      jobs.push(mapTalentRecruitJob(job, company, sourceUrl));
      if (jobs.length >= maxJobs) break;
    }

    if (batch.length < limit) break;
    offset += limit;
  }

  let results = uniqueBy(jobs, (j) => j.url);
  if (engineeringOnly) results = filterEngineeringJobs(results);
  if (results.length === 0) {
    throw new Error(`No matching jobs found on ${sourceUrl}`);
  }
  return results.slice(0, maxJobs);
}

async function fetchTalentRecruitJobs(domain, sourceUrl, { limit, offset }) {
  const url = `${API_BASE}/career/template/job/list?domain=${encodeURIComponent(domain)}&limit=${limit}&offset=${offset}`;
  const response = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      Origin: sourceUrl.replace(/\/[^/]*$/, ""),
      Referer: sourceUrl,
    },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid TalentRecruit response from ${url}`);
  }

  if (!response.ok || data.error) {
    throw new Error(data.message || `TalentRecruit API error (${response.status})`);
  }

  const list = data.data?.jobs || data.data?.jobList || data.data || data.jobs || [];
  return Array.isArray(list) ? list : [];
}

function mapTalentRecruitJob(job, company, sourceUrl) {
  const title = (job.jobTitle || job.title || job.designation || job.name || "").trim();
  const jobId = job.jobId || job.id || job.reqId;
  const location = job.location || job.city || job.jobLocation || "Not specified";
  const applyPath = jobId ? `/career-page/apply/${jobId}` : "";

  return {
    title,
    company: job.companyName || company,
    location: String(location).trim() || "Not specified",
    department: job.department || job.departmentName || "",
    team: "",
    url: applyPath ? new URL(applyPath, sourceUrl).href : sourceUrl,
    description: truncate([title, job.description, job.skills].filter(Boolean).join("\n")),
    sourceUrl,
  };
}

function extractTalentRecruitDomain(parsed) {
  if (parsed.hostname.endsWith(".talentrecruit.com")) {
    return parsed.hostname;
  }
  return parsed.hostname;
}

export function isTalentRecruitUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes("talentrecruit.com");
  } catch {
    return false;
  }
}
