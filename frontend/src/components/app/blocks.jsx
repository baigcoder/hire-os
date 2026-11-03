/** Small building blocks shared by the app screens (see app.css). */

export { plural, daysAgo, when } from "./format.js";

/** Loading: the final layout with flat bars at their real size. */
export const Skeleton = ({ w = "100%", h = 14, rows }) =>
  rows ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 6 }} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="app-skel" style={{ width: i % 2 ? "70%" : "100%", height: 14 }} />
      ))}
    </div>
  ) : (
    <span className="app-skel" style={{ width: w, height: h, display: "inline-block", verticalAlign: "middle" }} aria-hidden="true" />
  );

/** An error stays inside the block that failed, with a way to retry. */
export const ErrorBlock = ({ what, onRetry }) => (
  <div className="app-panel" role="alert">
    Couldn&apos;t load {what}.{" "}
    <button type="button" className="app-link" style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }} onClick={onRetry}>
      Retry
    </button>
  </div>
);
