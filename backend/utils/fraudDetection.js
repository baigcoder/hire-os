/**
 * Fraud Detection - Optimized for Speed & Accuracy
 * Real-time behavioral analysis for interview integrity
 */

// Risk thresholds (fine-tuned for accuracy)
const THRESHOLDS = {
  TAB_SWITCHES: { low: 2, medium: 4, high: 7 },
  RAPID_ANSWERS: { threshold: 5000 }, // Less than 5 seconds
  COPY_PASTE: { low: 1, medium: 3, high: 5 },
  FACE_AWAY: { low: 10, medium: 25, high: 40 }, // Percentage
  WINDOW_BLUR: { low: 3, medium: 6, high: 10 },
};

// Severity weights for scoring
const SEVERITY_WEIGHTS = {
  critical: 30,
  high: 20,
  medium: 10,
  low: 5,
};

/**
 * Calculate fraud risk score (0-100)
 * Higher = more suspicious
 */
export const calculateFraudRisk = (behaviorData) => {
  let score = 0;
  const alerts = [];
  const details = {};

  const {
    tabSwitches = 0,
    windowBlurs = 0,
    copyPasteAttempts = 0,
    rapidAnswers = 0,
    totalQuestions = 0,
    faceDetectionAway = 0,
    totalFaceChecks = 0,
    fullscreenExits = 0,
    rightClickAttempts = 0,
    idlePeriods = 0,
    suspiciousKeyPatterns = 0,
  } = behaviorData;

  // 1. Tab switching analysis
  if (tabSwitches > 0) {
    details.tabSwitches = tabSwitches;
    if (tabSwitches >= THRESHOLDS.TAB_SWITCHES.high) {
      score += SEVERITY_WEIGHTS.critical;
      alerts.push({
        type: "tab_switch",
        severity: "critical",
        message: `Excessive tab switching (${tabSwitches} times)`,
        count: tabSwitches,
      });
    } else if (tabSwitches >= THRESHOLDS.TAB_SWITCHES.medium) {
      score += SEVERITY_WEIGHTS.high;
      alerts.push({
        type: "tab_switch",
        severity: "high",
        message: `Multiple tab switches detected (${tabSwitches} times)`,
        count: tabSwitches,
      });
    } else if (tabSwitches >= THRESHOLDS.TAB_SWITCHES.low) {
      score += SEVERITY_WEIGHTS.medium;
      alerts.push({
        type: "tab_switch",
        severity: "medium",
        message: `Tab switching detected (${tabSwitches} times)`,
        count: tabSwitches,
      });
    }
  }

  // 2. Window blur analysis
  if (windowBlurs > 0) {
    details.windowBlurs = windowBlurs;
    if (windowBlurs >= THRESHOLDS.WINDOW_BLUR.high) {
      score += SEVERITY_WEIGHTS.high;
      alerts.push({
        type: "window_blur",
        severity: "high",
        message: `Frequent window focus loss (${windowBlurs} times)`,
        count: windowBlurs,
      });
    } else if (windowBlurs >= THRESHOLDS.WINDOW_BLUR.medium) {
      score += SEVERITY_WEIGHTS.medium;
      alerts.push({
        type: "window_blur",
        severity: "medium",
        message: `Window focus lost multiple times`,
        count: windowBlurs,
      });
    }
  }

  // 3. Copy/paste detection
  if (copyPasteAttempts > 0) {
    details.copyPasteAttempts = copyPasteAttempts;
    if (copyPasteAttempts >= THRESHOLDS.COPY_PASTE.high) {
      score += SEVERITY_WEIGHTS.critical;
      alerts.push({
        type: "copy_paste",
        severity: "critical",
        message: `Excessive copy/paste attempts (${copyPasteAttempts})`,
        count: copyPasteAttempts,
      });
    } else if (copyPasteAttempts >= THRESHOLDS.COPY_PASTE.medium) {
      score += SEVERITY_WEIGHTS.high;
      alerts.push({
        type: "copy_paste",
        severity: "high",
        message: `Multiple copy/paste attempts detected`,
        count: copyPasteAttempts,
      });
    } else {
      score += SEVERITY_WEIGHTS.low;
      alerts.push({
        type: "copy_paste",
        severity: "low",
        message: `Copy/paste attempt detected`,
        count: copyPasteAttempts,
      });
    }
  }

  // 4. Rapid answer detection
  if (totalQuestions > 0 && rapidAnswers > 0) {
    const rapidPercentage = (rapidAnswers / totalQuestions) * 100;
    details.rapidAnswerPercentage = Math.round(rapidPercentage);

    if (rapidPercentage > 50) {
      score += SEVERITY_WEIGHTS.critical;
      alerts.push({
        type: "rapid_answers",
        severity: "critical",
        message: `Most answers submitted too quickly (${rapidAnswers}/${totalQuestions})`,
        percentage: rapidPercentage,
      });
    } else if (rapidPercentage > 25) {
      score += SEVERITY_WEIGHTS.high;
      alerts.push({
        type: "rapid_answers",
        severity: "high",
        message: `Many answers submitted suspiciously fast`,
        percentage: rapidPercentage,
      });
    }
  }

  // 5. Face detection analysis
  if (totalFaceChecks > 0) {
    const awayPercentage = (faceDetectionAway / totalFaceChecks) * 100;
    details.faceAwayPercentage = Math.round(awayPercentage);

    if (awayPercentage >= THRESHOLDS.FACE_AWAY.high) {
      score += SEVERITY_WEIGHTS.critical;
      alerts.push({
        type: "face_away",
        severity: "critical",
        message: `Face frequently not detected (${Math.round(awayPercentage)}% of time)`,
        percentage: awayPercentage,
      });
    } else if (awayPercentage >= THRESHOLDS.FACE_AWAY.medium) {
      score += SEVERITY_WEIGHTS.high;
      alerts.push({
        type: "face_away",
        severity: "high",
        message: `Face not detected ${Math.round(awayPercentage)}% of the time`,
        percentage: awayPercentage,
      });
    }
  }

  // 6. Fullscreen exit detection
  if (fullscreenExits > 0) {
    details.fullscreenExits = fullscreenExits;
    score += fullscreenExits * SEVERITY_WEIGHTS.medium;
    alerts.push({
      type: "fullscreen_exit",
      severity: fullscreenExits > 2 ? "high" : "medium",
      message: `Fullscreen exited ${fullscreenExits} time(s)`,
      count: fullscreenExits,
    });
  }

  // 7. Right-click attempts
  if (rightClickAttempts > 0) {
    details.rightClickAttempts = rightClickAttempts;
    score += SEVERITY_WEIGHTS.low;
    alerts.push({
      type: "right_click",
      severity: "low",
      message: `Right-click attempts blocked (${rightClickAttempts})`,
      count: rightClickAttempts,
    });
  }

  // 8. Suspicious key patterns (potential copy shortcuts)
  if (suspiciousKeyPatterns > 0) {
    details.suspiciousKeyPatterns = suspiciousKeyPatterns;
    score += suspiciousKeyPatterns * SEVERITY_WEIGHTS.medium;
    alerts.push({
      type: "suspicious_keys",
      severity: "medium",
      message: `Suspicious keyboard shortcuts detected`,
      count: suspiciousKeyPatterns,
    });
  }

  // Normalize score to 0-100
  score = Math.min(100, score);

  // Determine risk level
  let riskLevel;
  if (score >= 60) {
    riskLevel = "critical";
  } else if (score >= 40) {
    riskLevel = "high";
  } else if (score >= 20) {
    riskLevel = "medium";
  } else {
    riskLevel = "low";
  }

  return {
    score,
    riskLevel,
    alerts: alerts.sort(
      (a, b) => SEVERITY_WEIGHTS[b.severity] - SEVERITY_WEIGHTS[a.severity],
    ),
    details,
    analyzedAt: new Date().toISOString(),
  };
};

