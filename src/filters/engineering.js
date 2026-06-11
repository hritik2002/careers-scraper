const KEYWORDS = [
  "software engineer",
  "frontend",
  "backend",
  "infra",
  "react",
  "javascript",
  "typescript",
  "nextjs",
  "nodejs",
  "database",
];

function normalize(text) {
  return text.toLowerCase().replace(/[\s._-]+/g, "");
}

export function isEngineeringJob(job) {
  const text = `${job.title || ""} ${job.department || ""} ${job.team || ""}`.toLowerCase();
  const normalized = normalize(text);

  return KEYWORDS.some((keyword) => {
    if (text.includes(keyword)) return true;
    return normalized.includes(normalize(keyword));
  });
}

export function filterEngineeringJobs(jobs) {
  return jobs.filter(isEngineeringJob);
}
