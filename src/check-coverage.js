import { loadCareers, buildCareersRegistry } from "../lib/careers.js";

function main() {
  const careers = loadCareers();
  const registry = buildCareersRegistry();
  const urls = careers.pages || [];

  const ok = registry.filter((e) => e.status === "ok").length;
  const broken = registry.filter((e) => e.status === "broken" || e.status === "empty").length;
  const unverified = registry.filter((e) => e.status === "unverified").length;

  console.log("Career Pages Report\n");
  console.log(`Total URLs:     ${urls.length}`);
  console.log(`Working:        ${ok}`);
  console.log(`Broken/empty:   ${broken}`);
  console.log(`Unverified:     ${unverified}\n`);

  if (urls.length) {
    console.log("Career pages:");
    for (const { url, status, jobs } of registry.sort((a, b) => a.url.localeCompare(b.url))) {
      const tag = status === "ok" ? "✓" : status === "unverified" ? "○" : "✗";
      const jobsLabel = jobs != null ? ` (${jobs} jobs)` : "";
      console.log(`  ${tag} ${url}${jobsLabel}`);
    }
  }

  if (broken > 0) process.exitCode = 1;
}

main();
