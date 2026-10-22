import { CheckCircle, AlertTriangle, ListChecks, ShieldCheck, ArrowRight } from "lucide-react";

/**
 * The evidence-based interview report (finalReport.structured), shown to the
 * recruiter before sending and to the CEO when deciding. Numbers come from
 * the interviewer's own ratings; quotes are what the candidate actually said.
 */
const THEMES = {
  dark: {
    card: "bg-[#111] border border-white/10",
    muted: "text-gray-500",
    body: "text-gray-300",
    strong: "text-white",
    quote: "text-gray-400",
    rowBorder: "border-white/5",
  },
  light: {
    card: "bg-white border border-gray-200",
    muted: "text-gray-500",
    body: "text-gray-700",
    strong: "text-gray-900",
    quote: "text-gray-500",
    rowBorder: "border-gray-100",
  },
};

const RECOMMENDATION = {
  STRONGLY_RECOMMEND: { label: "Strongly recommend", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  RECOMMEND: { label: "Recommend", className: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  CONSIDER: { label: "Consider", className: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  NOT_RECOMMENDED: { label: "Not recommended", className: "bg-red-500/10 text-red-500 border-red-500/30" },
};

const SOURCE = {
  recruiter: "the interviewer's overall call",
  scorecard: "the scorecard ratings (no overall call was made)",
  insufficient_data: "too little data to recommend either way",
};

const PRIORITY = { routine: "Routine", review: "Worth a review", priority_review: "Priority review" };

const Section = ({ t, title, icon: Icon, children }) => (
  <section className={`${t.card} rounded-md p-4`}>
    <h3 className={`flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider mb-3 ${t.muted}`}>
      <Icon className="w-3.5 h-3.5" /> {title}
    </h3>
    {children}
  </section>
);

const Rating = ({ value, t }) =>
  value == null ? <span className={t.muted}>—</span> : <span className={`font-mono font-bold ${t.strong}`}>{value}/4</span>;

const StructuredReport = ({ report, variant = "dark", interviewId, hideGaps = false }) => {
  const t = THEMES[variant] ?? THEMES.dark;
  const facts = report.facts ?? {};
  const scorecard = facts.scorecard ?? { competencies: [] };
  const rec = RECOMMENDATION[report.recommendation] ?? RECOMMENDATION.CONSIDER;
  const titleOf = new Map(scorecard.competencies.map((c) => [c.id, c.title]));

  return (
    <div className="space-y-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${t.card} rounded-md p-4`}>
          <div className={`text-[10px] font-mono uppercase tracking-wider ${t.muted}`}>Recommendation</div>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-sm border text-xs font-bold ${rec.className}`}>{rec.label}</span>
          <div className={`text-[11px] mt-1 ${t.muted}`}>From {SOURCE[report.recommendationSource] ?? "the report"}</div>
        </div>
        <div className={`${t.card} rounded-md p-4`}>
          <div className={`text-[10px] font-mono uppercase tracking-wider ${t.muted}`}>Scorecard</div>
          <div className={`text-2xl font-mono font-bold ${t.strong}`}>
            {report.overallScore ?? "—"}
            {report.overallScore != null && <span className={`text-sm ${t.muted}`}>/100</span>}
          </div>
          <div className={`text-[11px] ${t.muted}`}>
            {scorecard.rated}/{scorecard.total} rated by the interviewer
          </div>
        </div>
        <div className={`${t.card} rounded-md p-4`}>
          <div className={`text-[10px] font-mono uppercase tracking-wider ${t.muted}`}>Other signals</div>
          <div className={`text-xs space-y-0.5 mt-1 ${t.body}`}>
            <div>MCQ: {facts.mcq ? `${facts.mcq.percentage}%` : "not taken"}</div>
            <div>Resume screen: {facts.resumeScreening ? `${facts.resumeScreening.overall}/100` : "—"}</div>
            <div>Integrity: {facts.integrity?.reviewPriority ? PRIORITY[facts.integrity.reviewPriority] : facts.integrity ? "no report" : "not monitored"}</div>
          </div>
        </div>
      </div>

      {!hideGaps && report.gaps?.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600">
          Before this can go to the CEO: {report.gaps.map((g) => (g.type === "no_overall" ? "give an overall recommendation" : `rate “${g.title}”`)).join(", ")}.
        </div>
      )}

      <section className={`${t.card} rounded-md p-4`}>
        <p className={`leading-relaxed ${t.body}`}>{report.summary}</p>
        {report.narrativeSource === "rules" && (
          <p className={`text-[11px] mt-2 ${t.muted}`}>Written from the ratings without the AI (it was unavailable or its draft didn&apos;t pass the checks).</p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section t={t} title="Strengths" icon={CheckCircle}>
          {report.strengths?.length ? (
            <ul className="space-y-3">
              {report.strengths.map((s, i) => (
                <li key={i}>
                  <div className={t.body}>{s.text}</div>
                  <div className={`text-[11px] ${t.muted}`}>{titleOf.get(s.competencyId)}</div>
                  {s.evidence?.map((e) => (
                    <div key={e.quote} className={`text-xs italic mt-0.5 ${t.quote}`}>“{e.quote}”</div>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className={t.muted}>None recorded.</p>
          )}
        </Section>
        <Section t={t} title="Concerns" icon={AlertTriangle}>
          {report.concerns?.length ? (
            <ul className="space-y-2">
              {report.concerns.map((c, i) => (
                <li key={i}>
                  <div className={t.body}>{c.text}</div>
                  {c.competencyId && <div className={`text-[11px] ${t.muted}`}>{titleOf.get(c.competencyId)}</div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={t.muted}>None recorded.</p>
          )}
        </Section>
      </div>

      {scorecard.competencies.length > 0 && (
        <Section t={t} title="Scorecard" icon={ListChecks}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className={`text-left text-[10px] uppercase tracking-wider ${t.muted}`}>
                  <th className="py-1 pr-3 font-normal">Competency</th>
                  <th className="py-1 pr-3 font-normal">Interviewer</th>
                  <th className="py-1 pr-3 font-normal">AI draft</th>
                  <th className="py-1 font-normal">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {scorecard.competencies.map((c) => (
                  <tr key={c.id} className={`border-t ${t.rowBorder} align-top`}>
                    <td className={`py-2 pr-3 ${t.body}`}>
                      {c.title}
                      {c.kind === "must" && <span className={`ml-1 text-[9px] uppercase ${t.muted}`}>must</span>}
                      {c.ratingNotes && <div className={`text-[11px] mt-0.5 ${t.muted}`}>{c.ratingNotes}</div>}
                    </td>
                    <td className="py-2 pr-3"><Rating value={c.rating} t={t} /></td>
                    <td className={`py-2 pr-3 ${t.muted}`}>{c.aiDraft != null ? `${c.aiDraft}/4` : "—"}</td>
                    <td className={`py-2 italic ${t.quote}`}>{c.quotes?.[0] ? `“${c.quotes[0].quote}”` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {scorecard.overallNotes && <p className={`text-xs mt-3 ${t.body}`}>Interviewer: {scorecard.overallNotes}</p>}
        </Section>
      )}

      {facts.integrity?.summary && (
        <Section t={t} title="Interview integrity" icon={ShieldCheck}>
          <p className={`text-xs ${t.body}`}>{facts.integrity.summary}</p>
          <p className={`text-[11px] mt-1 ${t.muted}`}>Monitoring signals are for review, not findings of misconduct.</p>
          {interviewId && (
            <a href={`/interview/${interviewId}/integrity`} className="text-xs text-blue-500 hover:underline">
              Open integrity report
            </a>
          )}
        </Section>
      )}

      {report.nextSteps?.length > 0 && (
        <Section t={t} title="Next steps" icon={ArrowRight}>
          <ul className={`list-disc pl-5 space-y-1 text-xs ${t.body}`}>
            {report.nextSteps.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </Section>
      )}
    </div>
  );
};

export default StructuredReport;
