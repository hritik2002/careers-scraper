import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractGemSlug,
  gemBoardUrl,
  isIndiaOrFullRemoteLocation,
  postingMatchesIndiaOrRemote,
} from "../lib/gem-api.js";

test("extractGemSlug from board URL", () => {
  assert.equal(extractGemSlug("https://jobs.gem.com/better-auth"), "better-auth");
});

test("isIndiaOrFullRemoteLocation accepts India and global remote", () => {
  assert.equal(isIndiaOrFullRemoteLocation("Bengaluru, India"), true);
  assert.equal(isIndiaOrFullRemoteLocation("Worldwide - Remote"), true);
  assert.equal(isIndiaOrFullRemoteLocation("Remote"), true);
  assert.equal(isIndiaOrFullRemoteLocation("San Francisco, United States"), false);
  assert.equal(isIndiaOrFullRemoteLocation("Remote - United States"), false);
});

test("postingMatchesIndiaOrRemote uses offices", () => {
  assert.equal(
    postingMatchesIndiaOrRemote({
      offices: [{ location: { name: "Bangalore, India" } }],
    }),
    true
  );
  assert.equal(
    postingMatchesIndiaOrRemote({
      offices: [{ location: { name: "San Francisco, United States" } }],
    }),
    false
  );
});

test("gemBoardUrl builds jobs.gem.com path", () => {
  assert.equal(gemBoardUrl("promptql"), "https://jobs.gem.com/promptql");
});
