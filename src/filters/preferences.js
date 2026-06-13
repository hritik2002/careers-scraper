const ROLE_GROUPS = {
  software: [
    "software engineer",
    "software developer",
    "web engineer",
    "web developer",
    "sde",
    "javascript engineer",
    "typescript engineer",
  ],
  frontend: ["frontend", "front-end", "front end", "react", "ui engineer"],
  fullstack: ["full stack", "fullstack", "full-stack"],
  backend: ["backend", "back-end", "back end", "server-side", "server engineer", "api engineer"],
};

const ROLE_EXCLUDE = [
  "data scientist",
  "machine learning",
  "ml engineer",
  "devops",
  "site reliability",
  "sre",
  "security engineer",
  "android engineer",
  "ios engineer",
  "sales engineer",
  "solutions architect",
  "product manager",
  "program manager",
  "engineering manager",
  "technical writer",
];

const TESTING_ROLE_EXCLUDE = [
  "qa engineer",
  "qa analyst",
  "qa lead",
  "qa manager",
  "test engineer",
  "testing engineer",
  "quality assurance",
  "quality engineer",
  "sdet",
  "software engineer in test",
  "software development engineer in test",
  "test automation",
  "automation test",
  "software tester",
  "manual tester",
  "automation tester",
  "performance test",
  "qa automation",
];

const SENIORITY_EXCLUDE = [
  "staff engineer",
  "staff software",
  "principal engineer",
  "principal software",
  "director of engineering",
  "director, engineering",
  "vp engineering",
  "vice president",
  "head of engineering",
  "chief technology",
  "cto",
  "distinguished engineer",
  "fellow",
];

const EXPERIENCE_EXCLUDE = [
  "5+ years",
  "6+ years",
  "7+ years",
  "8+ years",
  "9+ years",
  "10+ years",
  "12+ years",
  "15+ years",
  "5-8 years",
  "6-10 years",
  "7-10 years",
  "8-12 years",
  "10-15 years",
];

const JUNIOR_EXPERIENCE_EXCLUDE = [
  "entry level",
  "entry-level",
  "new grad",
  "new graduate",
  "intern",
  "internship",
  "fresher",
  "campus hire",
  "graduate program",
  "0-1 years",
  "0-2 years",
  "1+ years",
  "1-2 years",
];

const INDIA_KEYWORDS = [
  "india",
  "indian",
  "mumbai",
  "bangalore",
  "bengaluru",
  "delhi",
  "new delhi",
  "gurgaon",
  "gurugram",
  "noida",
  "hyderabad",
  "pune",
  "chennai",
  "kolkata",
  "ahmedabad",
  "navi mumbai",
  "pan india",
  "india remote",
  "remote india",
  "remote - india",
  "remote (india)",
];

const REMOTE_KEYWORDS = [
  "remote",
  "work from home",
  "wfh",
  "anywhere",
  "distributed",
  "global remote",
  "worldwide",
  "location flexible",
  "work remotely",
];

const ONSITE_ONLY_EXCLUDE = [
  "san francisco",
  "new york",
  "seattle",
  "austin",
  "los angeles",
  "chicago",
  "boston",
  "london",
  "berlin",
  "amsterdam",
  "dublin",
  "toronto",
  "vancouver",
  "sydney",
  "singapore",
];

const DEFAULT_PREFERENCES = {
  enabled: true,
  roles: ["software", "frontend", "fullstack", "backend"],
  minYearsExperience: 2,
  maxYearsExperience: 4,
  locations: {
    india: true,
    remote: true,
  },
};

function getActiveRoleKeywords(preferences) {
  const roles = preferences.roles?.length ? preferences.roles : DEFAULT_PREFERENCES.roles;
  const keywords = new Set();

  for (const role of roles) {
    const key = role.toLowerCase().replace(/-/g, "");
    for (const keyword of ROLE_GROUPS[key] || []) {
      keywords.add(keyword);
    }
  }

  return keywords.size > 0 ? [...keywords] : Object.values(ROLE_GROUPS).flat();
}

function jobText(job) {
  return `${job.title || ""} ${job.department || ""} ${job.team || ""} ${job.location || ""} ${(job.description || "").slice(0, 800)}`.toLowerCase();
}

