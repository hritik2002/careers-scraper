import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const resumePath = resolve(root, "resume.md");

if (process.env.RESUME_MD) {
  writeFileSync(resumePath, process.env.RESUME_MD, "utf-8");
  console.log("Wrote resume.md from RESUME_MD secret.");
} else if (!existsSync(resumePath)) {
  console.error("resume.md missing. Set RESUME_MD secret for CI or create resume.md locally.");
  process.exit(1);
}
