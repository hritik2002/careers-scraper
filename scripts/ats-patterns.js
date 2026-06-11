/** ATS URL templates and probe helpers — used by resolve-career-pages.js */

export const ATS_PATTERNS = {
  ashby: {
    label: "Ashby",
    url: (slug) => `https://jobs.ashbyhq.com/${slug}`,
    example: "https://jobs.ashbyhq.com/supabase",
    probe: probeAshby,
  },
  greenhouse: {
    label: "Greenhouse",
    url: (slug) => `https://job-boards.greenhouse.io/${slug}`,
    legacyUrl: (slug) => `https://boards.greenhouse.io/${slug}`,
    example: "https://job-boards.greenhouse.io/postman",
    probe: probeGreenhouse,
  },
  lever: {
    label: "Lever",
    url: (slug) => `https://jobs.lever.co/${slug}`,
    example: "https://jobs.lever.co/meesho",
    probe: probeLever,
  },
  workable: {
    label: "Workable",
    url: (slug) => `https://apply.workable.com/${slug}/`,
    example: "https://apply.workable.com/elevation-capital-3/",
    probe: probeWorkable,
  },
  kula: {
    label: "Kula",
    url: (slug) => `https://careers.kula.ai/${slug}?jobs=true`,
    example: "https://careers.kula.ai/rocketlane?jobs=true",
    probe: probeKula,
  },
  rippling: {
    label: "Rippling ATS",
    url: (slug) => `https://ats.rippling.com/${slug}/jobs`,
    example: "https://ats.rippling.com/alaan-careers/jobs",
    probe: probeRippling,
  },
  freshteam: {
    label: "Freshteam",
    url: (slug) => `https://${slug}.freshteam.com/jobs`,
    example: "https://scapia.freshteam.com/jobs",
    probe: probeFreshteam,
  },
  sensehq: {
    label: "SenseHQ",
    url: (slug) => `https://${slug}.sensehq.com/careers`,
    example: "https://groww.sensehq.com/careers",
    probe: probeSensehq,
  },
  zohorecruit: {
    label: "Zoho Recruit",
    url: (slug) => `https://${slug}.zohorecruit.in/jobs/Careers`,
    example: "https://skyroot.zohorecruit.in/jobs/Careers",
    probe: probeZohoRecruit,
  },
  smartrecruiters: {
    label: "SmartRecruiters",
    url: (slug) => `https://jobs.smartrecruiters.com/${slug}`,
    probe: probeHttp200,
  },
  bamboohr: {
    label: "BambooHR",
    url: (slug) => `https://${slug}.bamboohr.com/careers`,
    probe: probeHttp200,
  },
  recruitee: {
    label: "Recruitee",
    url: (slug) => `https://${slug}.recruitee.com`,
    probe: probeHttp200,
  },
  ycombinator: {
    label: "YC job board",
    url: (slug) => `https://www.ycombinator.com/companies/${slug}/jobs`,
    probe: probeHttp200,
  },
};

export const GOOGLE_DORKS = [
  "site:jobs.ashbyhq.com {company}",
  "site:job-boards.greenhouse.io {company}",
  "site:boards.greenhouse.io {company}",
  "site:jobs.lever.co {company}",
  "site:apply.workable.com {company}",
  "site:careers.kula.ai {company}",
  "site:ats.rippling.com {company}",
  "site:freshteam.com/jobs {company}",
];

export const VC_AGGREGATORS = [
  { vc: "Peak XV", url: "https://careers.peakxv.com/jobs" },
  { vc: "Nexus VP", url: "https://jobs.nexusvp.com/jobs" },
  { vc: "Elevation Capital", url: "https://apply.workable.com/elevation-capital-3/" },
];

export const INDIA_FALLBACKS = [
  { platform: "LinkedIn", url: (slug) => `https://www.linkedin.com/company/${slug}/jobs/` },
  { platform: "Instahyre", url: (slug) => `https://www.instahyre.com/jobs-at-${slug}/` },
  { platform: "Wellfound", url: (slug) => `https://wellfound.com/company/${slug}` },
  { platform: "Cutshort", url: (slug) => `https://cutshort.io/company/${slug}` },
];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

async function probeAshby(slug) {
  try {
    const response = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${slug}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data.jobs)) return null;
    return { platform: "ashby", url: ATS_PATTERNS.ashby.url(slug), jobCount: data.jobs.length };
  } catch {
    return null;
  }
}

async function probeGreenhouse(slug) {
  try {
    const response = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
      { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data.jobs)) return null;
    return {
      platform: "greenhouse",
      url: ATS_PATTERNS.greenhouse.url(slug),
      jobCount: data.jobs.length,
    };
  } catch {
    return null;
  }
}

async function probeLever(slug) {
  try {
    const response = await fetch(`https://api.lever.co/v0/postings/${slug}?mode=json`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data)) return null;
    return { platform: "lever", url: ATS_PATTERNS.lever.url(slug), jobCount: data.length };
  } catch {
    return null;
  }
}

async function probeWorkable(slug) {
  try {
    const response = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${slug}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.jobs?.length) return null;
    return { platform: "workable", url: ATS_PATTERNS.workable.url(slug), jobCount: data.jobs.length };
  } catch {
    return null;
  }
}

async function probeKula(slug) {
  try {
    const response = await fetch(ATS_PATTERNS.kula.url(slug), {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    const matches = html.match(new RegExp(`/${slug}/(\\d+)`, "g"));
    if (!matches?.length) return null;
    return { platform: "kula", url: ATS_PATTERNS.kula.url(slug), jobCount: matches.length };
  } catch {
    return null;
  }
}

async function probeRippling(slug) {
  try {
    const url = ATS_PATTERNS.rippling.url(slug);
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const html = await response.text();
    if (!html.includes(`/${slug}/jobs/`)) return null;
    return { platform: "rippling", url, jobCount: null };
  } catch {
    return null;
  }
}

async function probeFreshteam(slug) {
  try {
    const url = ATS_PATTERNS.freshteam.url(slug);
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return { platform: "freshteam", url, jobCount: null, scrapeNote: "SPA — needs Playwright" };
  } catch {
    return null;
  }
}

async function probeSensehq(slug) {
  return probeHttp200(ATS_PATTERNS.sensehq.url(slug), "sensehq");
}

async function probeZohoRecruit(slug) {
  return probeHttp200(ATS_PATTERNS.zohorecruit.url(slug), "zohorecruit");
}

async function probeHttp200(url, platform = "unknown") {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return { platform, url, jobCount: null };
  } catch {
    return null;
  }
}

/** Probe all ATS platforms for a slug; returns first match with jobs (or freshteam SPA). */
export async function probeAllPlatforms(slug) {
  const probes = [
    probeAshby,
    probeGreenhouse,
    probeLever,
    probeWorkable,
    probeKula,
    probeRippling,
    probeFreshteam,
    (s) => probeSensehq(s),
    (s) => probeZohoRecruit(s),
  ];

  for (const probe of probes) {
    const result = await probe(slug);
    if (result) return { ...result, slug };
  }

  return null;
}
