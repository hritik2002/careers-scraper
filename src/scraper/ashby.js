import { fetchJson, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeAshby(company, sourceUrl, { maxJobs, engineeringOnly }) {
  const apiUrl = `https://api.ashbyhq.com/posting-api/job-board/${company}`;

  const data = await fetchJson(apiUrl);
  let jobs = (data.jobs || []).map((job) => ({
    title: job.title,
    company: data.organizationName || company,
    location: job.location || "Not specified",
    department: job.department || "",
    team: job.team || "",
    url: job.jobUrl,
    description: truncate(
      [job.title, job.department, job.team, job.descriptionPlain, job.descriptionHtml]
        .filter(Boolean)
        .join("\n\n")
    ),
    sourceUrl,
  }));

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  return jobs.slice(0, maxJobs);
}
