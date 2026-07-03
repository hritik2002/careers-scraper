import { normalizePreferences } from "../src/filters/preferences.js";

const ROLE_PHRASES = {
  software: ["software engineer", "software developer", "sde", "web engineer"],
  frontend: ["frontend engineer", "front-end engineer", "react engineer", "ui engineer"],
  fullstack: ["full stack engineer", "fullstack engineer", "full-stack developer"],
  backend: ["backend engineer", "back-end engineer", "server engineer", "api engineer"],
};

const DEFAULT_SKILLS = ["react", "typescript", "javascript", "nodejs", "nextjs"];

const INDIA_TERMS = [
  "india",
  "bangalore",
  "bengaluru",
  "mumbai",
  "delhi",
  "gurgaon",
  "gurugram",
  "noida",
  "hyderabad",
  "pune",
  "chennai",
  "remote",
];

function quote(term) {
  return term.includes(" ") ? `"${term}"` : term;
}

function orGroup(terms) {
  const unique = [...new Set(terms.filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.length === 1) return quote(unique[0]);
  return `(${unique.map(quote).join(" OR ")})`;
}

export function buildRoleTerms(preferences) {
  const prefs = normalizePreferences(preferences);
  const terms = new Set();

  for (const role of prefs.roles || []) {
    const key = role.toLowerCase().replace(/-/g, "");
    for (const phrase of ROLE_PHRASES[key] || []) {
      terms.add(phrase);
    }
  }

  return [...terms];
}

export function buildSkillTerms(searchConfig = {}) {
  const skills = searchConfig.skills?.length ? searchConfig.skills : DEFAULT_SKILLS;
  return skills.map((s) => s.toLowerCase());
}

export function buildLocationTerms(preferences) {
  const prefs = normalizePreferences(preferences);
  const terms = [...INDIA_TERMS];

  if (!prefs.locations.remote) {
    return terms.filter((t) => t !== "remote");
  }

  return terms;
}

/** Build a Google boolean query for one ATS domain. */
export function buildSiteDorkQuery(siteDomain, preferences, searchConfig = {}) {
  const roleClause = orGroup(buildRoleTerms(preferences));
  const locationClause = orGroup(buildLocationTerms(preferences));

  const parts = [`site:${siteDomain}`, roleClause, locationClause];

  if (searchConfig.includeSkills !== false) {
    const skillClause = orGroup(buildSkillTerms(searchConfig));
    if (skillClause) parts.push(skillClause);
  }

  return parts.filter(Boolean).join(" ");
}

export function googleSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function buildAllDorkQueries(sites, preferences, searchConfig = {}) {
  return sites.map((site) => ({
    site: site.id,
    label: site.label,
    domain: site.domain,
    query: buildSiteDorkQuery(site.domain, preferences, searchConfig),
    googleUrl: googleSearchUrl(buildSiteDorkQuery(site.domain, preferences, searchConfig)),
  }));
}
