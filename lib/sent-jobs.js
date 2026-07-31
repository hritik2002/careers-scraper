import { readFileSync, writeFileSync, existsSync } from "fs";
import { paths } from "./paths.js";

export function loadSentJobs() {
  if (!existsSync(paths.sentJobs)) return new Set();
  return new Set(JSON.parse(readFileSync(paths.sentJobs, "utf-8")));
}

export function saveSentJobs(urls) {
  writeFileSync(paths.sentJobs, JSON.stringify([...urls].sort(), null, 2) + "\n");
}
