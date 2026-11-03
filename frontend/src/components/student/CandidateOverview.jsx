import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import AppShell from "../app/AppShell";
import { Funnel, Skeleton, ErrorBlock, plural, when } from "../app/blocks";

const STAGE_PILL = {
  new: "",
  shortlisted: "",
  interviewing: "app-pill-positive",
  decision: "app-pill-positive",
  offer: "app-pill-positive",
  hired: "app-pill-positive",
  closed: "",
};
const STAGE_LABEL = {
  new: "Applied",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  decision: "Final decision",
  offer: "Offer",
  hired: "Hired",
  closed: "Closed",
};

const joinable = (i, now) => new Date(i.scheduledAt) - now < 15 * 60 * 1000;

/** The candidate's overview. Its question: where do my applications stand? */
const CandidateOverview = () => {
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    setError(false);
    try {
      setData((await api.get("/overview")).data);
    } catch {
      setError(true);
    }
    // Matches are a bonus: their failure never blocks the overview
    api
      .get("/job/ai-matched", { params: { limit: 4 } })
      .then((res) => setMatches(res.data.data?.jobs ?? []))
      .catch(() => setMatches([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inProgress = data ? data.pipeline.total - (data.pipeline.stages.find((s) => s.key === "closed")?.count ?? 0) : 0;
  const next = data?.upcoming.rows[0];

  return (
    <AppShell title="Overview" scope="Candidate">
      <div className="app-title-row">
        <div>
          <h1 className="app-h1">Overview</h1>
          <p className="app-finding">
            {!data ? (
              <Skeleton w={280} h={14} />
            ) : data.applications.total === 0 ? (
              "You haven't applied to anything yet."
            ) : (
              <>
                <strong>{plural(inProgress, "application")}</strong> in progress
                {next ? (
                  <>
                    {" "}
                    · next interview <strong>{when(next.scheduledAt, now)}</strong>
                  </>
                ) : (
                  "."
                )}
              </>
            )}
          </p>
        </div>
        <Link to="/jobs" className="app-btn app-btn-primary">
          Find jobs
        </Link>
      </div>

      {data?.trial && (
        <p className={`app-notice ${data.trial.expired ? "is-over" : ""}`}>
          {data.trial.expired
            ? "Your free trial has ended. Resume analysis and interview practice are paused; your applications carry on."
            : `Free trial: ${plural(data.trial.daysLeft, "day")} left of every candidate tool.`}
        </p>
      )}

      {error ? (
        <ErrorBlock what="your overview" onRetry={load} />
      ) : (
        <div className="app-grid">
          <div className="span-7 app-col">
          <section className="app-panel" aria-labelledby="apps-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="apps-h">
                Your applications
              </h2>
              <Link to="/applied-jobs" className="app-link">
                {data ? `View all ${data.applications.total}` : "View all"}
              </Link>
            </div>
            {!data ? (
              <Skeleton rows={5} />
            ) : data.applications.total === 0 ? (
              <p className="app-empty">
                Applications you send appear here with their stage. <Link to="/jobs">Browse open jobs</Link>
              </p>
            ) : (
              <ul className="app-list">
                {data.applications.rows.map((a) => (
                  <li className="app-row" key={a.id}>
                    <div className="app-row-main">
                      <div className="app-row-title">{a.job}</div>
                      <div className="app-row-sub">
                        {a.company}
                        {a.location ? ` · ${a.location}` : ""} · {a.nextStep}
                      </div>
                    </div>
                    <span className={`app-pill ${STAGE_PILL[a.stage]}`}>{STAGE_LABEL[a.stage]}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="app-panel" aria-labelledby="match-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="match-h">
                Jobs that match your profile
              </h2>
              <Link to="/student/career?tab=jobs" className="app-link">
                See all matches
              </Link>
            </div>
            {matches === null ? (
              <Skeleton rows={3} />
            ) : matches.length === 0 ? (
              <p className="app-empty">
                No matches yet. <Link to="/profile">Add your skills</Link> to get matched to open jobs.
              </p>
            ) : (
              <table className="app-table">
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Skills you have</th>
                    <th scope="col" className="num">
                      Match
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((j) => (
                    <tr key={j._id}>
                      <td>
                        <Link to={`/description/${j._id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {j.title}
                        </Link>
                        <div className="app-row-sub">{j.company?.name ?? ""}</div>
                      </td>
                      <td className="app-meta">{(j.match?.matchedSkills ?? []).slice(0, 4).join(", ") || "—"}</td>
                      <td className="num">{j.match?.score != null ? `${Math.round(j.match.score)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          </div>
          <div className="span-5 app-col">
          <section className="app-panel" aria-labelledby="int-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="int-h">
                Interviews
              </h2>
              <span className="app-meta">{data ? plural(data.upcoming.total, "upcoming", "upcoming") : ""}</span>
            </div>
            {!data ? (
              <Skeleton rows={2} />
            ) : data.upcoming.total === 0 ? (
              <p className="app-empty">
                None scheduled. Meanwhile, <Link to="/interview-prep">practise an interview</Link>.
              </p>
            ) : (
              <ul className="app-list">
                {data.upcoming.rows.map((i) => (
                  <li className="app-row" key={i.id}>
                    <div className="app-row-main">
                      <div className="app-row-title">{i.job}</div>
                      <div className="app-row-sub num">{when(i.scheduledAt, now)}</div>
                    </div>
                    {joinable(i, now) ? (
                      <Link to={`/interview/${i.id}/video`} className="app-btn app-btn-primary app-btn-sm">
                        Join
                      </Link>
                    ) : (
                      <span className="app-meta">Join opens 15 min before</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div className="app-panel-head" style={{ marginTop: 24 }}>
              <h2 className="app-h2">Where they stand</h2>
            </div>
            <Funnel pipeline={data?.pipeline} hue="interviewing" />
          </section>

          </div>
        </div>
      )}
    </AppShell>
  );
};

export default CandidateOverview;
