/**
 * Records this participant's own microphone in ~15 s chunks and uploads
 * them for transcription. Each chunk is a standalone file (the recorder is
 * restarted per chunk, so every file has its own header). Chunks without
 * speech aren't uploaded, which keeps the Whisper budget for real talk.
 */
import { useEffect, useRef, useState } from "react";
import { copilotApi } from "./api";
import { createVoiceMonitor } from "@/integrity/audio";

const CHUNK_MS = 15_000;
const MIN_VOICED_MS = 700;
const MIN_BYTES = 1024;
const SAMPLE_MS = 100;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];

const pickMimeType = () =>
  typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported
    ? MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
    : undefined;

/**
 * @returns {{ status: "off"|"recording"|"unsupported"|"stopped", uploaded: number, failed: number }}
 */
export const useTranscriber = ({ interviewId, enabled, stream }) => {
  const [state, setState] = useState({ status: "off", uploaded: 0, failed: 0 });
  const streamRef = useRef(stream);
  streamRef.current = stream;
  const hasAudio = Boolean(stream?.getAudioTracks?.().length);

  useEffect(() => {
    if (!enabled || !interviewId || !hasAudio) {
      setState((s) => ({ ...s, status: "off" }));
      return undefined;
    }
    if (typeof MediaRecorder === "undefined") {
      setState((s) => ({ ...s, status: "unsupported" }));
      return undefined;
    }
    const track = streamRef.current.getAudioTracks()[0];
    const audioStream = new MediaStream([track]);
    const mimeType = pickMimeType();
    const voice = createVoiceMonitor(audioStream);
    let seq = 0;
    let stopped = false;
    let recorder;
    let chunkTimer;
    let voicedMs = 0;
    let lastSample = performance.now();

    // Count voiced time by elapsed time, so throttled background timers
    // don't undercount it
    const sampler = setInterval(() => {
      const now = performance.now();
      if (voice?.sample().active) voicedMs += Math.min(now - lastSample, 1000);
      lastSample = now;
    }, SAMPLE_MS);

    const upload = async (blob, chunk, attempt = 0) => {
      try {
        await copilotApi.uploadAudio(interviewId, blob, chunk);
        setState((s) => ({ ...s, uploaded: s.uploaded + 1 }));
      } catch (error) {
        const code = error?.response?.data?.code;
        if (code === "NO_CONSENT" || error?.response?.status === 503) {
          stopped = true; // ended, declined, or not configured: stop recording
          setState((s) => ({ ...s, status: "stopped" }));
          return;
        }
        if (!error?.response && attempt === 0) return upload(blob, chunk, 1);
        setState((s) => ({ ...s, failed: s.failed + 1 }));
      }
      return undefined;
    };

    const startChunk = () => {
      const parts = [];
      const startedAt = Date.now();
      voicedMs = 0;
      try {
        recorder = new MediaRecorder(audioStream, mimeType ? { mimeType, audioBitsPerSecond: 24_000 } : undefined);
      } catch {
        setState((s) => ({ ...s, status: "unsupported" }));
        return;
      }
      recorder.ondataavailable = (e) => e.data?.size && parts.push(e.data);
      recorder.onstop = () => {
        const voiced = voicedMs;
        const blob = new Blob(parts, { type: recorder.mimeType || mimeType || "audio/webm" });
        const chunk = { seq: seq++, startedAt };
        if (!stopped) startChunk();
        if (voiced >= MIN_VOICED_MS && blob.size >= MIN_BYTES) upload(blob, chunk);
      };
      recorder.start();
      chunkTimer = setTimeout(() => recorder.state === "recording" && recorder.stop(), CHUNK_MS);
    };

    startChunk();
    setState((s) => ({ ...s, status: "recording" }));

    return () => {
      stopped = true;
      clearTimeout(chunkTimer);
      clearInterval(sampler);
      // Stopping flushes (and uploads) the last partial chunk
      if (recorder?.state === "recording") recorder.stop();
      voice?.close();
    };
  }, [enabled, interviewId, hasAudio]);

  return state;
};
