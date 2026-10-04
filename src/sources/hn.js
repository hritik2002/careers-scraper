import { plainText, publicUrl } from "./parse.js";

export function hnCommentToJob(comment, threadId) {
  if (!comment?.id || comment.deleted || comment.dead || !comment.text) return null;
  const description = plainText(comment.text);
  const header = description.split("\n").find((line) => line.trim()) || "";
  if (!header.includes("|")) return null;
  const fields = header.split("|").map((field) => field.trim()).filter(Boolean);
  const company = fields[0].replace(/https?:\/\/\S+/g, "").replace(/[()]/g, "").trim();
  if (!company) return null;
  const role = fields.slice(1).filter((field) => !/https?:/i.test(field) && /engineer|developer|designer|manager|analyst|scientist|devops|sre/i.test(field));
  const bodyRole = description.match(/\b(?:(?:senior|junior|founding|staff)\s+)?(?:software|front[- ]?end|back[- ]?end|full[- ]?stack|platform|infrastructure|devops)\s+(?:engineers?|developers?)\b/i)?.[0];
  const title = (role.join(" / ") || bodyRole || fields.slice(1, 3).join(" / ") || "Open roles").slice(0, 180);
  const location = fields.slice(1).filter((field) => !role.includes(field) &&
    !/https?:|full[- ]?time|part[- ]?time|contract|salary|\$|visa/i.test(field)).join(" / ") || "Not specified";
  const url = publicUrl(`https://news.ycombinator.com/item?id=${comment.id}`);
  return { title, company, location, department: "", team: "", url,
    description: description.slice(0, 8000), sourceUrl: `https://news.ycombinator.com/item?id=${threadId}` };
}

export async function scrapeHn(source, ctx) {
  const url = new URL("https://hn.algolia.com/api/v1/search_by_date");
  url.searchParams.set("tags", "story,author_whoishiring");
  url.searchParams.set("query", "Ask HN: Who is hiring?");
  url.searchParams.set("hitsPerPage", "12");
  const data = await ctx.json(url.href);
  const cutoff = Date.now() - ctx.maxAgeDays * 86400000;
  const threads = (data.hits || []).filter((hit) => /^Ask HN: Who is hiring\?/i.test(hit.title || "") &&
    hit.created_at_i * 1000 >= cutoff).slice(0, ctx.hnThreads);
  const jobs = [];
  for (const thread of threads) {
    const item = await ctx.json(`https://hn.algolia.com/api/v1/items/${thread.objectID}`);
    // Only employers' top-level comments, never replies or "Who wants to be hired?".
    const comments = [...(item.children || [])].sort((a, b) => Number(b.id) - Number(a.id));
    for (const comment of comments.slice(0, ctx.hnMaxComments)) {
      if (comment.parent_id !== undefined && String(comment.parent_id) !== String(thread.objectID)) continue;
      const job = hnCommentToJob(comment, thread.objectID);
      if (job) jobs.push(job);
    }
  }
  return jobs;
}