/**
 * Generate AI-powered fraud report
 */
export const generateFraudReport = async (interviewData, behaviorData) => {
  const riskAnalysis = calculateFraudRisk(behaviorData);

  // Generate summary based on findings
  let summary = "";
  let recommendation = "";

  if (riskAnalysis.riskLevel === "critical") {
    summary =
      "High-risk behavior detected during interview. Multiple indicators suggest potential integrity issues.";
    recommendation =
      "REVIEW REQUIRED: Manual review strongly recommended before proceeding.";
  } else if (riskAnalysis.riskLevel === "high") {
    summary =
      "Several concerning behaviors detected. The candidate showed signs of potential external assistance.";
    recommendation =
      "CAUTION: Consider follow-up verification or technical interview.";
  } else if (riskAnalysis.riskLevel === "medium") {
    summary =
      "Some minor anomalies detected, but within acceptable limits for online testing.";
    recommendation =
      "PROCEED: Minor concerns noted, but no significant red flags.";
  } else {
    summary =
      "No significant integrity concerns. Candidate behavior appears genuine throughout.";
    recommendation = "CLEAR: Interview conducted without notable issues.";
  }

  return {
    interviewId: interviewData?.interviewId,
    candidateName: interviewData?.candidateName,
    testType: interviewData?.testType || "MCQ",
    duration: interviewData?.duration,
    completedAt: interviewData?.completedAt || new Date().toISOString(),

    // Risk assessment
    riskScore: riskAnalysis.score,
    riskLevel: riskAnalysis.riskLevel,

    // Alerts sorted by severity
    alerts: riskAnalysis.alerts,

    // Summary
    summary,
    recommendation,

    // Detailed metrics
    metrics: riskAnalysis.details,

    // Metadata
    reportGeneratedAt: new Date().toISOString(),
    reportVersion: "2.0",
  };
};

