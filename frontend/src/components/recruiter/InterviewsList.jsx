import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "@/utils/api";
import { Skeleton, ErrorBlock, when } from "../app/blocks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { interviewState } from "./interviewState.js";

const TABS = [
  ["upcoming", "Upcoming"],
  ["report", "Needs report"],
  ["done", "Done"],
  ["cancelled", "Cancelled"],
];
// Joinable from 15 minutes before the start until it's over
const joinable = (i, s, now) => s.key === "live" || (s.key === "scheduled" && new Date(i.scheduledAt) - now < 15 * 60 * 1000);
// Stages from which a candidate can be invited to an interview
const SCHEDULABLE = ["new", "shortlisted", "interviewing"];
const emptyForm = { applicationId: "", scheduledAt: "", video: true, message: "" };
// <input type="datetime-local"> wants local time without a zone
const localNow = () => {
  const d = new Date(Date.now() + 3600e3);
  d.setMinutes(0, 0, 0);
  return new Date(d - d.getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
};

/**
 * Interviews. Recruiters see their own and run them; the owner sees the whole
 * company. Its question: what's next, and what still needs a report?
 */
const InterviewsList = () => {
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const isOwner = user?.role === "company_admin";
  const [change, setChange] = useState(null); // { interview, mode: "reschedule" | "cancel", when, reason }
  const [rows, setRows] = useState(null);
  const [apps, setApps] = useState([]);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("upcoming");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const now = Date.now();

  const load = useCallback(async () => {
    setError(false);
    try {
      const [iv, ap] = await Promise.all([
        api.get(isOwner ? "/interview/company/all" : "/interview/recruiter/my-interviews"),
        isOwner ? Promise.resolve({ data: {} }) : api.get("/application/company").catch(() => ({ data: {} })),
      ]);
      setRows(iv.data.interviews ?? []);
      setApps(ap.data.applications ?? []);
    } catch {
      setError(true);
    }
  }, [isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  const applyChange = async (e) => {
    e.preventDefault();
    const { interview, mode } = change;
    if (mode === "reschedule" && new Date(change.when) <= new Date()) {
      toast.error("Pick a time in the future");
      return;
    }
    setSaving(true);
    try {
      if (mode === "reschedule") {
        await api.put(`/interview/${interview._id}/reschedule`, { newDateTime: new Date(change.when).toISOString(), reason: change.reason });
        toast.success(`Moved to ${when(change.when)}. The candidate has been told.`);
      } else {
        await api.put(`/interview/${interview._id}/cancel`, { reason: change.reason });
        toast.success("Interview cancelled. The candidate has been told.");
      }
      setChange(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't change the interview");
    } finally {
      setSaving(false);
    }
  };

  // Arriving from an application with "schedule an interview"
  useEffect(() => {
    if (location.state?.applicationId) setForm({ ...emptyForm, applicationId: location.state.applicationId, scheduledAt: localNow() });
  }, [location.state]);

  const withState = useMemo(() => (rows ?? []).map((i) => ({ ...i, state: interviewState(i, now) })), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => withState.reduce((c, i) => ({ ...c, [i.state.tab]: (c[i.state.tab] ?? 0) + 1 }), {}), [withState]);
  const visible = useMemo(() => {
    const list = withState.filter((i) => i.state.tab === tab);
    // Upcoming soonest first; everything else most recent first
    return tab === "upcoming" ? [...list].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)) : list;
  }, [withState, tab]);
  const schedulable = apps.filter((a) => SCHEDULABLE.includes(a.stage) && !a.interviewId);

  const schedule = async (e) => {
    e.preventDefault();
    if (new Date(form.scheduledAt) < new Date()) {
      toast.error("Pick a time in the future");
      return;
    }
    setSaving(true);
    try {
      await api.post("/interview/create", {
        applicationId: form.applicationId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        videoEnabled: form.video,
        personalMessage: form.message,
        mcqEnabled: false,
      });
      toast.success("Interview scheduled. The candidate has been invited.");
      setForm(null);
      setTab("upcoming");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't schedule the interview");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="app-title-row">
        <div>
          <h1 className="app-h1">Interviews</h1>
        </div>
        {!isOwner && (
          <button type="button" className="app-btn app-btn-primary" onClick={() => setForm({ ...emptyForm, scheduledAt: localNow() })}>
            Schedule interview
          </button>
        )}
      </div>

      {error ? (
        <ErrorBlock what="interviews" onRetry={load} />
      ) : (
        <section className="app-panel" aria-label="Interviews">
          <div className="app-tabs" role="tablist" aria-label="Interviews by state">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>
                {label} <span className="num app-tab-count">{rows ? counts[key] ?? 0 : ""}</span>
              </button>
            ))}
          </div>

          {!rows ? (
            <Skeleton rows={6} />
          ) : visible.length === 0 ? (
            <p className="app-empty" style={{ marginTop: 12 }}>
              {tab === "upcoming" ? "No interviews coming up. Schedule one from an applicant." : tab === "report" ? "Every finished interview has its report sent." : `No ${tab} interviews.`}
            </p>
          ) : (
            <table className="app-table" style={{ marginTop: 4 }}>
              <thead>
                <tr>
                  <th scope="col">Candidate</th>
                  <th scope="col">Job</th>
                  {isOwner && <th scope="col">Interviewer</th>}
                  <th scope="col" className="num">
                    When
                  </th>
                  <th scope="col">State</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => (
                  <tr key={i._id}>
                    <td>
                      <div className="app-row-title">{i.studentId?.fullname ?? "Candidate"}</div>
                      <div className="app-row-sub">{i.studentId?.email}</div>
                    </td>
                    <td className="app-meta">{i.jobId?.title ?? "—"}</td>
                    {isOwner && <td className="app-meta">{i.recruiterId?.fullname ?? "—"}</td>}
                    <td className="num app-meta">{when(i.scheduledAt)}</td>
                    <td>
                      <span className={`app-pill ${i.state.pill ?? ""}`}>{i.state.label}</span>
                    </td>
                    <td className="app-row-actions">
                      {isOwner ? (
                        i.state.key === "owner" ? (
                          <Link className="app-btn app-btn-primary app-btn-sm" to={`/ceo/reports/${i._id}`}>
                            Decide
                          </Link>
                        ) : (
                          i.state.key !== "cancelled" && (
                            <Link className="app-link" to={`/interview/${i._id}/scorecard`}>
                              Scorecard
                            </Link>
                          )
                        )
                      ) : (
                        <>
                          {joinable(i, i.state, now) && (
                            <Link className="app-btn app-btn-primary app-btn-sm" to={`/interview/${i._id}/video`}>
                              Join
                            </Link>
                          )}
                          {i.state.key === "report" ? (
                            <Link className="app-btn app-btn-sm" to={`/interview/${i._id}/scorecard`}>
                              Finish report
                            </Link>
                          ) : (
                            i.state.key !== "cancelled" && (
                              <Link className="app-link" to={`/interview/${i._id}/scorecard`}>
                                Scorecard
                              </Link>
                            )
                          )}
                          {["scheduled", "missed"].includes(i.state.key) && (
                            <>
                              <button type="button" className="app-link" onClick={() => setChange({ interview: i, mode: "reschedule", when: localNow(), reason: "" })}>
                                Reschedule
                              </button>
                              <button type="button" className="app-link" onClick={() => setChange({ interview: i, mode: "cancel", reason: "" })}>
                                Cancel
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="bg-[#141414] border-0 text-white">
          {form && (
            <form onSubmit={schedule} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Schedule an interview</DialogTitle>
              </DialogHeader>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Candidate
                <select
                  required
                  value={form.applicationId}
                  onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
                  className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal"
                >
                  <option value="">Choose an applicant</option>
                  {schedulable.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.applicant?.fullname} · {a.job?.title}
                    </option>
                  ))}
                </select>
                {schedulable.length === 0 && <span className="font-normal text-[#b4b4b4]">Everyone who can be interviewed already has an interview.</span>}
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Date and time
                <input
                  required
                  type="datetime-local"
                  min={localNow()}
                  value={form.scheduledAt}
                  onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal [color-scheme:dark]"
                />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={form.video} onChange={(e) => setForm((f) => ({ ...f, video: e.target.checked }))} className="w-4 h-4 accent-white" />
                Video call in HIRE.OS, with the copilot and scorecard
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Message to the candidate <span className="font-normal text-[#949494]">Optional</span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="rounded-lg bg-[#0a0a0a] border border-[#444] p-3 font-normal"
                />
              </label>
              <DialogFooter>
                <button type="submit" disabled={saving} className="h-9 px-4 rounded-full bg-white text-black font-medium disabled:opacity-60">
                  {saving ? "Scheduling…" : "Schedule and invite"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!change} onOpenChange={(open) => !open && setChange(null)}>
        <DialogContent className="bg-[#141414] border-0 text-white">
          {change && (
            <form onSubmit={applyChange} className="flex flex-col gap-4">
              <DialogHeader>
                <DialogTitle>
                  {change.mode === "reschedule" ? "Reschedule" : "Cancel"} the interview with {change.interview.studentId?.fullname ?? "the candidate"}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-[#b4b4b4]">
                Currently {when(change.interview.scheduledAt)}. The candidate is notified{change.mode === "cancel" ? ", and a cancelled interview can't be restored" : ""}.
              </p>
              {change.mode === "reschedule" && (
                <label className="flex flex-col gap-2 text-sm font-medium">
                  New date and time
                  <input
                    required
                    type="datetime-local"
                    min={localNow()}
                    value={change.when}
                    onChange={(e) => setChange((c) => ({ ...c, when: e.target.value }))}
                    className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal [color-scheme:dark]"
                  />
                </label>
              )}
              <label className="flex flex-col gap-2 text-sm font-medium">
                Reason, shown to the candidate
                <input
                  required
                  maxLength={300}
                  value={change.reason}
                  onChange={(e) => setChange((c) => ({ ...c, reason: e.target.value }))}
                  className="h-10 rounded-lg bg-[#0a0a0a] border border-[#444] px-3 font-normal"
                />
              </label>
              <DialogFooter>
                <button
                  type="submit"
                  disabled={saving}
                  className={`h-9 px-4 rounded-full font-medium disabled:opacity-60 ${change.mode === "cancel" ? "border border-[#444] text-[#e5566f]" : "bg-white text-black"}`}
                >
                  {saving ? "Saving…" : change.mode === "reschedule" ? "Move the interview" : "Cancel the interview"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InterviewsList;
