import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import api from "@/utils/api";
import { Skeleton } from "../app/blocks";
import StructuredReport from "../interview/report/StructuredReport";

const RECOMMENDATION = {
  STRONGLY_RECOMMEND: "Strongly recommend",
  RECOMMEND: "Recommend",
  CONSIDER: "Consider",
  NOT_RECOMMENDED: "Not recommended",
};

/**
 * Everything awaiting the owner's final decision, in one list: candidates
 * sent with an evidence-based interview report, and candidates a recruiter
 * passed without a structured interview. One decision endpoint for both
 * (backend modules/hiring/ceoDecision.js).
 */
const DecisionQueue = ({ onDecided }) => {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/company/pending-approvals");
      setItems(res.data.pendingApprovals ?? []);
    } catch {
      setItems([]);
      toast.error("Couldn't load candidates awaiting your decision");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (item, decision) => {
    // Decisions are final; a rejection tells the candidate
    if (decision === "rejected" && !window.confirm(`Reject ${item.candidate.name} for ${item.job}? The candidate will be told, and this can't be undone.`)) return;
    setBusy(true);
    try {
      const res = await api.post(`/company/candidates/${item.applicationId}/approve`, { decision, comments: notes });
      toast.success(
        decision === "approved"
          ? item.source === "interview_report"
            ? "Approved. The recruiter will prepare the offer."
            : "Approved and marked as hired."
          : decision === "rejected"
            ? "Candidate rejected"
            : "Put on hold",
      );
      setOpen(null);
      setNotes("");
      await load();
      onDecided?.(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't record the decision");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="app-panel" aria-labelledby="queue-h">
      <div className="app-panel-head">
        <h2 className="app-h2" id="queue-h">
          Decisions
        </h2>
      </div>

      {items === null ? (
        <Skeleton rows={4} />
      ) : items.length === 0 ? (
        <p className="app-done">Nothing waiting on you.</p>
      ) : (
        <ul className="app-list">
          {items.map((item) => {
            const expanded = open === item.applicationId;
            const viaReport = item.source === "interview_report";
            return (
              <li key={item.applicationId} className="app-queue-item">
                <button
                  type="button"
                  className="app-row app-queue-row"
                  onClick={() => {
                    setOpen(expanded ? null : item.applicationId);
                    setNotes("");
                  }}
                  aria-expanded={expanded}
                >
                  <span className="app-row-main">
                    <span className="app-row-title" style={{ display: "block" }}>
                      {item.candidate.name}
                      {item.onHold && (
                        <span className="app-pill app-pill-warning" style={{ marginLeft: 8 }}>
                          On hold
                        </span>
                      )}
                    </span>
                    <span className="app-row-sub" style={{ display: "block" }}>
                      {item.job}
                    </span>
                  </span>
                  <span className="app-row-end">
                    <span style={{ display: "block", textAlign: "right" }}>
                      {viaReport ? (
                        <>
                          {RECOMMENDATION[item.report.recommendation] ?? item.report.recommendation}{" "}
                          <span className="app-meta num">{item.report.overallScore ?? "—"}</span>
                        </>
                      ) : (
                        <span className="app-meta">No interview</span>
                      )}
                    </span>
                    {expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                  </span>
                </button>

                {expanded && (
                  <div className="app-queue-detail">
                    {viaReport ? (
                      <>
                        {item.report.structured ? (
                          <StructuredReport report={item.report.structured} variant="dark" interviewId={item.interviewId} />
                        ) : (
                          <p>{item.report.summary}</p>
                        )}
                        <Link to={`/ceo/reports/${item.interviewId}`} className="app-link">
                          Open the full report
                        </Link>
                      </>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <p className="app-empty">Passed to you without a structured interview, so there&apos;s no scorecard or interview evidence.</p>
                        {item.recruiterNotes && (
                          <p style={{ margin: 0 }}>
                            <span className="app-meta">Recruiter&apos;s notes · </span>
                            {item.recruiterNotes}
                          </p>
                        )}
                        {item.candidate.skills?.length > 0 && (
                          <p className="app-meta" style={{ margin: 0 }}>
                            Skills: {item.candidate.skills.slice(0, 12).join(", ")}
                          </p>
                        )}
                      </div>
                    )}

                    <textarea
                      id={`notes-${item.applicationId}`}
                      aria-label="Note for the recruiter"
                      placeholder="Note for the recruiter"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      className="app-textarea"
                    />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button type="button" className="app-btn app-btn-primary" disabled={busy} onClick={() => decide(item, "approved")}>
                        {viaReport ? "Approve" : "Hire"}
                      </button>
                      {!item.onHold && (
                        <button type="button" className="app-btn" disabled={busy} onClick={() => decide(item, "on_hold")}>
                          Hold
                        </button>
                      )}
                      <button type="button" className="app-btn app-btn-danger" disabled={busy} onClick={() => decide(item, "rejected")}>
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default DecisionQueue;
