import { fetchJson, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeWorkable(account, sourceUrl, { maxJobs, engineeringOnly }) {
  const data = await fetchJson(`https://apply.workable.com/api/v1/widget/accounts/${account}`);
  const jobs = (data.jobs || []).map((job) => mapWorkableJob(job, data.name || account, sourceUrl));

  if (jobs.length === 0) {
    throw new Error(`No job listings found on ${sourceUrl}`);
  }

  let filtered = jobs;
  if (engineeringOnly) filtered = filterEngineeringJobs(jobs);

  if (filtered.length === 0) {
    throw new Error(`No matching jobs found on ${sourceUrl}`);
  }

  return filtered.slice(0, maxJobs);
}

function mapWorkableJob(job, company, sourceUrl) {
  const locationParts = [job.city, job.state, job.country].filter(Boolean);
  const location = locationParts.join(", ") || "Not specified";

  return {
    title: job.title,
    company,
    location: job.telecommuting ? `${location} (Remote)`.replace(/^ \(Remote\)$/, "Remote") : location,
    department: job.department || job.function || "",
    team: "",
    url: job.url || job.application_url,
    description: truncate(
      [job.title, job.department, job.function, job.industry, job.experience, job.education]
        .filter(Boolean)
        .join("\n\n")
    ),
    sourceUrl,
  };
}
