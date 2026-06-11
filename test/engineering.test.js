import { test } from "node:test";
import assert from "node:assert/strict";
import { isEngineeringJob, filterEngineeringJobs } from "../src/filters/engineering.js";

test("matches keyword in title", () => {
  assert.equal(isEngineeringJob({ title: "Senior Software Engineer" }), true);
  assert.equal(isEngineeringJob({ title: "Backend Developer" }), true);
  assert.equal(isEngineeringJob({ title: "React Developer" }), true);
});

test("matches normalized variants", () => {
  assert.equal(isEngineeringJob({ title: "Next.js Engineer" }), true);
  assert.equal(isEngineeringJob({ title: "Node.js Developer" }), true);
});

test("excludes non-matching roles", () => {
  assert.equal(isEngineeringJob({ title: "Account Executive" }), false);
  assert.equal(isEngineeringJob({ title: "Product Manager" }), false);
});

test("filterEngineeringJobs keeps only matching roles", () => {
  const jobs = [
    { title: "Software Engineer" },
    { title: "Account Executive" },
    { title: "Frontend Engineer" },
  ];
  assert.equal(filterEngineeringJobs(jobs).length, 2);
});
