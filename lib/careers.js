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

export function loadCareers() {
  return readJson(paths.careers, { updatedAt: null, pages: [] });
}

export function saveCareers(data) {
  writeJson(paths.careers, { ...data, updatedAt: new Date().toISOString() });
}

export function getCareerUrls(careers = loadCareers()) {
  return [...new Set((careers.pages || []).map((p) => p.url).filter(Boolean))];
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

export function addCareerUrl(url, { status } = {}) {
  const careers = loadCareers();
  const pages = careers.pages || [];
  if (pages.some((p) => p.url === url)) return false;
  pages.push({ url, ...(status ? { status } : {}) });
  saveCareers({ pages });
  return true;
}

export function updateCareerPage(url, patch) {
  const careers = loadCareers();
  const pages = (careers.pages || []).map((p) => (p.url === url ? { ...p, ...patch } : p));
  saveCareers({ pages });
}

export function removeCareerUrl(url) {
  const careers = loadCareers();
  const pages = (careers.pages || []).filter((p) => p.url !== url);
  saveCareers({ pages });
}

export function buildCareersRegistry() {
  const careers = loadCareers();
  return (careers.pages || []).map((page) => ({
    url: page.url,
    platform: getPlatform(page.url),
    status: page.status || "unverified",
    jobs: page.jobs ?? null,
    reason: page.reason ?? null,
    checkedAt: page.checkedAt ?? null,
  }));
}
