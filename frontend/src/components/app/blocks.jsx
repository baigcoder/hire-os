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

/**
 * The hiring pipeline as one strip: each stage's width is its share of the
 * applications, and the stage this person acts on carries the one data hue.
 */
export const PipelineStrip = ({ pipeline, focus, to }) => {
  const stages = (pipeline?.stages ?? []).filter((s) => s.key !== "closed");
  const total = stages.reduce((n, s) => n + s.count, 0);
  if (!total) return <p className="app-meta">No applications yet.</p>;
  return (
    <div className="app-strip">
      <div className="app-strip-bar" aria-hidden="true">
        {stages.map((s) =>
          s.count ? <span key={s.key} className={s.key === focus ? "is-focus" : ""} style={{ flexGrow: s.count }} /> : null,
        )}
      </div>
      <ul className="app-strip-legend">
        {stages.map((s) => (
          <li key={s.key} className={s.key === focus ? "is-focus" : ""}>
            <span className="num app-strip-count">{s.count}</span>
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
      {to}
    </div>
  );
};
