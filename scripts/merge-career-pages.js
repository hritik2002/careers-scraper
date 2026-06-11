import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/** Additional manual career pages discovered after auto-resolve */
const ADDITIONAL = {
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
};

const data = JSON.parse(readFileSync(resolve(root, "career-pages.json"), "utf-8"));
const config = JSON.parse(readFileSync(resolve(root, "config.json"), "utf-8"));

for (const [company, url] of Object.entries(ADDITIONAL)) {
  if (!data.mapping[company]) {
    data.mapping[company] = url;
    data.unresolved = data.unresolved.filter((c) => c !== company);
  }
}

const companies = JSON.parse(readFileSync(resolve(root, "companies.json"), "utf-8"));
config.careerPages = companies.map((c) => data.mapping[c]).filter(Boolean);

writeFileSync(resolve(root, "career-pages.json"), JSON.stringify({ ...data, resolvedAt: new Date().toISOString() }, null, 2));
writeFileSync(resolve(root, "config.json"), JSON.stringify(config, null, 2) + "\n");

console.log(`Updated: ${Object.keys(data.mapping).length}/${companies.length} companies`);
console.log(`Unresolved (${data.unresolved.length}):`);
data.unresolved.forEach((c) => console.log(`  • ${c}`));
