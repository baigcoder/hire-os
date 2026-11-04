import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/utils/api";
import AppShell from "../app/AppShell";
import { Skeleton, ErrorBlock, plural, when } from "../app/blocks";
import { TaskList } from "../app/TaskList";

const STAGE = {
  new: ["Applied", ""],
  shortlisted: ["Shortlisted", ""],
  interviewing: ["Interviewing", "app-pill-positive"],
  decision: ["Final decision", "app-pill-positive"],
  offer: ["Offer", "app-pill-positive"],
  hired: ["Hired", "app-pill-positive"],
  closed: ["Closed", ""],
};

// Joinable from 15 minutes before the start
const joinable = (i, now) => new Date(i.scheduledAt) - now < 15 * 60 * 1000;

/** Today for a candidate: interviews to attend, where each application stands, and jobs that fit. */
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
    // Matches are a bonus: their failure never blocks the screen
    api
      .get("/job/ai-matched", { params: { limit: 4 } })
      .then((res) => setMatches(res.data.data?.jobs ?? []))
      .catch(() => setMatches([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const interviews = (data?.upcoming.rows ?? []).map((i) => ({
    key: i.id,
    title: `Interview for ${i.job}`,
    meta: when(i.scheduledAt, now),
    action: joinable(i, now) ? { label: "Join", to: `/interview/${i.id}/video`, primary: true } : { label: "Practise", to: "/interview-prep" },
  }));
  const trial = data?.trial;
  const trialMatters = trial && (trial.expired || trial.daysLeft <= 5);

  return (
    <AppShell title="Today">
      <h1 className="app-h1 app-page-title">Today</h1>

      {trialMatters && (
        <p className={`app-notice ${trial.expired ? "is-over" : ""}`}>
          {trial.expired ? "Your free trial has ended. Your applications carry on." : `${plural(trial.daysLeft, "day")} left of your free trial.`}
        </p>
      )}

      {error ? (
        <ErrorBlock what="today" onRetry={load} />
      ) : (
        <div className="app-grid">
          <div className="span-8 app-col">
            {interviews.length > 0 && <TaskList tasks={interviews} />}

            <section aria-labelledby="apps-h">
              <div className="app-side-head">
                <h2 className="app-h2 app-side-h" id="apps-h">
                  Applications
                </h2>
                {data?.applications.total > data?.applications.rows.length && (
                  <Link to="/applied-jobs" className="app-link">
                    All {data.applications.total}
                  </Link>
                )}
              </div>
              {!data ? (
                <Skeleton rows={4} />
              ) : data.applications.total === 0 ? (
                <p className="app-done">
                  No applications yet. <Link to="/jobs">Find a job</Link>
                </p>
              ) : (
                <ul className="app-tasks">
                  {data.applications.rows.map((a) => (
                    <li className="app-task" key={a.id}>
                      <div className="app-task-main">
                        <span className="app-task-title">{a.job}</span>
                        <span className="app-task-sub">
                          {a.company}
                          {a.nextStep ? ` · ${a.nextStep}` : ""}
                        </span>
                      </div>
                      <span className={`app-pill ${STAGE[a.stage][1]}`}>{STAGE[a.stage][0]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="span-4" aria-labelledby="match-h">
            <h2 className="app-h2 app-side-h" id="match-h">
              Jobs for you
            </h2>
            {matches === null ? (
              <Skeleton rows={3} />
            ) : matches.length === 0 ? (
              <p className="app-meta">
                <Link to="/profile">Add your skills</Link> to see matches.
              </p>
            ) : (
              <ul className="app-list">
                {matches.map((j) => (
                  <li key={j._id}>
                    <Link to={`/description/${j._id}`} className="app-later">
                      <span className="app-row-title">{j.title}</span>
                      <span className="app-row-sub num">
                        {j.company?.name ?? ""}
                        {j.match?.score != null ? ` · ${Math.round(j.match.score)}% match` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
};

export default CandidateOverview;
