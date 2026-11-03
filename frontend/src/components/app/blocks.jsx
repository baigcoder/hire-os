/** Small building blocks shared by the app screens (see app.css). */

export const plural = (n, word, many = `${word}s`) => `${n.toLocaleString()} ${n === 1 ? word : many}`;

export const daysAgo = (days) => (days === 0 ? "Today" : days === 1 ? "1 day" : `${days} days`);

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

/** "Today, 3:30 PM" / "Tomorrow, 10:00 AM" / "Thu 6 Nov, 9:00 AM" */
export const when = (date, now = new Date()) => {
  const d = new Date(date);
  const days = Math.round((new Date(d.toDateString()) - new Date(now.toDateString())) / 864e5);
  const day = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days === -1 ? "Yesterday" : dayFmt.format(d);
  return `${day}, ${timeFmt.format(d)}`;
};

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

/** KPIs as one container split by dividers: label, value, one grey line. */
export const Kpis = ({ items, loading, count = 4 }) => (
  <div className="app-kpis">
    {(loading ? Array.from({ length: count }, () => null) : items).map((k, i) => (
      <div className="app-kpi" key={k?.label ?? i}>
        <div className="app-kpi-label">{k ? k.label : <Skeleton w={90} h={12} />}</div>
        <div className="app-kpi-value num">{k ? k.value : <Skeleton w={56} h={24} />}</div>
        {k?.sub && <div className="app-kpi-sub">{k.sub}</div>}
      </div>
    ))}
  </div>
);

/**
 * The hiring funnel: one bar per stage at its true share of the largest
 * stage. Only the stage the screen is about carries the data hue.
 */
export const Funnel = ({ pipeline, hue, hide = ["closed"] }) => {
  if (!pipeline) return <Skeleton rows={6} />;
  const stages = pipeline.stages.filter((s) => !hide.includes(s.key));
  const max = Math.max(1, ...stages.map((s) => s.count));
  const closed = pipeline.stages.find((s) => s.key === "closed")?.count ?? 0;
  return (
    <div className="app-funnel">
      {stages.map((s) => (
        <div key={s.key} className={`app-funnel-row${s.key === hue ? " is-hue" : ""}`}>
          <span className="app-funnel-label">{s.label}</span>
          <span className="app-funnel-track" aria-hidden="true">
            {s.count > 0 && <span className="app-funnel-fill" style={{ width: `${(s.count / max) * 100}%`, display: "block" }} />}
          </span>
          <span className="num" style={{ textAlign: "right" }}>
            {s.count}
          </span>
        </div>
      ))}
      {hide.includes("closed") && <div className="app-meta">{closed ? `${plural(closed, "application")} closed` : "None closed yet"}</div>}
    </div>
  );
};
