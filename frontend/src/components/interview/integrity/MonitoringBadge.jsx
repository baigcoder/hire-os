import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

/**
 * What the candidate sees during the call: only whether monitoring is on.
 * Never scores or alerts (they'd invite gaming and add stress).
 */
const MonitoringBadge = ({ phase, engine }) => {
  if (phase === "unavailable" || phase === "checking" || phase === "ended") return null;
  const failed = engine?.status === "failed";
  const loading = phase === "starting" || engine?.status === "loading";

  let icon = <ShieldCheck className="w-3 h-3" />;
  let text = "Monitoring on";
  let tone = "bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/30";
  let title = "Automated monitoring is running in your browser. You'll be able to see the report after the interview.";
  if (phase === "declined" || phase === "needs_consent") {
    icon = <ShieldOff className="w-3 h-3" />;
    text = "Monitoring off";
    tone = "bg-white/5 text-gray-400 border-white/10";
    title = "You declined monitoring. The interviewer can see that it's off.";
  } else if (failed) {
    icon = <ShieldOff className="w-3 h-3" />;
    text = "Detection unavailable";
    tone = "bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30";
    title = "The face and object detector couldn't load in this browser. The interviewer will see this; other checks still run.";
  } else if (loading) {
    icon = <Loader2 className="w-3 h-3 animate-spin" />;
    text = "Starting monitoring";
  }

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono ${tone}`}
    >
      {icon}
      {text}
    </span>
  );
};

export default MonitoringBadge;
