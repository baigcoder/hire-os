/**
 * Report helpers for notifications. The interview report itself is built
 * by modules/report/interviewReport.js from the structured scorecard and
 * transcript (it replaced a generator that asked a model to invent
 * culture-fit, communication and salary figures).
 */

/**
 * Short summary of a report for notifications and lists.
 */
export const generateQuickSummary = (report) => {
  const emoji = {
    STRONGLY_RECOMMEND: "🌟",
    RECOMMEND: "✅",
    CONSIDER: "🤔",
    NOT_RECOMMENDED: "❌",
  };
  const summary = report.aiSummary ?? report.summary ?? "";

  return {
    candidateName: report.candidate?.name,
    jobTitle: report.job?.title,
    recommendation: report.aiRecommendation ?? report.recommendation,
    emoji: emoji[report.aiRecommendation ?? report.recommendation] || "📋",
    overallScore: report.overallScore,
    summary: summary.length > 100 ? `${summary.substring(0, 100)}...` : summary,
    generatedAt: report.generatedAt,
  };
};

export default { generateQuickSummary };
