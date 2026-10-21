/**
 * Voice activity from a MediaStream's audio, with an adaptive noise floor.
 * Speech-band RMS above max(3× floor, MIN_RMS) counts as voice; a short
 * hangover bridges the gaps between words.
 */
const MIN_RMS = 0.015;
const HANGOVER_MS = 400;

export const createVoiceMonitor = (stream, { now = () => performance.now() } = {}) => {
  const track = stream?.getAudioTracks?.()[0];
  if (!track) return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(new MediaStream([track]));
  // Roughly the speech band, so fans and hum don't count as voice
  const highpass = new BiquadFilterNode(ctx, { type: "highpass", frequency: 120 });
  const lowpass = new BiquadFilterNode(ctx, { type: "lowpass", frequency: 3800 });
  const analyser = new AnalyserNode(ctx, { fftSize: 1024 });
  source.connect(highpass).connect(lowpass).connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);

  let floor = MIN_RMS / 3;
  let lastVoiceAt = -Infinity;

  /** @returns {{ active: boolean, rms: number }} */
  const sample = () => {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!track.enabled || track.muted || track.readyState !== "live") {
      return { active: false, rms: 0 };
    }
    analyser.getFloatTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);
    // Floor follows quiet periods quickly and loud ones slowly
    floor = rms < floor ? floor * 0.9 + rms * 0.1 : floor * 0.995 + rms * 0.005;
    const t = now();
    if (rms > Math.max(floor * 3, MIN_RMS)) lastVoiceAt = t;
    return { active: t - lastVoiceAt <= HANGOVER_MS, rms };
  };

  const close = () => {
    source.disconnect();
    ctx.close().catch(() => {});
  };

  return { sample, close };
};
