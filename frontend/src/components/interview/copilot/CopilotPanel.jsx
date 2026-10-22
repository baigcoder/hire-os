import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Sparkles, Loader2, ChevronDown, ChevronRight, Mic, MicOff, ListChecks, MessageSquareText, FileText } from "lucide-react";
import { copilotApi } from "@/copilot/api";

const COVERAGE = {
  covered: { dot: "bg-[#00FF94]", label: "Covered" },
  partial: { dot: "bg-[#FFD700]", label: "Partly covered" },
  not_covered: { dot: "bg-white/20", label: "Not covered yet" },
};

const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const RatingButtons = ({ competency, onRate }) => (
  <div className="flex gap-1" role="radiogroup" aria-label={`Rate ${competency.title}`}>
    {[1, 2, 3, 4].map((n) => {
      const active = competency.rating?.value === n;
      return (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={active}
          title={competency.rubric?.[n]}
          aria-label={`${n}: ${competency.rubric?.[n] ?? ""}`}
          onClick={() => onRate(competency.id, active ? null : n)}
          className={`w-6 h-6 rounded-sm text-[11px] font-mono border transition-colors ${
            active ? "bg-[#FFD700] text-black border-[#FFD700]" : "border-white/10 text-gray-400 hover:border-[#FFD700]/50 hover:text-white"
          }`}
        >
          {n}
        </button>
      );
    })}
  </div>
);

/**
 * Live interviewer copilot: suggested follow-ups, scorecard coverage with
 * 1–4 ratings, and the running transcript. Suggestions are prompts for the
 * interviewer, never automatic decisions.
 */
