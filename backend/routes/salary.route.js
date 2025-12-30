import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { submitSalary, getSalaryBenchmark, searchSalaries, getTrendingJobs } from "../controllers/salary.controller.js";

const router = express.Router();

router.post("/", isAuthenticated, submitSalary);
router.get("/benchmark", getSalaryBenchmark);
router.get("/search", searchSalaries);
router.get("/trending", getTrendingJobs);

export default router;
