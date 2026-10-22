/**
 * Candidate side of live-interview integrity.
 *
 * phase: checking → needs_consent | declined → starting → active → ended
 *        (or "unavailable" when the interview has no integrity session)
 *
 * Once consent is given: MediaPipe on the local camera (in a worker),
 * voice activity on mic and remote audio, browser-environment events, a
 * frame hash per batch, and a signed batch every 5 s. The candidate never
 * receives scores or alerts — only whether monitoring is on.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { integrityApi, errorCode } from "./api";
import { importIngestKey } from "./signing";
import { createSignalTracker, faceReadings, objectReadings, SNAPSHOT_SIGNALS } from "./signalTracker";
import { createVisionEngine, TICK_MS } from "./visionEngine";
import { createVoiceMonitor } from "./audio";
import { watchEnvironment, hasExtendedDisplay } from "./environment";
import { frameHash, captureStill } from "./frames";
import { createBatchSender } from "./batchSender";

const BATCH_EVERY_TICKS = 5000 / TICK_MS;
const EVIDENCE_GAP_MS = 60_000;
const MAX_EVIDENCE = 40;
// Remote speech this recent means our mic may be hearing the interviewer
const REMOTE_ECHO_MS = 800;
const LIPS_CLOSED_JAW = 0.06;

export const useCandidateProctor = ({ interviewId, enabled, localVideoRef, localStream, remoteStream, getScreenShareSurface }) => {
  const [phase, setPhase] = useState("checking");
  const [policy, setPolicy] = useState(null);
  const [engine, setEngine] = useState({ status: "idle" });
  const [error, setError] = useState(null);

  const streams = useRef({});
  streams.current = { localStream, remoteStream, getScreenShareSurface };
  const runtime = useRef(null);

  const stopRuntime = useCallback(async (final = true) => {
    const rt = runtime.current;
    if (!rt) return;
    runtime.current = null;
    rt.cleanupEnv();
    rt.engine.stop();
    rt.localVoice?.close();
    rt.remoteVoice?.close();
    if (final) {
      rt.tracker.flush(Date.now());
      const events = rt.tracker.drain();
      if (events.length) {
        rt.sender.enqueue(events, rt.stats());
        await rt.sender.flush().catch(() => {});
      }
    }
  }, []);

  const startRuntime = useCallback(
    async (ingestKey) => {
      await stopRuntime(false);
      const cryptoKey = await importIngestKey(ingestKey);
      const evidence = { count: 0, last: {} };
      let engineStatus = "loading";
      let results = 0;
      let ticks = 0;
      let lastFps = 0;
      let lastRemoteVoiceAt = -Infinity;

      const tracker = createSignalTracker({
        onConfirm: (type, startedAt, attach) => {
          if (!SNAPSHOT_SIGNALS.has(type) || evidence.count >= MAX_EVIDENCE) return;
          const now = Date.now();
          if (now - (evidence.last[type] ?? 0) < EVIDENCE_GAP_MS) return;
          const image = captureStill(localVideoRef.current);
          if (!image) return;
          evidence.count += 1;
          evidence.last[type] = now;
          integrityApi
            .uploadEvidence(interviewId, { image, signal: type, at: now })
            .then((r) => attach(r.evidenceId))
            .catch(() => {});
        },
      });

      const stats = () => {
        const track = streams.current.localStream?.getVideoTracks?.()[0];
        return {
          modelLoaded: engineStatus === "ready" ? true : engineStatus === "failed" ? false : undefined,
          fps: lastFps,
          frameHash: frameHash(localVideoRef.current),
          cameraLabel: track?.label || undefined,
          extendedDisplay: hasExtendedDisplay(),
          screenShareSurface: streams.current.getScreenShareSurface?.() || undefined,
        };
      };

      const sender = createBatchSender({
        cryptoKey,
        send: (batch) => integrityApi.sendBatch(interviewId, batch),
        onFatal: (code) => {
          stopRuntime(false);
          setPhase(code === "SESSION_ENDED" ? "ended" : "needs_consent");
        },
      });

      const rt = {
        tracker,
        sender,
        stats,
        cleanupEnv: watchEnvironment(tracker),
        localVoice: null,
        remoteVoice: null,
        engine: null,
      };

      rt.engine = createVisionEngine({
        getVideo: () => localVideoRef.current,
        objects: true,
        onStatus: (s) => {
          engineStatus = s.status;
          setEngine(s);
        },
        onResult: ({ at, face, objects }) => {
          results += 1;
          const readings = { ...faceReadings(face), ...objectReadings(objects) };
          // Speech while the lips are still: someone else talking, or audio
          // being played — unless the interviewer is talking (echo)
          const local = rt.localVoice?.sample();
          if (local) {
            const echo = performance.now() - lastRemoteVoiceAt < REMOTE_ECHO_MS;
            readings.speech_lips_closed =
              face?.count === 1 && local.active && !echo && face.jawOpen < LIPS_CLOSED_JAW ? 0.75 : 0;
          }
          tracker.update(at, readings);
        },
        onTick: () => {
          if (!runtime.current) return;
          const { localStream: ls, remoteStream: rs } = streams.current;
          if (!rt.localVoice && ls) rt.localVoice = createVoiceMonitor(ls);
          if (!rt.remoteVoice && rs) rt.remoteVoice = createVoiceMonitor(rs);
          if (rt.remoteVoice?.sample().active) lastRemoteVoiceAt = performance.now();
          ticks += 1;
          if (ticks % BATCH_EVERY_TICKS === 0) {
            lastFps = Math.round((results / 5) * 10) / 10;
            results = 0;
            sender.enqueue(tracker.drain(), stats());
            sender.flush();
          }
        },
      });

      runtime.current = rt;
      setPhase("active");
    },
    [interviewId, localVideoRef, stopRuntime],
  );

  const consent = useCallback(
    async (accept) => {
      setError(null);
      try {
        if (!accept) {
          await integrityApi.consent(interviewId, false);
          setPhase("declined");
          return;
        }
        setPhase("starting");
        const result = await integrityApi.consent(interviewId, true);
        await startRuntime(result.ingestKey);
      } catch (e) {
        setError(e?.response?.data?.message || e.message);
        setPhase(errorCode(e) === "SESSION_ENDED" ? "ended" : "needs_consent");
      }
    },
    [interviewId, startRuntime],
  );

  useEffect(() => {
    if (!enabled || !interviewId) {
      setPhase("unavailable");
      return undefined;
    }
    let cancelled = false;
    integrityApi
      .get(interviewId)
      .then(async (data) => {
        if (cancelled) return;
        setPolicy(data.policy);
        if (data.role !== "candidate") return setPhase("unavailable");
        if (data.status === "ended") return setPhase("ended");
        if (data.status === "declined") return setPhase("declined");
        if (data.status === "active") {
          // Reload or rejoin: already agreed, so resume with a fresh key
          setPhase("starting");
          const result = await integrityApi.consent(interviewId, true);
          if (!cancelled) await startRuntime(result.ingestKey);
          return undefined;
        }
        setPhase("needs_consent");
        return undefined;
      })
      .catch(() => !cancelled && setPhase("unavailable"));
    return () => {
      cancelled = true;
      stopRuntime(true);
    };
  }, [enabled, interviewId, startRuntime, stopRuntime]);

  return {
    phase,
    policy,
    engine,
    error,
    accept: () => consent(true),
    decline: () => consent(false),
    stop: () => stopRuntime(true).then(() => setPhase("ended")),
  };
};
