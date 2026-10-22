/**
 * Live-interview integrity: the catalog of signals the detectors may report.
 *
 * Two kinds, kept apart all the way to the report:
 *   - behavior: something the candidate did or that was in view (phone,
 *     second person, looking away). Feeds the 0–100 risk score.
 *   - tamper:   evidence that the monitoring itself was interfered with
 *     (virtual camera, detector stopped, frozen video). Never mixed into the
 *     score — it means "the score can't be trusted", not "more cheating".
 *
 * Per behavior signal:
 *   weight      points at full severity before time decay
 *   minMs       how long it must persist before it counts. Stops people
 *               being flagged for glancing down to think.
 *   cooldownMs  repeats within this window merge into one occurrence
 *   snapshot    a high-severity signal worth an evidence frame
 *   sources     which detector may report it
 */

export const SIGNAL_VERSION = "integrity-signals-1";

const CANDIDATE = ["candidate"];
const BOTH = ["candidate", "recruiter"];

export const BEHAVIOR_SIGNALS = {
  // Vision: face / gaze (MediaPipe FaceLandmarker)
  face_missing: { weight: 18, minMs: 3000, cooldownMs: 10000, snapshot: true, sources: BOTH, label: "Face not visible" },
  multiple_faces: { weight: 30, minMs: 1500, cooldownMs: 15000, snapshot: true, sources: BOTH, label: "More than one face in view" },
  gaze_away: { weight: 8, minMs: 4000, cooldownMs: 10000, snapshot: false, sources: CANDIDATE, label: "Looking away from the screen" },
  head_turned: { weight: 8, minMs: 4000, cooldownMs: 10000, snapshot: false, sources: BOTH, label: "Head turned away" },
  // Vision: objects (MediaPipe ObjectDetector, COCO)
  phone_detected: { weight: 35, minMs: 1000, cooldownMs: 20000, snapshot: true, sources: BOTH, label: "Phone in view" },
  book_detected: { weight: 15, minMs: 2000, cooldownMs: 20000, snapshot: true, sources: BOTH, label: "Book or paper in view" },
  extra_device: { weight: 20, minMs: 2000, cooldownMs: 20000, snapshot: true, sources: BOTH, label: "Another laptop or screen in view" },
  extra_person: { weight: 30, minMs: 1500, cooldownMs: 15000, snapshot: true, sources: BOTH, label: "Another person in view" },
  // Audio (VAD + mouth blendshapes)
  speech_lips_closed: { weight: 20, minMs: 3000, cooldownMs: 15000, snapshot: false, sources: CANDIDATE, label: "Speech while the candidate's lips were still" },
  second_voice: { weight: 20, minMs: 3000, cooldownMs: 15000, snapshot: false, sources: BOTH, label: "A second voice" },
  // Environment (DOM / media APIs)
  tab_hidden: { weight: 15, minMs: 1000, cooldownMs: 5000, snapshot: false, sources: CANDIDATE, label: "Interview tab hidden" },
  window_blur: { weight: 8, minMs: 1500, cooldownMs: 5000, snapshot: false, sources: CANDIDATE, label: "Interview window lost focus" },
  fullscreen_exit: { weight: 5, minMs: 0, cooldownMs: 10000, snapshot: false, sources: CANDIDATE, label: "Left fullscreen" },
  copy_paste: { weight: 12, minMs: 0, cooldownMs: 5000, snapshot: false, sources: CANDIDATE, label: "Copy or paste" },
  devtools: { weight: 12, minMs: 0, cooldownMs: 30000, snapshot: false, sources: CANDIDATE, label: "Developer tools opened" },
  multiple_displays: { weight: 20, minMs: 0, cooldownMs: 300000, snapshot: false, sources: CANDIDATE, label: "Extended or multiple displays" },
  screen_share_not_monitor: { weight: 10, minMs: 0, cooldownMs: 60000, snapshot: false, sources: CANDIDATE, label: "Shared a window or tab instead of the whole screen" },
};

/**
 * Tamper flags. Detectors may report the first group directly; the server
 * derives the rest (heartbeat gaps, sequence gaps, detector mismatch).
 */
export const TAMPER_SIGNALS = {
  virtual_camera: { label: "Virtual camera software", reportable: true },
  frozen_video: { label: "Video frozen or looped", reportable: true },
  model_not_loaded: { label: "Detection model failed to load", reportable: true },
  heartbeat_gap: { label: "Candidate-side monitoring went silent", reportable: false },
  sequence_gap: { label: "Monitoring batches went missing", reportable: false },
  detector_mismatch: { label: "Recruiter-side detector saw what the candidate's didn't", reportable: false },
};

/** Device labels of common virtual cameras (OBS, ManyCam, Snap, XSplit…). */
export const VIRTUAL_CAMERA_PATTERN =
  /\b(obs|virtual|manycam|snap ?camera|xsplit|droidcam|e2esoft|splitcam|camtwist|youcam|mmhmm|epoccam|iriun)\b/i;

/** Signals a recruiter may mark as expected for this candidate (accommodation). */
export const ANNOTATABLE_SIGNALS = Object.keys(BEHAVIOR_SIGNALS);

export const HEARTBEAT_INTERVAL_MS = 5000;
/** Silence longer than this while the call is live is a heartbeat gap. */
export const HEARTBEAT_GAP_MS = 3 * HEARTBEAT_INTERVAL_MS;

/** Shown to the candidate on the consent screen, and stored with consent. */
export const MONITORING_POLICY = {
  version: "2026-10b",
  analyzed: [
    "Whether your face is visible, and whether more than one face or person is in view",
    "Where you are looking (head and eye direction), measured in your browser",
    "Phones, books or other screens in view of the camera",
    "Whether someone else's voice is heard, or speech occurs while your lips are still",
    "Tab switches, window focus, copy/paste, fullscreen and display setup",
    "Whether the monitoring itself keeps running (camera software, frozen video)",
    "What you and the interviewer say is transcribed to text, so the interviewer can take structured notes against the job's requirements",
  ],
  notAnalyzed: [
    "No face recognition or identity matching",
    "No video or audio recording is stored: audio is turned into text and discarded; only event times, the transcript text and, for serious events, a small still frame are kept",
    "The transcript is never used to judge accent, fluency or anything other than job-related answers",
  ],
  retention: { eventsDays: 90, snapshotsDays: 30, transcriptDays: 90 },
  humanReview:
    "Signals are observations for the interviewer to review, never an automatic decision. You can see your own report and dispute it.",
};
