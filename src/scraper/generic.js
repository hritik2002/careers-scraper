import * as cheerio from "cheerio";
import { fetchText, normalizeUrl, uniqueBy } from "../utils.js";
import { filterEngineeringJobs } from "../filters/engineering.js";

const JOB_LINK_PATTERNS = [
  /\/jobs?\//i,
  /\/careers?\//i,
  /\/positions?\//i,
  /\/openings?\//i,
  /\/role\//i,
  /\/opportunit/i,
  /greenhouse\.io/i,
  /lever\.co/i,
  /ashbyhq\.com/i,
];

const NOISE_PATTERNS = [
  /linkedin\.com/i,
  /twitter\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /privacy/i,
  /terms/i,
  /cookie/i,
  /login/i,
  /signup/i,
];

export async function scrapeGeneric(sourceUrl, { maxJobs, engineeringOnly }) {
  const html = await fetchText(sourceUrl);
  const $ = cheerio.load(html);
  const company = extractCompanyName($, sourceUrl);
  const candidates = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (!href || title.length < 4 || title.length > 120) return;

    const url = normalizeUrl(href, sourceUrl);
    if (!url || NOISE_PATTERNS.some((p) => p.test(url))) return;
    if (!JOB_LINK_PATTERNS.some((p) => p.test(url))) return;

    candidates.push({
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

  let jobs = uniqueBy(candidates, (j) => j.url);

  if (jobs.length === 0) {
    throw new Error(
      `Could not find job listings on ${sourceUrl}. Try a direct Greenhouse, Lever, or Ashby board URL.`
    );
  }

  if (engineeringOnly) jobs = filterEngineeringJobs(jobs);
  jobs = jobs.slice(0, maxJobs);

  return enrichGenericJobs(jobs, $);
}

async function enrichGenericJobs(jobs, $) {
  const pageText = $("body").text().replace(/\s+/g, " ").trim().slice(0, 4000);

  return jobs.map((job) => ({
    ...job,
    description: `${job.title}\n\n${pageText}`,
  }));
}

function extractCompanyName($, sourceUrl) {
  const ogSite = $('meta[property="og:site_name"]').attr("content");
  if (ogSite) return ogSite;

  const title = $("title").text().split(/[|\-–]/)[0].trim();
  if (title && !/careers?|jobs?/i.test(title)) return title;

  return new URL(sourceUrl).hostname.replace(/^www\./, "");
}
