import { test } from "node:test";
import assert from "node:assert/strict";
import { scorecardScore, band, ROLES, FREE_FOR_ALL } from "./data.js";

test("score follows the backend rule: must-haves double, 1–4 mapped to 0–100", () => {
  const c = ROLES[0].competencies;
  // (2·1 + 2·(2/3) + 1·(2/3)) / 5 = 0.8
  assert.equal(scorecardScore(c, [4, 3, 3, null]), 80);
  assert.equal(scorecardScore(c, [null, null, null, null]), null);
  assert.equal(scorecardScore(c, [1, 1, 1, 1]), 0);
  assert.equal(band(80), "Strongly recommend");
  assert.equal(band(79), "Recommend");
});

test("the landing page promises everything free, for both audiences", () => {
  assert.ok(FREE_FOR_ALL.companies.length > 0);
  assert.ok(FREE_FOR_ALL.seekers.length > 0);
});

test("a typed role gets its own draft, anything else a generic one", async () => {
  const { draftScorecard } = await import("./data.js");
  assert.equal(draftScorecard("Senior Backend Engineer").must[0][0], "API design");
  assert.equal(draftScorecard("Product designer").must[0][0], "Interaction design");
  const other = draftScorecard("Pastry chef");
  assert.equal(other.matched, false);
  assert.equal(other.must.length, 2);
  assert.equal(draftScorecard("Software development lead").matched, false);
  assert.equal(draftScorecard("Building manager").matched, false);
});
