/**
 * Frame utilities: a tiny content hash (frozen-feed detection) and JPEG
 * evidence stills. Both read from a <video> element.
 */
const HASH_W = 32;
const HASH_H = 24;
const EVIDENCE_WIDTH = 320;

let hashCanvas;
const hashContext = () => {
  hashCanvas ??= Object.assign(document.createElement("canvas"), { width: HASH_W, height: HASH_H });
  return hashCanvas.getContext("2d", { willReadFrequently: true });
};

/** Is the element showing live video we can read? */
export const videoReady = (video) =>
  Boolean(video && video.readyState >= 2 && video.videoWidth > 0 && !video.paused);

/**
 * FNV-1a over the raw RGB bytes of a 32×24 downscale. Any change in any
 * channel of any sampled pixel changes it, so live camera noise does every
 * frame; the same hash across seconds means the feed is frozen. (Averaging
 * to whole-number luma first hid small changes and flagged live feeds.)
 * Returns undefined when there's nothing to hash (camera off).
 */
export const frameHash = (video) => {
  if (!videoReady(video)) return undefined;
  const ctx = hashContext();
  ctx.drawImage(video, 0, 0, HASH_W, HASH_H);
  const { data } = ctx.getImageData(0, 0, HASH_W, HASH_H);
  let hash = 0x811c9dc5;
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] + data[i + 1] + data[i + 2] > 24) lit += 1;
    for (let c = 0; c < 3; c++) {
      hash ^= data[i + c];
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  // A black frame (camera disabled) isn't a frozen feed
  if (lit < 4) return undefined;
  return hash.toString(16).padStart(8, "0");
};

/** ~320px JPEG data URL of the current frame, or null. */
export const captureStill = (video, quality = 0.6) => {
  if (!videoReady(video)) return null;
  const scale = EVIDENCE_WIDTH / video.videoWidth;
  const canvas = Object.assign(document.createElement("canvas"), {
    width: EVIDENCE_WIDTH,
    height: Math.round(video.videoHeight * scale),
  });
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
};
