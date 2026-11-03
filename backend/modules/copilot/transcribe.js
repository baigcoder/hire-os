/**
 * Speech-to-text for live interviews with Groq Whisper.
 *
 * Each side uploads ~15 s chunks of its own microphone, so the speaker is
 * known. Audio is transcribed and discarded; only text is stored.
 *
 * Whisper invents text on silence or noise ("Thank you.", "Thanks for
 * watching!") — segments it rates as probably-not-speech, or that are just
 * those stock phrases at low confidence, are dropped.
 */
import Groq, { toFile } from "groq-sdk";
import { TRANSCRIPTION_MODEL } from "../../config/aiModels.js";
import { AiRun } from "../../models/aiRun.model.js";
import logger from "../../utils/logger.js";

const NO_SPEECH_DROP = 0.6;
const STOCK_HALLUCINATIONS =
  /^(thank you\.?|thanks( for watching)?[.!]?|you|bye\.?|\.+|subtitles by .*|transcribed by .*|please subscribe.*)$/i;

let groq;
const defaultTranscriber = async ({ buffer, mimeType, language }) => {
  groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 1, timeout: 30_000 });
  const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
  return groq.audio.transcriptions.create({
    file: await toFile(buffer, `chunk.${ext}`, { type: mimeType }),
    model: TRANSCRIPTION_MODEL,
    response_format: "verbose_json",
    temperature: 0,
    ...(language && { language }),
  });
};

let transcriber = defaultTranscriber;
/** Test seam: replace the Whisper call (null restores Groq). */
export const setTranscriberForTests = (fn) => {
  transcriber = fn ?? defaultTranscriber;
};

export const transcriptionConfigured = () => transcriber !== defaultTranscriber || Boolean(process.env.GROQ_API_KEY);

/** Keep real speech; drop silence and Whisper's stock hallucinations. */
export const cleanSegments = (segments) =>
  (segments ?? [])
    .map((s) => ({ ...s, text: String(s.text ?? "").trim() }))
    .filter((s) => s.text.length > 0)
    .filter((s) => (s.no_speech_prob ?? 0) < NO_SPEECH_DROP)
    .filter((s) => !(STOCK_HALLUCINATIONS.test(s.text) && (s.avg_logprob ?? 0) < -0.5));

/**
 * @returns {Promise<Array<{index, startOffsetMs, endOffsetMs, text, avgLogprob}>>}
 */
export const transcribeChunk = async ({ buffer, mimeType, language, userId }) => {
  const started = Date.now();
  try {
    const result = await transcriber({ buffer, mimeType, language, userId });
    const segments = result.segments?.length
      ? cleanSegments(result.segments)
      : cleanSegments(result.text ? [{ start: 0, end: 0, text: result.text }] : []);
    AiRun.create({
      task: "copilot.transcribe",
      status: "success",
      provider: "groq",
      model: TRANSCRIPTION_MODEL,
      latencyMs: Date.now() - started,
      userId,
    }).catch(() => {});
    return segments.map((s, index) => ({
      index,
      startOffsetMs: Math.round((s.start ?? 0) * 1000),
      endOffsetMs: Math.round((s.end ?? s.start ?? 0) * 1000),
      text: s.text.slice(0, 2000),
      avgLogprob: s.avg_logprob,
    }));
  } catch (error) {
    AiRun.create({
      task: "copilot.transcribe",
      status: "error",
      provider: "groq",
      model: TRANSCRIPTION_MODEL,
      latencyMs: Date.now() - started,
      error: error.message?.slice(0, 300),
      userId,
    }).catch(() => {});
    logger.warn("Transcription failed", { error: error.message });
    throw error;
  }
};
