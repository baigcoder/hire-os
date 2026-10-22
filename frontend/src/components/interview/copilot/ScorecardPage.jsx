import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ListChecks, Sparkles, RefreshCw, MessageSquareText } from "lucide-react";
import { Button } from "../../ui/button";
import { copilotApi } from "@/copilot/api";
import { useCopilot } from "@/copilot/useCopilot";

const RECOMMENDATIONS = [
  { value: "strong_no", label: "Strong no" },
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
  { value: "strong_yes", label: "Strong yes" },
];

const COVERAGE_LABEL = { covered: "Covered", partial: "Partly covered", not_covered: "Not covered" };

const Card = ({ children }) => <section className="bg-[#111111] border border-white/10 rounded-md p-5">{children}</section>;

/** One competency: rubric, AI draft with quotes, and the recruiter's rating. */
const CompetencyCard = ({ c, onRate }) => {
  const [notes, setNotes] = useState(c.rating?.notes ?? "");
  useEffect(() => setNotes(c.rating?.notes ?? ""), [c.rating?.notes]);
  const draft = c.aiDraft;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="font-bold">
          {c.title}
          <span className="ml-2 text-[10px] font-mono uppercase tracking-wider text-gray-500">{c.kind === "must" ? "must-have" : "nice-to-have"}</span>
        </h3>
        <span className="text-xs text-gray-500">{COVERAGE_LABEL[c.coverage?.status ?? "not_covered"]}</span>
      </div>
      <p className="text-sm text-gray-400 mb-4">{c.description}</p>

      <div className="grid gap-2 sm:grid-cols-4 mb-4" role="radiogroup" aria-label={`Your rating for ${c.title}`}>
        {[1, 2, 3, 4].map((n) => {
          const active = c.rating?.value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${n}: ${c.rubric?.[n] ?? ""}`}
              onClick={() => onRate(c.id, active ? null : n, notes)}
              className={`text-left rounded-sm border p-2 transition-colors ${
                active ? "border-[#FFD700] bg-[#FFD700]/10" : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className={`font-mono font-bold ${active ? "text-[#FFD700]" : "text-gray-300"}`}>{n}</div>
              <div className="text-[11px] text-gray-400 leading-snug">{c.rubric?.[n]}</div>
            </button>
          );
        })}
      </div>

      {draft && (draft.rating || draft.rationale) && (
        <div className="rounded-sm border border-blue-400/20 bg-blue-400/5 p-3 mb-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">
            <Sparkles className="w-3 h-3" /> AI draft {draft.rating ? `· ${draft.rating}/4` : "· no rating"}
            {draft.rating && draft.rating !== c.rating?.value && (
              <button type="button" onClick={() => onRate(c.id, draft.rating, notes)} className="ml-auto normal-case tracking-normal text-blue-200 hover:underline">
                Use {draft.rating}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-300">{draft.rationale}</p>
          {draft.evidence?.map((e) => (
            <p key={e.quote} className="text-sm italic text-gray-400 mt-1">“{e.quote}”</p>
          ))}
        </div>
      )}

      {c.coverage?.evidence?.length > 0 && !draft?.evidence?.length && (
        <div className="mb-3">
          {c.coverage.evidence.map((e) => (
            <p key={e.quote} className="text-sm italic text-gray-400">“{e.quote}”</p>
          ))}
        </div>
      )}

      <label className="block">
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Your notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (c.rating?.notes ?? "") && onRate(c.id, c.rating?.value ?? null, notes)}
          rows={2}
          maxLength={2000}
          className="mt-1 w-full rounded-sm bg-black/40 border border-white/10 p-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50"
        />
      </label>
    </Card>
  );
};

/**
 * Post-interview structured scorecard. The recruiter's ratings are the
 * record; AI drafts are suggestions shown next to their quoted evidence.
 */
const ScorecardPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, refresh, rate } = useCopilot({ interviewId: id, enabled: true });
  const [overall, setOverall] = useState({ recommendation: "", notes: "" });
  const [showTranscript, setShowTranscript] = useState(false);
  const card = data?.scorecard;

  useEffect(() => {
    if (card?.overall) setOverall({ recommendation: card.overall.recommendation ?? "", notes: card.overall.notes ?? "" });
  }, [card?.overall?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRate = async (competencyId, value, notes) => {
    try {
      await rate(competencyId, value, notes);
    } catch {
      toast.error("Couldn't save that rating");
      refresh();
    }
  };

  const saveOverall = async () => {
    try {
      await copilotApi.overall(id, overall);
      toast.success("Recommendation saved");
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Couldn't save");
    }
  };

  const draftNow = async () => {
    try {
      await copilotApi.draft(id);
      toast.info("Drafting ratings from the transcript…");
      refresh();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Couldn't start the draft");
    }
  };

  const rated = (card?.competencies ?? []).filter((c) => c.rating?.value).length;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-['Space_Grotesk',sans-serif]">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-[#FFD700]" /> Interview scorecard
          </h1>
          {card?.status === "ready" && (
            <Button
              variant="outline"
              onClick={draftNow}
              disabled={card.draft?.status === "queued"}
              className="border-white/10 rounded-sm text-xs uppercase tracking-wider"
            >
              {card.draft?.status === "queued" ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
              {card.draft?.status === "ready" ? "Redraft from transcript" : "Draft from transcript"}
            </Button>
          )}
        </div>

        {!data && !error && <p className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}
        {error && <p className="text-gray-400">{error}</p>}
        {card?.status === "generating" && <p className="flex items-center gap-2 text-gray-400"><Loader2 className="w-4 h-4 animate-spin" /> Building the scorecard from the job…</p>}
        {card?.status === "failed" && <p className="text-red-400">The scorecard couldn&apos;t be built: {card.error}</p>}
        {card?.draft?.note && <p className="text-sm text-gray-500">{card.draft.note}</p>}

        {card?.status === "ready" && (
          <>
            <p className="text-sm text-gray-500">
              Rate each competency against its anchors. AI drafts are suggestions based on quotes from the transcript; your rating is the one that&apos;s recorded. {rated}/{card.competencies.length} rated.
            </p>
            {card.competencies.map((c) => (
              <CompetencyCard key={c.id} c={c} onRate={onRate} />
            ))}

            <Card>
              <h2 className="text-xs font-mono uppercase tracking-wider text-[#FFD700] mb-3">Overall recommendation</h2>
              <div className="flex flex-wrap gap-2 mb-3" role="radiogroup" aria-label="Overall recommendation">
                {RECOMMENDATIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={overall.recommendation === r.value}
                    onClick={() => setOverall((o) => ({ ...o, recommendation: r.value }))}
                    className={`px-3 py-1.5 rounded-sm border text-sm ${
                      overall.recommendation === r.value ? "border-[#FFD700] bg-[#FFD700]/10 text-[#FFD700]" : "border-white/10 text-gray-300 hover:border-white/30"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <textarea
                value={overall.notes}
                onChange={(e) => setOverall((o) => ({ ...o, notes: e.target.value }))}
                rows={3}
                maxLength={4000}
                aria-label="Overall notes"
                placeholder="Why, in a few sentences, tied to the competencies above."
                className="w-full rounded-sm bg-black/40 border border-white/10 p-2 text-sm text-white focus:outline-none focus:border-[#FFD700]/50 mb-3"
              />
              <Button
                onClick={saveOverall}
                disabled={!overall.recommendation}
                className="bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold rounded-sm uppercase tracking-wider text-xs"
              >
                Save recommendation
              </Button>
            </Card>

            <Card>
              <button
                type="button"
                onClick={() => setShowTranscript((s) => !s)}
                aria-expanded={showTranscript}
                className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-400"
              >
                <MessageSquareText className="w-4 h-4" /> Transcript ({data.transcript.length} lines)
              </button>
              {showTranscript && (
                <div className="mt-3 space-y-2 max-h-[60vh] overflow-y-auto text-sm">
                  {data.transcript.map((s) => (
                    <p key={s._id}>
                      <span className={s.speaker === "candidate" ? "text-[#00FF94]" : "text-blue-300"}>
                        {s.speaker === "candidate" ? "Candidate" : "Interviewer"}:
                      </span>{" "}
                      <span className="text-gray-300">{s.text}</span>
                    </p>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ScorecardPage;
