import { truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

export async function scrapeWorkday(sourceUrl, { maxJobs, engineeringOnly }) {
  const { tenant, site, wd } = parseWorkdayUrl(sourceUrl);
  const api = `https://${tenant}.${wd}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;

  const response = await fetch(api, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ limit: maxJobs, offset: 0, searchText: "" }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${sourceUrl}`);
  const data = await response.json();

  let jobs = (data.jobPostings || []).map((job) => ({
    title: job.title,
    company: tenant,
    location: job.locationsText || job.location || "Not specified",
    department: job.timeType || "",
    team: "",
    url: `https://${tenant}.${wd}.myworkdayjobs.com${job.externalPath}`,
    description: truncate(job.title),
    sourceUrl,
  }));

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  if (jobs.length === 0) throw new Error(`No job listings found on ${sourceUrl}`);
  return jobs.slice(0, maxJobs);
}

export function parseWorkdayUrl(sourceUrl) {
  const parsed = new URL(sourceUrl);
  const [tenant, wdHost] = parsed.hostname.split(".");
  const wd = wdHost?.startsWith("wd") ? wdHost : "wd1";
  const parts = parsed.pathname.split("/").filter(Boolean);
  const site = parts.find((part) => !/^[a-z]{2}-[A-Z]{2}$/.test(part)) || parts[1] || "Careers";

  return { tenant, site, wd };
}
