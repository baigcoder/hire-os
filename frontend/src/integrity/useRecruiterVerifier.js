/**
 * Recruiter-side verifier: the same face/object detectors run on the video
 * the recruiter actually receives. The candidate can't switch this off, and
 * the server cross-checks it against the candidate's own detector.
 *
 * Frames are skipped while the remote feed is stalled or black (network
 * hiccup, camera off) so connection problems don't become sightings.
 */
import { useEffect, useRef, useState } from "react";
import { integrityApi } from "./api";
import { createSignalTracker, faceReadings, objectReadings, SNAPSHOT_SIGNALS } from "./signalTracker";
import { createVisionEngine, TICK_MS } from "./visionEngine";
import { frameHash, captureStill } from "./frames";

const BATCH_EVERY_TICKS = 5000 / TICK_MS;
const STALL_MS = 1500;
const EVIDENCE_GAP_MS = 60_000;
const MAX_EVIDENCE = 20;

export const useRecruiterVerifier = ({ interviewId, enabled, remoteVideoRef }) => {
  const [engine, setEngine] = useState({ status: "idle" });
  const [sent, setSent] = useState(0);
  const remoteRef = useRef(remoteVideoRef);
  remoteRef.current = remoteVideoRef;

  useEffect(() => {
    if (!enabled || !interviewId) return undefined;
    const evidence = { count: 0, last: {} };
    let lastHash;
    let lastChangeAt = 0;
    let feedLive = false;
    let ticks = 0;
    let stopped = false;
    let pending = [];

    const getVideo = () => remoteRef.current?.current ?? null;
    const tracker = createSignalTracker({
      onConfirm: (type, startedAt, attach) => {
        if (!SNAPSHOT_SIGNALS.has(type) || evidence.count >= MAX_EVIDENCE) return;
        const now = Date.now();
        if (now - (evidence.last[type] ?? 0) < EVIDENCE_GAP_MS) return;
        const image = captureStill(getVideo());
        if (!image) return;
        evidence.count += 1;
        evidence.last[type] = now;
        integrityApi
          .uploadEvidence(interviewId, { image, signal: type, at: now })
          .then((r) => attach(r.evidenceId))
          .catch(() => {});
      },
    });

    const send = async () => {
      const events = [...pending, ...tracker.drain()];
      pending = [];
      if (!events.length) return;
      try {
        await integrityApi.sendObservations(interviewId, { events });
        setSent((n) => n + events.length);
      } catch (error) {
        // Keep them for the next round unless the session isn't active
        if (!error?.response) pending = events.slice(-50);
      }
    };

    const engine = createVisionEngine({
      getVideo,
      objects: true,
      onStatus: (s) => !stopped && setEngine(s),
      onResult: ({ at, face, objects }) => {
        if (!feedLive) return;
        tracker.update(at, { ...faceReadings(face, { gaze: false }), ...objectReadings(objects) });
      },
      onTick: (at) => {
        const hash = frameHash(getVideo());
        if (hash && hash !== lastHash) {
          lastHash = hash;
          lastChangeAt = at;
        }
        feedLive = Boolean(hash) && at - lastChangeAt < STALL_MS;
        ticks += 1;
        if (ticks % BATCH_EVERY_TICKS === 0) send();
      },
    });

    return () => {
      stopped = true;
      engine.stop();
      tracker.flush(Date.now());
      send();
    };
  }, [enabled, interviewId]);

  return { engine, sent };
};
