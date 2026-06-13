import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const root = resolve(__dirname, "..");

export const paths = {
  companies: resolve(root, "companies.json"),
  careerPages: resolve(root, "career-pages.json"),
  scrapeValidation: resolve(root, "scrape-validation.json"),
  knownAtsUrls: resolve(root, "data/known-ats-urls.json"),
  careersFallbacks: resolve(root, "data/careers-fallbacks.json"),
  vcPortfolio: resolve(root, "data/sources/vc-portfolio.json"),
  startups: resolve(root, "data/sources/startups.json"),
  config: resolve(root, "config.json"),
  configExample: resolve(root, "config.example.json"),
  companiesMd: resolve(root, "COMPANIES.md"),
};
