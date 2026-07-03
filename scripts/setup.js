import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Local files to create from their tracked *.example templates (never overwrites). */
const files = [
  { from: "config.example.json", to: "config.json" },
  { from: "resume.example.md", to: "resume.md" },
  { from: ".env.example", to: ".env" },
];

let created = 0;

for (const { from, to } of files) {
  const dest = resolve(root, to);
  if (existsSync(dest)) {
    console.log(`• ${to} already exists — left unchanged`);
    continue;
  }
  copyFileSync(resolve(root, from), dest);
  console.log(`✓ created ${to} from ${from}`);
  created++;
}

console.log(
  created
    ? `\nDone. Now edit resume.md, config.json, and .env, then run: npm start`
    : `\nAll config files already present. Edit them if needed, then run: npm start`
);
