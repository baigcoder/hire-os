import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import api from "@/utils/api";
import useGetAppliedJobs from "@/hooks/useGetAppliedJobs";
import { useSupabaseDashboard } from "@/hooks/useSupabaseDashboard";
import { setAllAppliedJobs } from "@/redux/jobSlice";
import { Skeleton } from "../app/blocks";
import { when } from "../app/format.js";

// Application status → the stage a candidate would name, its pill and what happens next
const STAGE = [
  ["review", "In review", "", "Waiting for the recruiter to review", ["pending", "under_review", "reviewing", "shortlisted"]],
  ["interview", "Interviewing", "app-pill-positive", "Interview stage", ["interview", "mcq_pending", "mcq_passed", "video_scheduled", "video_completed", "pending_ceo_approval"]],
  ["offer", "Offer or hired", "app-pill-positive", "An offer is on its way", ["offer_pending", "offer_sent", "offer_accepted", "accepted", "hired"]],
  ["closed", "Closed", "", "This one didn't go ahead", ["rejected", "mcq_failed", "offer_rejected", "withdrawn"]],
];
const stageOf = (status) => STAGE.find((s) => s[4].includes(status)) ?? STAGE[0];

// Joinable from 15 minutes before the start until an hour after
const joinable = (at, now) => at && now >= new Date(at) - 15 * 60e3 && now <= new Date(at).getTime() + 60 * 60e3;

/** Where each application stands, and the one thing to do for it. */
const AppliedJobs = () => {
  const dispatch = useDispatch();
  useGetAppliedJobs();
  const { allAppliedJobs } = useSelector((store) => store.job);
  const [tab, setTab] = useState("all");
  const now = Date.now();

  const refetch = useCallback(async () => {
    try {
      const { data } = await api.get("/application/get");
      if (data.success) dispatch(setAllAppliedJobs(data.application));
    } catch {
      // the list keeps what it has; the next visit reloads it
    }
  }, [dispatch]);

  useSupabaseDashboard({
    onInterviewScheduled: (payload) => {
      toast.success(`Interview scheduled for ${payload.jobTitle}`, {
        description: payload.scheduledAt ? when(payload.scheduledAt) : undefined,
      });
      refetch();
    },
  });

  const rows = useMemo(
    () =>
      (allAppliedJobs ?? []).map((a) => {
        const [key, label, pill, next] = stageOf(a.status);
        const interview = typeof a.interviewId === "object" ? a.interviewId : null;
        return { a, key, label, pill, next, interview };
      }),
    [allAppliedJobs],
  );
  const count = (k) => rows.filter((r) => r.key === k).length;
  const shown = tab === "all" ? rows : rows.filter((r) => r.key === tab);

  const action = ({ a, key, interview }) => {
    if (key === "interview" && interview?.scheduledAt && interview.status !== "completed") {
      return joinable(interview.scheduledAt, now) ? (
        <Link className="app-btn app-btn-sm app-btn-primary" to={`/interview/${interview._id}/video`}>
          Join
        </Link>
      ) : (
        <Link className="app-btn app-btn-sm" to="/interview-prep">
          Practise
        </Link>
      );
    }
    return a.job?._id ? (
      <Link className="app-link" to={`/description/${a.job._id}`}>
        View job
      </Link>
    ) : null;
  };

  return (
    <>
      <div className="app-title-row">
        <h1 className="app-h1">Applications</h1>
        <Link to="/jobs" className="app-btn">
          Find jobs
        </Link>
      </div>

      <section className="app-panel" aria-label="Your applications" style={{ paddingTop: 8 }}>
        <div className="app-tabs" role="tablist" aria-label="Stage">
          {[["all", "All", rows.length], ...STAGE.map(([k, l]) => [k, l, count(k)])].map(([k, l, n]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}>
              {l} <span className="app-tab-count num">{n}</span>
            </button>
          ))}
        </div>

        {!allAppliedJobs ? (
          <Skeleton rows={5} />
        ) : shown.length === 0 ? (
          <p className="app-empty">
            {rows.length === 0 ? (
              <>
                No applications yet. <Link to="/jobs">Find a job</Link>
              </>
            ) : (
              "Nothing at this stage."
            )}
          </p>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                <th scope="col">Job</th>
                <th scope="col">Stage</th>
                <th scope="col">Applied</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.a._id}>
                  <td>
                    <div className="app-row-title">{r.a.job?.title ?? "A removed job"}</div>
                    <div className="app-row-sub">
                      {[r.a.job?.company?.name, r.a.job?.location].filter(Boolean).join(" · ")}
                      {" · "}
                      {r.key === "interview" && r.interview?.scheduledAt ? `Interview ${when(r.interview.scheduledAt).toLowerCase()}` : r.next}
                    </div>
                  </td>
                  <td>
                    <span className={`app-pill ${r.pill}`}>{r.label}</span>
                  </td>
                  <td className="app-meta num">{new Date(r.a.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</td>
                  <td className="app-row-actions">{action(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
};

export default AppliedJobs;
