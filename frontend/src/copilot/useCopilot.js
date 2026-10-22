/** Recruiter's copilot state (scorecard, suggestions, transcript), polled. */
import { useCallback, useEffect, useState } from "react";
import { copilotApi } from "./api";

const POLL_MS = 4000;

export const useCopilot = ({ interviewId, enabled }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!interviewId) return;
    try {
      setData(await copilotApi.get(interviewId));
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  }, [interviewId]);

  useEffect(() => {
    if (!enabled || !interviewId) return undefined;
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, interviewId, refresh]);

  /** Optimistically set a rating, then save it. */
  const rate = useCallback(
    async (competencyId, value, notes) => {
      setData((d) =>
        d?.scorecard
          ? {
              ...d,
              scorecard: {
                ...d.scorecard,
                competencies: d.scorecard.competencies.map((c) =>
                  c.id === competencyId ? { ...c, rating: { ...c.rating, value, ...(notes !== undefined && { notes }) } } : c,
                ),
              },
            }
          : d,
      );
      await copilotApi.rate(interviewId, competencyId, { value, notes });
    },
    [interviewId],
  );

  return { data, error, refresh, rate };
};
