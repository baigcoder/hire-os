import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Radio,
  Loader2,
  FileText,
} from "lucide-react";
import { integrityApi } from "@/integrity/api";
import { BAND_STYLES, SIGNAL_LABELS, signalLabel } from "@/integrity/labels";

const fmtClock = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const fmtSilence = (ms) => (ms == null ? "never reported" : ms < 60_000 ? `${Math.round(ms / 1000)}s ago` : `${Math.round(ms / 60_000)} min ago`);

const Dot = ({ ok, warn }) => (
  <span
    aria-hidden="true"
    className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? "bg-[#00FF94]" : warn ? "bg-[#FFD700]" : "bg-red-500"}`}
  />
);

const CONSENT_TEXT = {
  awaiting_consent: "Waiting for the candidate to accept monitoring",
  declined: "The candidate declined monitoring",
  ended: "Monitoring ended",
};

/**
 * Recruiter's live integrity panel: decayed risk score, detector health on
 * both sides, tamper flags, the alert feed with evidence, and per-signal
 * "expected for this candidate" toggles.
 */
const IntegrityMeter = ({ interviewId, snapshot, streaming, verifier }) => {
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(null);

  if (!snapshot) {
    return (
      <div className="bg-[#111111]/95 backdrop-blur-md border border-white/10 rounded-md p-3 text-xs text-gray-400 flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" /> Loading integrity monitor…
      </div>
    );
  }

  const risk = snapshot.risk ?? { score: 0, band: "low", peak: 0 };
  const band = BAND_STYLES[risk.band] ?? BAND_STYLES.low;
  const active = snapshot.status === "active";
  const tamper = snapshot.tamperFlags ?? [];
  const expected = new Set(snapshot.expectedSignals ?? []);
  const totals = Object.entries(snapshot.aggregates ?? {})
    .filter(([type, a]) => SIGNAL_LABELS[type] && (a.counted ?? 0) > 0)
    .sort((a, b) => (b[1].points ?? 0) - (a[1].points ?? 0));
  const cand = snapshot.candidateDetector ?? {};

  const openEvidence = async (evidenceId) => {
    // Open the tab synchronously so popup blockers allow it
    // ("noopener" would make window.open return null, so detach manually)
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = await integrityApi.evidenceUrl(interviewId, evidenceId);
      if (tab) tab.location.href = url;
      else window.open(url, "_blank", "noopener");
    } catch {
      tab?.close();
      toast.error("Couldn't open that evidence frame");
    }
  };

  const toggleExpected = async (signal) => {
    setBusy(signal);
    try {
      await integrityApi.annotate(interviewId, { signal, expected: !expected.has(signal) });
      toast.success(expected.has(signal) ? "Signal counts again" : "Marked as expected for this candidate");
    } catch {
      toast.error("Couldn't update that signal");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-label="Interview integrity"
      className="bg-[#111111]/95 backdrop-blur-md border border-white/10 rounded-md text-white text-xs"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-3"
      >
        <span className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px] text-gray-300">
          {tamper.length ? (
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFD700]" />
          )}
          Integrity
          {streaming && (
            <span className="flex items-center gap-1 text-[#00FF94] font-mono normal-case tracking-normal">
              <Radio className="w-3 h-3" /> live
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {active && (
            <span className={`font-mono font-bold ${band.text}`}>
              {risk.score}
              <span className="text-gray-500 font-normal">/100</span>
            </span>
          )}
          {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 max-h-[55vh] overflow-y-auto">
          {!active && <p className="text-gray-400">{CONSENT_TEXT[snapshot.status] ?? snapshot.status}</p>}

          {active && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className={`font-bold uppercase tracking-wider text-[10px] ${band.text}`}>{band.label}</span>
                <span className="text-gray-500 font-mono text-[10px]">peak {risk.peak ?? 0}</span>
              </div>
              <div
                className="h-1.5 bg-white/5 rounded-sm overflow-hidden"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={risk.score}
                aria-label="Current integrity signal level"
              >
                <div className={`h-full ${band.bar} transition-all duration-700`} style={{ width: `${risk.score}%` }} />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Recent signals, fading over ~90s. Observations for review, not verdicts.</p>
            </div>
          )}

          {snapshot.status !== "ended" && <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <Dot ok={cand.alive && cand.modelLoaded !== false} warn={cand.alive && cand.modelLoaded == null} />
              <span className="text-gray-300">Candidate detector</span>
              <span className="ml-auto text-gray-500 font-mono">
                {cand.alive
                  ? cand.modelLoaded === false
                    ? "no model"
                    : `${cand.fps ?? 0} fps`
                  : fmtSilence(cand.silentForMs)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Dot ok={verifier?.engine.status === "ready"} warn={verifier?.engine.status === "loading"} />
              <span className="text-gray-300">Your detector</span>
              <span className="ml-auto text-gray-500 font-mono">
                {verifier?.engine.status === "ready" ? `${verifier.sent} sent` : verifier?.engine.status ?? "off"}
              </span>
            </div>
          </div>}

          {tamper.length > 0 && (
            <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-2 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">Monitoring reliability</div>
              {tamper.map((t) => (
                <div key={t.type} className="flex justify-between gap-2 text-red-300">
                  <span>{signalLabel(t.type)}</span>
                  <span className="font-mono text-red-400/80">×{t.count}</span>
                </div>
              ))}
            </div>
          )}

          {snapshot.recent?.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Recent</div>
              <ul className="space-y-1">
                {snapshot.recent.slice(0, 8).map((e) => (
                  <li
                    key={`${e._id ?? e.type}-${e.at}`}
                    className={`flex items-center gap-2 rounded-sm px-2 py-1 border ${
                      e.kind === "tamper" ? "border-red-500/30 bg-red-500/5" : "border-white/5 bg-black/30"
                    }`}
                  >
                    <span className="truncate text-gray-200" title={e.detail || e.label || undefined}>
                      {signalLabel(e.type)}
                    </span>
                    {e.source === "recruiter" && (
                      <span className="text-[9px] px-1 rounded-sm bg-blue-500/20 text-blue-300 shrink-0">your side</span>
                    )}
                    {e.mismatch && (
                      <span className="text-[9px] px-1 rounded-sm bg-red-500/20 text-red-300 shrink-0">unmatched</span>
                    )}
                    <span className="ml-auto font-mono text-[10px] text-gray-500 shrink-0">{fmtClock(e.at)}</span>
                    {e.evidenceId && (
                      <button
                        type="button"
                        onClick={() => openEvidence(e.evidenceId)}
                        className="text-[#FFD700] hover:text-[#FFD700]/80 shrink-0"
                        aria-label="View evidence frame"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {totals.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Totals</div>
              <ul className="space-y-1">
                {totals.map(([type, a]) => (
                  <li key={type} className="flex items-center gap-2">
                    <span className={expected.has(type) ? "text-gray-500 line-through" : "text-gray-300"}>
                      {SIGNAL_LABELS[type]}
                    </span>
                    <span className="font-mono text-gray-500">
                      ×{a.counted} · {Math.round((a.totalMs ?? 0) / 1000)}s
                    </span>
                    <button
                      type="button"
                      disabled={busy === type}
                      onClick={() => toggleExpected(type)}
                      className="ml-auto text-[10px] text-gray-400 hover:text-white underline-offset-2 hover:underline disabled:opacity-50"
                      title="An accommodation: the signal is recorded but no longer raises the score"
                    >
                      {expected.has(type) ? "Count it" : "Expected"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {snapshot.status === "ended" && (
            <Link
              to={`/interview/${interviewId}/integrity`}
              className="flex items-center gap-2 text-[#FFD700] hover:underline"
            >
              <FileText className="w-3.5 h-3.5" /> Integrity report
              <span className="text-gray-500">({snapshot.report?.status ?? "none"})</span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
};

export default IntegrityMeter;
