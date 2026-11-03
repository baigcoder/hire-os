/**
 * Recruiter's live integrity state: a server-sent-event stream for instant
 * updates plus a poll as the source of truth (the stream is per instance,
 * so on serverless it may miss events — the poll never does).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { integrityApi, streamIntegrity } from "./api";

const POLL_MS = 5000;
const RECONNECT_MS = 5000;

export const useIntegrityLive = ({ interviewId, enabled }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const refreshTimer = useRef(null);

  const refresh = useCallback(async () => {
    if (!interviewId) return;
    try {
      setSnapshot(await integrityApi.get(interviewId));
      setError(null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  }, [interviewId]);

  const refreshSoon = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refresh, 400);
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !interviewId) return undefined;
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    const controller = new AbortController();
    let reconnect;

    const connect = () => {
      streamIntegrity(interviewId, {
        signal: controller.signal,
        onEvent: (event, data) => {
          setStreaming(true);
          if (event === "update" && data.risk) {
            // Show the new score at once; the full snapshot follows
            setSnapshot((s) => (s ? { ...s, risk: { ...s.risk, ...data.risk } } : s));
          }
          if (event !== "snapshot") refreshSoon();
        },
      })
        .catch(() => {})
        .finally(() => {
          setStreaming(false);
          if (!controller.signal.aborted) reconnect = setTimeout(connect, RECONNECT_MS);
        });
    };
    connect();

    return () => {
      controller.abort();
      clearInterval(poll);
      clearTimeout(reconnect);
      clearTimeout(refreshTimer.current);
    };
  }, [enabled, interviewId, refresh, refreshSoon]);

  return { snapshot, streaming, error, refresh };
};
