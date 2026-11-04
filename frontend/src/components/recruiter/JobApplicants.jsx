import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/utils/api";
import { Skeleton, ErrorBlock, daysAgo } from "../app/blocks";
import ScreeningPanel from "./screening/ScreeningPanel";

const STAGE_LABEL = {
  new: "New",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  decision: "With owner",
  offer: "Offer",
  hired: "Hired",
  closed: "Closed",
};
const STAGE_PILL = { interviewing: "app-pill-positive", decision: "app-pill-warning", offer: "app-pill-positive", hired: "app-pill-positive" };
const ORDER = ["new", "shortlisted", "interviewing", "decision", "offer", "hired", "closed"];
// What a recruiter can do by hand at each stage (later stages move through the owner)
const ACTIONS = {
  new: [
    ["under_review", "Mark reviewed"],
    ["shortlisted", "Shortlist"],
  ],
  shortlisted: [["interview", "Move to interview"]],
  interviewing: [],
};
const DAY = 864e5;

/** Open a resume: our API links need the session; older public links open directly. */
const openResume = async (url) => {
  if (!url) return;
  try {
    if (/\/api\/v1\/resumes\//.test(url)) {
      const res = await api.get(url.replace(/^.*\/api\/v1/, ""), { responseType: "blob" });
      window.open(URL.createObjectURL(res.data), "_blank", "noopener");
    } else {
      window.open(url, "_blank", "noopener");
    }
  } catch {
    toast.error("Couldn't open the resume");
  }
};

