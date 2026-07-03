import { truncate, uniqueBy } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

/** Known Zwayam career sites — companyId is base64-encoded in their frontend config. */
const ZWAYAM_SITES = {
  "careers.cult.fit": {
    companyId: "MTU0NzA=",
    domain: "careers.cult.fit",
    company: "Cultfit",
    jobPathPrefix: "/cult",
  },
};

export async function scrapeZwayam(sourceUrl, { maxJobs, engineeringOnly }, meta = {}) {
  const parsed = new URL(sourceUrl);
  const site =
    ZWAYAM_SITES[parsed.hostname] ||
    (meta.companyId && meta.domain
      ? { companyId: meta.companyId, domain: meta.domain, company: meta.company || parsed.hostname, jobPathPrefix: meta.jobPathPrefix || "" }
      : null);

  if (!site) {
    throw new Error(`Unknown Zwayam site ${parsed.hostname}. Add it to ZWAYAM_SITES or pass companyId/domain metadata.`);
  }

  const jobs = [];
  const pageSize = 10;
  let paginationStartNo = 0;

  while (jobs.length < maxJobs) {
    const batch = await fetchZwayamJobs(site, paginationStartNo);
    if (!batch.length) break;

    for (const job of batch) {
      if (job.otherStatusTwo === "Closed") continue;
      jobs.push(mapZwayamJob(job, site, sourceUrl));
      if (jobs.length >= maxJobs) break;
    }

    if (batch.length < pageSize) break;
    paginationStartNo += pageSize;
  }

  let results = uniqueBy(jobs, (j) => j.url);
  if (results.length === 0) {
    throw new Error(`No open jobs found on ${sourceUrl}`);
  }
  if (engineeringOnly) results = filterEngineeringJobs(results);
  if (results.length === 0) {
    throw new Error(`No engineering jobs found on ${sourceUrl}`);
  }
  return results.slice(0, maxJobs);
}

async function fetchZwayamJobs(site, paginationStartNo) {
  const form = new FormData();
  form.append(
    "filterCri",
    JSON.stringify({
      paginationStartNo,
      selectedCall: "sort",
      sortCriteria: { name: "modifiedDate", isAscending: false },
      anyOfTheseWords: "",
    })
  );
  form.append("domain", site.domain);
  form.append("companyId", site.companyId);

  const response = await fetch("https://public.zwayam.com/jobs/search", {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      Accept: "application/json",
      Origin: `https://${site.domain}`,
      Referer: `https://${site.domain}${site.jobPathPrefix || ""}/jobslist`,
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for Zwayam jobs/search`);
  }

  const data = await response.json();
  if (data.code !== 200) {
    throw new Error(data.message || `Zwayam API error (code ${data.code})`);
  }

  return (data.data?.data || []).map((hit) => hit._source || hit);
}

function mapZwayamJob(source, site, sourceUrl) {
  const title = source.roles || source.role || source.jobTitle || source.title || "Untitled role";
  const jobId = source.jobId || source.id;
  const careerUrl = source.careerUrl || buildZwayamJobUrl(site, jobId, source.referenceNumber);

  return {
    title: title.trim(),
    company: site.company,
    location: source.officeLocation || source.locationDisplayForManageJobs || source.locationSeparatedbySlash || "Not specified",
    department: source.departmentName || source.subDepartment || "",
    team: source.jobFunction || "",
    url: careerUrl,
    description: truncate(
      [
        title,
        source.responsibility,
        source.jdSkillsNew,
        source.yrsOfExperience && `Experience: ${source.yrsOfExperience}`,
      ]
        .filter(Boolean)
        .join("\n")
    ),
    sourceUrl,
  };
}

function buildZwayamJobUrl(site, jobId, referenceNumber) {
  const prefix = site.jobPathPrefix || "";
  const jobUrl = `https://${site.domain}${prefix}/jobs/${jobId || referenceNumber}`;
  return `https://${site.domain}${prefix}/job_preview/?jobUrl=${encodeURIComponent(jobUrl)}`;
}

export function extractZwayamSite(hostname) {
  return ZWAYAM_SITES[hostname] || null;
}
