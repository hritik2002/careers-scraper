import { fetchJson, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeLever(company, sourceUrl, { maxJobs, engineeringOnly }) {
  const apiUrl = `https://api.lever.co/v0/postings/${company}?mode=json`;

  const postings = await fetchJson(apiUrl);
  let jobs = postings.map((job) => ({
    title: job.text,
    company,
    location: formatLeverLocation(job.categories),
    department: job.categories?.department || "",
    team: job.categories?.team || "",
    url: job.hostedUrl || job.applyUrl,
    description: truncate(buildLeverDescription(job)),
    sourceUrl,
  }));

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  return jobs.slice(0, maxJobs);
}

function formatLeverLocation(categories = {}) {
  const parts = [categories.location, categories.commitment, categories.team].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Not specified";
}

function buildLeverDescription(job) {
  const sections = [];
  if (job.description) sections.push(stripHtml(job.description));
  if (job.lists) {
    for (const list of job.lists) {
      sections.push(`${list.text}: ${stripHtml(list.content)}`);
    }
  }
  if (job.additional) sections.push(stripHtml(job.additional));
  return sections.join("\n\n");
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
