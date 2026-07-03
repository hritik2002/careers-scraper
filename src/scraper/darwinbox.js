import { truncate, uniqueBy } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

export async function scrapeDarwinbox(sourceUrl, { maxJobs, engineeringOnly }) {
  const parsed = new URL(sourceUrl);
  const origin = `${parsed.protocol}//${parsed.hostname}`;
  const careersPath = parsed.pathname.includes("/candidate/careers")
    ? parsed.pathname.split("/careers")[0] + "/candidate/careers"
    : "/ms/candidate/careers";

  const company = hostnameToCompany(parsed.hostname);
  const session = await openDarwinboxSession(origin, careersPath);
  const jobs = [];
  let page = 1;

  while (jobs.length < maxJobs) {
    const batch = await fetchDarwinboxPage(origin, careersPath, page, session);
    if (!batch.length) break;

    for (const job of batch) {
      jobs.push(mapDarwinboxJob(job, company, origin, careersPath, sourceUrl));
      if (jobs.length >= maxJobs) break;
    }

    if (batch.length < 20) break;
    page++;
  }

  let results = uniqueBy(jobs, (j) => j.url);
  if (results.length === 0) {
    throw new Error(`No jobs found on ${sourceUrl}`);
  }
  if (engineeringOnly) results = filterEngineeringJobs(results);
  if (results.length === 0) {
    throw new Error(`No engineering jobs found on ${sourceUrl}`);
  }
  return results.slice(0, maxJobs);
}

async function fetchDarwinboxPage(origin, careersPath, page, session) {
  const apiUrl = `${origin}/ms/candidateapi/job?page=${page}`;
  const apiHeaders = {
    ...DEFAULT_HEADERS,
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: session.cookies,
    Referer: `${origin}${careersPath}`,
    Origin: origin,
  };

  let response = await fetch(apiUrl, { headers: apiHeaders });
  if (response.status === 403) {
    await new Promise((r) => setTimeout(r, 500));
    Object.assign(session, await openDarwinboxSession(origin, careersPath));
    response = await fetch(apiUrl, { headers: { ...apiHeaders, Cookie: session.cookies } });
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for Darwinbox job API`);
  }

  const data = await response.json();
  if (data.status !== "success") {
    throw new Error(data.message || "Darwinbox job API returned an error");
  }

  return data.message?.jobs || [];
}

async function openDarwinboxSession(origin, careersPath) {
  const response = await fetch(`${origin}${careersPath}`, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for Darwinbox careers page`);
  }

  await response.text();
  const cookies = (response.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
  return { cookies };
}

function mapDarwinboxJob(job, company, origin, careersPath, sourceUrl) {
  const title = (job.designation_display_name || job.title || "").trim();
  const location = job.officelocation_show_arr || job.tool_tip_locations || "Not specified";

  return {
    title,
    company,
    location: String(location).trim() || "Not specified",
    department: job.department || job.functional_area || "",
    team: "",
    url: `${origin}${careersPath}/job/${job.id}`,
    description: truncate(
      [
        title,
        job.department,
        job.functional_area,
        job.experience_from_num && `Experience: ${job.experience_from_num}-${job.experience_to_num} years`,
      ]
        .filter(Boolean)
        .join("\n")
    ),
    sourceUrl,
  };
}

function hostnameToCompany(hostname) {
  const slug = hostname.split(".")[0];
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}
