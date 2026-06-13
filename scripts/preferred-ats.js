/**
 * Preferred ATS platforms — probed before custom /careers sites.
 * Order matches user preference: GH → Ashby → Workable → SR → Jobvite → Workday → ICIMS → Dover
 */

export const PREFERRED_ATS_ORDER = [
  "greenhouse",
  "ashby",
  "workable",
  "smartrecruiters",
  "jobvite",
  "workday",
  "icims",
  "dover",
];

/** Secondary ATS we already scrape well (Lever, Kula, Rippling). */
export const SECONDARY_ATS_ORDER = ["lever", "kula", "rippling"];

export function getPreferredProbes(atsPatterns) {
  return PREFERRED_ATS_ORDER.map((key) => atsPatterns[key]?.probe).filter(Boolean);
}

export function getSecondaryProbes(atsPatterns) {
  return SECONDARY_ATS_ORDER.map((key) => atsPatterns[key]?.probe).filter(Boolean);
}

export async function probePreferredAts(slug, atsPatterns) {
  for (const probe of getPreferredProbes(atsPatterns)) {
    const result = await probe(slug);
    if (result && result.jobCount !== 0) return { ...result, slug };
  }
  return null;
}

export async function probeSecondaryAts(slug, atsPatterns) {
  for (const probe of getSecondaryProbes(atsPatterns)) {
    const result = await probe(slug);
    if (result && result.jobCount !== 0) return { ...result, slug };
  }
  return null;
}

export async function probeAllAts(slug, atsPatterns) {
  return (await probePreferredAts(slug, atsPatterns)) || (await probeSecondaryAts(slug, atsPatterns));
}

export function isAtsUrl(url) {
  if (!url) return false;
  return /greenhouse\.io|ashbyhq\.com|workable\.com|smartrecruiters\.com|jobvite\.|myworkdayjobs\.com|icims\.com|dover\.(com|io)|lever\.co|kula\.ai|rippling\.com/i.test(
    url
  );
}
