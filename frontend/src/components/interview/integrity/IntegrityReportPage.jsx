import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck, AlertTriangle, MessageSquareWarning } from "lucide-react";
import { Button } from "../../ui/button";
import { integrityApi } from "@/integrity/api";
import { PRIORITY_STYLES, signalLabel } from "@/integrity/labels";

const RELIABILITY = {
  reliable: { label: "Reliable", className: "text-[#00FF94]" },
  partially_reliable: { label: "Partially reliable", className: "text-[#FFD700]" },
  unreliable: { label: "Unreliable", className: "text-red-400" },
};
const STRENGTH = { weak: "text-gray-400", moderate: "text-[#FFD700]", strong: "text-orange-400" };

const Card = ({ title, children }) => (
  <section className="bg-[#111111] border border-white/10 rounded-md p-5">
    <h2 className="text-xs font-mono uppercase tracking-wider text-[#FFD700] mb-3">{title}</h2>
    {children}
  </section>
);

/**
 * Post-interview integrity report. Recruiters see it to review; the
 * candidate sees the same report and can dispute it, which regenerates
 * the report with their explanation included.
 */
const IntegrityReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true });
  const [role, setRole] = useState(null);
  const [dispute, setDispute] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summary, data] = await Promise.all([integrityApi.get(id), integrityApi.getReport(id)]);
      setRole(summary.role);
      setState({ loading: false, ...data });
    } catch (error) {
      setState({
        loading: false,
        error: error?.response?.status === 404 ? "There's no integrity report for this interview yet." : "Couldn't load the report.",
      });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while the report is being generated
  useEffect(() => {
    if (state.status !== "queued") return undefined;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [state.status, load]);

  const regenerate = async () => {
    try {
      await integrityApi.requestReport(id);
      setState((s) => ({ ...s, status: "queued" }));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Couldn't queue the report");
    }
  };

  const submitDispute = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await integrityApi.dispute(id, dispute);
      setDispute("");
      toast.success("Your explanation was added. The report will be updated.");
      setState((s) => ({ ...s, status: "queued" }));
    } catch (error) {
      toast.error(error?.response?.data?.message || "Couldn't send your explanation");
    } finally {
      setSending(false);
    }
  };

  const report = state.report;
  const priority = report && PRIORITY_STYLES[report.reviewPriority];
  const reliability = report && RELIABILITY[report.monitoringReliability?.level];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#FFD700]" /> Interview integrity report
          </h1>
          {role === "recruiter" && state.status && state.status !== "queued" && (
            <Button variant="outline" onClick={regenerate} className="border-white/10 rounded-sm text-xs uppercase tracking-wider">
              <RefreshCw className="w-3.5 h-3.5 mr-2" /> {report ? "Regenerate" : "Generate"}
            </Button>
          )}
        </div>

        {state.loading && (
          <p className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        )}
        {state.error && <p className="text-gray-400">{state.error}</p>}
        {state.status === "queued" && (
          <p className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> The report is being prepared…
          </p>
        )}
        {state.status === "failed" && <p className="text-red-400">The report couldn&apos;t be generated. Try again.</p>}
        {!state.loading && !state.error && state.status === "none" && (
          <p className="text-gray-400">No report yet. It&apos;s generated when the interview ends.</p>
        )}

        {report && (
          <>
            <Card title="Summary">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {priority && (
                  <span className={`text-xs px-2 py-1 rounded-sm border font-bold uppercase tracking-wider ${priority.className}`}>
                    {priority.label}
                  </span>
                )}
                {reliability && (
                  <span className="text-xs text-gray-400">
                    Monitoring: <span className={reliability.className}>{reliability.label}</span>
                  </span>
                )}
                <span className="text-xs text-gray-500 font-mono">
                  {report.facts?.durationMinutes} min · peak {report.facts?.risk?.peak}/100
                </span>
              </div>
              <p className="text-sm text-gray-200 leading-relaxed">{report.summary}</p>
              {report.monitoringReliability?.reasons?.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-gray-400 list-disc pl-5">
                  {report.monitoringReliability.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </Card>

            {report.observations?.length > 0 && (
              <Card title="Observations">
                <ul className="space-y-4">
                  {report.observations.map((o) => (
                    <li key={o.signal}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{signalLabel(o.signal)}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-mono ${STRENGTH[o.strength]}`}>{o.strength}</span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{o.observed}</p>
                      {o.possibleBenignExplanations?.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">Could also be: {o.possibleBenignExplanations.join("; ")}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {report.facts?.tamper?.length > 0 && (
              <Card title="Monitoring issues">
                <ul className="space-y-1 text-sm">
                  {report.facts.tamper.map((t) => (
                    <li key={t.flag} className="flex items-center gap-2 text-red-300">
                      <AlertTriangle className="w-4 h-4" /> {t.label}
                      <span className="text-gray-500 font-mono text-xs">×{t.count}{t.at ? ` from ${t.at}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {report.facts?.signals?.length > 0 && (
              <Card title="All signals">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500">
                        <th className="py-1 pr-3 font-normal">Signal</th>
                        <th className="py-1 pr-3 font-normal">Counted</th>
                        <th className="py-1 pr-3 font-normal">Time</th>
                        <th className="py-1 font-normal">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.facts.signals.map((s) => (
                        <tr key={s.signal} className="border-t border-white/5">
                          <td className="py-1.5 pr-3">
                            {s.label}
                            {s.expected && <span className="ml-2 text-[10px] text-gray-500">(expected)</span>}
                            {s.confirmedByRecruiterSide && <span className="ml-2 text-[10px] text-blue-300">both sides</span>}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-gray-300">{s.counted}</td>
                          <td className="py-1.5 pr-3 font-mono text-gray-300">{s.totalSeconds}s</td>
                          <td className="py-1.5 font-mono text-xs text-gray-500">{s.at.join(", ")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {report.suggestedFollowUps?.length > 0 && role === "recruiter" && (
              <Card title="Suggested follow-ups">
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                  {report.suggestedFollowUps.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </Card>
            )}

            <p className="text-xs text-gray-500">{report.disclaimer}</p>
          </>
        )}

        {(state.disputes?.length > 0 || role === "candidate") && !state.loading && !state.error && (
          <Card title="Candidate's explanation">
            {state.disputes?.map((d) => (
              <blockquote key={d.at} className="border-l-2 border-[#FFD700]/40 pl-3 text-sm text-gray-300 mb-3">
                {d.text}
                <div className="text-[10px] text-gray-500 mt-1">{new Date(d.at).toLocaleString()}</div>
              </blockquote>
            ))}
            {role === "candidate" && (state.disputes?.length ?? 0) < 5 && (
              <form onSubmit={submitDispute} className="space-y-2">
                <label htmlFor="dispute" className="flex items-center gap-2 text-sm text-gray-300">
                  <MessageSquareWarning className="w-4 h-4 text-[#FFD700]" /> Something here wrong or missing context?
                </label>
                <textarea
                  id="dispute"
                  value={dispute}
                  onChange={(e) => setDispute(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-sm bg-black/40 border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
                  placeholder="For example: I looked down at my notes because the interviewer asked me to check a number."
                />
                <Button
                  type="submit"
                  disabled={sending || dispute.trim().length < 10}
                  className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold rounded-sm uppercase tracking-wider text-xs"
                >
                  {sending && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />} Add my explanation
                </Button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default IntegrityReportPage;
