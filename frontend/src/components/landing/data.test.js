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
