/**
 * Pure proctor logic, run with Node's built-in runner:
 *   npm run test:integrity
 * Signatures are checked against the backend's own verifier, so the two
 * sides can't drift apart.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createSignalTracker,
  faceReadings,
  objectReadings,
  CONFIRM_MS,
} from "../signalTracker.js";
import { importIngestKey, signBatch } from "../signing.js";
import { createBatchSender } from "../batchSender.js";
import { verifyBatch, issueIngestKey } from "../../../../backend/modules/integrity/heartbeat.js";
import { BEHAVIOR_SIGNALS } from "../../../../backend/modules/integrity/signals.js";

const T0 = 1_700_000_000_000;

/** Feed one reading every 200 ms (the engine's frame rate) for `ms`. */
const feed = (tracker, from, ms, readings) => {
  let at = from;
  for (; at < from + ms; at += 200) tracker.update(at, readings);
  return at;
};

test("a brief glance is not an episode; a sustained one is", () => {
  const tracker = createSignalTracker();
  let at = feed(tracker, T0, 400, { gaze_away: 0.8 });
  at = feed(tracker, at, 3000, { gaze_away: 0 });
  assert.deepEqual(tracker.drain(), []);

  at = feed(tracker, at, 6000, { gaze_away: 0.8 });
  feed(tracker, at, 2000, { gaze_away: 0 });
  const [event] = tracker.drain();
  assert.equal(event.type, "gaze_away");
  assert.ok(event.durationMs >= 5600 && event.durationMs <= 6000, `duration ${event.durationMs}`);
  assert.equal(event.confidence, 0.8);
});

test("one missed frame doesn't split an episode", () => {
  const tracker = createSignalTracker();
  let at = feed(tracker, T0, 2000, { phone_detected: 0.9 });
  at = feed(tracker, at, 400, { phone_detected: 0 }); // flicker under the grace period
  at = feed(tracker, at, 2000, { phone_detected: 0.9 });
  feed(tracker, at, 2000, { phone_detected: 0 });
  assert.equal(tracker.drain().length, 1);
});

test("confirmation fires once at the signal's minimum and attaches evidence", () => {
  const confirmed = [];
  const tracker = createSignalTracker({
    onConfirm: (type, startedAt, attach) => {
      confirmed.push(type);
      attach("ev123");
    },
  });
  let at = feed(tracker, T0, 800, { phone_detected: 0.9 });
  assert.deepEqual(confirmed, []);
  at = feed(tracker, at, 2000, { phone_detected: 0.9 });
  feed(tracker, at, 2000, { phone_detected: 0 });
  assert.deepEqual(confirmed, ["phone_detected"]);
  assert.equal(tracker.drain()[0].evidenceId, "ev123");
});

test("long episodes stream out in 30-second segments", () => {
  const tracker = createSignalTracker();
  feed(tracker, T0, 65_000, { face_missing: 0.9 });
  const segments = tracker.drain();
  assert.equal(segments.length, 2);
  assert.ok(segments.every((s) => s.durationMs >= 29_800));
  tracker.flush(T0 + 66_000);
  assert.equal(tracker.drain().length, 1);
});

test("signals that weren't measured this frame keep their state", () => {
  const tracker = createSignalTracker();
  let at = feed(tracker, T0, 3000, { phone_detected: 0.9 });
  // Face-only frames (objects run every 3rd frame) must not end the episode
  at = feed(tracker, at, 3000, { face_missing: 0 });
  assert.deepEqual(tracker.drain(), []);
  assert.deepEqual(tracker.active(), ["phone_detected"]);
});

test("client minimums match the server's", () => {
  for (const [type, ms] of Object.entries(CONFIRM_MS)) {
    assert.equal(ms, BEHAVIOR_SIGNALS[type].minMs, type);
  }
});

test("face readings: thinking glances and small turns are not flagged", () => {
  const steady = { count: 1, yaw: 12, pitch: -10, gazeSide: 0.3, gazeDown: 0.4, gazeUp: 0.1, jawOpen: 0.02 };
  assert.deepEqual(faceReadings(steady), { face_missing: 0, multiple_faces: 0, head_turned: 0, gaze_away: 0 });
  assert.equal(faceReadings({ ...steady, yaw: 45 }).head_turned, 0.8);
  assert.ok(faceReadings({ ...steady, gazeSide: 0.8 }).gaze_away > 0);
  // A turned head is reported as head_turned only, not also as gaze
  assert.equal(faceReadings({ ...steady, yaw: 45, gazeSide: 0.8 }).gaze_away, 0);
  assert.equal(faceReadings({ count: 0 }).face_missing, 0.9);
  assert.equal(faceReadings({ ...steady, count: 2 }).multiple_faces, 0.9);
  assert.equal("gaze_away" in faceReadings(steady, { gaze: false }), false);
});

test("object readings use per-class thresholds", () => {
  const r = objectReadings({ phone: 0.62, book: 0.5, device: 0.7, persons: 2, personScore: 0.8 });
  assert.deepEqual(r, { phone_detected: 0.62, book_detected: 0, extra_device: 0.7, extra_person: 0.8 });
  assert.equal(objectReadings({ phone: 0, book: 0, device: 0, persons: 1, personScore: 0.9 }).extra_person, 0);
});

test("browser signatures verify with the backend", async () => {
  const ingestKey = issueIngestKey();
  const key = await importIngestKey(ingestKey);
  const events = [
    { type: "phone_detected", startedAt: T0, durationMs: 2500, confidence: 0.92, evidenceId: "abc" },
    { type: "copy_paste", startedAt: T0 + 10, durationMs: 0, confidence: 1, detail: "paste" },
  ];
  const batch = { seq: 3, sentAt: T0, events };
  const sig = await signBatch(key, batch);
  // The server re-serializes the parsed JSON body
  const received = JSON.parse(JSON.stringify({ ...batch, sig }));
  assert.deepEqual(verifyBatch(ingestKey, received, { lastSeq: 2, now: T0 }), { ok: true });
  assert.equal(verifyBatch(ingestKey, { ...received, seq: 4 }, { lastSeq: 2, now: T0 }).code, "BAD_SIGNATURE");
});

test("batch sender: ordered, retries network errors, drops rejected batches, stops when ended", async () => {
  const key = await importIngestKey("k");
  const sent = [];
  let failNext = null;
  let fatal = null;
  const sender = createBatchSender({
    cryptoKey: key,
    now: () => T0,
    send: async (batch) => {
      if (failNext) {
        const error = failNext;
        failNext = null;
        throw error;
      }
      sent.push(batch.seq);
      return {};
    },
    onFatal: (code) => {
      fatal = code;
    },
  });

  sender.enqueue([], {});
  failNext = new Error("offline"); // no response: keep and retry
  await sender.flush();
  assert.deepEqual(sent, []);
  assert.equal(sender.pending(), 1);

  sender.enqueue([], {});
  await sender.flush();
  assert.deepEqual(sent, [1, 2]);

  sender.enqueue([], {});
  failNext = { response: { data: { code: "REPLAYED_BATCH" } } };
  sender.enqueue([], {});
  await sender.flush();
  assert.deepEqual(sent, [1, 2, 4]);

  sender.enqueue([], {});
  failNext = { response: { data: { code: "SESSION_ENDED" } } };
  await sender.flush();
  assert.equal(fatal, "SESSION_ENDED");
  assert.equal(sender.pending(), 0);
});
