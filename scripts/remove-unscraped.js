import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const UNSCRAPED = [
  { company: "Abstract Security", url: "https://www.abstractsecurity.com/careers", reason: "HTTP 404" },
  { company: "Adobe", url: "https://careers.adobe.com/us/en/search-results", reason: "Could not find job listings" },
  { company: "Agoda", url: "https://careersatagoda.com/jobs", reason: "HTTP 403" },
  { company: "Aidetic", url: "https://www.aidetic.com/careers", reason: "Could not find job listings" },
  { company: "Aion", url: null, reason: "No career page URL found" },
  { company: "Amazon", url: "https://www.amazon.jobs/en/search", reason: "Could not find job listings" },
  { company: "Arcana", url: null, reason: "No career page URL found" },
  { company: "Arcesium", url: "https://www.arcesium.com/careers.html", reason: "HTTP 404" },
  { company: "Bartr", url: null, reason: "No career page URL found" },
  { company: "Blinkit", url: "https://blinkit.com/careers", reason: "HTTP 403" },
  { company: "Booking.com", url: "https://careers.booking.com/jobs", reason: "HTTP 404" },
  { company: "Cautio", url: null, reason: "No career page URL found" },
  { company: "Cleartrip", url: "https://careers.cleartrip.com/", reason: "Could not find job listings" },
  { company: "Constantinople", url: null, reason: "No career page URL found" },
  { company: "Cred", url: "https://cred.club/careers", reason: "HTTP 404" },
  { company: "Cuemath", url: "https://careers.cuemath.com/", reason: "Fetch failed" },
  { company: "Curefit", url: "https://www.cult.fit/careers", reason: "Could not find job listings" },
  { company: "Delta Exchange", url: "https://www.delta.exchange/careers", reason: "HTTP 404" },
  { company: "DigitalOcean", url: "https://www.digitalocean.com/careers", reason: "Could not find job listings" },
  { company: "DoorDash", url: "https://careers.doordash.com/", reason: "HTTP 403" },
  { company: "Dyumn Tech", url: null, reason: "No career page URL found" },
  { company: "Eightfold AI", url: "https://jobs.ashbyhq.com/eightfold", reason: "HTTP 404" },
  { company: "Eloelo", url: "https://eloelo.in/careers", reason: "Could not find job listings" },
  { company: "EventBrite", url: "https://www.eventbritecareers.com/jobs", reason: "HTTP 404" },
  { company: "Fanatics", url: "https://www.fanaticsinc.com/careers", reason: "Could not find job listings" },
  { company: "Fancraze", url: null, reason: "No career page URL found" },
  { company: "Flipkart", url: "https://www.flipkartcareers.com/", reason: "Could not find job listings" },
  { company: "Flipkart SuperMoney", url: "https://super.money/careers", reason: "HTTP 404" },
  { company: "Fluent Health", url: "https://www.fluenthealth.com/careers", reason: "Fetch failed" },
  { company: "Flyra", url: null, reason: "No career page URL found" },
  { company: "Forgecode", url: null, reason: "No career page URL found" },
  { company: "Games24x7", url: "https://www.games24x7.com/careers/", reason: "HTTP 404" },
  { company: "Gojek", url: "https://careers.gojek.com/", reason: "Fetch failed" },
  { company: "Gupshup", url: "https://www.gupshup.io/about/careers", reason: "Could not find job listings" },
  { company: "Inferless", url: null, reason: "No career page URL found" },
  { company: "Intervue", url: "https://intervue.io/careers", reason: "Could not find job listings" },
  { company: "Iomete", url: null, reason: "No career page URL found" },
  { company: "Jar", url: "https://www.myjar.app/careers", reason: "Could not find job listings" },
  { company: "Jio", url: "https://careers.jio.com/", reason: "Could not find job listings" },
  { company: "Jio Fynd", url: "https://fynd.com/careers", reason: "Could not find job listings" },
  { company: "JioHotstar", url: "https://careers.hotstar.com/", reason: "Could not find job listings" },
  { company: "Jupiter Money", url: "https://jupiter.money/careers/", reason: "Could not find job listings" },
  { company: "Klub", url: "https://www.klubworks.com/careers", reason: "HTTP 404" },
  { company: "Kotak Mahindra Bank", url: "https://www.kotak.com/en/careers.html", reason: "HTTP 404" },
  { company: "LinkedIn", url: "https://careers.linkedin.com/jobs", reason: "HTTP 404" },
  { company: "MakeMyTrip", url: "https://careers.makemytrip.com/", reason: "Could not find job listings" },
  { company: "Masai", url: "https://www.masaischool.com/careers", reason: "Could not find job listings" },
  { company: "Mechademy", url: "https://mechademy.com/careers", reason: "HTTP 404" },
  { company: "Meesho", url: "https://meesho.io/careers", reason: "HTTP 404" },
  { company: "Meta", url: "https://www.metacareers.com/jobs", reason: "HTTP 400" },
  { company: "Microsoft", url: "https://careers.microsoft.com/us/en/search-results", reason: "Could not find job listings" },
  { company: "Moneyview", url: "https://www.moneyview.in/careers", reason: "Could not find job listings" },
  { company: "Nexthop AI", url: "https://www.nexthop.ai/careers", reason: "HTTP 404" },
  { company: "Novama Wealth", url: "https://www.novamawealth.com/careers", reason: "Fetch failed" },
  { company: "Nutanix", url: "https://careers.nutanix.com/jobs", reason: "HTTP 403" },
  { company: "Oracle", url: "https://careers.oracle.com/jobs/", reason: "Could not find job listings" },
  { company: "OYO", url: "https://www.oyorooms.com/careers/", reason: "Could not find job listings" },
  { company: "Payoneer", url: "https://www.payoneer.com/careers/", reason: "Could not find job listings" },
  { company: "Priceline", url: "https://careers.priceline.com/jobs", reason: "HTTP 404" },
  { company: "QRT (Qube Research Technologies)", url: "https://www.qube-rt.com/careers/", reason: "HTTP 403" },
  { company: "Racro", url: null, reason: "No career page URL found" },
  { company: "Rio", url: null, reason: "No career page URL found" },
  { company: "Roku", url: "https://www.wbd.com/careers", reason: "Could not find job listings" },
  { company: "Saleschat", url: "https://saleschat.io/careers", reason: "Could not find job listings" },
  { company: "ServiceNow", url: "https://careers.servicenow.com/jobs", reason: "HTTP 403" },
  { company: "ShareChat", url: "https://sharechat.com/careers", reason: "Could not find job listings" },
  { company: "Sifthub", url: null, reason: "No career page URL found" },
  { company: "Sobeys", url: "https://sobeys.com/en/careers/", reason: "HTTP 403" },
  { company: "Souled Store", url: "https://www.thesouledstore.com/careers", reason: "Could not find job listings" },
  { company: "Starkey", url: "https://www.starkey.com/careers", reason: "Could not find job listings" },
  { company: "Stronkworks", url: null, reason: "No career page URL found" },
  { company: "Sundial", url: "https://sundial.so/careers", reason: "HTTP 404" },
  { company: "Tetrate", url: "https://jobs.ashbyhq.com/tetrate", reason: "HTTP 404" },
  { company: "Times Group", url: "https://timesgroup.com/careers/", reason: "Fetch failed" },
  { company: "TrueMeds", url: "https://truemeds.in/careers", reason: "HTTP 404" },
  { company: "Twilio", url: "https://www.twilio.com/en-us/company/jobs", reason: "Could not find job listings" },
  { company: "Uber Freight", url: "https://www.uberfreight.com/careers/", reason: "Could not find job listings" },
  { company: "Unicards", url: "https://www.uni.cards/careers", reason: "HTTP 403" },
  { company: "Wayfair", url: "https://www.wayfair.com/careers/jobs", reason: "HTTP 429" },
  { company: "Wishlink", url: "https://www.wishlink.com/careers", reason: "HTTP 500" },
  { company: "Zepto", url: "https://www.zeptonow.com/careers", reason: "Could not find job listings" },
  { company: "Zomato", url: "https://www.zomato.com/careers", reason: "Could not find job listings" },
];

