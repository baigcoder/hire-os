import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "@/utils/api";
import AppShell from "../app/AppShell";
import { Funnel, Skeleton, ErrorBlock, plural, daysAgo, when } from "../app/blocks";

const REPORT_STATE = { pending: "Not generated", draft: "Draft ready" };

// Joinable from 15 minutes before the start, or while the room is open
const joinable = (i, now) => i.live || new Date(i.scheduledAt) - now < 15 * 60 * 1000;

/** The recruiter's overview. Its question: what needs me today? */
const RecruiterOverview = () => {
  const { user } = useSelector((s) => s.auth);
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    setError(false);
    try {
      setData((await api.get("/overview")).data);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
    // Interview times move from "later" to "join now" while the screen is open
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  const finding = !data ? (
    <Skeleton w={300} h={14} />
  ) : (
    <>
      <strong>{plural(data.interviewsToday, "interview")}</strong> today, <strong>{plural(data.reportsToSend.total, "report")}</strong> to send and{" "}
      <strong>{plural(data.toReview.total, "applicant")}</strong> waiting for review.
    </>
  );

  return (
    <AppShell title="Overview" scope={user?.fullname}>
      <div className="app-title-row">
        <div>
          <h1 className="app-h1">Overview</h1>
          <p className="app-finding">{finding}</p>
        </div>
        {/* Recruiters don't post jobs (owners do); their most frequent job is reviewing */}
        <Link to="/recruiter/applicants" className="app-btn app-btn-primary">
          Review applicants
        </Link>
      </div>

      {error ? (
        <ErrorBlock what="your overview" onRetry={load} />
      ) : (
        <div className="app-grid">
          <section className="app-panel span-7" aria-labelledby="up-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="up-h">
                Upcoming interviews
              </h2>
              <Link to="/recruiter/interviews" className="app-link">
                {data ? `View all ${data.upcoming.total}` : "View all"}
              </Link>
            </div>
            {!data ? (
              <Skeleton rows={4} />
            ) : data.upcoming.total === 0 ? (
              <p className="app-empty">
                No interviews scheduled. <Link to="/recruiter/interviews">Schedule one</Link> from a candidate&apos;s application.
              </p>
            ) : (
              <ul className="app-list">
                {data.upcoming.rows.map((i) => (
                  <li className="app-row" key={i.id}>
                    <div className="app-row-main">
                      <div className="app-row-title">{i.candidate}</div>
                      <div className="app-row-sub">{i.job}</div>
                    </div>
                    <div className="app-row-end">
                      <span className="app-meta num">{when(i.scheduledAt, now)}</span>
                      {joinable(i, now) ? (
                        <Link to={`/interview/${i.id}/video`} className="app-btn app-btn-primary app-btn-sm">
                          Join
                        </Link>
                      ) : (
                        <Link to={`/interview/${i.id}/scorecard`} className="app-btn app-btn-sm">
                          Scorecard
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="app-panel span-5" aria-labelledby="rep-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="rep-h">
                Reports to send
              </h2>
              <span className="app-meta">{data ? plural(data.reportsToSend.total, "interview") : ""}</span>
            </div>
            {!data ? (
              <Skeleton rows={3} />
            ) : data.reportsToSend.total === 0 ? (
              <p className="app-empty">Every finished interview has its report with the owner.</p>
            ) : (
              <ul className="app-list">
                {data.reportsToSend.rows.map((i) => (
                  <li className="app-row" key={i.id}>
                    <div className="app-row-main">
                      <div className="app-row-title">{i.candidate}</div>
                      <div className="app-row-sub">
                        {i.job} · {REPORT_STATE[i.reportStatus] ?? "Not sent"}
                      </div>
                    </div>
                    <Link to={`/interview/${i.id}/scorecard`} className="app-btn app-btn-sm">
                      Finish report
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="app-panel span-7" aria-labelledby="rev-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="rev-h">
                Waiting for review
              </h2>
              <Link to="/recruiter/applicants" className="app-link">
                {data ? `View all ${data.toReview.total}` : "View all"}
              </Link>
            </div>
            {!data ? (
              <Skeleton rows={4} />
            ) : data.toReview.total === 0 ? (
              <p className="app-empty">No new applicants. They appear here, longest-waiting first.</p>
            ) : (
              <table className="app-table">
                <thead>
                  <tr>
                    <th scope="col">Applicant</th>
                    <th scope="col">Job</th>
                    <th scope="col" className="num">
                      Waiting
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.toReview.rows.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.jobId ? (
                          <Link to={`/recruiter/job/${a.jobId}/applications`} style={{ color: "inherit", textDecoration: "none" }}>
                            {a.candidate}
                          </Link>
                        ) : (
                          a.candidate
                        )}
                      </td>
                      <td className="app-meta">{a.job}</td>
                      <td className={`num ${a.waitingDays >= 7 ? "" : "app-meta"}`}>
                        {daysAgo(a.waitingDays)}
                        {a.waitingDays >= 7 && (
                          <span className="app-pill app-pill-warning" style={{ marginLeft: 8 }}>
                            Over a week
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="app-panel span-5" aria-labelledby="flow-h">
            <div className="app-panel-head">
              <h2 className="app-h2" id="flow-h">
                Hiring flow
              </h2>
              <span className="app-meta">{data ? `${plural(data.activeJobs, "open job")}` : ""}</span>
            </div>
            <Funnel pipeline={data?.pipeline} hue="new" />
          </section>
        </div>
      )}
    </AppShell>
  );
};

export default RecruiterOverview;
