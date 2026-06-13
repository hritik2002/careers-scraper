import { loadCompanyNames, loadCareerPagesData, getMapping } from "../lib/companies.js";

function main() {
  const companies = loadCompanyNames();
  const careerPagesData = loadCareerPagesData();
  const mapping = getMapping(careerPagesData);
  const unscraped = careerPagesData.unscrapedCompanies || [];
  const unscrapedNames = new Set(unscraped.map((entry) => entry.company));

  const covered = new Map();
  for (const company of companies) {
    if (mapping[company]) {
      covered.set(company, [mapping[company]]);
    }
  }

  const missing = companies.filter((c) => !covered.has(c) && !unscrapedNames.has(c));

  console.log("Career Page Coverage Report\n");
  console.log(`Companies in list:      ${companies.length}`);
  console.log(`Companies covered:      ${covered.size}`);
  if (unscraped.length) {
    console.log(`Unscraped (parked):     ${unscraped.length}`);
  }
  console.log(`Companies missing:      ${missing.length}\n`);

  if (covered.size > 0) {
    console.log("✓ Covered companies:");
    for (const [company, urls] of [...covered.entries()].sort()) {
      console.log(`  • ${company}`);
      for (const url of urls) console.log(`      ${url}`);
    }
    console.log();
  }

  if (missing.length > 0) {
    console.log(`✗ Missing career pages (${missing.length}):`);
    for (const company of missing) console.log(`  • ${company}`);
  }

  const parkedInList = companies.filter((c) => unscrapedNames.has(c) && !covered.has(c));
  if (parkedInList.length > 0) {
    console.log(`\n○ Parked (unscraped, ${parkedInList.length}):`);
    for (const company of parkedInList) {
      const entry = unscraped.find((e) => e.company === company);
      const url = entry?.url ? ` — ${entry.url}` : "";
      console.log(`  • ${company}${url}`);
    }
  }

  const accounted = covered.size + parkedInList.length;
  const pct = ((accounted / companies.length) * 100).toFixed(1);
  console.log(`\nCoverage: ${accounted}/${companies.length} (${pct}%) — ${covered.size} scrapeable, ${parkedInList.length} parked`);

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

main();
