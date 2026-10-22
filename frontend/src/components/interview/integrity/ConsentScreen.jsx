import { ShieldCheck, Check, X, Loader2, Info } from "lucide-react";
import { Button } from "../../ui/button";

/**
 * Shown to the candidate before the call. Lists exactly what is analyzed,
 * what isn't, retention, and that a human decides. Declining is allowed.
 */
const ConsentScreen = ({ phase, policy, error, onAccept, onDecline, onContinue }) => {
  const declined = phase === "declined";
  const starting = phase === "starting";

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-['Space_Grotesk',sans-serif]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="integrity-consent-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#111111] border border-white/10 rounded-md p-6 text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-sm bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#FFD700]" />
          </div>
          <div>
            <h2 id="integrity-consent-title" className="text-lg font-bold">
              Interview monitoring
            </h2>
            <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">
              Please read before joining
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-4">
          To keep interviews fair, this one uses automated monitoring. It runs in your browser
          while the call is live.
        </p>

        {policy ? (
          <>
            <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">What&apos;s analyzed</h3>
            <ul className="space-y-1.5 mb-4">
              {policy.analyzed.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-200">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#00FF94]" />
                  {item}
                </li>
              ))}
            </ul>
            <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">What isn&apos;t</h3>
            <ul className="space-y-1.5 mb-4">
              {policy.notAnalyzed.map((item) => (
                <li key={item} className="flex gap-2 text-sm text-gray-200">
                  <X className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 rounded-sm border border-white/10 bg-black/30 p-3 text-xs text-gray-400 mb-4">
              <Info className="w-4 h-4 shrink-0 text-gray-500" />
              <span>
                {policy.humanReview} Events and transcripts are kept {policy.retention.eventsDays} days
                and still frames {policy.retention.snapshotsDays} days.
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading the monitoring policy…
          </div>
        )}

        {declined && (
          <p className="text-sm text-[#FFD700] mb-4">
            You declined monitoring. The interviewer can see that it&apos;s off. You can still change your
            mind below.
          </p>
        )}
        {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onAccept}
            disabled={starting || !policy}
            className="flex-1 bg-[#FFD700] hover:bg-[#FFD700]/90 text-black font-bold rounded-sm uppercase tracking-wider"
          >
            {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            {starting ? "Starting…" : "I agree, start monitoring"}
          </Button>
          <Button
            variant="outline"
            onClick={declined ? onContinue : onDecline}
            disabled={starting}
            className="border-white/10 rounded-sm uppercase tracking-wider text-xs"
          >
            {declined ? "Join without monitoring" : "Decline"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsentScreen;
