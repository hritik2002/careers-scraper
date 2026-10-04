import * as cheerio from "cheerio";
import { detectPlatform } from "../scraper/detect.js";
import { scrapeCareerPage } from "../scraper/index.js";
import { extractBoardUrl } from "../../lib/parse-search-hits.js";
import { fetchText, uniqueBy } from "../utils.js";
import { canonicalJobUrl, isJobDetailUrl, looksLikeRole, plainText, publicUrl, structuredJobs } from "./parse.js";

const SUPPORTED_ATS = new Set([
  "greenhouse", "lever", "ashby", "kula", "workable", "rippling", "gem", "workday",
  "smartrecruiters", "zwayam", "darwinbox", "talentrecruit",
]);
const NOISE_HOST = /(^|\.)(linkedin\.com|x\.com|twitter\.com|youtube\.com|youtu\.be|substack\.com|substackcdn\.com|google\.com|forms\.gle|airtable\.com|partiful\.com|facebook\.com|instagram\.com)$/i;
const CAREER_LINK = /\b(careers?|jobs?|join (?:us|our team)|open (?:roles|positions)|we.re hiring|work (?:with|at) us)\b/i;

export function pageLinks(html, base) {
  const $ = cheerio.load(html);
  const links = [];
  $("a[href], iframe[src]").each((_, el) => {
    const url = publicUrl($(el).attr("href") || $(el).attr("src"), base);
    if (!url || NOISE_HOST.test(new URL(url).hostname)) return;
    links.push({ url, title: $(el).text().replace(/\s+/g, " ").trim(), label: $(el).attr("aria-label") || "" });
  });
  // Some company sites embed their ATS URL in script configuration instead of an anchor.
  for (const match of html.matchAll(/https:\/\/(?:jobs\.ashbyhq\.com|(?:job-)?boards\.greenhouse\.io|job-boards\.greenhouse\.io|jobs\.lever\.co)\/[\w.%/-]+/g)) {
    links.push({ url: match[0], title: "", label: "" });
  }
  return uniqueBy(links, (link) => link.url);
}

export function isCompanyWebsite(url, sourceUrl) {
  const parsed = new URL(url);
  return parsed.hostname !== new URL(sourceUrl).hostname && !NOISE_HOST.test(parsed.hostname) &&
    !/\.(png|jpg|svg|gif|pdf|mp4)$/i.test(parsed.pathname) &&
    !/^(cdn\.|images\.|static\.|pbs\.|chatgpt\.)/i.test(parsed.hostname);
}

function boardUrl(url) {
  const { platform } = detectPlatform(url);
  if (!SUPPORTED_ATS.has(platform)) return null;
  return extractBoardUrl(url) || url;
}

