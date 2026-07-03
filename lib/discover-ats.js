/** Discover ATS board URLs embedded in a company careers page HTML. */

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

const ATS_PATTERNS = [
  {
    platform: "greenhouse",
    regex: /(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://job-boards.greenhouse.io/${slug}`,
  },
  {
    platform: "greenhouse",
    regex: /greenhouse\.io\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://job-boards.greenhouse.io/${slug}`,
  },
  {
    platform: "lever",
    regex: /jobs\.lever\.co\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://jobs.lever.co/${slug}`,
  },
  {
    platform: "ashby",
    regex: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://jobs.ashbyhq.com/${slug}`,
  },
  {
    platform: "kula",
    regex: /careers\.kula\.ai\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://careers.kula.ai/${slug}?jobs=true`,
  },
  {
    platform: "rippling",
    regex: /ats\.rippling\.com\/([a-z0-9_-]+)\/jobs/gi,
    url: (slug) => `https://ats.rippling.com/${slug}/jobs`,
  },
  {
    platform: "workable",
    regex: /apply\.workable\.com\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://apply.workable.com/${slug}/`,
  },
  {
    platform: "gem",
    regex: /jobs\.gem\.com\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://jobs.gem.com/${slug}`,
  },
  {
    platform: "smartrecruiters",
    regex: /jobs\.smartrecruiters\.com\/([a-z0-9_-]+)/gi,
    url: (slug) => `https://jobs.smartrecruiters.com/${slug}`,
  },
];

const WORKDAY_URL_REGEX = /https?:\/\/[a-z0-9_-]+\.wd\d+\.myworkdayjobs\.com\/[a-z0-9_-]+/gi;
const GEM_URL_REGEX = /https?:\/\/jobs\.gem\.com\/[a-z0-9_-]+/gi;
const BAMBOO_URL_REGEX = /https?:\/\/[a-z0-9_-]+\.bamboohr\.com\/careers/gi;
const WORKABLE_URL_REGEX = /https?:\/\/apply\.workable\.com\/[a-z0-9_-]+\/?/gi;
const LEVER_URL_REGEX = /https?:\/\/jobs\.lever\.co\/[a-z0-9_-]+/gi;

const CAREERS_PATHS = ["/careers", "/careers/", "/jobs", "/jobs/", "/s/careers", "/company/careers"];

export function extractAtsUrlsFromHtml(html) {
  const found = new Map();

  for (const { platform, regex, url } of ATS_PATTERNS) {
    for (const match of html.matchAll(regex)) {
      const slug = match[1]?.toLowerCase();
      if (!slug || slug.length < 2) continue;
      const boardUrl = url(slug);
      if (!found.has(boardUrl)) {
        found.set(boardUrl, { platform, slug, url: boardUrl });
      }
    }
  }

  for (const [regex, platform] of [
    [WORKDAY_URL_REGEX, "workday"],
    [BAMBOO_URL_REGEX, "bamboohr"],
    [WORKABLE_URL_REGEX, "workable"],
    [LEVER_URL_REGEX, "lever"],
    [GEM_URL_REGEX, "gem"],
  ]) {
    for (const match of html.matchAll(regex)) {
      const boardUrl = match[0].replace(/\/$/, "").split("?")[0].split("#")[0];
      if (!found.has(boardUrl)) {
        found.set(boardUrl, { platform, url: boardUrl });
      }
    }
  }

  return [...found.values()];
}

/** Fetch a specific careers URL and extract embedded ATS board links. */
export async function discoverAtsFromPage(url) {
  const html = await fetchHtml(url);
  if (!html) return [];
  return extractAtsUrlsFromHtml(html).map((hit) => ({ ...hit, sourcePage: url }));
}

export async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

/** Try common careers page URLs for a company domain and extract embedded ATS boards. */
export async function discoverAtsFromCareersSite(domain) {
  const hosts = [`www.${domain}`, domain, `careers.${domain}`];
  const discovered = new Map();

  for (const host of hosts) {
    for (const path of CAREERS_PATHS) {
      const pageUrl = `https://${host}${path}`;
      const html = await fetchHtml(pageUrl);
      if (!html) continue;

      for (const hit of extractAtsUrlsFromHtml(html)) {
        if (!discovered.has(hit.url)) {
          discovered.set(hit.url, { ...hit, sourcePage: pageUrl });
        }
      }

      if (discovered.size > 0) break;
    }
    if (discovered.size > 0) break;
  }

  return [...discovered.values()];
}
