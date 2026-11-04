import { test } from "node:test";
import assert from "node:assert/strict";
import { scorecardScore, band, ROLES, PLAN_ROWS, PLANS } from "./data.js";

test("score follows the backend rule: must-haves double, 1–4 mapped to 0–100", () => {
  const c = ROLES[0].competencies;
  // (2·1 + 2·(2/3) + 1·(2/3)) / 5 = 0.8
  assert.equal(scorecardScore(c, [4, 3, 3, null]), 80);
  assert.equal(scorecardScore(c, [null, null, null, null]), null);
  assert.equal(scorecardScore(c, [1, 1, 1, 1]), 0);
  assert.equal(band(80), "Strongly recommend");
  assert.equal(band(79), "Recommend");
});

test("every plan row has one answer per plan", () => {
  for (const row of PLAN_ROWS) assert.equal(row.length, PLANS.length + 1);
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
