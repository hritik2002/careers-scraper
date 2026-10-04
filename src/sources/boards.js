import * as cheerio from "cheerio";
import { canonicalJobUrl, embeddedData, plainText, walkObjects } from "./parse.js";
import { uniqueBy } from "../utils.js";

export function parseYcJobs(html, sourceUrl) {
  const $ = cheerio.load(html);
  const jobs = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!/\/companies\/[^/]+\/jobs\/[^/]+/.test(href)) return;
    const anchor = $(el);
    const companyLink = anchor.parent().find("a[href]").filter((_, a) => /^\/companies\/[^/]+$/.test($(a).attr("href"))).first();
    const company = companyLink.find("span").first().text().replace(/\s*\([WSF]\d+\)$/, "").trim() || href.split("/companies/")[1].split("/")[0];
    const details = anchor.next();
    const location = details.find(".break-all").text().trim() || "Not specified";
    const title = anchor.text().trim();
    jobs.push({ title, company, location, department: "", team: "", url: canonicalJobUrl(href, sourceUrl),
      description: `${title}\n${plainText(details.html() || "")}`, sourceUrl });
  });
  return uniqueBy(jobs, (job) => job.url);
}

export async function scrapeYc(source, ctx) {
  // YC's main domain serves public HTML; workatastartup.com may reject CLI requests.
  const url = ctx.config.engineeringOnly ? `${source.url}/role/software-engineer` : source.url;
  const jobs = parseYcJobs(await ctx.text(url), url);
  if (!jobs.length) throw new Error("YC page contained no public job listings; its page format may have changed");
  return jobs;
}

export function parseCosignJobs(html, sourceUrl) {
  const jobs = [];
  for (const data of embeddedData(html)) {
    for (const item of walkObjects(data)) {
      if (!item.postingId || !item.organizationName || !item.title || item.closed) continue;
      const url = canonicalJobUrl(item.url || item.applyUrl, sourceUrl);
      if (!url) continue;
      const description = typeof item.description === "string" && !/^\$[\da-f]+$/.test(item.description)
        ? plainText(item.description) : item.title;
      jobs.push({ title: item.title, company: item.organizationName,
        location: [item.location, item.remote ? "Remote" : ""].filter(Boolean).join(" / ") || "Not specified",
        department: "", team: item.team || "", url, description, sourceUrl });
    }
  }
  return uniqueBy(jobs, (job) => job.url);
}

export async function scrapeCosign(source, ctx) {
  const jobs = parseCosignJobs(await ctx.text(source.url), source.url);
  if (!jobs.length) throw new Error("Cosign page contained no public job data; full listings may require sign-in");
  return jobs;
}
