/**
 * Per-interview call configuration from the API: ICE servers (with
 * short-lived TURN credentials when a provider is configured) and the
 * private Realtime channel token. Falls back to public STUN and the legacy
 * public channel if the API can't be reached, so the call still works.
 */
import { useEffect, useState } from "react";
import api from "@/utils/api";

export const FALLBACK_ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];

const fallback = (interviewId) => ({
  topic: `interview:${interviewId}`,
  ice: { iceServers: FALLBACK_ICE_SERVERS, relay: false, provider: null },
  realtime: { privateChannels: false },
  fallback: true,
});

export const fetchCallConfig = (interviewId) =>
  api.get(`/realtime/interviews/${interviewId}/call-config`).then((r) => r.data);

/** @returns {{ status: "loading"|"ready"|"denied", config: object|null }} */
export const useCallConfig = (interviewId) => {
  const [state, setState] = useState(
    interviewId ? { status: "loading", config: null } : { status: "ready", config: fallback("dev") },
  );

  useEffect(() => {
    if (!interviewId) return undefined;
    let cancelled = false;
    setState({ status: "loading", config: null });
    fetchCallConfig(interviewId)
      .then((config) => !cancelled && setState({ status: "ready", config }))
      .catch((error) => {
        if (cancelled) return;
        const status = error?.response?.status;
        // Not a participant, or cancelled: don't join any channel
        if (status === 404 || status === 409) setState({ status: "denied", config: null });
        else setState({ status: "ready", config: fallback(interviewId) });
      });
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  return state;
};
