/**
 * Main-thread side of the proctor: pumps downscaled frames from a <video>
 * into the vision worker (~5 fps faces, ~1.7 fps objects, one frame in
 * flight at a time) and relays the worker's unthrottled clock.
 */
import { videoReady } from "./frames";

const MEDIAPIPE_VERSION = "0.10.17";
const WASM_BASE =
  import.meta.env.VITE_MEDIAPIPE_WASM_BASE ||
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_BASE =
  import.meta.env.VITE_MEDIAPIPE_MODEL_BASE || "https://storage.googleapis.com/mediapipe-models";

export const TICK_MS = 200;
const OBJECTS_EVERY = 3; // frames
const FRAME_WIDTH = 480;
const LOAD_TIMEOUT_MS = 45_000;

/**
 * @param {{ getVideo: () => HTMLVideoElement|null, objects?: boolean,
 *           onResult: (r) => void, onTick: (at: number) => void,
 *           onStatus?: (s: {status: string, delegate?: string, error?: string}) => void }} options
 */
export const createVisionEngine = ({ getVideo, objects = true, onResult, onTick, onStatus }) => {
  let worker;
  let ready = false;
  let inFlight = false;
  let frame = 0;
  let stopped = false;

  const status = (s) => !stopped && onStatus?.(s);

  const pump = async () => {
    const video = getVideo();
    if (!ready || inFlight || !videoReady(video)) return;
    inFlight = true;
    try {
      const bitmap = await createImageBitmap(video, {
        resizeWidth: Math.min(FRAME_WIDTH, video.videoWidth),
        resizeQuality: "low",
      });
      frame += 1;
      worker.postMessage(
        { type: "frame", bitmap, at: performance.now(), withObjects: objects && frame % OBJECTS_EVERY === 0 },
        [bitmap],
      );
    } catch {
      inFlight = false;
    }
  };

  const start = () => {
    try {
      worker = new Worker(new URL("./vision.worker.js", import.meta.url), { type: "module" });
    } catch (error) {
      status({ status: "failed", error: error.message });
      return;
    }
    const timeout = setTimeout(() => {
      if (!ready) status({ status: "failed", error: "Detection models took too long to load" });
    }, LOAD_TIMEOUT_MS);

    worker.onmessage = ({ data }) => {
      if (stopped) return;
      if (data.type === "ready") {
        clearTimeout(timeout);
        ready = true;
        status({ status: "ready", delegate: data.delegate });
      } else if (data.type === "result") {
        inFlight = false;
        onResult({ ...data, at: Date.now() });
      } else if (data.type === "tick") {
        onTick(data.at);
        pump();
      } else if (data.type === "error") {
        inFlight = false;
        if (!ready) {
          clearTimeout(timeout);
          status({ status: "failed", error: data.message });
        }
      }
    };
    worker.onerror = (event) => {
      clearTimeout(timeout);
      status({ status: "failed", error: event.message || "Vision worker crashed" });
    };
    status({ status: "loading" });
    // The clock runs even if models fail, so heartbeats keep flowing
    worker.postMessage({ type: "clock", intervalMs: TICK_MS });
    worker.postMessage({ type: "init", wasmBase: WASM_BASE, modelBase: MODEL_BASE, objects });
  };

  const stop = () => {
    stopped = true;
    worker?.postMessage({ type: "stop" });
    setTimeout(() => worker?.terminate(), 500);
  };

  start();
  return { stop, isReady: () => ready };
};
