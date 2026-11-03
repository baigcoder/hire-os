import { test } from "node:test";
import assert from "node:assert/strict";
import { recruiterTasks } from "./today.js";

const now = new Date("2026-11-03T10:00:00");
const at = (h) => new Date(now.getTime() + h * 3600e3).toISOString();
const data = {
  upcoming: {
    rows: [
      { id: "a", candidate: "Amina", job: "Backend", scheduledAt: at(0.1) }, // starts in 6 minutes
      { id: "b", candidate: "Bilal", job: "Design", scheduledAt: at(3) }, // later today
      { id: "c", candidate: "Sara", job: "Sales", scheduledAt: at(30) }, // tomorrow
    ],
    total: 3,
  },
  reportsToSend: { rows: [{ id: "r", candidate: "Mahnoor", job: "Backend" }], total: 1 },
  toReview: {
    rows: [
      { id: "x", candidate: "Usman", job: "Ops", jobId: "j1", waitingDays: 1 },
      { id: "y", candidate: "Hira", job: "Ops", jobId: "j1", waitingDays: 9 },
    ],
    total: 5,
  },
};

test("orders today's work: join, then reports, then today's interviews, then reviews, longest waiting first", () => {
  const { tasks, later, more } = recruiterTasks(data, now);
  assert.deepEqual(tasks.map((t) => t.key), ["iv-a", "rp-r", "iv-b", "rv-y", "rv-x"]);
  assert.equal(tasks[0].action.label, "Join");
  assert.equal(tasks[2].action.label, "Prepare");
  assert.equal(tasks.find((t) => t.key === "rv-y").late, true);
  assert.deepEqual(later.map((l) => l.key), ["l-c"]);
  assert.equal(more, 3); // 5 waiting, 2 shown
});

test("nothing to do is an empty list, not an error", () => {
  assert.deepEqual(recruiterTasks(null, now), { tasks: [], later: [] });
});
