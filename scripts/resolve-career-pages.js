import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { probeAllPlatforms, VC_AGGREGATORS } from "./ats-patterns.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/** Known career page URLs (non-ATS or custom slugs) */
const MANUAL_OVERRIDES = {
  Adobe: "https://careers.adobe.com/us/en/search-results",
  Agoda: "https://careersatagoda.com/jobs",
  Airbnb: "https://careers.airbnb.com/positions/",
  Amazon: "https://www.amazon.jobs/en/search",
  Apple: "https://jobs.apple.com/en-us/search",
  Arcesium: "https://www.arcesium.com/careers.html",
  Atlassian: "https://www.atlassian.com/company/careers/all-jobs",
  "Booking.com": "https://careers.booking.com/jobs",
  "BrightEdge": "https://www.brightedge.com/careers",
  Cleartrip: "https://careers.cleartrip.com/",
  "DE Shaw": "https://www.deshaw.com/careers",
  DoorDash: "https://careers.doordash.com/",
  Flipkart: "https://www.flipkartcareers.com/",
  Google: "https://careers.google.com/jobs/results/",
  "IMC Trading": "https://www.imc.com/us/careers",
  Intuit: "https://jobs.intuit.com/search-jobs",
  "JP Morgan": "https://careers.jpmorgan.com/us/en/search-results",
  LinkedIn: "https://careers.linkedin.com/jobs",
  Meta: "https://www.metacareers.com/jobs",
  Microsoft: "https://careers.microsoft.com/us/en/search-results",
  Nutanix: "https://careers.nutanix.com/jobs",
  Oracle: "https://careers.oracle.com/jobs/",
  Priceline: "https://careers.priceline.com/jobs",
  Rippling: "https://www.rippling.com/careers",
  Roblox: "https://careers.roblox.com/jobs",
  Roku: "https://www.wbd.com/careers",
  Salesforce: "https://careers.salesforce.com/en/jobs/",
  ServiceNow: "https://careers.servicenow.com/jobs",
  Twilio: "https://www.twilio.com/en-us/company/jobs",
  Uber: "https://www.uber.com/us/en/careers/list/",
  "Uber Freight": "https://www.uberfreight.com/careers/",
  Walmart: "https://careers.walmart.com/us/en/search-results",
  Wayfair: "https://www.wayfair.com/careers/jobs",
  Zomato: "https://www.zomato.com/careers",
  Zscaler: "https://www.zscaler.com/careers",
  Cohesity: "https://careers.cohesity.com/",
  Coursera: "https://careers.coursera.com/",
  DigitalOcean: "https://www.digitalocean.com/careers",
  EventBrite: "https://www.eventbritecareers.com/jobs",
  Gojek: "https://careers.gojek.com/",
  Payoneer: "https://www.payoneer.com/careers/",
  PayU: "https://corporate.payu.com/careers/",
  PhonePe: "https://www.phonepe.com/careers/",
  Razorpay: "https://razorpay.com/jobs/",
  ShareChat: "https://sharechat.com/careers",
  Slice: "https://sliceit.com/careers",
  Upstox: "https://upstox.com/careers/",
  MakeMyTrip: "https://careers.makemytrip.com/",
  OYO: "https://www.oyorooms.com/careers/",
  Meesho: "https://meesho.io/careers",
  Groww: "https://groww.in/careers",
  Cred: "https://cred.club/careers",
  Zepto: "https://www.zeptonow.com/careers",
  BharatPe: "https://bharatpe.com/careers",
  Cars24: "https://www.cars24.com/careers/",
  Headout: "https://www.headout.com/careers/",
  Jar: "https://www.myjar.app/careers",
  "Jupiter Money": "https://jupiter.money/careers/",
  Navi: "https://navi.com/careers",
  Swiggy: "https://careers.swiggy.com/",
  Blinkit: "https://blinkit.com/careers",
  Jio: "https://careers.jio.com/",
  JioHotstar: "https://careers.hotstar.com/",
  SRIB: "https://research.samsung.com/careers",
  Games24x7: "https://www.games24x7.com/careers/",
  "Souled Store": "https://www.thesouledstore.com/careers",
  Chargebee: "https://www.chargebee.com/careers/",
  "Eightfold AI": "https://jobs.ashbyhq.com/eightfold",
  Harness: "https://boards.greenhouse.io/harnessinc",
  Tetrate: "https://jobs.ashbyhq.com/tetrate",
  MoEngage: "https://www.moengage.com/careers/",
  Gupshup: "https://www.gupshup.io/about/careers",
  Cuemath: "https://careers.cuemath.com/",
  Curefit: "https://www.cult.fit/careers",
  "Kotak Mahindra Bank": "https://www.kotak.com/en/careers.html",
  "Flipkart SuperMoney": "https://super.money/careers",
  "Jio Fynd": "https://fynd.com/careers",
  "Times Group": "https://timesgroup.com/careers/",
  TrueMeds: "https://truemeds.in/careers",
  Unicards: "https://www.uni.cards/careers",
  Wishlink: "https://www.wishlink.com/careers",
  "Nexthop AI": "https://www.nexthop.ai/careers",
  Moneyview: "https://www.moneyview.in/careers",
  Masai: "https://www.masaischool.com/careers",
  Fanatics: "https://www.fanaticsinc.com/careers",
  "Abstract Security": "https://www.abstractsecurity.com/careers",
  Aidetic: "https://www.aidetic.com/careers",
  Eloelo: "https://eloelo.in/careers",
  Enlyft: "https://www.enlyft.com/careers",
  "Fluent Health": "https://www.fluenthealth.com/careers",
  Intervue: "https://intervue.io/careers",
  Klub: "https://www.klubworks.com/careers",
  "Novama Wealth": "https://www.novamawealth.com/careers",
  "QRT (Qube Research Technologies)": "https://www.qube-rt.com/careers/",
  Skillz: "https://www.skillz.com/careers/",
  Sobeys: "https://sobeys.com/en/careers/",
  Sundial: "https://sundial.so/careers",
  "Delta Exchange": "https://www.delta.exchange/careers",
  Mechademy: "https://mechademy.com/careers",
  Saleschat: "https://saleschat.io/careers",
  Starkey: "https://www.starkey.com/careers",
  Freshworks: "https://www.freshworks.com/company/careers/",
  Postman: "https://boards.greenhouse.io/postman",
  Bloomreach: "https://boards.greenhouse.io/bloomreach",
  Glean: "https://boards.greenhouse.io/gleanwork",
  DeepIntent: "https://boards.greenhouse.io/deepintent",
  YipitData: "https://boards.greenhouse.io/yipitdata",
  Crunchyroll: "https://boards.greenhouse.io/crunchyroll",
  CommerceIQ: "https://boards.greenhouse.io/commerceiq",
  Nirmata: "https://boards.greenhouse.io/nirmata",
  "AlphaGrep Securities": "https://boards.greenhouse.io/alphagrepsecurities",
  EarnIn: "https://boards.greenhouse.io/earnin",
  "Schrödinger (LiveDesign)": "https://boards.greenhouse.io/schrdinger",
  Exaforce: "https://www.exaforce.com/careers",
  Supabase: "https://jobs.ashbyhq.com/supabase",
  "Better Auth": "https://www.better-auth.com/careers",
  Vapi: "https://jobs.ashbyhq.com/vapi",
  Mem0: "https://jobs.ashbyhq.com/mem0",
  MarqVision: "https://job-boards.greenhouse.io/marqvision",
  Alaan: "https://ats.rippling.com/alaan-careers/jobs",
  TrueFoundry: "https://boards.greenhouse.io/truefoundry",
  "Relevance AI": "https://jobs.ashbyhq.com/relevanceai",
  Atomicwork: "https://job-boards.greenhouse.io/atomicwork",
  "Finster AI": "https://boards.greenhouse.io/finsterai",
  "Sarvam AI": "https://jobs.ashbyhq.com/sarvam",
  TensorWave: "https://jobs.ashbyhq.com/tensorwave",
  FurtherAI: "https://jobs.ashbyhq.com/furtherai",
  GrowthBook: "https://www.ycombinator.com/companies/growthbook/jobs",
  Firecrawl: "https://jobs.ashbyhq.com/firecrawl",
  Gumloop: "https://jobs.ashbyhq.com/gumloop",
  Orkes: "https://job-boards.greenhouse.io/orkes",
  Daloopa: "https://ats.rippling.com/daloopa/jobs",
  OpenObserve: "https://jobs.ashbyhq.com/openobserve-careers",
  Neysa: "https://job-boards.greenhouse.io/neysanetwork",
  Composio: "https://jobs.ashbyhq.com/composio",
  Heizen: "https://www.heizen.work/careers",
  "Latent AI": "https://jobs.ashbyhq.com/latent",
  Rocketlane: "https://careers.kula.ai/rocketlane?jobs=true",
  Seekho: "https://apply.workable.com/seekho/",
  "GreyLabs AI": "https://careers.kula.ai/greylabs?jobs=true",
  "Cognida.ai": "https://www.cognida.ai/careers",
  Convin: "https://www.convin.ai/careers",
  "Azimuth AI": "https://azimuth-ai.com/career/",
  Tazapay: "https://tazapay.freshteam.com/jobs",
  Scapia: "https://scapia.freshteam.com/jobs",
  Zoop: "https://www.zoop.one/career",
  "Morphing Machines": "https://portal.morphing.in/jobs",
  Skydo: "https://www.expertia.ai/skydo",
  Simplismart: "https://www.expertia.ai/simplismart-tech",
  "Portkey.ai": "https://portkey.ai/",
  UnifyApps: "https://www.unifyapps.com/",
  SquareX: "https://www.linkedin.com/company/getsquarex/jobs/",
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function slugCandidates(name) {
  const slugs = new Set();
  slugs.add(slugify(name));

  const manual = {
    "de shaw": ["deshaw"],
    "jp morgan": ["jpmorgan", "jpmorganchase"],
    "eightfold ai": ["eightfold"],
    "flipkart supermoney": ["supermoney"],
    "jio fynd": ["fynd"],
    "cockroach labs": ["cockroachlabs"],
    "booking.com": ["booking"],
    "apollo.io": ["apolloio", "apollo"],
    "paytm payments bank": ["paytm"],
    "kotak mahindra bank": ["kotak"],
    "souled store": ["thesouledstore", "souledstore"],
    "games24x7": ["games247"],
    "qrt (qube research technologies)": ["qrt", "quberesearch"],
    "nexthop ai": ["nexthop"],
    "delta exchange": ["deltaexchange"],
    "uber freight": ["uberfreight"],
    "branch international": ["branch"],
    "abstract security": ["abstractsecurity"],
    "fluent health": ["fluenthealth"],
    "wissen technology": ["wissen"],
    "novama wealth": ["novama"],
    "stable money": ["stablemoney"],
    "times group": ["timesinternet", "timesgroup"],
    "network science": ["networkscience"],
    "confido health": ["confidohealth"],
    "dyumn tech": ["dyumntech"],
    "curefit": ["cultfit", "curefit"],
    "cuemath": ["cuemath"],
    "mindtickle": ["mindtickle"],
    "moengage": ["moengage"],
    "moneyview": ["moneyview"],
    "netradyne": ["netradyne"],
    "pocketfm": ["pocketfm"],
    "skillz": ["skillz"],
    "skyflow": ["skyflow"],
    "tetrate": ["tetrate"],
    "truemeds": ["truemeds"],
    "wishlink": ["wishlink"],
    "enterpret": ["enterpret"],
    "eloelo": ["eloelo"],
    "fancraze": ["fancraze"],
    "fleek": ["joinfleek", "fleek"],
    "flyra": ["flyra"],
    "forgecode": ["forgecode"],
    "galileo": ["galileo"],
    "gupshup": ["gupshup"],
    "harness": ["harness"],
    "inferless": ["inferless"],
    "intervue": ["intervue"],
    "iomete": ["iomete"],
    "keychain": ["keychain"],
    "liberis": ["liberis"],
    "masai": ["masaischool", "masai"],
    "mechademy": ["mechademy"],
    "aidetic": ["aidetic"],
    "aion": ["aion"],
    "alphasense": ["alphasense"],
    "arcana": ["arcana"],
    "atlan": ["atlan"],
    "bartr": ["bartr"],
    "cautio": ["cautio"],
    "clearstreet": ["clearstreet"],
    "constantinople": ["constantinople"],
    "demandbase": ["demandbase"],
    "enlyft": ["enlyft"],
    "falconx": ["falconx"],
    "fanatics": ["fanatics"],
    "nasuni": ["nasuni"],
    "sundial": ["sundial"],
    "sifthub": ["sifthub"],
    "stronkworks": ["stronkworks"],
    "unicards": ["unicards", "uni"],
    "zeta": ["zeta"],
    "racco": ["racro"],
    "quince": ["quince"],
    "saleschat": ["saleschat"],
    "rio": ["rio"],
    "klub": ["klub"],
    "payu": ["payu"],
    "latent ai": ["latent", "latentai"],
    "greylabs ai": ["greylabs", "greylabsai"],
    "finster ai": ["finsterai"],
    "sarvam ai": ["sarvam"],
    "relevance ai": ["relevanceai"],
    neysa: ["neysanetwork"],
    openobserve: ["openobserve-careers"],
    alaan: ["alaan-careers"],
    mem0: ["mem0"],
    supabase: ["supabase"],
    "better auth": ["betterauth", "better-auth"],
    squarex: ["getsquarex", "sqrx"],
    convin: ["convin"],
    "cognida.ai": ["cognida"],
    skydo: ["skydo"],
    simplismart: ["simplismart"],
    unifyapps: ["unifyapps"],
  };

  const key = name.toLowerCase();
  if (manual[key]) manual[key].forEach((s) => slugs.add(s));

  name
    .toLowerCase()
    .split(/[\s/]+/)
    .filter((w) => w.length > 2)
    .forEach((w) => slugs.add(slugify(w)));

  return [...slugs];
}

async function resolveCompany(name) {
  if (MANUAL_OVERRIDES[name]) {
    return { company: name, url: MANUAL_OVERRIDES[name], source: "manual" };
  }

  const slugs = slugCandidates(name);

  for (const slug of slugs) {
    const result = await probeAllPlatforms(slug);
    if (result) {
      return {
        company: name,
        url: result.url,
        source: result.platform,
        slug: result.slug,
        jobCount: result.jobCount,
        scrapeNote: result.scrapeNote,
      };
    }
  }

  return { company: name, url: null, source: "unresolved" };
}

async function main() {
  const companies = JSON.parse(readFileSync(resolve(root, "companies.json"), "utf-8"));
  const results = [];
  const unresolved = [];

  console.log(`Resolving career pages for ${companies.length} companies...\n`);

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    process.stdout.write(`\r[${i + 1}/${companies.length}] ${company.padEnd(40).slice(0, 40)}`);

    const result = await resolveCompany(company);
    results.push(result);

    if (result.url) {
      console.log(`\r[${i + 1}/${companies.length}] ✓ ${company} → ${result.url}`);
    } else {
      unresolved.push(company);
      console.log(`\r[${i + 1}/${companies.length}] ✗ ${company}`);
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  const careerPages = results.filter((r) => r.url).map((r) => r.url);
  const mapping = Object.fromEntries(results.filter((r) => r.url).map((r) => [r.company, r.url]));

  writeFileSync(resolve(root, "career-pages.json"), JSON.stringify({ mapping, unresolved, resolvedAt: new Date().toISOString() }, null, 2));

  console.log(`\n\nDone!`);
  console.log(`Resolved:   ${careerPages.length}/${companies.length}`);
  console.log(`Unresolved: ${unresolved.length}`);
  console.log(`\nVC aggregators (check manually):`);
  for (const { vc, url } of VC_AGGREGATORS) console.log(`  • ${vc}: ${url}`);
  console.log(`\nUpdated career-pages.json (config.json not auto-overwritten — merge manually)`);
}

main().catch(console.error);
