import { test } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform } from "../src/scraper/detect.js";

test("detects Greenhouse URLs", () => {
  const result = detectPlatform("https://boards.greenhouse.io/stripe");
  assert.equal(result.platform, "greenhouse");
  assert.equal(result.company, "stripe");
});

test("detects Lever URLs", () => {
  const result = detectPlatform("https://jobs.lever.co/notion");
  assert.equal(result.platform, "lever");
  assert.equal(result.company, "notion");
});

test("detects Ashby URLs", () => {
  const result = detectPlatform("https://jobs.ashbyhq.com/anthropic");
  assert.equal(result.platform, "ashby");
  assert.equal(result.company, "anthropic");
});

test("detects Kula URLs", () => {
  const result = detectPlatform("https://careers.kula.ai/rocketlane?jobs=true");
  assert.equal(result.platform, "kula");
  assert.equal(result.company, "rocketlane");
});

test("detects Workable URLs", () => {
  const result = detectPlatform("https://apply.workable.com/seekho/");
  assert.equal(result.platform, "workable");
  assert.equal(result.company, "seekho");
});

test("detects Rippling URLs", () => {
  const result = detectPlatform("https://ats.rippling.com/alaan-careers/jobs");
  assert.equal(result.platform, "rippling");
  assert.equal(result.company, "alaan-careers");
});

test("detects Gem careers pages", () => {
  const result = detectPlatform("https://www.better-auth.com/careers");
  assert.equal(result.platform, "gem");
  assert.equal(result.company, "better-auth");
});

test("detects Zwayam URLs", () => {
  const result = detectPlatform("https://careers.cult.fit/cult/jobslist");
  assert.equal(result.platform, "zwayam");
  assert.equal(result.company, "careers");
});

test("detects Darwinbox URLs", () => {
  const result = detectPlatform("https://spinzone.darwinbox.in/ms/candidate/careers");
  assert.equal(result.platform, "darwinbox");
  assert.equal(result.company, "spinzone");
});

test("detects TalentRecruit URLs", () => {
  const result = detectPlatform("https://zepto.talentrecruit.com/career-page");
  assert.equal(result.platform, "talentrecruit");
  assert.equal(result.company, "zepto");
});

test("falls back to generic for unknown URLs", () => {
  const result = detectPlatform("https://careers.example.com/jobs");
  assert.equal(result.platform, "generic");
});
