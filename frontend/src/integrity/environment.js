/**
 * Browser-environment signals for the candidate's page: tab hidden, window
 * focus lost, fullscreen exit, copy/paste and developer-tools shortcuts.
 * Durations are measured here; events go to the tracker.
 */
const DEVTOOLS_KEYS = (e) =>
  e.key === "F12" ||
  ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C", "i", "j", "c"].includes(e.key)) ||
  (e.metaKey && e.altKey && ["i", "I", "j", "J"].includes(e.key));

export const watchEnvironment = (tracker, { now = () => Date.now() } = {}) => {
  let hiddenAt = document.hidden ? now() : null;
  let blurAt = null;
  let blurWhileHidden = false;

  const onVisibility = () => {
    if (document.hidden) {
      hiddenAt = now();
    } else if (hiddenAt != null) {
      tracker.push({ type: "tab_hidden", startedAt: hiddenAt, durationMs: now() - hiddenAt, confidence: 1 });
      hiddenAt = null;
    }
  };
  const onBlur = () => {
    blurAt = now();
    blurWhileHidden = false;
  };
  const onFocus = () => {
    // A hidden tab is already reported; don't double-count its blur
    if (blurAt != null && !blurWhileHidden) {
      tracker.push({ type: "window_blur", startedAt: blurAt, durationMs: now() - blurAt, confidence: 1 });
    }
    blurAt = null;
  };
  const onHiddenDuringBlur = () => {
    if (document.hidden && blurAt != null) blurWhileHidden = true;
  };
  const onFullscreen = () => {
    if (!document.fullscreenElement) tracker.instant("fullscreen_exit", now());
  };
  const onCopy = () => tracker.instant("copy_paste", now(), "copy");
  const onCut = () => tracker.instant("copy_paste", now(), "cut");
  const onPaste = () => tracker.instant("copy_paste", now(), "paste");
  const onKey = (e) => {
    if (DEVTOOLS_KEYS(e)) tracker.instant("devtools", now(), "shortcut");
  };

  document.addEventListener("visibilitychange", onVisibility);
  document.addEventListener("visibilitychange", onHiddenDuringBlur);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  document.addEventListener("fullscreenchange", onFullscreen);
  document.addEventListener("copy", onCopy);
  document.addEventListener("cut", onCut);
  document.addEventListener("paste", onPaste);
  document.addEventListener("keydown", onKey);

  return () => {
    // Close anything still open so it isn't lost
    if (hiddenAt != null) {
      tracker.push({ type: "tab_hidden", startedAt: hiddenAt, durationMs: now() - hiddenAt, confidence: 1 });
      hiddenAt = null;
    }
    document.removeEventListener("visibilitychange", onVisibility);
    document.removeEventListener("visibilitychange", onHiddenDuringBlur);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("fullscreenchange", onFullscreen);
    document.removeEventListener("copy", onCopy);
    document.removeEventListener("cut", onCut);
    document.removeEventListener("paste", onPaste);
    document.removeEventListener("keydown", onKey);
  };
};

/** Extended/multiple displays (Chromium exposes screen.isExtended). */
export const hasExtendedDisplay = () =>
  typeof window.screen?.isExtended === "boolean" ? window.screen.isExtended : undefined;
