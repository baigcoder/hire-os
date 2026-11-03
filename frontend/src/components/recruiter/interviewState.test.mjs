import { test } from "node:test";
import assert from "node:assert/strict";
import { interviewState } from "./interviewState.js";

const now = Date.parse("2026-11-03T10:00:00Z");
const at = (h) => new Date(now + h * 3600e3).toISOString();

test("names what each interview is waiting on", () => {
  assert.equal(interviewState({ scheduledAt: at(2), status: "video_scheduled" }, now).key, "scheduled");
  assert.equal(interviewState({ scheduledAt: at(-0.2), videoInterview: { status: "in_progress" } }, now).key, "live");
  assert.equal(interviewState({ scheduledAt: at(-5), status: "video_scheduled" }, now).key, "missed");
  assert.deepEqual(
    interviewState({ scheduledAt: at(-24), videoInterview: { status: "completed" }, finalReport: { status: "draft" } }, now),
    { key: "report", label: "Report drafted", tab: "report", pill: "app-pill-warning" },
  );
  assert.equal(interviewState({ scheduledAt: at(-48), videoInterview: { status: "completed" }, finalReport: { status: "submitted" } }, now).label, "With owner");
  assert.equal(interviewState({ scheduledAt: at(-48), finalReport: { status: "approved" } }, now).tab, "done");
  assert.equal(interviewState({ scheduledAt: at(1), status: "no_show" }, now).label, "No-show");
});
