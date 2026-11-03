import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/utils/api";
import { Skeleton, ErrorBlock, plural, daysAgo } from "../app/blocks";

const dash = (n) => (n ? n : <span className="app-meta">—</span>);

/** The company's jobs. Its question: which jobs are moving, and which are stuck? */
const JobsList = () => {
  const { user } = useSelector((s) => s.auth);
  const isOwner = user?.role === "company_admin";
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("open");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setJobs((await api.get("/overview/jobs")).data.jobs ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = useMemo(() => (jobs ?? []).filter((j) => j.open), [jobs]);
  const closed = useMemo(() => (jobs ?? []).filter((j) => !j.open), [jobs]);
  const visible = tab === "open" ? open : closed;
  // An open job past two weeks with nobody past "new" is stuck
  const stuck = open.filter((j) => j.daysOpen >= 14 && j.applicants === j.stages.new + j.stages.closed);
  const applicantsLink = (j) => (isOwner ? `/admin/jobs/${j.id}/applicants` : `/recruiter/job/${j.id}/applications`);

  const toggle = async (j) => {
    if (j.open && !window.confirm(`Close "${j.title}"? It stops taking applications; people already applying keep their place.`)) return;
    setBusy(j.id);
    try {
      await api.patch(`/job/toggle-status/${j.id}`);
      toast.success(j.open ? `"${j.title}" is closed` : `"${j.title}" is open again`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't change the job");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="app-title-row">
        <div>
          <h1 className="app-h1">Jobs</h1>
          <p className="app-finding">
            {!jobs ? (
              <Skeleton w={260} h={14} />
            ) : open.length === 0 ? (
              "No open jobs."
            ) : stuck.length ? (
              <>
                <strong>{plural(stuck.length, "open job")}</strong> {stuck.length === 1 ? "has" : "have"} had no one move past review in two weeks or more.
              </>
            ) : (
              <>
                <strong>{plural(open.length, "open job")}</strong> with {plural(open.reduce((n, j) => n + j.applicants, 0), "applicant")}.
              </>
            )}
          </p>
        </div>
        {isOwner && (
          <Link to="/admin/jobs/create" className="app-btn app-btn-primary">
            Post a job
          </Link>
        )}
      </div>

      {error ? (
        <ErrorBlock what="jobs" onRetry={load} />
      ) : (
        <section className="app-panel" aria-label="Jobs">
          <div className="app-tabs" role="tablist" aria-label="Job status">
            {[
              ["open", "Open", open.length],
              ["closed", "Closed", closed.length],
            ].map(([key, label, n]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>
                {label} <span className="num app-tab-count">{jobs ? n : ""}</span>
              </button>
            ))}
          </div>

          {!jobs ? (
            <Skeleton rows={5} />
          ) : visible.length === 0 ? (
            <p className="app-empty" style={{ marginTop: 12 }}>
              {tab === "open" ? (isOwner ? <>No open jobs. <Link to="/admin/jobs/create">Post one</Link> to start receiving applicants.</> : "No open jobs. The company owner posts them.") : "No closed jobs."}
            </p>
          ) : (
            <table className="app-table" style={{ marginTop: 4 }}>
              <thead>
                <tr>
                  <th scope="col">Job</th>
                  <th scope="col" className="num">
                    Applicants
                  </th>
                  <th scope="col" className="num">
                    New
                  </th>
                  <th scope="col" className="num">
                    Shortlisted
                  </th>
                  <th scope="col" className="num">
                    Interviewing
                  </th>
                  <th scope="col" className="num">
                    With owner
                  </th>
                  <th scope="col" className="num">
                    Offer or hired
                  </th>
                  <th scope="col" className="num">
                    {tab === "open" ? "Open for" : "Posted"}
                  </th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <Link to={applicantsLink(j)} className="app-row-title" style={{ display: "block", color: "inherit", textDecoration: "none" }}>
                        {j.title}
                      </Link>
                      <div className="app-row-sub">
                        {[j.location, j.jobType, j.postedBy && `posted by ${j.postedBy}`].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="num">{j.applicants}</td>
                    <td className="num">{dash(j.stages.new)}</td>
                    <td className="num">{dash(j.stages.shortlisted)}</td>
                    <td className="num">{dash(j.stages.interviewing)}</td>
                    <td className="num">{dash(j.stages.decision)}</td>
                    <td className="num">{dash(j.stages.hired + j.stages.offer)}</td>
                    <td className="num app-meta">
                      {daysAgo(j.daysOpen)}
                      {stuck.includes(j) && (
                        <span className="app-pill app-pill-warning" style={{ marginLeft: 8 }}>
                          Stuck
                        </span>
                      )}
                    </td>
                    <td className="app-row-actions">
                      <Link className="app-link" to={applicantsLink(j)}>
                        Applicants
                      </Link>
                      {isOwner && (
                        <Link className="app-link" to={`/admin/jobs/${j.id}/edit`}>
                          Edit
                        </Link>
                      )}
                      {isOwner && (
                        <button type="button" className="app-link" disabled={busy === j.id} onClick={() => toggle(j)}>
                          {j.open ? "Close" : "Reopen"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  );
};

export default JobsList;
