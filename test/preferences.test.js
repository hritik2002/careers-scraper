import { test } from "node:test";
import assert from "node:assert/strict";
import {
  matchesPreferences,
  filterByPreferences,
  matchesLocationPreference,
  matchesRolePreference,
} from "../src/filters/preferences.js";

const preferences = {
  enabled: true,
  roles: ["software", "frontend", "fullstack", "backend"],
  minYearsExperience: 2,
  maxYearsExperience: 4,
  locations: { india: true, remote: true },
};

test("accepts frontend role in Bangalore", () => {
  assert.equal(
    matchesPreferences(
      { title: "Frontend Engineer", location: "Bangalore, India" },
      preferences
    ),
    true
  );
});

test("accepts full stack remote role", () => {
  assert.equal(
    matchesPreferences(
      { title: "Full Stack Software Engineer", location: "Remote - Global" },
      preferences
    ),
    true
  );
});

test("rejects staff engineer roles", () => {
  assert.equal(
    matchesPreferences(
      { title: "Staff Software Engineer", location: "Remote" },
      preferences
    ),
    false
  );
});

test("accepts backend roles", () => {
  assert.equal(
    matchesRolePreference(
      { title: "Backend Engineer", location: "Remote" },
      preferences
    ),
    true
  );
});

test("rejects QA and testing roles", () => {
  assert.equal(
    matchesRolePreference(
      { title: "QA Engineer", location: "Remote - India" },
      preferences
    ),
    false
  );
  assert.equal(
    matchesRolePreference(
      { title: "SDET", location: "Bangalore, India" },
      preferences
    ),
    false
  );
});

test("rejects roles requiring more than 4 years", () => {
  assert.equal(
    matchesPreferences(
      { title: "Software Engineer", location: "Remote", description: "5+ years experience required" },
      preferences
    ),
    false
  );
});

test("rejects on-site only US roles", () => {
  assert.equal(
    matchesLocationPreference(
      { title: "Software Engineer", location: "San Francisco, CA" },
      preferences
    ),
    false
  );
});

test("passes unspecified location to GPT", () => {
  assert.equal(
    matchesLocationPreference(
      { title: "Frontend Engineer", location: "Not specified" },
      preferences
    ),
    true
  );
});

test("filterByPreferences keeps matching subset", () => {
  const jobs = [
    { title: "Frontend Engineer", location: "Mumbai" },
    { title: "Principal Engineer", location: "Remote" },
    { title: "Full Stack Developer", location: "Remote - India" },
  ];
  assert.equal(filterByPreferences(jobs, preferences).length, 2);
});
