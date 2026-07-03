import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractLeverSlug,
  leverApiUrl,
  mapLeverPosting,
} from "../lib/lever-api.js";
import { detectPlatform } from "../src/scraper/detect.js";

test("extractLeverSlug from board URL", () => {
  assert.equal(extractLeverSlug("https://jobs.lever.co/gohighlevel"), "gohighlevel");
});

test("extractLeverSlug from JSON API URL", () => {
  assert.equal(
    extractLeverSlug("https://api.lever.co/v0/postings/gohighlevel?mode=json"),
    "gohighlevel"
  );
});

test("leverApiUrl builds public postings endpoint", () => {
  assert.equal(
    leverApiUrl("gohighlevel"),
    "https://api.lever.co/v0/postings/gohighlevel?mode=json"
  );
});

test("mapLeverPosting uses plain text and allLocations", () => {
  const job = mapLeverPosting(
    {
      text: "Software Engineer",
      categories: {
        department: "Engineering",
        team: "Platform",
        location: "India",
        allLocations: ["India"],
        commitment: "Employee India",
      },
      country: "IN",
      workplaceType: "remote",
      descriptionPlain: "Build scalable systems.",
      hostedUrl: "https://jobs.lever.co/gohighlevel/abc123",
    },
    { company: "gohighlevel", sourceUrl: "https://jobs.lever.co/gohighlevel" }
  );

  assert.equal(job.title, "Software Engineer");
  assert.equal(job.company, "gohighlevel");
  assert.match(job.location, /India/);
  assert.match(job.location, /remote/);
  assert.match(job.description, /Build scalable systems/);
  assert.equal(job.url, "https://jobs.lever.co/gohighlevel/abc123");
});

test("detects Lever JSON API URLs", () => {
  const result = detectPlatform("https://api.lever.co/v0/postings/gohighlevel?mode=json");
  assert.equal(result.platform, "lever");
  assert.equal(result.company, "gohighlevel");
});
