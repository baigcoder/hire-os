import { STATUS } from "./reportModel";

/** Shared pieces of the candidate report and the recruiter screening view. */

export const Section = ({ icon: Icon, title, children, aside }) => (
  <section className="bg-[#111111] border border-white/10 rounded-md p-5">
    <div className="flex items-center justify-between mb-4">
      <h3 className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-[#FFD700]">
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      {aside}
    </div>
    {children}
  </section>
);

export const Evidence = ({ evidence, labels }) =>
  evidence?.length ? (
    <ul className="mt-2 space-y-1">
      {evidence.map((e, i) => (
        <li key={`${e.itemId}-${i}`} className="text-xs text-gray-400">
          <span className="text-gray-500">
            {labels.get(e.itemId) || e.itemId}:
          </span>{" "}
          <span className="italic">“{e.quote}”</span>
        </li>
      ))}
    </ul>
  ) : null;

/** Requirement checklist with status, rationale and quoted evidence. */
export const RequirementList = ({ requirements, matches, labels }) => {
  const byId = new Map((matches || []).map((m) => [m.requirementId, m]));
  return (
    <ul className="divide-y divide-white/5">
      {requirements.map((req) => {
        const match = byId.get(req.id) || { status: "missing" };
        const { icon: Icon, label, className } = STATUS[match.status];
        return (
          <li key={req.id} className="py-3 flex gap-3">
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${className}`} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-200">{req.text}</span>
                <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-400">
                  {req.kind === "must" ? "Required" : "Nice to have"}
                </span>
                <span className={`text-xs ${className}`}>{label}</span>
              </div>
              {match.rationale && (
                <p className="text-xs text-gray-500 mt-1">{match.rationale}</p>
              )}
              <Evidence evidence={match.evidence} labels={labels} />
            </div>
          </li>
        );
      })}
    </ul>
  );
};
