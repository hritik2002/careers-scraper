/** ATS domains for Google `site:` dork searches. */

export const ATS_SEARCH_SITES = [
  { id: "ashby", label: "Ashby", domain: "jobs.ashbyhq.com" },
  { id: "greenhouse", label: "Greenhouse (boards)", domain: "boards.greenhouse.io" },
  { id: "greenhouse-new", label: "Greenhouse (job-boards)", domain: "job-boards.greenhouse.io" },
  { id: "lever", label: "Lever", domain: "jobs.lever.co" },
  { id: "icims", label: "iCIMS", domain: "careers.icims.com" },
  { id: "jobvite", label: "Jobvite", domain: "jobs.jobvite.com" },
  { id: "workday", label: "Workday", domain: "myworkdayjobs.com" },
  { id: "bamboohr", label: "BambooHR", domain: "jobs.bamboohr.com" },
  { id: "smartrecruiters", label: "SmartRecruiters", domain: "jobs.smartrecruiters.com" },
  { id: "jazz", label: "JazzHR", domain: "apply.jazz.co" },
  { id: "workable", label: "Workable", domain: "apply.workable.com" },
  { id: "kula", label: "Kula", domain: "careers.kula.ai" },
  { id: "rippling", label: "Rippling", domain: "ats.rippling.com" },
  { id: "gem", label: "Gem", domain: "jobs.gem.com" },
];

export function getSearchSites(siteFilter) {
  if (!siteFilter?.length) return ATS_SEARCH_SITES;
  const ids = new Set(siteFilter.map((s) => s.toLowerCase()));
  return ATS_SEARCH_SITES.filter((site) => ids.has(site.id) || ids.has(site.domain));
}
