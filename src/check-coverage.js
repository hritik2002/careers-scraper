import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { detectPlatform } from "./scraper/detect.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadJson(filename) {
  const path = resolve(root, filename);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function companySlugs(name) {
  const base = slugify(name);
  const aliases = [base];

  const parts = name.toLowerCase().split(/[\s/]+/).filter(Boolean);
  if (parts.length > 1) aliases.push(slugify(parts[0]), slugify(parts[parts.length - 1]));

  const manual = {
    "de shaw": ["deshaw", "deshawresearch"],
    "jp morgan": ["jpmorgan", "jpmorganchase"],
    "eightfold ai": ["eightfold", "eightfoldai"],
    "flipkart supermoney": ["supermoney", "flipkartsupermoney"],
    "jio fynd": ["fynd", "jiofynd"],
    "cockroach labs": ["cockroachlabs", "cockroachdb"],
    "booking.com": ["booking", "bookingcom"],
    "apollo.io": ["apollo", "apolloio"],
    "paytm payments bank": ["paytm", "paytmbank"],
    "kotak mahindra bank": ["kotak", "kotakmahindrabank"],
    "souled store": ["souledstore", "thesouledstore"],
    "games24x7": ["games247", "games24x7"],
    "qrt (qube research technologies)": ["qrt", "quberesearch"],
    "nexthop ai": ["nexthop", "nexthopai"],
    "delta exchange": ["deltaexchange"],
    "uber freight": ["uberfreight"],
    "branch international": ["branch", "branchco"],
    "abstract security": ["abstractsecurity"],
    "fluent health": ["fluenthealth"],
    "wissen technology": ["wissen", "wissentechnology"],
    "novama wealth": ["novama", "novamawealth"],
    "stable money": ["stablemoney"],
    "times group": ["timesgroup", "timesinternet"],
    "network science": ["networkscience"],
    "confido health": ["confidohealth"],
    "dyumn tech": ["dyumntech"],
    "flipkart supermoney": ["supermoney"],
    "greylabs ai": ["greylabs", "greylabsai"],
    "better auth": ["betterauth", "better-auth"],
    "finster ai": ["finsterai", "finster"],
    "openobserve": ["openobserve-careers", "openobserve"],
    "neysa": ["neysanetwork", "neysa"],
    "marqvision": ["marqvision"],
    "relevance ai": ["relevanceai", "relevance"],
    "sarvam ai": ["sarvam", "sarvamai"],
    "latent ai": ["latent", "latentai"],
    "truefoundry": ["truefoundry"],
    "growthbook": ["growthbook"],
    "alaan": ["alaan-careers", "alaan"],
    "atomicwork": ["atomicwork"],
  };

  const key = name.toLowerCase();
  if (manual[key]) aliases.push(...manual[key].map(slugify));

  return [...new Set(aliases.filter(Boolean))];
}

function extractUrlSlug(url) {
  try {
    const { platform, company } = detectPlatform(url);
    const parsed = new URL(url);
    const slugs = [];

    if (company) slugs.push(slugify(company));

    const hostParts = parsed.hostname.replace(/^www\./, "").split(".");
    slugs.push(slugify(hostParts[0]));

    const pathSlug = parsed.pathname.split("/").filter(Boolean).pop();
    if (pathSlug) slugs.push(slugify(pathSlug));

    return { platform, slugs: [...new Set(slugs.filter(Boolean))], url };
  } catch {
    return { platform: "unknown", slugs: [], url };
  }
}

function findCompanyForUrl(url, companies) {
  const { slugs } = extractUrlSlug(url);

  for (const company of companies) {
    const candidates = companySlugsList(company).map(slugify);
    const matched = slugs.some((s) => candidates.includes(s));
    if (matched) return company;
  }

  return null;
}

function companySlugsList(name) {
  return companySlugs(name);
}

function main() {
  const companies = loadJson("companies.json");
  const config = loadJson("config.json");
  const careerPagesData = loadJson("career-pages.json");

  if (!companies?.length) {
    console.error("companies.json not found or empty.");
    process.exit(1);
  }

  const careerPages = config?.careerPages || [];
  const companyCareerPages = config?.companyCareerPages || {};
  const unscraped = config?.unscrapedCompanies || careerPagesData?.unscrapedCompanies || [];
  const unscrapedNames = new Set(unscraped.map((entry) => entry.company));
  const mapping = careerPagesData?.mapping || {};
  const covered = new Map();
  const unmatchedUrls = [];

  if (Object.keys(companyCareerPages).length > 0) {
    for (const company of companies) {
      if (companyCareerPages[company]) {
        covered.set(company, [companyCareerPages[company]]);
      }
    }
  } else if (Object.keys(mapping).length > 0) {
    for (const company of companies) {
      if (mapping[company]) {
        covered.set(company, [mapping[company]]);
      }
    }
  } else {
    for (const url of careerPages) {
      const match = findCompanyForUrl(url, companies);
      if (match) {
        if (!covered.has(match)) covered.set(match, []);
        covered.get(match).push(url);
      } else {
        unmatchedUrls.push(url);
      }
    }
  }

  const missing = companies.filter((c) => !covered.has(c) && !unscrapedNames.has(c));

  console.log("Career Page Coverage Report\n");
  console.log(`Companies in list:      ${companies.length}`);
  console.log(`Career pages in config: ${careerPages.length}`);
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

  if (unmatchedUrls.length > 0) {
    console.log("⚠ Configured URLs not matched to any company in companies.json:");
    for (const url of unmatchedUrls) console.log(`  • ${url}`);
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
