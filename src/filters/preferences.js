const ROLE_KEYWORDS = [
  "frontend",
  "front-end",
  "front end",
  "full stack",
  "fullstack",
  "full-stack",
  "software engineer",
  "software developer",
  "web engineer",
  "web developer",
  "sde",
  "react",
  "ui engineer",
  "javascript engineer",
  "typescript engineer",
];

const ROLE_EXCLUDE = [
  "data scientist",
  "machine learning",
  "ml engineer",
  "devops",
  "site reliability",
  "sre",
  "qa engineer",
  "test engineer",
  "quality assurance",
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
  roles: ["frontend", "fullstack"],
  minYearsExperience: 0,
  maxYearsExperience: 4,
  locations: {
    india: true,
    remote: true,
  },
};

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

  if (ROLE_EXCLUDE.some((term) => text.includes(term))) return false;
  if (SENIORITY_EXCLUDE.some((term) => text.includes(term))) return false;

  return ROLE_KEYWORDS.some((keyword) => text.includes(keyword));
}

export function matchesExperiencePreference(job, preferences) {
  const text = jobText(job);
  const { maxYearsExperience } = preferences;

  if (EXPERIENCE_EXCLUDE.some((term) => text.includes(term))) return false;

  const yearsMatch = text.match(/(\d+)\s*\+?\s*(?:years|yrs|yoe)/g) || [];
  for (const match of yearsMatch) {
    const years = Number.parseInt(match, 10);
    if (!Number.isNaN(years) && years > maxYearsExperience) return false;
  }

  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years|yrs|yoe)/);
  if (rangeMatch) {
    const min = Number.parseInt(rangeMatch[1], 10);
    const max = Number.parseInt(rangeMatch[2], 10);
    if (!Number.isNaN(min) && min > preferences.maxYearsExperience) return false;
    if (!Number.isNaN(max) && max > preferences.maxYearsExperience + 1) return false;
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

export function formatPreferencesForPrompt(preferences = DEFAULT_PREFERENCES) {
  const prefs = normalizePreferences(preferences);
  const locations = [];
  if (prefs.locations.india) locations.push("India (any city)");
  if (prefs.locations.remote) locations.push("Remote (global or India remote)");

  return [
    `Target roles: Frontend and Full-Stack engineering (not pure backend, ML, DevOps, QA, or management).`,
    `Experience: ${prefs.minYearsExperience}–${prefs.maxYearsExperience} years.`,
    `Location: ${locations.join(" or ")} only. Downscore or reject roles requiring on-site outside India with no remote option.`,
  ].join("\n");
}
