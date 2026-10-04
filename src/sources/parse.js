import * as cheerio from "cheerio";
import { normalizeUrl, truncate, uniqueBy } from "../utils.js";

export function plainText(html = "") {
  const $ = cheerio.load(String(html));
  $("script, style, nav, footer").remove();
  $("p, li, br, h1, h2, h3, h4").prepend("\n");
  return $.text().replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
}

export function publicUrl(value, base) {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = normalizeUrl(value, base);
  if (!url || !/^https?:\/\//.test(url)) return null;
  return url;
}

// Preserve identity parameters (e.g. gh_jid), remove only tracking/application suffixes.
export function canonicalJobUrl(value, base) {
  const url = publicUrl(value, base);
  if (!url) return null;
  const parsed = new URL(url);
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(utm_.+|ref|source|src|gh_src|lever-source|lever-origin)$/i.test(key)) {
      parsed.searchParams.delete(key);
    }
  }
  if (/\.(ashbyhq\.com|lever\.co)$/.test(parsed.hostname)) {
    parsed.pathname = parsed.pathname.replace(/\/(application|apply)\/?$/, "");
  }
  const greenhouseJob = parsed.pathname.match(/\/jobs\/(\d+)\/?$/);
  if (greenhouseJob && /^(?:boards|job-boards)(\.eu)?\.greenhouse\.io$/.test(parsed.hostname)) {
    parsed.hostname = parsed.hostname.replace(/^boards\./, "job-boards.");
    if (parsed.searchParams.get("gh_jid") === greenhouseJob[1]) parsed.searchParams.delete("gh_jid");
  }
  parsed.pathname = parsed.pathname.replace(/\/$/, "") || "/";
  return parsed.href;
}

export function* walkObjects(value) {
  if (!value || typeof value !== "object") return;
  if (!Array.isArray(value)) yield value;
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") yield* walkObjects(child);
  }
}

// Read data, never execute downloaded scripts. Flight data also powers Cosign's public page.
export function embeddedData(html) {
  const $ = cheerio.load(html);
  const data = [];
  let flight = "";
  const parse = (text) => {
    try { data.push(JSON.parse(text)); } catch { /* not a JSON record */ }
  };
  $("script").each((_, el) => {
    const text = $(el).text();
    if ($(el).attr("id") === "__NEXT_DATA__" || $(el).attr("type") === "application/ld+json") {
      parse(text);
    }
    const match = text.match(/^(?:\(self\.__next_f=self\.__next_f\|\|\[\]\)\.push|self\.__next_f\.push)\((\[.*\])\);?$/s);
    if (!match) return;
    try {
      const [type, payload] = JSON.parse(match[1]);
      if (type === 1 && typeof payload === "string") {
        flight += payload;
        for (const line of payload.split("\n")) {
          const record = line.match(/^[\da-f]+:([\[{].*)$/);
          if (record) parse(record[1]);
        }
      }
    } catch { /* unrelated script */ }
  });
  // Also handle JSON records split across multiple streaming script tags.
  for (const line of flight.split("\n")) {
    const record = line.match(/^[\da-f]+:([\[{].*)$/);
    if (record) parse(record[1]);
  }
  return data;
}

export function structuredJobs(html, sourceUrl, company) {
  const jobs = [];
  for (const data of embeddedData(html)) {
    for (const item of walkObjects(data)) {
      const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
      if (!types.includes("JobPosting") || !item.title) continue;
      if (item.validThrough && Date.parse(item.validThrough) < Date.now()) continue;
      const locations = [item.jobLocation].flat().filter(Boolean).map((place) => {
        const address = place.address || {};
        return [address.addressLocality, address.addressRegion, address.addressCountry?.name || address.addressCountry]
          .filter(Boolean).join(", ");
      }).filter(Boolean);
      if (item.jobLocationType === "TELECOMMUTE") locations.push("Remote");
      const url = canonicalJobUrl(item.url || sourceUrl, sourceUrl);
      if (!url) continue;
      jobs.push({
        title: item.title, company: item.hiringOrganization?.name || company || "Unknown",
        location: locations.join(" / ") || "Not specified", department: "", team: "", url,
        description: truncate(plainText(item.description || item.title)), sourceUrl,
      });
    }
  }
  return uniqueBy(jobs, (job) => job.url);
}

export function looksLikeRole(title) {
  return title.length >= 4 && title.length <= 180 &&
    /\b(engineer|developer|designer|manager|analyst|scientist|recruiter|lead|director|specialist|officer|intern|associate|devops|sre)\b/i.test(title) &&
    !/^(view|see|all|browse|explore|find|apply|join)\b/i.test(title);
}

export function isJobDetailUrl(url) {
  const { hostname, pathname, searchParams } = new URL(url);
  if (searchParams.has("gh_jid")) return true;
  if (/ashbyhq\.com$|lever\.co$/.test(hostname)) return pathname.split("/").filter(Boolean).length >= 2;
  if (/greenhouse\.io$/.test(hostname)) return /\/jobs\/\d+/.test(pathname);
  return /\/(jobs?|careers?|positions?|openings?|roles?|opportunities)\/[^/]+/i.test(pathname) &&
    !/\/(categories|search|locations|teams|departments|role)(\/|$)/i.test(pathname);
}
