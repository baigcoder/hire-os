import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleDashed,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import ReportView from "./ReportView";
import {
  deleteAnalysis,
  errorMessage,
  fetchHistory,
  useResumeAnalysis,
} from "./useResumeAnalysis";

const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const StageIcon = ({ status }) => {
  if (status === "done")
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "running")
    return <Loader2 className="w-4 h-4 text-[#FFD700] animate-spin" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "skipped")
    return <CircleDashed className="w-4 h-4 text-gray-700" />;
  return <CircleDashed className="w-4 h-4 text-gray-600" />;
};

const Progress = ({ stages, status, error }) => (
  <motion.div
    key="progress"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    className="bg-[#111111] border border-white/10 rounded-md p-8 max-w-xl mx-auto"
  >
    <h3 className="text-white font-semibold mb-1">Analyzing your resume</h3>
    <p className="text-xs text-gray-500 mb-6">
      {status === "queued"
        ? "Waiting for a free analysis slot…"
        : "This usually takes 20–60 seconds. You can leave this page — the report is saved."}
    </p>
    <ol className="space-y-3">
      {stages.map((s) => (
        <li
          key={s.id}
          className={`flex items-center gap-3 text-sm ${
            s.status === "skipped" ? "text-gray-600" : "text-gray-300"
          }`}
        >
          <StageIcon status={s.status} />
          <span className="flex-1">{s.label}</span>
          {s.ms != null && s.status === "done" && (
            <span className="text-xs font-mono text-gray-600">
              {(s.ms / 1000).toFixed(1)}s
            </span>
          )}
        </li>
      ))}
    </ol>
    {error && <p className="text-xs text-orange-300 mt-5">{error}</p>}
  </motion.div>
);