export function createSourceContext(settings, config, { existingJobs = [], onWarning } = {}) {
  const pages = new Map();
  const boards = new Map();
  const companies = new Map();
  const knownJobs = new Map(existingJobs.map((job) => [canonicalJobUrl(job.url), job]));
  const warning = (url, error) => onWarning?.(`${url} — ${error.message}`);
  const text = (url) => {
    if (!pages.has(url)) pages.set(url, fetchText(url, { signal: AbortSignal.timeout(settings.requestTimeoutMs) }));
    return pages.get(url);
  };
  const json = async (url) => JSON.parse(await text(url));
  const scrapeBoard = async (url, company) => {
    const board = boardUrl(url);
    if (!board) return [];
    if (!boards.has(board)) {
      boards.set(board, scrapeCareerPage(board, {
        // A linked individual role may be beyond the board's first 50 listings.
        // Cache the full API response and apply the page cap only during board discovery.
        maxJobs: Number.MAX_SAFE_INTEGER, engineeringOnly: config.engineeringOnly,
      }).catch((error) => { warning(board, error); return []; }));
    }
    const jobs = await boards.get(board);
    return jobs.map((job) => ({ ...job, company: company || job.company, url: canonicalJobUrl(job.url) }));
  };

  const crawl = async (startUrl, company) => {
    const key = canonicalJobUrl(startUrl);
    if (companies.has(key)) return companies.get(key);
    const run = async () => {
      const pending = [startUrl];
      const visited = new Set();
      const jobs = [];
      let boardCount = 0;
      while (pending.length && visited.size < settings.maxPagesPerCompany) {
        const url = pending.shift();
        if (visited.has(url)) continue;
        visited.add(url);
        if (boardUrl(url)) {
          const boardJobs = await scrapeBoard(url, company);
          if (isJobDetailUrl(url)) {
            const linkedJob = boardJobs.find((job) => job.url === canonicalJobUrl(url));
            if (linkedJob) jobs.push(linkedJob);
          } else {
            jobs.push(...boardJobs.slice(0, config.maxJobsPerPage));
          }
          continue;
        }
        try {
          const html = await text(url);
          const structured = structuredJobs(html, url, company);
          const links = pageLinks(html, url);
          if (isJobDetailUrl(url)) {
            const $ = cheerio.load(html);
            const title = $("h1").first().text().trim();
            const apply = links.find((link) => boardUrl(link.url) && isJobDetailUrl(link.url) && /apply/i.test(`${link.title} ${link.label}`));
            const employer = company || new URL(url).pathname.match(/\/(?:companies|jobs)\/([^/]+)\/[^/]+/)?.[1];
            const detail = structured.find((job) => job.url === canonicalJobUrl(url)) || structured[0] ||
              (looksLikeRole(title) && employer ? { title, company: employer, location: "Not specified", department: "", team: "",
                url: canonicalJobUrl(url), description: plainText($(".prose, main, article").first().html() || title).slice(0, 8000), sourceUrl: url } : null);
            if (detail) {
              jobs.push({ ...detail, url: apply ? canonicalJobUrl(apply.url) : detail.url });
              continue;
            }
          }
          jobs.push(...structured);
          for (const link of links) {
            if (boardUrl(link.url)) {
              if (visited.size < settings.maxPagesPerCompany && boardCount < settings.maxPagesPerCompany && !visited.has(boardUrl(link.url))) {
                visited.add(boardUrl(link.url));
                boardCount++;
                jobs.push(...(await scrapeBoard(link.url, company)).slice(0, config.maxJobsPerPage));
              }
              continue;
            }
            if (isJobDetailUrl(link.url) && looksLikeRole(link.title)) {
              jobs.push({ title: link.title, company: company || new URL(url).hostname,
                location: "Not specified", department: "", team: "", url: canonicalJobUrl(link.url),
                description: link.title, sourceUrl: url });
            }
            const companyHost = new URL(startUrl).hostname.replace(/^www\./, "");
            const linkHost = new URL(link.url).hostname.replace(/^www\./, "");
            const sameCompany = linkHost === companyHost || linkHost.endsWith(`.${companyHost}`);
            if (sameCompany && CAREER_LINK.test(`${link.title} ${link.label} ${new URL(link.url).pathname}`) && !visited.has(link.url)) {
              pending.push(link.url);
            }
          }
          if (visited.size === 1 && pending.length === 0 && jobs.length === 0) {
            pending.push(new URL("/careers", startUrl).href, new URL("/jobs", startUrl).href);
          }
        } catch (error) { warning(url, error); }
      }
      return uniqueBy(jobs.filter((job) => job.url), (job) => job.url);
    };
    const result = run();
    companies.set(key, result);
    return result;
  };

  const followCompanies = async (items) => {
    const jobs = [];
    for (const item of uniqueBy(items, (item) => item.url).slice(0, settings.maxCompaniesPerSource)) {
      jobs.push(...await crawl(item.url, item.company));
    }
    return jobs;
  };

  const enrich = async (job) => {
    if (new URL(job.url).hostname === "news.ycombinator.com") return job;
    if (knownJobs.has(canonicalJobUrl(job.url))) {
      return { ...knownJobs.get(canonicalJobUrl(job.url)), company: job.company, sourceUrl: job.sourceUrl };
    }
    // The ATS APIs give descriptions without scraping JS-heavy application pages.
    if (boardUrl(job.url)) {
      const jobs = await scrapeBoard(job.url, job.company);
      const match = jobs.find((item) => item.url === canonicalJobUrl(job.url));
      if (match) return { ...match, sourceUrl: job.sourceUrl };
    }
    try {
      const html = await text(job.url);
      const structured = structuredJobs(html, job.url, job.company);
      if (structured.length) return { ...job, ...structured[0], sourceUrl: job.sourceUrl };
      const $ = cheerio.load(html);
      const detail = $("[class*='job-description'], .prose").first();
      const container = detail.length ? detail : $("main, article").first();
      const description = plainText(container.html() || "");
      return description ? { ...job, description: description.slice(0, 8000) } : job;
    } catch (error) { warning(job.url, error); return job; }
  };

  return { ...settings, config, text, json, scrapeBoard, crawl, followCompanies, enrich, warning };
}
