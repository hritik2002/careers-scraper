import { loadConfig, loadResume, loadEnv } from "./config.js";
import { scrapeCareerPages } from "./scraper/index.js";
import { matchJobs } from "./matcher.js";
import { createTransporter, sendMatchEmail } from "./emailer.js";
import { filterByPreferences } from "./filters/preferences.js";

const isDryRun = process.argv.includes("--dry-run");
const skipEmail = process.argv.includes("--no-email");

async function main() {
  console.log("Careers Scraper\n");

  const config = loadConfig();
  const minFitScore = config.minFitScore;

  const env = isDryRun ? null : loadEnv({ requireEmail: !skipEmail });

  console.log(`Career pages: ${config.careerPages.length}`);
  console.log(`Fit threshold:  > ${minFitScore}/5`);
  console.log(`Engineering only: ${config.engineeringOnly ? "yes" : "no"}`);
  if (config.preferences?.enabled !== false) {
    const yoe = `${config.preferences.minYearsExperience ?? 0}–${config.preferences.maxYearsExperience ?? 4} YOE`;
    console.log(`Preferences:    frontend/full-stack · ${yoe} · India or remote`);
  }
  console.log();

  console.log("Step 1: Scraping job listings...");
  const jobs = await scrapeCareerPages(config.careerPages, {
    maxJobsPerPage: config.maxJobsPerPage,
    engineeringOnly: config.engineeringOnly,
  });
  console.log(`\nFound ${jobs.length} unique ${config.engineeringOnly ? "engineering " : ""}job(s) across all pages.`);

  const preferredJobs =
    config.preferences?.enabled === false ? jobs : filterByPreferences(jobs, config.preferences);
  if (config.preferences?.enabled !== false) {
    console.log(`After preferences:  ${preferredJobs.length} job(s) (frontend/full-stack · 0–4 YOE · India/remote)\n`);
  } else {
    console.log();
  }

  if (preferredJobs.length === 0) {
    console.log("No jobs match your preferences. Try widening filters in config.json.");
    return;
  }

  if (isDryRun) {
    console.log("Dry run — listing scraped jobs (no AI scoring or email):\n");
    for (const job of preferredJobs) {
      console.log(`  • ${job.title} @ ${job.company}`);
      console.log(`    ${job.url}\n`);
    }
    return;
  }

  const resume = loadResume();
  const apiKey = env?.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for resume matching. Set it in .env");
  }

  console.log("Step 2: Matching jobs against your resume...");
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

  console.log(`\n${matches.length} job(s) scored above ${minFitScore}/5.\n`);

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

  console.log("\nStep 3: Sending email...");
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
