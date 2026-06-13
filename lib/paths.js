import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const root = resolve(__dirname, "..");

export const paths = {
  careers: resolve(root, "careers.json"),
  config: resolve(root, "config.json"),
  configExample: resolve(root, "config.example.json"),
  careersMd: resolve(root, "CAREERS.md"),
};
