import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import ResumeAnalyzer from "../ResumeAnalyzer";
import ResumeIntelligence from "./ResumeIntelligence";
import { fetchCapabilities } from "./useResumeAnalysis";

const CLASSIC_KEY = "resumeAnalyzer.classic";

const readClassicPreference = () => {
  try {
    return localStorage.getItem(CLASSIC_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Shows the Resume Intelligence pipeline when a background worker is
 * running, and the classic analyzer otherwise (or if the user prefers it).
 */
const ResumeAnalyzerGate = () => {
  const [available, setAvailable] = useState(null);
  const [classic, setClassic] = useState(readClassicPreference);

  useEffect(() => {
    let cancelled = false;
    fetchCapabilities()
      .then((caps) => !cancelled && setAvailable(Boolean(caps.available)))
      .catch(() => !cancelled && setAvailable(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = (useClassic) => {
    setClassic(useClassic);
    try {
      localStorage.setItem(CLASSIC_KEY, useClassic ? "1" : "0");
    } catch {
      /* preference just won't persist */
    }
  };

  if (available === null) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#FFD700] animate-spin" />
      </div>
    );
  }

  if (!available || classic) {
    return (
      <div className="space-y-3">
        {available && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => choose(false)}
              className="text-xs text-[#FFD700] hover:underline"
            >
              Try the new Resume Intelligence
            </button>
          </div>
        )}
        <ResumeAnalyzer />
      </div>
    );
  }

  return <ResumeIntelligence onUseClassic={() => choose(true)} />;
};

export default ResumeAnalyzerGate;
