import * as cheerio from "cheerio";
import { embeddedData, publicUrl } from "./parse.js";
import { isCompanyWebsite, pageLinks } from "./crawl.js";

export async function scrapeBreakout(source, ctx) {
  const html = await ctx.text(source.url);
  const $ = cheerio.load(html);
  const companies = $("table td.co a[href], table td:first-child a[href]").map((_, el) => ({
    company: $(el).text().trim(), url: publicUrl($(el).attr("href"), source.url),
  })).get().filter((item) => item.url && isCompanyWebsite(item.url, source.url));
  if (!companies.length) throw new Error("Breakout List contained no company links; its page format may have changed");
  return ctx.followCompanies(companies);
}

export async function scrapeLenny(source, ctx) {
  // The live TrueUp feed requires signed browser requests. Its public curated employer
  // list embeds real domains, allowing us to retrieve current jobs from those employers.
  const html = await ctx.text(source.url);
  const data = embeddedData(html).find((value) => value.props?.pageProps?.tagData)?.props.pageProps.tagData;
  const companies = (data?.companies || []).map((item) => ({
    company: item.name || item.company,
    url: publicUrl(`https://${item.normalized_domain || item.url_clean}`),
  })).filter((item) => item.url && new URL(item.url).hostname !== "undefined");
  if (!companies.length) throw new Error("Lenny's public company list contained no employer domains");
  return ctx.followCompanies(companies);
}

export async function scrapeRamp(source, ctx) {
  const links = pageLinks(await ctx.text(source.url), source.url).filter((link) =>
    new URL(link.url).hostname === new URL(source.url).hostname && /^\/vendors\/[^/]+\/?$/.test(new URL(link.url).pathname)
  ).slice(0, ctx.maxCompaniesPerSource);
  if (!links.length) throw new Error("Ramp directory contained no vendor reports");
  const companies = [];
  for (const link of links) {
    try {
      const html = await ctx.text(link.url);
      const $ = cheerio.load(html);
      $("a[href][aria-label]").each((_, el) => {
        const label = $(el).attr("aria-label") || "";
        if (!/^Visit .+ website$/i.test(label)) return;
        const url = publicUrl($(el).attr("href"), link.url);
        if (url && isCompanyWebsite(url, link.url)) {
          companies.push({ company: label.replace(/^Visit /i, "").replace(/'s website$/i, "").replace(/ website$/i, ""), url });
        }
      });
    } catch (error) { ctx.warning(link.url, error); }
  }
  return ctx.followCompanies(companies);
}
