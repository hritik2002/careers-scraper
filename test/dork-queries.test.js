import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSiteDorkQuery, buildRoleTerms, googleSearchUrl } from "../lib/dork-queries.js";
import { extractBoardUrl, isAtsJobUrl } from "../lib/parse-search-hits.js";

const preferences = {
  roles: ["software", "frontend", "backend"],
  locations: { india: true, remote: true },
};

test("builds boolean site dork with roles and India terms", () => {
  const query = buildSiteDorkQuery("jobs.ashbyhq.com", preferences, { includeSkills: false });
  assert.match(query, /^site:jobs\.ashbyhq\.com/);
  assert.match(query, /software engineer/);
  assert.match(query, /frontend engineer/);
  assert.match(query, /bangalore|india|remote/);
});

test("buildRoleTerms respects preference roles", () => {
  const terms = buildRoleTerms({ roles: ["backend"] });
  assert.ok(terms.some((t) => t.includes("backend")));
  assert.equal(terms.some((t) => t.includes("frontend")), false);
});

test("googleSearchUrl encodes query", () => {
  const url = googleSearchUrl('site:jobs.ashbyhq.com "software engineer"');
  assert.match(url, /^https:\/\/www\.google\.com\/search\?q=/);
  assert.ok(url.includes("software"));
});

test("isAtsJobUrl accepts known ATS hosts", () => {
  assert.equal(isAtsJobUrl("https://jobs.ashbyhq.com/supabase/abc"), true);
  assert.equal(isAtsJobUrl("https://boards.greenhouse.io/stripe/jobs/123"), true);
  assert.equal(isAtsJobUrl("https://www.linkedin.com/jobs/view/123"), false);
});

test("extractBoardUrl normalizes Ashby and Greenhouse", () => {
  assert.equal(
    extractBoardUrl("https://jobs.ashbyhq.com/supabase/some-role-id"),
    "https://jobs.ashbyhq.com/supabase"
  );
  assert.equal(
    extractBoardUrl("https://boards.greenhouse.io/stripe/jobs/12345"),
    "https://job-boards.greenhouse.io/stripe"
  );
  assert.equal(
    extractBoardUrl("https://jobs.lever.co/notion/abc-123"),
    "https://jobs.lever.co/notion"
  );
});
