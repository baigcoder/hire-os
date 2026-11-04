import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, ShieldCheck, AlertTriangle, MessageSquareWarning } from "lucide-react";
import { Button } from "../../ui/button";
import { integrityApi } from "@/integrity/api";
import { PRIORITY_STYLES, signalLabel } from "@/integrity/labels";

const RELIABILITY = {
  reliable: { label: "Reliable", className: "text-accent" },
  partially_reliable: { label: "Partially reliable", className: "text-primary" },
  unreliable: { label: "Unreliable", className: "text-red-400" },
};
const STRENGTH = { weak: "text-gray-400", moderate: "text-primary", strong: "text-orange-400" };

const Card = ({ title, children }) => (
  <section className="bg-card border border-white/10 rounded-md p-5">
    <h2 className="text-xs text-primary mb-3">{title}</h2>
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
  const [live, setLive] = useState(null);
  const [dispute, setDispute] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const summary = await integrityApi.get(id);
      setRole(summary.role);
      setLive(summary);
      // No report yet while the interview runs; the live card covers that
      const data = await integrityApi.getReport(id).catch((error) => {
        if (error?.response?.status === 404) return { status: "none" };
        throw error;
      });
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

  // Poll while the report is being generated, or while monitoring is live
  const monitoring = role === "recruiter" && live?.status === "active";
  useEffect(() => {
    if (state.status !== "queued" && !monitoring) return undefined;
    const timer = setInterval(load, monitoring ? 5000 : 4000);
    return () => clearInterval(timer);
  }, [state.status, monitoring, load]);

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
    <div className="min-h-screen bg-background text-white">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Interview integrity report
          </h1>
          {role === "recruiter" && state.status && state.status !== "queued" && (
            <Button variant="outline" onClick={regenerate} className="border-white/10 rounded-sm text-xs">
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
        {monitoring && (
          <Card title="Live monitoring">
            <div className="flex flex-wrap items-baseline gap-4 mb-3">
              <span className="text-3xl font-bold">{live.risk?.score ?? 0}</span>
              <span className="text-xs text-gray-400">
                risk now · peak {live.risk?.peak ?? 0}/100 ·{" "}
                {live.candidateDetector?.alive ? "candidate's monitoring is running" : (
                  <span className="text-red-300">candidate&apos;s monitoring is silent</span>
                )}
              </span>
            </div>
            {live.recent?.length ? (
              <ul className="space-y-1 text-sm" aria-live="polite">
                {live.recent.map((e) => (
                  <li key={`${e.type}-${e.at}`} className="flex justify-between gap-3 border-t border-white/5 pt-1">
                    <span className={e.kind === "tamper" ? "text-red-300" : "text-gray-200"}>{e.label}</span>
                    <span className="text-xs text-gray-500">{new Date(e.at).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No signals so far.</p>
            )}
          </Card>
        )}
        {!state.loading && !state.error && state.status === "none" && !monitoring && (
          <p className="text-gray-400">No report yet. It&apos;s generated when the interview ends.</p>
        )}

        {report && (
          <>
            <Card title="Summary">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {priority && (
                  <span className={`text-xs px-2 py-1 rounded-sm border font-bold ${priority.className}`}>
                    {priority.label}
                  </span>
                )}
                {reliability && (
                  <span className="text-xs text-gray-400">
                    Monitoring: <span className={reliability.className}>{reliability.label}</span>
                  </span>
                )}
                <span className="text-xs text-gray-500">
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
                        <span className={`text-xs ${STRENGTH[o.strength]}`}>{o.strength}</span>
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
                      <span className="text-gray-500 text-xs">×{t.count}{t.at ? ` from ${t.at}` : ""}</span>
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
                      <tr className="text-left text-xs text-gray-500">
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
                            {s.expected && <span className="ml-2 text-xs text-gray-500">(expected)</span>}
                            {s.confirmedByRecruiterSide && <span className="ml-2 text-xs text-blue-300">both sides</span>}
                          </td>
                          <td className="py-1.5 pr-3 text-gray-300">{s.counted}</td>
                          <td className="py-1.5 pr-3 text-gray-300">{s.totalSeconds}s</td>
                          <td className="py-1.5 text-xs text-gray-500">{s.at.join(", ")}</td>
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
              <blockquote key={d.at} className="border-l-2 border-primary/40 pl-3 text-sm text-gray-300 mb-3">
                {d.text}
                <div className="text-xs text-gray-500 mt-1">{new Date(d.at).toLocaleString()}</div>
              </blockquote>
            ))}
            {role === "candidate" && (state.disputes?.length ?? 0) < 5 && (
              <form onSubmit={submitDispute} className="space-y-2">
                <label htmlFor="dispute" className="flex items-center gap-2 text-sm text-gray-300">
                  <MessageSquareWarning className="w-4 h-4 text-primary" /> Something here wrong or missing context?
                </label>
                <textarea
                  id="dispute"
                  value={dispute}
                  onChange={(e) => setDispute(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="w-full rounded-sm bg-black/40 border border-white/10 p-3 text-sm text-white focus:outline-none focus:border-primary/50"
                  placeholder="For example: I looked down at my notes because the interviewer asked me to check a number."
                />
                <Button
                  type="submit"
                  disabled={sending || dispute.trim().length < 10}
                  className="bg-primary hover:bg-primary/90 text-black font-bold rounded-sm text-xs"
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
