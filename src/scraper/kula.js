import * as cheerio from "cheerio";
import { fetchText, sleep, truncate } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

export async function scrapeKula(slug, sourceUrl, { maxJobs, engineeringOnly }) {
  const listHtml = await fetchText(sourceUrl);
  const ids = [
    ...new Set([...listHtml.matchAll(new RegExp(`/${slug}/(\\d+)`, "g"))].map((m) => m[1])),
  ];

  if (ids.length === 0) {
    throw new Error(`No job listings found on ${sourceUrl}`);
  }

  const company = slugToCompany(slug);
  const jobs = [];

  for (const id of ids) {
    if (jobs.length >= maxJobs) break;

    const jobUrl = `https://careers.kula.ai/${slug}/${id}`;
    const detailHtml = await fetchText(jobUrl);
    const job = parseKulaJobDetail(detailHtml, { company, jobUrl, sourceUrl, id });
    if (!job) continue;

    if (engineeringOnly && !filterEngineeringJobs([job]).length) continue;
    jobs.push(job);
    await sleep(150);
  }

  if (jobs.length === 0) {
    throw new Error(`No matching jobs found on ${sourceUrl}`);
  }

  return jobs.slice(0, maxJobs);
}

function parseKulaJobDetail(html, { company, jobUrl, sourceUrl }) {
  const $ = cheerio.load(html);
  const rawTitle = $("title").text().split("|")[0].trim();
  const title = decodeHtmlEntities(rawTitle.replace(new RegExp(`\\s*-\\s*${company}$`, "i"), "").trim());

  if (!title) return null;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const location =
    bodyText.match(/(?:Location|Work type)[:\s]+([A-Za-z0-9 ,/-]{3,80})/i)?.[1]?.trim() || "Not specified";

  return {
    title,
    company,
    location,
    department: "",
    team: "",
    url: jobUrl,
    description: truncate(`${title}\n\n${bodyText}`, 6000),
    sourceUrl,
  };
}

function slugToCompany(slug) {
  return slug
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function decodeHtmlEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}
