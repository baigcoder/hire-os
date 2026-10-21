import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SCREENING_API_END_POINT } from "@/utils/constant";
import {
  Evidence,
  RequirementList,
} from "@/components/student/resume-intel/shared";
import {
  BAND_STYLES,
  buildItemLabels,
} from "@/components/student/resume-intel/reportModel";

const api = axios.create({
  baseURL: SCREENING_API_END_POINT,
  withCredentials: true,
});
const HIDE_NAMES_KEY = "screening.hideNames";

const readHideNames = () => {
  try {
    return localStorage.getItem(HIDE_NAMES_KEY) !== "0";
  } catch {
    return true;
  }
};

const STATUS_LABEL = {
  queued: "Queued",
  running: "Screening…",
  failed: "Failed",
  no_resume: "No resume",
  not_screened: "Not screened",
};

const FLAG_LABEL = {
  prompt_injection: "Injection attempt",
  possible_prompt_injection: "Possible injection",
  keyword_stuffing: "Keyword stuffing",
};

const REDACTION_LABEL = {
  name: "name",
  email: "email",
  phone: "phone",
  link: "link",
  personal: "personal detail",
};

const ScreeningDetail = ({ screeningId }) => {
  const [screening, setScreening] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/${screeningId}`)
      .then((r) => setScreening(r.data.screening))
      .catch((e) =>
        setError(e.response?.data?.message || "Could not load the screening."),
      );
  }, [screeningId]);

  const labels = useMemo(
    () => buildItemLabels(screening?.profile),
    [screening],
  );

  if (error) return <p className="text-sm text-red-400 p-4">{error}</p>;
  if (!screening) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="w-5 h-5 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  const summary = screening.summary || {};
  const redactions = Object.entries(screening.redactions || {}).filter(
    ([, n]) => n > 0,
  );

  return (
    <div className="grid lg:grid-cols-2 gap-6 p-5 bg-[#0A0A0A] border-t border-white/5">
      <div>
        <h4 className="text-xs font-mono uppercase tracking-wider text-[#FFD700] mb-2">
          Requirements
        </h4>
        <RequirementList
          requirements={screening.job?.requirements || []}
          matches={screening.matches}
          labels={labels}
        />
      </div>
      <div className="space-y-5">
        {summary.summary && (
          <p className="text-sm text-gray-300">{summary.summary}</p>
        )}

        {summary.strengths?.length > 0 && (
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2">
              Strengths
            </h4>
            <ul className="space-y-2">
              {summary.strengths.map((s, i) => (
                <li key={i} className="text-sm text-gray-200">
                  {s.text}
                  <Evidence evidence={s.evidence} labels={labels} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.concerns?.length > 0 && (
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-orange-400 mb-2">
              Concerns
            </h4>
            <ul className="space-y-1 list-disc list-inside text-sm text-gray-300">
              {summary.concerns.map((c, i) => (
                <li key={i}>{c.text}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.interviewProbes?.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
              <MessageSquare className="w-3 h-3" /> Interview probes
            </h4>
            <ul className="space-y-2">
              {summary.interviewProbes.map((p, i) => (
                <li key={i} className="text-sm text-gray-200">
                  {p.question}
                  <Evidence evidence={p.evidence} labels={labels} />
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-[11px] text-gray-600 space-y-1">
          <p>
            Experience from dates: {screening.signals?.experience?.years ?? "?"}{" "}
            years · ATS checks {screening.signals?.ats?.passed}/
            {screening.signals?.ats?.total}
          </p>
          {redactions.length > 0 && (
            <p>
              Removed before AI scoring:{" "}
              {redactions
                .map(
                  ([k, n]) =>
                    `${n} ${REDACTION_LABEL[k] || k}${n > 1 ? "s" : ""}`,
                )
                .join(", ")}
              .
            </p>
          )}
          {screening.grounding?.matchDowngrades > 0 && (
            <p>
              {screening.grounding.matchDowngrades} AI match claim(s) without
              real evidence were marked missing.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Blind AI screening for one job: ranked applicants with verified evidence.
 * Names are hidden by default so the ranking is read on merit first.
 */
const ScreeningPanel = ({ jobId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [hideNames, setHideNames] = useState(readHideNames);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data: body } = await api.get(`/jobs/${jobId}`);
      setData(body);
      return body;
    } catch (e) {
      if (e.response?.status !== 403) {
        toast.error(
          e.response?.data?.message || "Could not load screening results.",
        );
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
    return () => clearInterval(pollRef.current);
  }, [load]);

  // Poll while screenings are in progress
  useEffect(() => {
    clearInterval(pollRef.current);
    if (data?.counts?.pending > 0) {
      pollRef.current = setInterval(load, 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [data?.counts?.pending, load]);

  const run = async (force = false) => {
    setRunning(true);
    try {
      const { data: body } = await api.post(`/jobs/${jobId}/run`, { force });
      toast.success(
        body.queued
          ? `Screening ${body.queued} applicant${body.queued > 1 ? "s" : ""}…`
          : "Every applicant is already screened.",
      );
      await load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Could not start screening.");
    } finally {
      setRunning(false);
    }
  };

  const toggleNames = () => {
    setHideNames((value) => {
      try {
        localStorage.setItem(HIDE_NAMES_KEY, value ? "0" : "1");
      } catch {
        /* preference just won't persist */
      }
      return !value;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#FFD700]" />
      </div>
    );
  }
  if (!data) return null;

  const { counts, candidates, workerAvailable } = data;
  const unscreened = counts.notScreened + counts.failed;

  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-white/5">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="w-5 h-5 text-[#FFD700]" /> AI screening
            <Badge className="border border-white/10 bg-white/5 text-gray-400 text-[10px] font-mono">
              BLIND
            </Badge>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Names and contact details are removed before scoring. Scores come
            from a fixed formula over evidence verified against each resume.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-gray-400">
            {counts.completed}/{counts.total} screened
            {counts.pending > 0 && ` · ${counts.pending} in progress`}
            {counts.noResume > 0 && ` · ${counts.noResume} without resume`}
          </span>
          <Link
            to="/admin/talent-search"
            className="text-xs text-gray-400 hover:text-[#FFD700] px-2"
          >
            Search all candidates →
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleNames}
            className="text-gray-400 hover:text-white"
          >
            {hideNames ? (
              <EyeOff className="w-4 h-4 mr-1" />
            ) : (
              <Eye className="w-4 h-4 mr-1" />
            )}
            {hideNames ? "Names hidden" : "Names shown"}
          </Button>
          {counts.completed > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={running || !workerAvailable}
              onClick={() => run(true)}
              className="border-white/10 text-gray-300 hover:bg-white/5"
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Re-screen all
            </Button>
          )}
          <Button
            size="sm"
            disabled={running || !workerAvailable || unscreened === 0}
            onClick={() => run(false)}
            className="bg-yellow-500 text-black hover:bg-yellow-400 font-bold"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" /> Screen {unscreened || ""}{" "}
                applicant
                {unscreened === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </div>
      </div>

      {!workerAvailable && (
        <p className="flex items-center gap-2 px-5 py-3 text-xs text-orange-300 bg-orange-500/5 border-b border-white/5">
          <AlertTriangle className="w-4 h-4" /> Screening workers are offline.
          Queued screenings will run once a worker is online.
        </p>
      )}

      {candidates.length === 0 ? (
        <p className="p-8 text-center text-sm text-gray-500">
          No applicants yet.
        </p>
      ) : (
        <ul>
          {candidates.map((c, index) => {
            const isOpen = expanded === c.applicationId;
            const label = hideNames ? `Candidate ${index + 1}` : c.name;
            const canOpen = c.status === "completed" && c.screeningId;
            return (
              <li
                key={c.applicationId}
                className="border-b border-white/5 last:border-0"
              >
                <button
                  type="button"
                  disabled={!canOpen}
                  onClick={() => setExpanded(isOpen ? null : c.applicationId)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-white/[0.03] disabled:cursor-default"
                >
                  <span className="w-6 text-xs font-mono text-gray-600">
                    {c.score !== null ? `#${index + 1}` : "—"}
                  </span>
                  {canOpen ? (
                    isOpen ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    )
                  ) : (
                    <span className="w-4" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-200 truncate">
                        {label}
                      </span>
                      {c.flags.map((f) => (
                        <Badge
                          key={f}
                          className="border border-red-500/30 bg-red-500/10 text-red-300 text-[10px]"
                        >
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          {FLAG_LABEL[f] || f}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {c.status === "completed"
                        ? c.summary
                        : c.error || STATUS_LABEL[c.status]}
                    </p>
                  </div>
                  {c.mustHave && (
                    <span className="hidden sm:block text-xs text-gray-400 font-mono">
                      must-haves {c.mustHave.met}/{c.mustHave.total}
                    </span>
                  )}
                  {c.score !== null ? (
                    <Badge
                      className={`border font-mono ${BAND_STYLES[c.band]}`}
                    >
                      {c.score}
                    </Badge>
                  ) : (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      {["queued", "running"].includes(c.status) && (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {STATUS_LABEL[c.status]}
                    </span>
                  )}
                </button>
                {isOpen && <ScreeningDetail screeningId={c.screeningId} />}
              </li>
            );
          })}
        </ul>
      )}

      <p className="px-5 py-3 text-[11px] text-gray-600 border-t border-white/5">
        AI screening is a decision aid. Review the evidence and the candidate
        yourself before rejecting anyone.
      </p>
    </div>
  );
};

export default ScreeningPanel;
