import * as cheerio from "cheerio";
import { isCompanyWebsite, pageLinks } from "./crawl.js";
import { publicUrl } from "./parse.js";

export function parseFeed(xml, { maxFeedItems, maxAgeDays, now = Date.now() }) {
  const $ = cheerio.load(xml, { xmlMode: true });
  return $("item").map((_, el) => {
    const item = $(el);
    const published = Date.parse(item.find("pubDate").text());
    return { url: item.find("link").text().trim(), published,
      html: item.find("content\\:encoded").text() || item.find("description").text() };
  }).get().filter((item) => item.html && Number.isFinite(item.published) &&
    item.published >= now - maxAgeDays * 86400000 && item.published <= now + 86400000
  ).slice(0, maxFeedItems);
}

export async function scrapeNewsletter(source, ctx) {
  const xml = await ctx.text(source.url);
  if (!/<rss[\s>]/i.test(xml)) throw new Error("Expected a public RSS feed");
  const items = parseFeed(xml, ctx);
  const targets = [];
  for (const item of items) {
    const base = publicUrl(item.url) || source.url;
    for (const link of pageLinks(item.html, base)) {
      if (!isCompanyWebsite(link.url, base)) continue;
      const path = new URL(link.url).pathname;
      const career = /careers?|jobs?|positions?|openings?|ashbyhq|greenhouse|lever\.co/i.test(link.url);
      // FYSK recaps list company homepages instead of job URLs. Ignore sponsors,
      // media and event links by requiring homepage URLs for that fallback.
      const homepage = source.id === "founders-ysk" && /^\/?$/.test(path) &&
        link.title && !/subscribe|quiz|newsletter|follow|community|sponsor/i.test(link.title);
      if (!career && !homepage) continue;
      targets.push({ url: link.url, company: homepage ? link.title : undefined });
    }
  }
  return ctx.followCompanies(targets);
}