/** One job's applicants. Its question: who here should move forward? */
const JobApplicants = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const isRecruiter = user?.role === "recruiter";
  const [job, setJob] = useState(null);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get(`/application/${id}/applicants`);
      setJob(res.data.job);
    } catch (e) {
      setError(e.response?.status === 403 ? "forbidden" : true);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const apps = useMemo(
    () =>
      [...(job?.applications ?? [])].sort(
        (a, b) => ORDER.indexOf(a.stage) - ORDER.indexOf(b.stage) || (b.screening?.overall ?? -1) - (a.screening?.overall ?? -1) || new Date(a.createdAt) - new Date(b.createdAt),
      ),
    [job],
  );
  const selected = apps.find((a) => a._id === selectedId) ?? apps[0];
  const now = Date.now();

  const setStatus = async (app, status, label) => {
    if (status === "rejected" && !window.confirm(`Reject ${app.applicant?.fullname}? They'll see their application as closed.`)) return;
    setBusy(true);
    try {
      await api.post(`/application/status/${app._id}/update`, { status });
      toast.success(`${label}: ${app.applicant?.fullname}`);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't update the applicant");
    } finally {
      setBusy(false);
    }
  };

  if (error === "forbidden") return <p className="app-empty">This job belongs to another company.</p>;

  return (
    <>
      <div className="app-title-row">
        <div>
          <Link to={isRecruiter ? "/recruiter/jobs" : "/admin/jobs"} className="app-link">
            Jobs
          </Link>
          <h1 className="app-h1" style={{ marginTop: 4 }}>
            {job ? job.title : <Skeleton w={220} h={24} />}
            {job?.isActive === false && (
              <span className="app-pill" style={{ marginLeft: 12, verticalAlign: "middle" }}>
                Closed
              </span>
            )}
          </h1>
        </div>
      </div>

      {error ? (
        <ErrorBlock what="applicants" onRetry={load} />
      ) : (
        <div className="app-grid">
          <section className="app-panel span-7" aria-label="Applicants">
            {!job ? (
              <Skeleton rows={6} />
            ) : apps.length === 0 ? (
              <p className="app-empty">No applicants yet.</p>
            ) : (
              <ul className="app-list" role="listbox" aria-label="Applicants">
                {apps.map((a) => (
                  <li key={a._id} role="option" aria-selected={selected?._id === a._id}>
                    <button type="button" className={`app-row app-pick ${selected?._id === a._id ? "is-picked" : ""}`} onClick={() => setSelectedId(a._id)}>
                      <span className="app-row-main">
                        <span className="app-row-title" style={{ display: "block" }}>
                          {a.applicant?.fullname ?? "Applicant"}
                        </span>
                        <span className="app-row-sub" style={{ display: "block" }}>
                          Applied {daysAgo(Math.floor((now - new Date(a.createdAt)) / DAY)).toLowerCase()}
                          {a.isFlagged ? " · flagged for review" : ""}
                        </span>
                      </span>
                      <span className="app-row-end">
                        <span className="num app-meta">{a.screening?.overall != null ? `${Math.round(a.screening.overall)}/100` : "—"}</span>
                        <span className={`app-pill ${STAGE_PILL[a.stage] ?? ""}`}>{STAGE_LABEL[a.stage]}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="app-panel span-5 app-sticky" aria-label="Selected applicant">
            {!selected ? (
              job ? <p className="app-empty">Choose an applicant to see their details.</p> : <Skeleton rows={6} />
            ) : (
              <div className="app-detail">
                <div>
                  <h2 className="app-h2">{selected.applicant?.fullname}</h2>
                  <p className="app-row-sub">
                    {[selected.applicant?.email, selected.applicant?.phoneNumber].filter(Boolean).join(" · ")}
                  </p>
                </div>

                <dl className="app-facts">
                  <div>
                    <dt>Stage</dt>
                    <dd>{STAGE_LABEL[selected.stage]}</dd>
                  </div>
                  <div>
                    <dt>Blind screening</dt>
                    <dd className="num">
                      {selected.screening?.overall != null ? `${Math.round(selected.screening.overall)}/100${selected.screening.band ? ` · ${selected.screening.band}` : ""}` : "Not screened yet"}
                    </dd>
                  </div>
                  <div>
                    <dt>Applied</dt>
                    <dd className="num">{new Date(selected.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>

                {selected.isFlagged && <p className="app-notice is-over">Flagged: {selected.flagReason || "needs a closer look"}</p>}

                {selected.applicant?.profile?.skills?.length > 0 && (
                  <div>
                    <div className="app-meta" style={{ marginBottom: 6 }}>
                      Skills
                    </div>
                    <div className="app-chips">
                      {selected.applicant.profile.skills.slice(0, 16).map((s) => (
                        <span key={s} className="app-pill">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(selected.coverLetter || selected.applicant?.profile?.bio) && (
                  <div>
                    <div className="app-meta" style={{ marginBottom: 6 }}>
                      {selected.coverLetter ? "Cover letter" : "About"}
                    </div>
                    <p className="app-prose">{selected.coverLetter || selected.applicant.profile.bio}</p>
                  </div>
                )}

                <div className="app-actions">
                  {(selected.resumeUrl || selected.applicant?.profile?.resume) && (
                    <button type="button" className="app-btn app-btn-sm" onClick={() => openResume(selected.resumeUrl || selected.applicant.profile.resume)}>
                      View resume
                    </button>
                  )}
                  {(ACTIONS[selected.stage] ?? []).map(([status, label]) => (
                    <button key={status} type="button" className="app-btn app-btn-sm" disabled={busy || (status === "under_review" && selected.status === "under_review")} onClick={() => setStatus(selected, status, label)}>
                      {label}
                    </button>
                  ))}
                  {isRecruiter && ["new", "shortlisted", "interviewing"].includes(selected.stage) && !selected.interviewId && (
                    <button type="button" className="app-btn app-btn-primary app-btn-sm" onClick={() => navigate("/recruiter/interviews", { state: { applicationId: selected._id } })}>
                      Schedule interview
                    </button>
                  )}
                  {selected.interviewId && (
                    <Link className="app-btn app-btn-sm" to={`/interview/${selected.interviewId}/scorecard`}>
                      Scorecard
                    </Link>
                  )}
                  {["new", "shortlisted", "interviewing"].includes(selected.stage) && (
                    <button type="button" className="app-btn app-btn-sm app-btn-danger" disabled={busy} onClick={() => setStatus(selected, "rejected", "Rejected")}>
                      Reject
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>

          <div className="span-12">{id && <ScreeningPanel jobId={id} />}</div>
        </div>
      )}
    </>
  );
};

export default JobApplicants;
