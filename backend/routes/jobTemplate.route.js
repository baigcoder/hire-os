import express from "express";
import isAuthenticated, { isCompanyAdmin } from "../middlewares/isAuthenticated.js";
import {
    createTemplate,
    getCompanyTemplates,
    getPublicTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    createJobFromTemplate,
    saveJobAsTemplate,
} from "../controllers/jobTemplate.controller.js";

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Template CRUD
router.post("/", createTemplate);
router.get("/", getCompanyTemplates);
router.get("/library", getPublicTemplates);
router.get("/:id", getTemplate);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

// Template usage
// Posting jobs is company_admin-only (same as POST /job/post)
router.post("/:id/use", isCompanyAdmin, createJobFromTemplate);
router.post("/save-from-job", saveJobAsTemplate);

export default router;