export function normalizePreferences(preferences = {}) {
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    locations: {
      ...DEFAULT_PREFERENCES.locations,
      ...preferences.locations,
    },
  };
}

export function matchesRolePreference(job, preferences) {
  const text = jobText(job);
  const title = (job.title || "").toLowerCase();

  if (ROLE_EXCLUDE.some((term) => text.includes(term))) return false;
  if (TESTING_ROLE_EXCLUDE.some((term) => text.includes(term))) return false;
  if (SENIORITY_EXCLUDE.some((term) => text.includes(term))) return false;
  if (/\bqa\b/.test(title) || /\b(sdet|tester)\b/.test(title)) return false;

  const roleKeywords = getActiveRoleKeywords(normalizePreferences(preferences));
  return roleKeywords.some((keyword) => text.includes(keyword));
}

export function matchesExperiencePreference(job, preferences) {
  const text = jobText(job);
  const { minYearsExperience, maxYearsExperience } = preferences;

  if (EXPERIENCE_EXCLUDE.some((term) => text.includes(term))) return false;
  if (minYearsExperience >= 2 && JUNIOR_EXPERIENCE_EXCLUDE.some((term) => text.includes(term))) {
    return false;
  }

  const yearsMatch = text.match(/(\d+)\s*\+?\s*(?:years|yrs|yoe)/g) || [];
  for (const match of yearsMatch) {
    const years = Number.parseInt(match, 10);
    if (!Number.isNaN(years) && years > maxYearsExperience) return false;
  }

  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years|yrs|yoe)/);
  if (rangeMatch) {
    const min = Number.parseInt(rangeMatch[1], 10);
    const max = Number.parseInt(rangeMatch[2], 10);
    if (!Number.isNaN(min) && min > maxYearsExperience) return false;
    if (!Number.isNaN(max) && max > maxYearsExperience) return false;
  }

  return true;
}

export function matchesLocationPreference(job, preferences) {
  const text = jobText(job);
  const { india, remote } = preferences.locations;

  if (remote && REMOTE_KEYWORDS.some((keyword) => text.includes(keyword))) return true;
  if (india && INDIA_KEYWORDS.some((keyword) => text.includes(keyword))) return true;

  if (!job.location || job.location.toLowerCase() === "not specified") {
    return true;
  }

  const hasOnsiteOnly = ONSITE_ONLY_EXCLUDE.some((city) => text.includes(city));
  const hasRemoteOrIndia =
    REMOTE_KEYWORDS.some((keyword) => text.includes(keyword)) ||
    INDIA_KEYWORDS.some((keyword) => text.includes(keyword));

  if (hasOnsiteOnly && !hasRemoteOrIndia) return false;

  return true;
}

export function matchesPreferences(job, preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizePreferences(preferences);
  if (!prefs.enabled) return true;

  return (
    matchesRolePreference(job, prefs) &&
    matchesExperiencePreference(job, prefs) &&
    matchesLocationPreference(job, prefs)
  );
}

export function filterByPreferences(jobs, preferences = DEFAULT_PREFERENCES) {
  return jobs.filter((job) => matchesPreferences(job, preferences));
}

export function formatPreferencesSummary(preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizePreferences(preferences);
  const roles = prefs.roles.map((role) => role.replace("fullstack", "full-stack")).join(" · ");
  const yoe = `${prefs.minYearsExperience}–${prefs.maxYearsExperience} YOE`;
  const locations = [];
  if (prefs.locations.india) locations.push("India");
  if (prefs.locations.remote) locations.push("remote");
  return `${roles} · ${yoe} · ${locations.join(" or ")} · no testing/QA roles`;
}

export function formatPreferencesForPrompt(preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizePreferences(preferences);
  const locations = [];
  if (prefs.locations.india) locations.push("India (any city)");
  if (prefs.locations.remote) locations.push("Remote (global or India remote)");

  return [
    `Target roles: Software, Frontend, Full-Stack, and Backend engineering only. Reject QA, testing, SDET, ML, DevOps, and management roles.`,
    `Experience: ${prefs.minYearsExperience}–${prefs.maxYearsExperience} years. Reject roles requiring more than ${prefs.maxYearsExperience} years or senior/staff/principal titles.`,
    `Location: ${locations.join(" or ")} only. Downscore or reject roles requiring on-site outside India with no remote option.`,
  ].join("\n");
}