const CopilotPanel = ({ interviewId, copilot, transcriber }) => {
  const { data, error, refresh, rate } = copilot;
  const [open, setOpen] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [asking, setAsking] = useState(false);
  const transcriptEnd = useRef(null);

  const card = data?.scorecard;
  const transcript = data?.transcript ?? [];
  // Newest suggestion per competency, up to three
  const suggestions = [];
  for (const s of [...(card?.suggestions ?? [])].reverse()) {
    if (suggestions.length === 3) break;
    if (!suggestions.some((x) => x.competencyId === s.competencyId)) suggestions.push(s);
  }
  const titleOf = new Map((card?.competencies ?? []).map((c) => [c.id, c.title]));

  useEffect(() => {
    if (showTranscript) transcriptEnd.current?.scrollIntoView({ block: "end" });
  }, [showTranscript, transcript.length]);

  const onRate = async (competencyId, value) => {
    try {
      await rate(competencyId, value);
    } catch {
      toast.error("Couldn't save that rating");
      refresh();
    }
  };

  const suggestNow = async () => {
    setAsking(true);
    try {
      await copilotApi.refresh(interviewId);
      setTimeout(refresh, 3000);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Copilot isn't ready yet");
    } finally {
      setAsking(false);
    }
  };

  if (!data) {
    return (
      <div className="p-4 text-xs text-gray-500 flex items-center gap-2">
        {error ? error : <><Loader2 className="w-3 h-3 animate-spin" /> Loading copilot…</>}
      </div>
    );
  }

  const covered = (card?.competencies ?? []).filter((c) => c.coverage?.status === "covered").length;

  return (
    <div className="flex-1 overflow-y-auto text-white text-xs">
      <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 text-[10px] font-mono text-gray-500">
        {transcriber?.status === "recording" ? (
          <span className="flex items-center gap-1 text-[#00FF94]"><Mic className="w-3 h-3" /> transcribing</span>
        ) : (
          <span className="flex items-center gap-1" title={data.transcription?.allowed ? "" : "Starts once the candidate accepts monitoring and transcription"}>
            <MicOff className="w-3 h-3" /> {data.transcriptionConfigured ? (data.transcription?.allowed ? "not recording" : "awaiting consent") : "transcription off"}
          </span>
        )}
        <span className="ml-auto">{transcript.length} lines</span>
      </div>

      {/* Follow-ups */}
      <section className="p-4 border-b border-white/5" aria-label="Suggested follow-ups">
        <div className="flex items-center justify-between mb-2">
          <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#FFD700]">
            <Sparkles className="w-3.5 h-3.5" /> Ask next
          </h3>
          <button
            type="button"
            onClick={suggestNow}
            disabled={asking || card?.status !== "ready"}
            className="text-[10px] text-gray-400 hover:text-white disabled:opacity-40"
          >
            {asking ? "Thinking…" : "Suggest now"}
          </button>
        </div>
        {card?.status === "generating" && (
          <p className="text-gray-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Building the scorecard from the job…</p>
        )}
        {card?.status === "failed" && <p className="text-red-400">The scorecard couldn&apos;t be built: {card.error}</p>}
        {card?.status === "ready" && suggestions.length === 0 && (
          <p className="text-gray-500">Suggestions appear once the candidate starts answering. Start with the probes below.</p>
        )}
        <ul className="space-y-2">
          {suggestions.map((s) => (
            <li key={s.id} className="rounded-sm border border-[#FFD700]/20 bg-[#FFD700]/5 p-2">
              <p className="text-gray-100 leading-relaxed">{s.question}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                {titleOf.get(s.competencyId) ?? s.competencyId} · {s.reason}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Scorecard */}
      {card?.status === "ready" && (
        <section className="p-4 border-b border-white/5" aria-label="Scorecard">
          <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            <ListChecks className="w-3.5 h-3.5" /> Scorecard
            <span className="ml-auto font-mono normal-case tracking-normal text-gray-500">
              {covered}/{card.competencies.length} covered
            </span>
          </h3>
          <ul className="space-y-1.5">
            {card.competencies.map((c) => {
              const cov = COVERAGE[c.coverage?.status ?? "not_covered"];
              const expanded = open === c.id;
              return (
                <li key={c.id} className="rounded-sm border border-white/5 bg-black/30">
                  <div className="flex items-center gap-2 p-2">
                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : c.id)}
                      aria-expanded={expanded}
                      aria-label={`${c.title}, ${cov.label}${c.kind === "nice" ? ", nice to have" : ""}`}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      {expanded ? <ChevronDown className="w-3 h-3 shrink-0 text-gray-500" /> : <ChevronRight className="w-3 h-3 shrink-0 text-gray-500" />}
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cov.dot}`} title={cov.label} aria-label={cov.label} />
                      <span className="truncate text-gray-200">{c.title}</span>
                      {c.kind === "nice" && <span className="text-[9px] text-gray-500 shrink-0">nice</span>}
                    </button>
                    <RatingButtons competency={c} onRate={onRate} />
                  </div>
                  {expanded && (
                    <div className="px-3 pb-3 space-y-2 text-[11px]">
                      <p className="text-gray-400">{c.description}</p>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Probes</div>
                        <ul className="list-disc pl-4 space-y-0.5 text-gray-300">
                          {c.probes.map((p) => <li key={p}>{p}</li>)}
                        </ul>
                      </div>
                      {c.coverage?.evidence?.length > 0 && (
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Heard so far</div>
                          {c.coverage.evidence.map((e) => (
                            <p key={e.quote} className="italic text-gray-300">“{e.quote}”</p>
                          ))}
                        </div>
                      )}
                      <div className="text-[10px] text-gray-500">Hover 1–4 for the rubric.</div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Link to={`/interview/${interviewId}/scorecard`} className="mt-3 flex items-center gap-1.5 text-[11px] text-[#FFD700] hover:underline">
            <FileText className="w-3.5 h-3.5" /> Full scorecard
          </Link>
        </section>
      )}

      {/* Transcript */}
      <section className="p-4" aria-label="Transcript">
        <button
          type="button"
          onClick={() => setShowTranscript((s) => !s)}
          aria-expanded={showTranscript}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400"
        >
          <MessageSquareText className="w-3.5 h-3.5" /> Transcript
          {showTranscript ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        {showTranscript && (
          <div className="mt-2 space-y-1.5 max-h-64 overflow-y-auto">
            {transcript.length === 0 && <p className="text-gray-500">Nothing transcribed yet.</p>}
            {transcript.slice(-60).map((s) => (
              <p key={s._id} className="leading-relaxed">
                <span className={s.speaker === "candidate" ? "text-[#00FF94]" : "text-blue-300"}>
                  {s.speaker === "candidate" ? "Candidate" : "You"}
                </span>{" "}
                <span className="text-[9px] font-mono text-gray-600">{fmtTime(s.startedAt)}</span>
                <br />
                <span className="text-gray-300">{s.text}</span>
              </p>
            ))}
            <div ref={transcriptEnd} />
          </div>
        )}
      </section>
    </div>
  );
};

export default CopilotPanel;
