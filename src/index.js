import { loadConfig, loadResume, loadEnv } from "./config.js";
import { scrapeCareerPages } from "./scraper/index.js";
import { matchJobs } from "./matcher.js";
import { createTransporter, sendMatchEmail } from "./emailer.js";
import { filterByPreferences, formatPreferencesSummary } from "./filters/preferences.js";
import { discoverAtsJobs, hasSearchProvider } from "../lib/discover-jobs.js";
import { uniqueBy } from "./utils.js";

const isDryRun = process.argv.includes("--dry-run");
const skipEmail = process.argv.includes("--no-email");
const skipDiscover = process.argv.includes("--skip-discover");

async function main() {
  console.log("Careers Scraper\n");

  const config = loadConfig();
  const minFitScore = config.minFitScore;

  const env = isDryRun ? null : loadEnv({ requireEmail: !skipEmail });

  console.log(`Career pages:   ${config.careerPages.length}`);
  console.log(`ATS discovery:  ${skipDiscover ? "off" : hasSearchProvider() ? "on" : "off (no SERPER_API_KEY)"}`);
  console.log(`Fit threshold:  > ${minFitScore}/5`);
  console.log(`Engineering only: ${config.engineeringOnly ? "yes" : "no"}`);
  if (config.preferences?.enabled !== false) {
    console.log(`Preferences:    ${formatPreferencesSummary(config.preferences)}`);
  }
  console.log();

  console.log("Step 1: Scraping career pages...");
  const scrapedJobs = await scrapeCareerPages(config.careerPages, {
    maxJobsPerPage: config.maxJobsPerPage,
    engineeringOnly: config.engineeringOnly,
  });
  console.log(`  → ${scrapedJobs.length} job(s) from careers.json\n`);

  let discoveredJobs = [];
  if (!skipDiscover && hasSearchProvider()) {
    console.log("Step 2: Discovering jobs via ATS search (Google site: dorks)...");
    const { jobs } = await discoverAtsJobs(config, {
      engineeringOnly: config.engineeringOnly,
      saveOutput: true,
      onProgress: ({ current, total, label }) => {
        process.stdout.write(`\r  [${current}/${total}] ${label}`.padEnd(50));
      },
    });
    discoveredJobs = jobs;
    console.log(`\n  → ${discoveredJobs.length} job(s) from ATS discovery\n`);
  } else if (!skipDiscover && !hasSearchProvider()) {
    console.log("Step 2: Skipped ATS discovery — add SERPER_API_KEY to .env (https://serper.dev)\n");
  }

  const allJobs = uniqueBy(
    [...scrapedJobs.map((j) => ({ ...j, source: "scrape" })), ...discoveredJobs],
    (j) => j.url
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
      const tag = job.source === "discover" ? " [discovered]" : "";
      console.log(`  • ${job.title} @ ${job.company}${tag}`);
      console.log(`    ${job.url}\n`);
    }
    return;
  }

  const resume = loadResume();
  const apiKey = env?.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for resume matching. Set it in .env");
  }

  const matchStep = skipDiscover || !hasSearchProvider() ? 2 : 3;
  console.log(`Step ${matchStep}: Matching jobs against your resume...`);
  const matches = await matchJobs({
    jobs: preferredJobs,
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

  const emailStep = matchStep + 1;
  console.log(`\nStep ${emailStep}: Sending email...`);
  const transporter = createTransporter(env.smtp);
  await sendMatchEmail({
    transporter,
    from: env.emailFrom,
    to: env.emailTo,
    matches,
  });
  console.log(`Email sent to ${env.emailTo}`);
}

main().catch((err) => {
  console.error(`\nError: ${err.message}`);
  process.exit(1);
});
