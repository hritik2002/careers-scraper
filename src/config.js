import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadCareerPagesFromJson() {
  const pagesPath = resolve(root, "career-pages.json");
  if (!existsSync(pagesPath)) return [];

  const data = JSON.parse(readFileSync(pagesPath, "utf-8"));
  return [...new Set(Object.values(data.mapping || {}))];
}

export function loadConfig() {
  const configPath = process.env.CONFIG_PATH || resolve(root, "config.json");
  const examplePath = resolve(root, "config.example.json");

  let config;
  if (existsSync(configPath)) {
    config = JSON.parse(readFileSync(configPath, "utf-8"));
  } else if (existsSync(examplePath)) {
    config = JSON.parse(readFileSync(examplePath, "utf-8"));
  } else {
    throw new Error(
      "Config not found. Copy config.example.json to config.json and add your career pages."
    );
  }

  let careerPages = config.careerPages;
  if (!Array.isArray(careerPages) || careerPages.length === 0 || process.env.CAREER_PAGES_FROM_JSON === "1") {
    careerPages = loadCareerPagesFromJson();
  }

  if (!Array.isArray(careerPages) || careerPages.length === 0) {
    throw new Error("Config must include career pages (careerPages array or career-pages.json mapping).");
  }

  return {
    careerPages,
    minFitScore:
      config.minFitScore ??
      (process.env.MIN_FIT_SCORE ? Number(process.env.MIN_FIT_SCORE) : 2.5),
    maxJobsPerPage: config.maxJobsPerPage ?? 50,
    engineeringOnly: config.engineeringOnly ?? true,
    preferences: config.preferences ?? {},
  };
}

export function loadResume() {
  const resumePath = process.env.RESUME_PATH || resolve(root, "resume.md");
  if (!existsSync(resumePath)) {
    throw new Error(
      `Resume not found at ${resumePath}. Copy resume.example.md to resume.md and fill in your details.`
    );
  }
  return readFileSync(resumePath, "utf-8");
}

export function loadEnv({ requireEmail = true } = {}) {
  const required = ["OPENAI_API_KEY"];
  if (requireEmail) {
    required.push("SMTP_HOST", "SMTP_USER", "SMTP_PASS", "EMAIL_TO");
  }

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const env = {
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    minFitScore: Number(process.env.MIN_FIT_SCORE || 2.5),
  };

  if (requireEmail) {
    env.smtp = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    };
    env.emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER;
    env.emailTo = process.env.EMAIL_TO;
  }

  return env;
}
