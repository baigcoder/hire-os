import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
    createAssessment,
    getCompanyAssessments,
    getAssessmentLibrary,
    getAssessment,
    updateAssessment,
    deleteAssessment,
    assignAssessment,
    startAssessment,
    submitAnswer,
    submitAssessment,
    getSubmissionResults,
    recordProctoringEvent,
    getCompanySubmissions,
} from "../controllers/assessment.controller.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Assessment CRUD
router.post("/", createAssessment);
router.get("/", getCompanyAssessments);
router.get("/library", getAssessmentLibrary);
router.get("/:id", getAssessment);
router.put("/:id", updateAssessment);
router.delete("/:id", deleteAssessment);

// Assignment & Taking
router.post("/:id/assign", assignAssessment);
router.post("/:id/start", startAssessment);
router.post("/:id/answer", submitAnswer);
router.post("/:id/submit", submitAssessment);

// Proctoring
router.post("/:id/proctoring-event", recordProctoringEvent);

// Results
router.get("/submission/:submissionId", getSubmissionResults);
router.get("/submissions/company", getCompanySubmissions);

export default router;
