import { loadConfig, loadResume, loadEnv } from "./config.js";
import { scrapeCareerPages } from "./scraper/index.js";
import { matchJobs } from "./matcher.js";
import { createTransporter, sendMatchEmail } from "./emailer.js";
import { filterByPreferences, formatPreferencesSummary } from "./filters/preferences.js";
import { discoverAtsJobs, hasSearchProvider } from "../lib/discover-jobs.js";
import { loadSentJobs, saveSentJobs } from "../lib/sent-jobs.js";
import { uniqueBy } from "./utils.js";
import { scrapeAdditionalSources, sourceSettings } from "./sources/index.js";
import { canonicalJobUrl } from "./sources/parse.js";

const isDryRun = process.argv.includes("--dry-run");
const skipEmail = process.argv.includes("--no-email");
const skipDiscover = process.argv.includes("--skip-discover");
const skipSources = process.argv.includes("--skip-sources");
const sourcesOnly = process.argv.includes("--sources-only");

async function main() {
  console.log("Careers Scraper\n");

  const config = loadConfig();
  const minFitScore = config.minFitScore;
  const additionalSources = sourceSettings(config);
  let step = 1;

  const env = isDryRun ? null : loadEnv({ requireEmail: !skipEmail });

  console.log(`Career pages:   ${sourcesOnly ? "off (--sources-only)" : config.careerPages.length}`);
  console.log(`Extra sources:  ${skipSources || !additionalSources.enabled ? "off" : additionalSources.sources.join(", ")}`);
  console.log(`ATS discovery:  ${skipDiscover || sourcesOnly ? "off" : hasSearchProvider() ? "on" : "off (no search API key)"}`);
  console.log(`Fit threshold:  > ${minFitScore}/5`);
  console.log(`Engineering only: ${config.engineeringOnly ? "yes" : "no"}`);
  if (config.preferences?.enabled !== false) {
    console.log(`Preferences:    ${formatPreferencesSummary(config.preferences)}`);
  }
  console.log();

  let scrapedJobs = [];
  if (!sourcesOnly) {
    console.log(`Step ${step++}: Scraping career pages...`);
    scrapedJobs = await scrapeCareerPages(config.careerPages, {
      maxJobsPerPage: config.maxJobsPerPage,
      engineeringOnly: config.engineeringOnly,
    });
    console.log(`  → ${scrapedJobs.length} job(s) from careers.json\n`);
  }

  let sourceJobs = [];
  if (!skipSources && additionalSources.enabled) {
    console.log(`Step ${step++}: Scraping additional job sources...`);
    const { jobs } = await scrapeAdditionalSources(config, {
      existingJobs: scrapedJobs,
      onProgress: (source) => console.log(`  Fetching ${source.label}...`),
      onWarning: (message) => console.warn(`    ! ${message}`),
      onResult: (result) => {
        const status = result.status === "ok" ? `✓ ${result.count} job(s)` : `✗ ${result.error}`;
        console.log(`  ${result.label} — ${status}`);
      },
    });
    sourceJobs = jobs;
    console.log(`  → ${sourceJobs.length} job(s) from additional sources\n`);
  }

  let discoveredJobs = [];
  if (!skipDiscover && !sourcesOnly && hasSearchProvider()) {
    console.log(`Step ${step++}: Discovering jobs via ATS search (Google site: dorks)...`);
    const { jobs } = await discoverAtsJobs(config, {
      engineeringOnly: config.engineeringOnly,
      saveOutput: true,
      onProgress: ({ current, total, label }) => {
        process.stdout.write(`\r  [${current}/${total}] ${label}`.padEnd(50));
      },
    });
    discoveredJobs = jobs;
    console.log(`\n  → ${discoveredJobs.length} job(s) from ATS discovery\n`);
  } else if (!skipDiscover && !sourcesOnly && !hasSearchProvider()) {
    console.log("Skipped ATS discovery — add SERPER_API_KEY to .env (https://serper.dev)\n");
  }

  const allJobs = uniqueBy(
    [...scrapedJobs.map((j) => ({ ...j, source: "scrape" })), ...sourceJobs, ...discoveredJobs],
    (j) => canonicalJobUrl(j.url)
  );
  console.log(`Combined:       ${allJobs.length} unique job(s)\n`);

  const preferredJobs =
    config.preferences?.enabled === false ? allJobs : filterByPreferences(allJobs, config.preferences);
  if (config.preferences?.enabled !== false) {
    console.log(`After preferences: ${preferredJobs.length} job(s)\n`);
  }

  if (preferredJobs.length === 0) {
    console.log("No jobs match your preferences. Try widening filters in config.json.");
    return;
  }

  if (isDryRun) {
    console.log("Dry run — listing jobs (no AI scoring or email):\n");
    for (const job of preferredJobs) {
      const tag = job.sourceLabel ? ` [${job.sourceLabel}]` : job.source === "discover" ? " [discovered]" : "";
      console.log(`  • ${job.title} @ ${job.company}${tag}`);
      console.log(`    ${job.url}\n`);
    }
    return;
  }

  const sentJobs = loadSentJobs();
  const sentUrls = new Set([...sentJobs].map((url) => canonicalJobUrl(url)));
  const unseenJobs = preferredJobs.filter((j) => !sentUrls.has(canonicalJobUrl(j.url)));
  console.log(`Already emailed: ${preferredJobs.length - unseenJobs.length} job(s), skipping\n`);

  if (unseenJobs.length === 0) {
    console.log("No new jobs since the last run.");
    return;
  }

  const resume = loadResume();
  const apiKey = env?.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for resume matching. Set it in .env");
  }

  console.log(`Step ${step++}: Matching jobs against your resume...`);
  const matches = await matchJobs({
    jobs: unseenJobs,
    resume,
    openaiApiKey: apiKey,
    model: env?.openaiModel || process.env.OPENAI_MODEL || "gpt-4o-mini",
    minFitScore: env?.minFitScore ?? minFitScore,
    preferences: config.preferences,
    onProgress: (current, total, job) => {
      process.stdout.write(`\r  Scoring ${current}/${total}: ${job.title.slice(0, 50).padEnd(50)}`);
    },
  });
  console.log("\n");

  console.log(`${matches.length} job(s) scored above ${minFitScore}/5.\n`);

  if (matches.length === 0) {
    console.log("No matches to email. Try lowering minFitScore or updating your resume.");
    return;
  }

  for (const job of matches) {
    console.log(`  ★ ${job.score}/5 — ${job.title} @ ${job.company}`);
    console.log(`    ${job.url}`);
  }

  if (skipEmail || !env?.smtp) {
    console.log("\nEmail skipped (--no-email or missing SMTP config).");
    return;
  }

  console.log(`\nStep ${step++}: Sending email...`);
  const transporter = createTransporter(env.smtp);
  await sendMatchEmail({
    transporter,
    from: env.emailFrom,
    to: env.emailTo,
    matches,
  });
  console.log(`Email sent to ${env.emailTo}`);

  saveSentJobs(new Set([...sentJobs, ...matches.map((j) => j.url)]));
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
