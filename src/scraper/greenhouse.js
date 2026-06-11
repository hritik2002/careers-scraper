import { fetchJson, fetchText, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";
import * as cheerio from "cheerio";

export async function scrapeGreenhouse(company, sourceUrl, { maxJobs, engineeringOnly }) {
  const listUrl = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
  const contentUrl = `${listUrl}?content=true`;

  try {
    const data = await fetchJson(contentUrl);
    let jobs = (data.jobs || []).map((job) => ({
      title: job.title,
      company,
      location: job.location?.name || "Not specified",
      department: job.departments?.map((d) => d.name).join(", ") || "",
      team: job.offices?.map((o) => o.name).join(", ") || "",
      url: job.absolute_url,
      description: truncate(stripHtml(job.content || "")),
      sourceUrl,
    }));

    if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
    return jobs.slice(0, maxJobs);
  } catch {
    return scrapeGreenhouseHtml(company, sourceUrl, { maxJobs, engineeringOnly });
  }
}

async function scrapeGreenhouseHtml(company, sourceUrl, { maxJobs, engineeringOnly }) {
  const html = await fetchText(sourceUrl);
  const $ = cheerio.load(html);
  let jobs = [];

  $("a[href*='/jobs/']").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().trim();
    if (!href || !title) return;

    const url = href.startsWith("http") ? href : `https://boards.greenhouse.io${href}`;
    jobs.push({
      title,
      company,
      location: "Not specified",
      department: "",
      team: "",
      url,
      description: title,
      sourceUrl,
    });
  });

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  return jobs.slice(0, maxJobs);
}

function stripHtml(html) {
  return cheerio.load(html).text().replace(/\s+/g, " ").trim();
}