const InputForm = ({ onSubmit, submitting }) => {
  const [mode, setMode] = useState("file");
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");

  const canSubmit =
    !submitting &&
    (mode === "file" ? Boolean(file) : resumeText.trim().length >= 200);

  const submit = (event) => {
    event.preventDefault();
    const form = new FormData();
    if (mode === "file") form.append("resume", file);
    else form.append("resumeText", resumeText);
    if (jobId) form.append("jobId", jobId);
    else if (jobDescription.trim())
      form.append("jobDescription", jobDescription.trim());
    onSubmit(form);
  };

  return (
    <motion.form
      key="input"
      onSubmit={submit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-[#111111] border border-white/10 rounded-md p-6 space-y-6"
    >
      <div>
        <div className="flex gap-2 mb-3">
          {[
            ["file", "Upload file"],
            ["text", "Paste text"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider border ${
                mode === value
                  ? "border-[#FFD700]/50 text-[#FFD700] bg-[#FFD700]/10"
                  : "border-white/10 text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-[#FFD700]/30 rounded-md cursor-pointer bg-[#0A0A0A] hover:bg-[#FFD700]/5 hover:border-[#FFD700]/50 transition-all">
            {file ? (
              <>
                <FileText className="w-8 h-8 mb-2 text-[#FFD700]" />
                <p className="text-sm text-[#FFD700]">{file.name}</p>
                <p className="text-xs text-gray-500">Click to replace</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                <p className="text-sm text-gray-300">
                  Drop your resume or click to browse
                </p>
                <p className="text-xs text-gray-500">PDF or DOCX, up to 5 MB</p>
              </>
            )}
            <input
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        ) : (
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            rows={10}
            placeholder="Paste the full text of your resume…"
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-md p-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#FFD700]/50"
          />
        )}
      </div>

      {jobId ? (
        <p className="text-xs text-gray-400">
          Matching against the job you selected.
        </p>
      ) : (
        <div>
          <label className="text-xs text-[#FFD700] uppercase tracking-wider mb-2 block font-mono">
            Target job description (optional)
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={5}
            maxLength={8000}
            placeholder="Paste a job posting to see how well you match each requirement. Leave empty for a general review."
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-md p-3 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#FFD700]/50"
          />
        </div>
      )}

      <Button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-semibold"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Analyze resume"
        )}
      </Button>
      <p className="text-[11px] text-gray-600 text-center">
        Your resume text is stored with the report so you can revisit it. Delete
        a report anytime from history.
      </p>
    </motion.form>
  );
};

const HistoryList = ({ items, onOpen, onDelete, activeId }) =>
  items.length === 0 ? null : (
    <div className="bg-[#111111] border border-white/10 rounded-md p-4">
      <h3 className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-400 mb-3">
        <History className="w-4 h-4" /> Recent analyses
      </h3>
      <ul className="divide-y divide-white/5">
        {items.map((a) => (
          <li key={a._id} className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => onOpen(a._id)}
              className={`flex-1 text-left text-sm truncate ${
                a._id === activeId
                  ? "text-[#FFD700]"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {a.input?.jobTitle || a.input?.fileName || "Pasted resume"}
              <span className="text-xs text-gray-600 ml-2">
                {new Date(a.createdAt).toLocaleDateString()}
              </span>
            </button>
            {a.status === "completed" ? (
              <Badge className="border border-white/10 bg-white/5 text-gray-300 font-mono">
                {a.score?.overall}
              </Badge>
            ) : (
              <span className="text-xs text-gray-500">{a.status}</span>
            )}
            <button
              type="button"
              aria-label="Delete analysis"
              onClick={() => onDelete(a._id)}
              className="text-gray-600 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

const ResumeIntelligence = ({ onUseClassic }) => {
  const { analysisId, status, stages, report, error, start, open, reset } =
    useResumeAnalysis();
  const [history, setHistory] = useState([]);

  const refreshHistory = useCallback(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => {});
  }, []);

  useEffect(refreshHistory, [refreshHistory]);
  useEffect(() => {
    if (status === "completed" || status === "failed") refreshHistory();
  }, [status, refreshHistory]);

  const submit = async (form) => {
    try {
      const result = await start(form);
      if (result?.reused)
        toast.info("Showing your existing analysis of this resume.");
    } catch (e) {
      toast.error(errorMessage(e, "Could not start the analysis."));
    }
  };

  const remove = async (id) => {
    try {
      await deleteAnalysis(id);
      if (id === analysisId) reset();
      refreshHistory();
    } catch (e) {
      toast.error(errorMessage(e, "Could not delete the analysis."));
    }
  };

  const inProgress = ["submitting", "queued", "running"].includes(status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Resume Intelligence</h2>
          <p className="text-xs text-gray-500">
            Evidence-based review: every finding links back to a line in your
            resume.
          </p>
        </div>
        <div className="flex gap-2">
          {(report || status === "failed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="border-white/10 text-gray-300 hover:bg-white/5"
            >
              <RefreshCw className="w-4 h-4 mr-1" /> New analysis
            </Button>
          )}
          {onUseClassic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUseClassic}
              className="text-gray-500 hover:text-gray-300"
            >
              Classic analyzer
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === "completed" && report ? (
          <motion.div
            key="report"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ReportView report={report} />
          </motion.div>
        ) : inProgress ? (
          <Progress stages={stages} status={status} error={error} />
        ) : status === "failed" ? (
          <motion.div
            key="failed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-[#111111] border border-red-500/30 rounded-md p-6 text-center"
          >
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-gray-200">{error || "The analysis failed."}</p>
          </motion.div>
        ) : (
          <InputForm onSubmit={submit} submitting={status === "submitting"} />
        )}
      </AnimatePresence>

      {status === "idle" && error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}

      <HistoryList
        items={history}
        activeId={analysisId}
        onOpen={(id) =>
          open(id).catch((e) =>
            toast.error(errorMessage(e, "Could not open the analysis.")),
          )
        }
        onDelete={remove}
      />
    </div>
  );
};

export default ResumeIntelligence;
