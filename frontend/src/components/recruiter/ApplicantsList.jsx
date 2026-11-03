import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Search } from "lucide-react";
import api from "@/utils/api";
import { Skeleton, ErrorBlock, plural, daysAgo } from "../app/blocks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";

const TABS = [
  ["all", "All"],
  ["new", "New"],
  ["shortlisted", "Shortlisted"],
  ["interviewing", "Interviewing"],
  ["decision", "With owner"],
  ["offer", "Offer"],
  ["hired", "Hired"],
  ["closed", "Closed"],
];
const STAGE_LABEL = Object.fromEntries(TABS);
STAGE_LABEL.new = "New";
const STAGE_PILL = { interviewing: "app-pill-positive", decision: "app-pill-warning", offer: "app-pill-positive", hired: "app-pill-positive" };
// Bulk actions the backend accepts; each moves the selection to one stage
const BULK = [
  ["review", "Mark reviewed"],
  ["shortlist", "Shortlist"],
  ["interview", "Move to interview"],
  ["reject", "Reject"],
];
// A candidate can go straight to the owner only before or during interviews
const CAN_PASS = ["new", "shortlisted", "interviewing"];
const PAGE = 50;
const DAY = 864e5;

/** Every applicant to the company's jobs. Its question: who do I move forward next? */
const ApplicantsList = () => {
  const { user } = useSelector((s) => s.auth);
  const isRecruiter = user?.role === "recruiter";
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("new");
  const [query, setQuery] = useState("");
  const [jobId, setJobId] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const [pass, setPass] = useState(null); // the application being passed to the owner

  const load = useCallback(async () => {
    setError(false);
    try {
      const res = await api.get("/application/company");
      setRows(res.data.applications ?? []);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const jobs = useMemo(() => {
    const m = new Map();
    for (const a of rows ?? []) if (a.job?._id) m.set(a.job._id, a.job.title);
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  // Counts follow the job filter and the search, so each tab says what it holds
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (a) =>
        (jobId === "all" || a.job?._id === jobId) &&
        (!q || a.applicant?.fullname?.toLowerCase().includes(q) || a.applicant?.email?.toLowerCase().includes(q)),
    );
  }, [rows, jobId, query]);
  const counts = useMemo(() => {
    const c = { all: scoped.length };
    for (const a of scoped) c[a.stage] = (c[a.stage] ?? 0) + 1;
    return c;
  }, [scoped]);
  const visible = useMemo(() => {
    const list = tab === "all" ? scoped : scoped.filter((a) => a.stage === tab);
    // New applicants oldest first (they've waited longest); everything else newest first
    return tab === "new" ? [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) : list;
  }, [scoped, tab]);

  useEffect(() => {
    setSelected(new Set());
    setShown(PAGE);
  }, [tab, jobId, query]);

  const now = Date.now();
  const waiting = (rows ?? []).filter((a) => a.stage === "new");
  const oldest = waiting.reduce((d, a) => Math.max(d, Math.floor((now - new Date(a.createdAt)) / DAY)), 0);
  const page = visible.slice(0, shown);
  const allOnPage = page.length > 0 && page.every((a) => selected.has(a._id));

  const toggle = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(page.map((a) => a._id)));

  const runBulk = async (action, label) => {
    const ids = [...selected];
    if (action === "reject" && !window.confirm(`Reject ${plural(ids.length, "applicant")}? They'll see their application as closed.`)) return;
    setBusy(true);
    try {
      const res = await api.post("/application/bulk-update", { applicationIds: ids, action });
      const { updated = 0, skipped = 0 } = res.data;
      toast.success(`${label}: ${plural(updated, "applicant")}${skipped ? `, ${skipped} with the owner or further along left as they are` : ""}`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Couldn't update the applicants");
    } finally {
      setBusy(false);
    }
  };

  const sendToOwner = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/application/${pass.app._id}/pass-to-ceo`, { notes: pass.notes });
      toast.success(`${pass.app.applicant?.fullname} is with the owner for a decision`);
      setPass(null);
      await load();
    } catch (err) {
      // e.g. USE_INTERVIEW_REPORT: interviewed candidates go through their report
      toast.error(err.response?.data?.message || "Couldn't send to the owner");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="app-title-row">
        <div>
          <h1 className="app-h1">Applicants</h1>
          <p className="app-finding">
            {!rows ? (
              <Skeleton w={280} h={14} />
            ) : waiting.length ? (
              <>
                <strong>{plural(waiting.length, "applicant")}</strong> waiting for review, the oldest for <strong>{daysAgo(oldest).toLowerCase()}</strong>.
              </>
            ) : (
              "No one is waiting for review."
            )}
          </p>
        </div>
      </div>

      {error ? (
        <ErrorBlock what="applicants" onRetry={load} />
      ) : (
        <section className="app-panel" aria-label="Applicants">
          <div className="app-toolbar">
            <label className="app-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Search applicants</span>
              <input type="search" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <select className="app-select" value={jobId} onChange={(e) => setJobId(e.target.value)} aria-label="Job">
              <option value="all">All jobs</option>
              {jobs.map(([id, title]) => (
                <option key={id} value={id}>
                  {title}
                </option>
              ))}
            </select>
          </div>

          <div className="app-tabs" role="tablist" aria-label="Stage">
            {TABS.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>
                {label} <span className="num app-tab-count">{rows ? counts[key] ?? 0 : ""}</span>
              </button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="app-bulkbar" role="region" aria-label="Bulk actions">
              <span>{plural(selected.size, "selected", "selected")}</span>
              {BULK.map(([action, label]) => (
                <button key={action} type="button" className={`app-btn app-btn-sm ${action === "reject" ? "app-btn-danger" : ""}`} disabled={busy} onClick={() => runBulk(action, label)}>
                  {label}
                </button>
              ))}
              <button type="button" className="app-link app-bulk-clear" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </div>
          )}

          {!rows ? (
            <Skeleton rows={8} />
          ) : visible.length === 0 ? (
            <p className="app-empty" style={{ marginTop: 12 }}>
              {query || jobId !== "all" ? "No applicants match these filters." : tab === "new" ? "No one is waiting for review." : `No applicants are ${STAGE_LABEL[tab]?.toLowerCase() ?? ""} right now.`}
            </p>
          ) : (
            <>
              <table className="app-table app-table-select">
                <thead>
                  <tr>
                    <th scope="col" className="app-check-col">
                      <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={toggleAll} />
                    </th>
                    <th scope="col">Applicant</th>
                    <th scope="col">Job</th>
                    <th scope="col">Stage</th>
                    <th scope="col" className="num">
                      Screening
                    </th>
                    <th scope="col" className="num">
                      Applied
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.map((a) => {
                    const days = Math.floor((now - new Date(a.createdAt)) / DAY);
                    return (
                      <tr key={a._id} className={selected.has(a._id) ? "is-selected" : ""}>
                        <td className="app-check-col">
                          <input type="checkbox" aria-label={`Select ${a.applicant?.fullname}`} checked={selected.has(a._id)} onChange={() => toggle(a._id)} />
                        </td>
                        <td>
                          <div className="app-row-title">{a.applicant?.fullname ?? "Applicant"}</div>
                          <div className="app-row-sub">{a.applicant?.email}</div>
                        </td>
                        <td className="app-meta">{a.job?.title ?? "—"}</td>
                        <td>
                          <span className={`app-pill ${STAGE_PILL[a.stage] ?? ""}`}>{STAGE_LABEL[a.stage]}</span>
                        </td>
                        <td className="num">
                          {a.screening?.overall != null ? (
                            <>
                              {Math.round(a.screening.overall)}
                              <span className="app-meta">/100</span>
                            </>
                          ) : (
                            <span className="app-meta">—</span>
                          )}
                        </td>
                        <td className="num">
                          <span className={a.stage === "new" && days >= 7 ? "" : "app-meta"}>{daysAgo(days)}</span>
                        </td>
                        <td className="app-row-actions">
                          {a.job?._id && (
                            <Link className="app-link" to={isRecruiter ? `/recruiter/job/${a.job._id}/applications` : `/admin/jobs/${a.job._id}/applicants`}>
                              Open
                            </Link>
                          )}
                          {a.interviewId && (
                            <Link className="app-link" to={`/interview/${a.interviewId}/scorecard`}>
                              Scorecard
                            </Link>
                          )}
                          {isRecruiter && CAN_PASS.includes(a.stage) && !a.interviewId && (
                            <button type="button" className="app-link" onClick={() => setPass({ app: a, notes: "" })}>
                              Send to owner
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="app-table-foot">
                <span className="app-meta num">
                  1–{page.length} of {visible.length}
                </span>
                {page.length < visible.length && (
                  <button type="button" className="app-btn app-btn-sm" onClick={() => setShown((n) => n + PAGE)}>
                    Show {Math.min(PAGE, visible.length - page.length)} more
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      <Dialog open={!!pass} onOpenChange={(open) => !open && setPass(null)}>
        <DialogContent className="bg-[#141414] border-0 text-white">
          {pass && (
            <form onSubmit={sendToOwner}>
              <DialogHeader>
                <DialogTitle>Send {pass.app.applicant?.fullname} to the owner</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-[#b4b4b4] mt-2">
                Without an interview there&apos;s no scorecard, so the owner decides on your notes. Candidates who were interviewed go through their report instead.
              </p>
              <label className="flex flex-col gap-2 text-sm font-medium mt-4">
                Your notes for the owner
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={4}
                  aria-label="Your notes for the owner"
                  value={pass.notes}
                  onChange={(e) => setPass((p) => ({ ...p, notes: e.target.value }))}
                  className="rounded-lg bg-[#0a0a0a] border border-[#444] p-3 font-normal"
                />
              </label>
              <DialogFooter className="mt-4">
                <button type="submit" disabled={busy} className="h-9 px-4 rounded-full bg-white text-black font-medium disabled:opacity-60">
                  {busy ? "Sending…" : "Send to owner"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ApplicantsList;
