import { fetchJson, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeSmartRecruiters(company, sourceUrl, { maxJobs, engineeringOnly }) {
  const data = await fetchJson(
    `https://api.smartrecruiters.com/v1/companies/${company}/postings?limit=${maxJobs}`
  );
  let jobs = (data.content || []).map((job) => ({
    title: job.name,
    company: job.company?.name || company,
    location: formatLocation(job.location),
    department: job.department?.label || "",
    team: "",
    url: job.ref || `https://jobs.smartrecruiters.com/${company}/${job.id}`,
    description: truncate([job.name, job.department?.label, job.typeOfEmployment?.label].filter(Boolean).join("\n")),
    sourceUrl,
  }));

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  if (jobs.length === 0) throw new Error(`No job listings found on ${sourceUrl}`);
  return jobs.slice(0, maxJobs);
}

function formatLocation(location = {}) {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  if (location.remote) return parts.length ? `${parts.join(", ")} (Remote)` : "Remote";
  return parts.join(", ") || "Not specified";
}
