import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ATS_PATTERNS } from "./ats-patterns.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SLUG_MANUAL = {
  supabase: ["supabase"],
  exaforce: ["exaforce"],
  vapi: ["vapi"],
  mem0: ["mem0"],
  marqvision: ["marqvision"],
  alaan: ["alaan", "alaan-careers"],
  truefoundry: ["truefoundry"],
  squarex: ["squarex", "getsquarex", "sqrx"],
  "relevance ai": ["relevanceai"],
  atomicwork: ["atomicwork"],
  "better auth": ["betterauth", "better-auth"],
  "finster ai": ["finsterai"],
  scapia: ["scapia"],
  "sarvam ai": ["sarvam"],
  tazapay: ["tazapay"],
  "companion labs": ["companionlabs", "companion-labs"],
  kello: ["kello", "kellohq"],
  "memfold ai": ["memfold", "memfoldai"],
  round1: ["round1", "round1ai"],
  zoop: ["zoop", "zoopone"],
  tensorwave: ["tensorwave"],
  rocketlane: ["rocketlane"],
  "obot ai": ["obot", "obotai"],
  furtherai: ["furtherai"],
  growthbook: ["growthbook"],
  firecrawl: ["firecrawl"],
  gumloop: ["gumloop"],
  "cognida.ai": ["cognida", "cognidaai"],
  orkes: ["orkes"],
  daloopa: ["daloopa"],
  openobserve: ["openobserve-careers", "openobserve"],
  neysa: ["neysanetwork", "neysa"],
  unifyapps: ["unifyapps", "unify-apps"],
  composio: ["composio"],
  seekho: ["seekho"],
  "portkey.ai": ["portkey", "portkeyai"],
  "greylabs ai": ["greylabs", "greylabsai"],
  skydo: ["skydo"],
  finarkein: ["finarkein"],
  "morphing machines": ["morphingmachines", "morphing"],
  "caseflood.ai": ["caseflood", "casefloodai"],
  synthiolabs: ["synthiolabs", "synthio"],
  convin: ["convin"],
  simplismart: ["simplismart"],
  linkrunner: ["linkrunner"],
  "sookti ai": ["sookti", "sooktiai"],
  heizen: ["heizen"],
  "latent ai": ["latent", "latentai"],
  "azimuth ai": ["azimuth", "azimuthai"],
  "sanyark space": ["sanyark", "sanyarkspace"],
};

function slugify(name) {
  return name.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, "").trim();
}

function slugCandidates(name) {
  const slugs = new Set([slugify(name)]);
  const key = name.toLowerCase();
  if (SLUG_MANUAL[key]) SLUG_MANUAL[key].forEach((s) => slugs.add(s));
  name
    .toLowerCase()
    .split(/[\s/]+/)
    .filter((w) => w.length > 2)
    .forEach((w) => slugs.add(slugify(w)));
  return [...slugs];
}

function normalizeGreenhouseUrl(url) {
  return url.replace("https://job-boards.greenhouse.io/", "https://boards.greenhouse.io/");
}

const GENERIC_SLUG_WORDS = new Set([
  "space",
  "labs",
  "lab",
  "better",
  "auth",
  "ai",
  "tech",
  "data",
  "cloud",
  "one",
  "app",
  "io",
  "work",
  "team",
  "group",
  "inc",
  "hq",
]);

function companyWords(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !GENERIC_SLUG_WORDS.has(word));
}

function isPlausibleMatch(company, slug, boardMeta = {}) {
  const primary = slugify(company);
  if (slug === primary) return true;
  if (SLUG_MANUAL[company.toLowerCase()]?.includes(slug)) return true;

  const distinctive = companyWords(company);
  if (distinctive.length === 0) return slug === primary;

  const haystack = `${boardMeta.companyName || ""} ${slug}`.toLowerCase();
  return distinctive.some((word) => haystack.includes(word));
}

async function probeGreenhouse(slug) {
  try {
    const response = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
      { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data.jobs) || data.jobs.length === 0) return null;
    return {
      platform: "greenhouse",
      url: `https://boards.greenhouse.io/${slug}`,
      jobCount: data.jobs.length,
      companyName: data.jobs[0]?.company_name || "",
    };
  } catch {
    return null;
  }
}

async function probeThree(slug, company) {
  for (const [platform, fn] of [
    ["ashby", ATS_PATTERNS.ashby.probe],
    ["greenhouse", probeGreenhouse],
    ["lever", ATS_PATTERNS.lever.probe],
  ]) {
    const result = await fn(slug);
    if (!result) continue;
    if (result.jobCount === 0) continue;
    if (!isPlausibleMatch(company, slug, result)) continue;
    const url =
      platform === "greenhouse" ? normalizeGreenhouseUrl(result.url) : result.url;
    return { platform, url, slug, jobCount: result.jobCount };
  }
  return null;
}

async function resolveStartup(name) {
  for (const slug of slugCandidates(name)) {
    const match = await probeThree(slug, name);
    if (match) return { company: name, ...match };
  }
  return { company: name, url: null };
}

async function main() {
  const companies = JSON.parse(readFileSync(resolve(root, "companies.json"), "utf-8"));
  const dataPath = resolve(root, "career-pages.json");
  const data = JSON.parse(readFileSync(dataPath, "utf-8"));
  const mapping = { ...data.mapping };

  const found = [];
  const notFound = [];

  console.log(`Probing Greenhouse / Lever / Ashby for ${companies.length} startups...\n`);

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    process.stdout.write(`\r[${i + 1}/${companies.length}] ${company.padEnd(36).slice(0, 36)}`);

    const result = await resolveStartup(company);
    if (result.url) {
      found.push(result);
      mapping[company] = result.url;
      console.log(
        `\r[${i + 1}/${companies.length}] ✓ ${company} → ${result.url} (${result.platform}, ${result.jobCount} jobs)`
      );
    } else {
      notFound.push(company);
      delete mapping[company];
      console.log(`\r[${i + 1}/${companies.length}] ✗ ${company}`);
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  writeFileSync(
    dataPath,
    JSON.stringify(
      {
        ...data,
        mapping,
        startupAts: {
          resolvedAt: new Date().toISOString(),
          found: found.map(({ company, url, platform, jobCount, slug }) => ({
            company,
            url,
            platform,
            jobCount,
            slug,
          })),
          notFound,
        },
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ) + "\n"
  );

  console.log(`\n\nDone. Valid ATS pages: ${found.length}/${companies.length}`);
  if (notFound.length) {
    console.log(`\nNo Greenhouse/Lever/Ashby board found for:`);
    notFound.forEach((c) => console.log(`  • ${c}`));
  }
}

main().catch(console.error);
