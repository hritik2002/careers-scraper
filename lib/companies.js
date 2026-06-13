import { readFileSync, writeFileSync, existsSync } from "fs";
import { detectPlatform } from "../src/scraper/detect.js";
import { paths } from "./paths.js";

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function loadCompanyNames() {
  return readJson(paths.companies, []);
}

export function saveCompanyNames(names) {
  writeJson(paths.companies, names);
}

export function loadCareerPagesData() {
  return readJson(paths.careerPages, { mapping: {}, unscrapedCompanies: [] });
}

export function saveCareerPagesData(data) {
  writeJson(paths.careerPages, { ...data, updatedAt: new Date().toISOString() });
}

export function getMapping(data = loadCareerPagesData()) {
  return data.mapping || {};
}

export function loadKnownAtsUrls() {
  return readJson(paths.knownAtsUrls, {});
}

export function loadCareersFallbacks() {
  return readJson(paths.careersFallbacks, {});
}

export function loadVcPortfolio() {
  return readJson(paths.vcPortfolio, []);
}

export function loadStartups() {
  return readJson(paths.startups, []);
}

export function loadScrapeValidation() {
  return readJson(paths.scrapeValidation, { working: [], broken: [] });
}

export function saveScrapeValidation(data) {
  writeJson(paths.scrapeValidation, data);
}

/** Career page URLs for runtime scraping. */
export function getCareerUrls({ companiesOnly = false } = {}) {
  const mapping = getMapping();
  if (companiesOnly) {
    const names = loadCompanyNames();
    return [...new Set(names.map((name) => mapping[name]).filter(Boolean))];
  }
  return [...new Set(Object.values(mapping).filter(Boolean))];
}

export function getPlatform(url) {
  try {
    return detectPlatform(url).platform;
  } catch {
    return "unknown";
  }
}

export function isStaleUrl(url) {
  return !url || url.includes(".freshteam.com");
}

export function buildCompanyRegistry() {
  const names = loadCompanyNames();
  const mapping = getMapping();
  const validation = loadScrapeValidation();
  const verified = new Map(validation.working?.map((e) => [e.company, e]) || []);
  const broken = new Map(validation.broken?.map((e) => [e.company, e]) || []);

  const tracked = names.map((name) => {
    const url = mapping[name] || null;
    const entry = verified.get(name);
    let status = "unresolved";
    if (entry) status = "verified";
    else if (url && broken.has(name)) status = "broken";
    else if (url) status = "unverified";

    return {
      name,
      url,
      status,
      platform: url ? getPlatform(url) : null,
      jobs: entry?.jobs ?? null,
      reason: broken.get(name)?.reason ?? null,
    };
  });

  const bonus = Object.entries(mapping)
    .filter(([name]) => !names.includes(name))
    .map(([name, url]) => ({
      name,
      url,
      status: verified.has(name) ? "verified" : "bonus",
      platform: getPlatform(url),
      jobs: verified.get(name)?.jobs ?? null,
      reason: null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { tracked, bonus, checkedAt: validation.checkedAt || null };
}
