import { ResumeReport } from "../models/resumeReport.model.js";
import { ResumeAnalysis } from "../models/ResumeAnalysis.js";
import { runResumePipeline } from "../modules/resume-intel/pipeline.js";
import { AiGatewayError } from "../platform/ai-gateway/gateway.js";
import logger from "../utils/logger.js";

export const RESUME_ANALYZE_JOB = "resume.analyze";

const userFacingError = (error) =>
  error instanceof AiGatewayError
    ? {
        code: "AI_UNAVAILABLE",
        message:
          "The AI service is busy or unavailable right now. Please try again in a few minutes.",
      }
    : { code: "ANALYSIS_FAILED", message: "The analysis failed unexpectedly." };

/**
 * Keep the legacy ResumeAnalysis "practice" record in step, so dashboards
 * that read /resume/my-analysis and /resume/quick-score show the new result.
 */
const syncLegacyAnalysis = async (report, result) => {
  const missing = (result.matches || []).filter((m) => m.status === "missing");
  const requirementText = new Map(
    (result.job?.requirements || []).map((r) => [r.id, r]),
  );
  const matchedSkills = (result.matches || [])
    .filter((m) => m.status !== "missing")
    .flatMap((m) => requirementText.get(m.requirementId)?.skills || []);

  await ResumeAnalysis.findOneAndUpdate(
    { userId: report.userId, type: "practice" },
    {
      userId: report.userId,
      type: "practice",
      analysisScore: result.score.overall,
      atsScore: Math.round(
        (result.signals.ats.passed / result.signals.ats.total) * 100,
      ),
      keySkillsMatch: matchedSkills.length
        ? [...new Set(matchedSkills)]
        : result.signals.skills.slice(0, 15).map((s) => s.name),
      missingSkills: missing
        .flatMap((m) => {
          const req = requirementText.get(m.requirementId);
          return req?.skills?.length ? req.skills : [req?.text].filter(Boolean);
        })
        .slice(0, 15),
      overallFit: result.score.band,
      analysisMethod: report.pipelineVersion,
      confidence: result.degraded ? 70 : 90,
      analyzedAt: new Date(),
    },
    { upsert: true, runValidators: true },
  );
};

/**
 * Background handler for one ResumeReport. Idempotent: a completed report is
 * left alone, and a retry re-runs the pipeline from the stored resume text.
 */
export const createResumeAnalyzeHandler =
  ({ ai }) =>
  async ({ reportId }, ctx) => {
    const report = await ResumeReport.findById(reportId).select(
      "+resumeText +input.jobDescription",
    );
    if (!report) return { skipped: "report deleted" };
    if (report.status === "completed") return { skipped: "already completed" };

    await ResumeReport.updateOne(
      { _id: report._id },
      {
        $set: {
          status: "running",
          error: null,
          stages: report.stages.map((s) => ({
            ...s.toObject(),
            status: s.status === "skipped" ? "skipped" : "pending",
            ms: undefined,
          })),
        },
      },
    );

    let currentStage = null;
    const onStage = async (id, status, info = {}) => {
      if (status === "running") currentStage = id;
      await ResumeReport.updateOne(
        { _id: report._id, "stages.id": id },
        { $set: { "stages.$.status": status, "stages.$.ms": info.ms } },
      );
      await ctx.setProgress({ stage: id, status });
    };

    try {
      const jd = report.input?.jobDescription;
      const result = await runResumePipeline({
        ai,
        text: report.resumeText,
        textHash: report.input.textHash,
        job: jd
          ? {
              text: jd,
              title: report.input.jobTitle,
              minYears: report.input.minYears,
            }
          : null,
        onStage,
      });

      await ResumeReport.updateOne(
        { _id: report._id },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            profile: result.profile,
            signals: result.signals,
            job: result.job,
            matches: result.matches || [],
            score: result.score,
            critique: result.critique,
            flags: result.flags,
            grounding: result.grounding,
            models: result.models,
            degraded: result.degraded,
          },
        },
      );

      await syncLegacyAnalysis(report, result).catch((error) =>
        logger.warn("Could not sync legacy resume analysis", {
          error: error.message,
        }),
      );

      return { score: result.score.overall, degraded: result.degraded };
    } catch (error) {
      const final = ctx.attempt >= ctx.job.maxAttempts;
      const update = {
        status: final ? "failed" : "queued",
        error: userFacingError(error),
      };
      await ResumeReport.updateOne({ _id: report._id }, { $set: update });
      if (currentStage) {
        await ResumeReport.updateOne(
          { _id: report._id, "stages.id": currentStage },
          { $set: { "stages.$.status": "failed" } },
        );
      }
      throw error;
    }
  };
