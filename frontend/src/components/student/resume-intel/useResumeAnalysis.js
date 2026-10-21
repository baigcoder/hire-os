import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { RESUME_INTEL_API_END_POINT } from "@/utils/constant";

const api = axios.create({
  baseURL: RESUME_INTEL_API_END_POINT,
  withCredentials: true,
});

export const errorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

export const fetchCapabilities = () =>
  api.get("/capabilities").then((r) => r.data);

export const fetchHistory = () =>
  api.get("/analyses").then((r) => r.data.analyses);

export const deleteAnalysis = (id) => api.delete(`/analyses/${id}`);

/**
 * Start and follow one analysis. Progress arrives over Server-Sent Events;
 * if the stream can't be opened (proxies, old browsers) it falls back to
 * polling every 2s.
 */
export const useResumeAnalysis = () => {
  const [analysisId, setAnalysisId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle|submitting|queued|running|completed|failed
  const [stages, setStages] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const pollRef = useRef(null);

  const stopFollowing = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
    clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  useEffect(() => stopFollowing, [stopFollowing]);

  const loadReport = useCallback(async (id) => {
    const { data } = await api.get(`/analyses/${id}`);
    const analysis = data.analysis;
    setReport(analysis);
    setStages(analysis.stages || []);
    setStatus(analysis.status);
    if (analysis.status === "failed") setError(analysis.error?.message);
    return analysis;
  }, []);

  const follow = useCallback(
    (id) => {
      stopFollowing();
      const finish = () => {
        stopFollowing();
        loadReport(id).catch((e) =>
          setError(errorMessage(e, "Could not load the report.")),
        );
      };

      const poll = () => {
        pollRef.current = setInterval(async () => {
          try {
            const analysis = await loadReport(id);
            if (["completed", "failed"].includes(analysis.status)) finish();
          } catch {
            /* keep polling; transient errors are expected */
          }
        }, 2000);
      };

      if (typeof EventSource === "undefined") return poll();

      const source = new EventSource(
        `${RESUME_INTEL_API_END_POINT}/analyses/${id}/events`,
        { withCredentials: true },
      );
      streamRef.current = source;
      let received = false;
      source.addEventListener("progress", (event) => {
        received = true;
        const data = JSON.parse(event.data);
        setStatus(data.status);
        setStages(data.stages || []);
        if (data.error && data.status !== "failed") {
          setError(`${data.error.message} Retrying…`);
        }
      });
      source.addEventListener("done", finish);
      source.onerror = () => {
        // The server closes the stream every ~25s and EventSource
        // reconnects on its own; only fall back if it never worked.
        if (!received) {
          source.close();
          streamRef.current = null;
          poll();
        }
      };
    },
    [loadReport, stopFollowing],
  );

  /** formData: "resume" file or "resumeText", plus optional jobDescription/jobId */
  const start = useCallback(
    async (formData) => {
      setError(null);
      setReport(null);
      setStages([]);
      setStatus("submitting");
      try {
        const { data } = await api.post("/analyses", formData);
        setAnalysisId(data.analysisId);
        if (data.status === "completed") {
          await loadReport(data.analysisId);
        } else {
          setStatus(data.status);
          follow(data.analysisId);
        }
        return data;
      } catch (e) {
        setStatus("idle");
        setError(errorMessage(e, "Could not start the analysis."));
        throw e;
      }
    },
    [follow, loadReport],
  );

  const open = useCallback(
    async (id) => {
      setError(null);
      setAnalysisId(id);
      const analysis = await loadReport(id);
      if (!["completed", "failed"].includes(analysis.status)) follow(id);
    },
    [follow, loadReport],
  );

  const reset = useCallback(() => {
    stopFollowing();
    setAnalysisId(null);
    setStatus("idle");
    setStages([]);
    setReport(null);
    setError(null);
  }, [stopFollowing]);

  return { analysisId, status, stages, report, error, start, open, reset };
};
