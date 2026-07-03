import { scrapeLeverBoard } from "../../lib/lever-api.js";

export async function scrapeLever(company, sourceUrl, options) {
  return scrapeLeverBoard(company, sourceUrl, options);
}
