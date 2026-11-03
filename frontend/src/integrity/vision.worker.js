/**
 * Proctor vision worker: runs MediaPipe FaceLandmarker and ObjectDetector
 * off the main thread on frames the page sends as ImageBitmaps, and keeps
 * an unthrottled clock for the page (timers in background tabs are slowed
 * to as little as once a minute; worker timers are not).
 *
 * Messages in:  {type:"init", wasmBase, modelBase, objects}
 *               {type:"frame", bitmap, at, withObjects}
 *               {type:"clock", intervalMs} | {type:"stop"}
 * Messages out: {type:"ready", delegate} | {type:"error", message}
 *               {type:"result", at, face, objects} | {type:"tick", at}
 */
import { FilesetResolver, FaceLandmarker, ObjectDetector } from "@mediapipe/tasks-vision";

// MediaPipe loads its WASM glue with importScripts(), which throws inside
// module workers. Load it with a synchronous fetch + global eval instead.
self.importScripts = (...urls) => {
  for (const url of urls) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", String(url), false);
    xhr.send();
    if (xhr.status !== 200) throw new Error(`Could not load ${url}`);
    (0, eval)(xhr.responseText);
  }
};

const OBJECT_CLASSES = ["cell phone", "book", "laptop", "tv", "person"];

let face = null;
let objects = null;
let clock = null;

const create = async (Task, fileset, options) => {
  try {
    return { task: await Task.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: "GPU" } }), delegate: "GPU" };
  } catch {
    return { task: await Task.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: "CPU" } }), delegate: "CPU" };
  }
};

const init = async ({ wasmBase, modelBase, objects: withObjects = true }) => {
  const fileset = await FilesetResolver.forVisionTasks(wasmBase);
  const faceTask = await create(FaceLandmarker, fileset, {
    baseOptions: { modelAssetPath: `${modelBase}/face_landmarker/face_landmarker/float16/1/face_landmarker.task` },
    runningMode: "VIDEO",
    numFaces: 3,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  });
  face = faceTask.task;
  if (withObjects) {
    objects = (
      await create(ObjectDetector, fileset, {
        baseOptions: { modelAssetPath: `${modelBase}/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite` },
        runningMode: "VIDEO",
        scoreThreshold: 0.45,
        maxResults: 8,
        categoryAllowlist: OBJECT_CLASSES,
      })
    ).task;
  }
  self.postMessage({ type: "ready", delegate: faceTask.delegate });
};

const deg = (rad) => (rad * 180) / Math.PI;

/** Head yaw/pitch (degrees) from the 4x4 column-major face transform. */
const headPose = (matrix) => {
  const m = matrix?.data;
  if (!m || m.length < 16) return null;
  return {
    yaw: deg(Math.asin(Math.max(-1, Math.min(1, -m[2])))),
    pitch: deg(Math.atan2(m[6], m[10])),
  };
};

const blend = (categories) => {
  const out = {};
  for (const c of categories ?? []) out[c.categoryName] = c.score;
  return out;
};

const analyzeFace = (bitmap, at) => {
  const result = face.detectForVideo(bitmap, at);
  const count = result.faceLandmarks?.length ?? 0;
  if (!count) return { count: 0 };
  const b = blend(result.faceBlendshapes?.[0]?.categories);
  const pose = headPose(result.facialTransformationMatrixes?.[0]);
  return {
    count,
    yaw: pose?.yaw ?? 0,
    pitch: pose?.pitch ?? 0,
    // Eyes looking sideways (one eye "out" pairs with the other "in")
    gazeSide: Math.max(
      ((b.eyeLookOutLeft ?? 0) + (b.eyeLookInRight ?? 0)) / 2,
      ((b.eyeLookInLeft ?? 0) + (b.eyeLookOutRight ?? 0)) / 2,
    ),
    gazeDown: ((b.eyeLookDownLeft ?? 0) + (b.eyeLookDownRight ?? 0)) / 2,
    gazeUp: ((b.eyeLookUpLeft ?? 0) + (b.eyeLookUpRight ?? 0)) / 2,
    jawOpen: b.jawOpen ?? 0,
  };
};

const analyzeObjects = (bitmap, at) => {
  const found = { phone: 0, book: 0, device: 0, persons: 0, personScore: 0 };
  for (const d of objects.detectForVideo(bitmap, at).detections ?? []) {
    const c = d.categories?.[0];
    if (!c) continue;
    if (c.categoryName === "cell phone") found.phone = Math.max(found.phone, c.score);
    else if (c.categoryName === "book") found.book = Math.max(found.book, c.score);
    else if (c.categoryName === "laptop" || c.categoryName === "tv") found.device = Math.max(found.device, c.score);
    else if (c.categoryName === "person" && c.score >= 0.5) {
      found.persons += 1;
      found.personScore = Math.max(found.personScore, c.score);
    }
  }
  return found;
};

self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      await init(data);
    } else if (data.type === "frame") {
      const { bitmap, at, withObjects } = data;
      try {
        if (!face) return;
        const faceResult = analyzeFace(bitmap, at);
        const objectResult = withObjects && objects ? analyzeObjects(bitmap, at) : null;
        self.postMessage({ type: "result", at, face: faceResult, objects: objectResult });
      } finally {
        bitmap.close();
      }
    } else if (data.type === "clock") {
      clearInterval(clock);
      clock = setInterval(() => self.postMessage({ type: "tick", at: Date.now() }), data.intervalMs);
    } else if (data.type === "stop") {
      clearInterval(clock);
      face?.close();
      objects?.close();
      face = objects = null;
    }
  } catch (error) {
    self.postMessage({ type: "error", message: error?.message || String(error) });
  }
};
