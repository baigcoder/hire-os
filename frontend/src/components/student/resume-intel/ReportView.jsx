import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Copy,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../ui/badge";
import { Evidence, RequirementList, Section } from "./shared";
import { BAND_STYLES, buildItemLabels } from "./reportModel";
import CoachPanel from "./CoachPanel";
import JobsForYou from "./JobsForYou";

const ScoreHeader = ({ report }) => {
  const { score } = report;
  return (
    <div className="bg-[#111111] border border-white/10 rounded-md p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-bold font-mono text-white">
            {score.overall}
            <span className="text-lg text-gray-500">/100</span>
          </div>
          <div>
            <Badge className={`border ${BAND_STYLES[score.band]}`}>
              {score.band}
            </Badge>
            <p className="text-xs text-gray-500 mt-2">
              {score.mode === "job-match"
                ? `Match for ${report.job?.title || report.input?.jobTitle || "the target job"}`
                : "Overall resume strength"}
            </p>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {score.components.map((c) => (
            <div
              key={c.id}
              className="bg-[#0A0A0A] border border-white/5 rounded p-3"
            >
              <div className="flex justify-between text-xs text-gray-400 mb-2">
                <span>{c.label}</span>
                <span className="font-mono text-gray-300">
                  {c.points}/{c.weight}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FFD700]"
                  style={{ width: `${Math.round(c.value * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {report.critique?.summary && (
        <p className="text-gray-300 text-sm mt-5 leading-relaxed">
          {report.critique.summary}
        </p>
      )}
    </div>
  );
};

const Flags = ({ report }) => {
  const notes = [
    ...(report.flags || []).map((f) => ({ ...f, tone: "flag" })),
    ...(report.warnings || []).map((w) => ({ detail: w, tone: "warning" })),
  ];
  if (report.degraded) {
    notes.push({
      tone: "warning",
      detail:
        "Part of this analysis used a fallback AI model because the primary one was busy.",
    });
  }
  if (!notes.length) return null;
  return (
    <div className="space-y-2">
      {notes.map((n, i) => (
        <div
          key={i}
          className={`flex gap-3 rounded-md border p-3 text-sm ${
            n.tone === "flag"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-orange-500/30 bg-orange-500/10 text-orange-200"
          }`}
        >
          {n.tone === "flag" ? (
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{n.detail}</span>
        </div>
      ))}
    </div>
  );
};

const Requirements = ({ report, labels }) =>
  report.job?.requirements?.length ? (
    <Section icon={Target} title="Job requirements">
      <RequirementList
        requirements={report.job.requirements}
        matches={report.matches}
        labels={labels}
      />
    </Section>
  ) : null;

const Rewrites = ({ rewrites }) => {
  if (!rewrites?.length) return null;
  const copy = (text) =>
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast.success("Copied"))
      .catch(() => {});
  return (
    <Section icon={Sparkles} title="Suggested bullet rewrites">
      <div className="space-y-4">
        {rewrites.map((r) => (
          <div
            key={r.itemId}
            className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-start"
          >
            <p className="text-sm text-gray-500 bg-[#0A0A0A] border border-white/5 rounded p-3 line-through decoration-white/20">
              {r.before}
            </p>
            <ArrowRight className="hidden md:block w-4 h-4 text-gray-600 mt-3" />
            <div className="text-sm text-gray-200 bg-[#FFD700]/5 border border-[#FFD700]/20 rounded p-3">
              <p>{r.after}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-500">{r.why}</span>
                <button
                  type="button"
                  onClick={() => copy(r.after)}
                  className="text-xs text-[#FFD700] flex items-center gap-1 hover:underline"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-600 mt-3">
        Placeholders like [X%] mark numbers only you know — fill them in or
        remove them.
      </p>
    </Section>
  );
};

const AtsChecklist = ({ signals }) => (
  <Section
    icon={CheckCircle2}
    title="ATS checklist"
    aside={
      <span className="text-xs font-mono text-gray-400">
        {signals.ats.passed}/{signals.ats.total}
      </span>
    }
  >
    <ul className="grid sm:grid-cols-2 gap-2">
      {signals.ats.checks.map((c) => (
        <li key={c.id} className="flex items-start gap-2 text-sm">
          {c.passed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          )}
          <span className={c.passed ? "text-gray-300" : "text-gray-200"}>
            {c.label}
            {c.detail && <span className="text-gray-500"> · {c.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
    <div className="grid grid-cols-3 gap-3 mt-4 text-center">
      <Stat label="Years (from dates)" value={signals.experience.years} />
      <Stat
        label="Quantified bullets"
        value={`${signals.impact.quantified}/${signals.impact.bullets}`}
      />
      <Stat label="Skills found" value={signals.skills.length} />
    </div>
  </Section>
);

const Stat = ({ label, value }) => (
  <div className="bg-[#0A0A0A] border border-white/5 rounded p-3">
    <div className="text-lg font-mono text-white">{value}</div>
    <div className="text-[11px] text-gray-500">{label}</div>
  </div>
);

const ReportView = ({ report }) => {
  const labels = useMemo(
    () => buildItemLabels(report.profile),
    [report.profile],
  );
  const [showAllSkills, setShowAllSkills] = useState(false);
  const critique = report.critique || {};
  const skills = report.signals?.skills || [];

  return (
    <div className="space-y-4">
      <ScoreHeader report={report} />
      <Flags report={report} />
      <Requirements report={report} labels={labels} />

      <div className="grid lg:grid-cols-2 gap-4">
        {critique.strengths?.length > 0 && (
          <Section icon={CheckCircle2} title="Strengths">
            <ul className="space-y-3">
              {critique.strengths.map((s, i) => (
                <li key={i} className="text-sm text-gray-200">
                  {s.text}
                  <Evidence evidence={s.evidence} labels={labels} />
                </li>
              ))}
            </ul>
          </Section>
        )}
        {critique.gaps?.length > 0 && (
          <Section icon={AlertTriangle} title="Gaps to close">
            <ul className="space-y-3">
              {critique.gaps.map((g, i) => (
                <li key={i} className="text-sm">
                  <p className="text-gray-200">{g.text}</p>
                  <p className="text-xs text-gray-500 mt-1">{g.suggestion}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      <Rewrites rewrites={critique.rewrites} />

      <div className="grid lg:grid-cols-2 gap-4">
        {critique.quickWins?.length > 0 && (
          <Section icon={Zap} title="Quick wins (under 30 min)">
            <ul className="space-y-2 list-disc list-inside text-sm text-gray-300">
              {critique.quickWins.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </Section>
        )}
        {critique.interviewQuestions?.length > 0 && (
          <Section icon={MessageSquare} title="Likely interview questions">
            <ul className="space-y-3">
              {critique.interviewQuestions.map((q, i) => (
                <li key={i} className="text-sm">
                  <p className="text-gray-200">{q.question}</p>
                  <p className="text-xs text-gray-500 mt-1">{q.why}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {report.signals && <AtsChecklist signals={report.signals} />}

      {skills.length > 0 && (
        <Section icon={Target} title="Skills detected">
          <div className="flex flex-wrap gap-2">
            {(showAllSkills ? skills : skills.slice(0, 18)).map((s) => (
              <Badge
                key={s.name}
                title={
                  s.evidence.length
                    ? `Used in ${s.evidence.length} role(s)/project(s)`
                    : "Listed only"
                }
                className={`border ${
                  s.evidence.length
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-gray-400"
                }`}
              >
                {s.name}
              </Badge>
            ))}
          </div>
          {skills.length > 18 && (
            <button
              type="button"
              className="text-xs text-[#FFD700] mt-3 hover:underline"
              onClick={() => setShowAllSkills((v) => !v)}
            >
              {showAllSkills ? "Show fewer" : `Show all ${skills.length}`}
            </button>
          )}
          <p className="text-xs text-gray-600 mt-3">
            Green skills are backed by a role or project; grey ones are only
            listed.
          </p>
        </Section>
      )}

      {critique.learningPath?.length > 0 && (
        <Section icon={BookOpen} title="Learning path">
          <ul className="space-y-3">
            {critique.learningPath.map((l, i) => (
              <li key={i} className="text-sm">
                <span className="text-gray-200 font-medium">{l.skill}</span>
                <span className="text-gray-500"> — {l.why}</span>
                <p className="text-xs text-[#FFD700]/80 mt-1">{l.resource}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <JobsForYou />

      {report._id && <CoachPanel reportId={report._id} />}

      <p className="text-[11px] text-gray-600 text-center">
        The score ({report.score?.version}) is calculated from your
        resume&apos;s content, not by the AI.
        {report.grounding?.dropped > 0 &&
          ` ${report.grounding.dropped} AI claim(s) that couldn't be verified against your resume were removed.`}
      </p>
    </div>
  );
};

export default ReportView;
