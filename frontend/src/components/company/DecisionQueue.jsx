import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserCheck, Loader2, ChevronDown, ChevronUp, FileText, AlertTriangle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import api from "@/utils/api";
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

  if (items === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 p-6">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading decisions…
      </div>
    );
  }

  return (
    <section className="relative p-6 bg-[#111111] border border-orange-500/30 rounded-sm" aria-label="Awaiting your decision">
      <div className="flex items-center gap-3 mb-1">
        <UserCheck className="w-5 h-5 text-orange-500" />
        <h3 className="text-lg font-bold text-white">Awaiting your decision</h3>
        <span className="bg-orange-500 text-black text-xs font-bold rounded-sm px-2">{items.length}</span>
      </div>
      <p className="text-gray-500 text-sm mb-5">Final hiring decisions sent to you by your recruiters.</p>

      {items.length === 0 && <p className="text-sm text-gray-500">Nothing waiting. You&apos;re all caught up.</p>}

      <ul className="space-y-3">
        {items.map((item) => {
          const expanded = open === item.applicationId;
          const viaReport = item.source === "interview_report";
          return (
            <li key={item.applicationId} className="bg-white/5 rounded-sm border border-white/5">
              <button
                type="button"
                onClick={() => {
                  setOpen(expanded ? null : item.applicationId);
                  setNotes("");
                }}
                aria-expanded={expanded}
                className="w-full flex items-center gap-4 p-4 text-left"
              >
                <Avatar className="w-10 h-10 rounded-sm">
                  <AvatarImage src={item.candidate.photo} />
                  <AvatarFallback className="bg-orange-500/10 text-orange-400 rounded-sm font-bold">
                    {item.candidate.name?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-white font-semibold">{item.candidate.name}</span>
                    {item.onHold && <span className="text-[10px] font-mono uppercase text-amber-400 border border-amber-500/30 rounded-sm px-1">on hold</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.job} · {item.recruiter ? `from ${item.recruiter}` : "from a recruiter"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {viaReport ? (
                    <>
                      <div className="text-sm text-white">{RECOMMENDATION[item.report.recommendation] ?? item.report.recommendation}</div>
                      <div className="text-[11px] font-mono text-gray-500">
                        scorecard {item.report.overallScore ?? "—"}
                        {item.report.overallScore != null && "/100"}
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] font-mono uppercase text-gray-500">no interview report</div>
                  )}
                </div>
                {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                  {viaReport ? (
                    <>
                      {item.report.structured ? (
                        <StructuredReport report={item.report.structured} variant="dark" interviewId={item.interviewId} />
                      ) : (
                        <p className="text-sm text-gray-300">{item.report.summary}</p>
                      )}
                      <Link to={`/ceo/reports/${item.interviewId}`} className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline">
                        <FileText className="w-3.5 h-3.5" /> Open the full report
                      </Link>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Passed to you without a structured interview, so there&apos;s no scorecard or interview evidence.
                      </div>
                      {item.recruiterNotes && (
                        <div>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500 mb-1">Recruiter notes</div>
                          <p className="text-sm text-gray-300">{item.recruiterNotes}</p>
                        </div>
                      )}
                      {item.candidate.skills?.length > 0 && (
                        <p className="text-xs text-gray-500">Skills: {item.candidate.skills.slice(0, 12).join(", ")}</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor={`notes-${item.applicationId}`} className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                      Note for the recruiter (optional)
                    </label>
                    <textarea
                      id={`notes-${item.applicationId}`}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      maxLength={2000}
                      className="w-full rounded-sm bg-black/30 border border-white/10 p-2 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={busy} onClick={() => decide(item, "approved")} className="bg-[#00FF94] hover:bg-[#00FF94]/80 text-black rounded-sm font-bold text-xs uppercase tracking-wider">
                        {viaReport ? "Approve" : "Hire"}
                      </Button>
                      {!item.onHold && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(item, "on_hold")} className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 rounded-sm text-xs uppercase tracking-wider">
                          Hold
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(item, "rejected")} className="border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-sm text-xs uppercase tracking-wider">
                        Reject
                      </Button>
                      {busy && <Loader2 className="w-4 h-4 animate-spin text-gray-500 self-center" />}
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default DecisionQueue;