/**
 * Create browser monitor for client-side tracking
 * Returns JavaScript code to inject in frontend
 */
export const createBrowserMonitor = () => {
  return `
(function() {
    const monitor = {
        tabSwitches: 0,
        windowBlurs: 0,
        copyPasteAttempts: 0,
        rightClickAttempts: 0,
        fullscreenExits: 0,
        suspiciousKeyPatterns: 0,
        rapidAnswers: 0,
        answerTimes: [],
        startTime: Date.now(),
        
        init() {
            // Tab visibility
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.tabSwitches++;
                    this.report('tab_switch');
                }
            });
            
            // Window blur
            window.addEventListener('blur', () => {
                this.windowBlurs++;
                this.report('window_blur');
            });
            
            // Copy/paste prevention
            document.addEventListener('copy', (e) => {
                e.preventDefault();
                this.copyPasteAttempts++;
                this.report('copy_attempt');
            });
            
            document.addEventListener('paste', (e) => {
                e.preventDefault();
                this.copyPasteAttempts++;
                this.report('paste_attempt');
            });
            
            // Right-click prevention
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.rightClickAttempts++;
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'f'].includes(e.key.toLowerCase())) {
                    e.preventDefault();
                    this.suspiciousKeyPatterns++;
                }
            });
            
            // Fullscreen exit
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement) {
                    this.fullscreenExits++;
                    this.report('fullscreen_exit');
                }
            });
        },
        
        recordAnswer(questionId, timeSpent) {
            this.answerTimes.push({ questionId, timeSpent });
            if (timeSpent < 5000) this.rapidAnswers++;
        },
        
        report(type) {
            if (typeof window.onFraudAlert === 'function') {
                window.onFraudAlert({ type, data: this.getData() });
            }
        },
        
        getData() {
            return {
                tabSwitches: this.tabSwitches,
                windowBlurs: this.windowBlurs,
                copyPasteAttempts: this.copyPasteAttempts,
                rightClickAttempts: this.rightClickAttempts,
                fullscreenExits: this.fullscreenExits,
                suspiciousKeyPatterns: this.suspiciousKeyPatterns,
                rapidAnswers: this.rapidAnswers,
                totalQuestions: this.answerTimes.length,
                sessionDuration: Date.now() - this.startTime
            };
        }
    };
    
    monitor.init();
    window.fraudMonitor = monitor;
})();
`;
};

/**
 * Quick risk check (for real-time UI feedback)
 */
export const quickRiskCheck = (behaviorData) => {
  const {
    tabSwitches = 0,
    copyPasteAttempts = 0,
    rapidAnswers = 0,
    totalQuestions = 0,
  } = behaviorData;

  // Simple threshold-based check
  if (tabSwitches >= 7 || copyPasteAttempts >= 5) return "high";
  if (tabSwitches >= 4 || copyPasteAttempts >= 3) return "medium";
  if (totalQuestions > 0 && rapidAnswers / totalQuestions > 0.5)
    return "medium";

  return "low";
};

export default {
  calculateFraudRisk,
  generateFraudReport,
  createBrowserMonitor,
  quickRiskCheck,
  THRESHOLDS,
  SEVERITY_WEIGHTS,
};