const unscrapedNames = new Set(UNSCRAPED.map((e) => e.company));
const careerPagesData = JSON.parse(readFileSync(resolve(root, "career-pages.json"), "utf-8"));
const config = JSON.parse(readFileSync(resolve(root, "config.json"), "utf-8"));

const keptMapping = Object.fromEntries(
  Object.entries(careerPagesData.mapping).filter(([company]) => !unscrapedNames.has(company))
);

const keptCompanies = Object.keys(keptMapping).sort((a, b) => a.localeCompare(b));

writeFileSync(resolve(root, "companies.json"), JSON.stringify(keptCompanies, null, 2) + "\n");

writeFileSync(
  resolve(root, "career-pages.json"),
  JSON.stringify(
    {
      mapping: keptMapping,
      unscrapedCompanies: UNSCRAPED.sort((a, b) => a.company.localeCompare(b.company)),
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  )
);

config.careerPages = keptCompanies.map((c) => keptMapping[c]);
config.unscrapedCompanies = UNSCRAPED.sort((a, b) => a.company.localeCompare(b.company));
writeFileSync(resolve(root, "config.json"), JSON.stringify(config, null, 2) + "\n");

console.log(`Kept:      ${keptCompanies.length} companies`);
console.log(`Unscraped: ${UNSCRAPED.length} companies (in unscrapedCompanies)`);
