import { SalaryData } from "../models/salaryData.model.js";
import { User } from "../models/user.model.js";

// Submit salary data
export const submitSalary = async (req, res) => {
    try {
        const userId = req.id;
        const { jobTitle, location, experienceLevel, yearsOfExperience, salary, education, skills, companySize, industry, isAnonymous } = req.body;

        if (!jobTitle || !salary?.base || !experienceLevel) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        const user = await User.findById(userId);

        const salaryRecord = await SalaryData.create({
            jobTitle,
            location: location || { country: "Pakistan" },
            experienceLevel,
            yearsOfExperience,
            salary,
            education,
            skills,
            companySize,
            industry,
            company: user?.companyId,
            submittedBy: userId,
            isAnonymous: isAnonymous !== false,
            year: new Date().getFullYear(),
        });

        return res.status(201).json({ success: true, message: "Salary submitted for review", salary: salaryRecord });
    } catch (error) {
        console.error("Submit salary error:", error);
        return res.status(500).json({ success: false, message: "Failed to submit" });
    }
};

// Get salary benchmark
export const getSalaryBenchmark = async (req, res) => {
    try {
        const { jobTitle, location, experienceLevel } = req.query;

        if (!jobTitle) {
            return res.status(400).json({ success: false, message: "Job title required" });
        }

        const benchmark = await SalaryData.getBenchmark(jobTitle, location, experienceLevel);

        // Get distribution by experience
        const distribution = await SalaryData.aggregate([
            { $match: { status: "approved", normalizedTitle: jobTitle.toLowerCase().trim() } },
            { $group: { _id: "$experienceLevel", avgSalary: { $avg: "$salary.base" }, count: { $sum: 1 } } },
            { $sort: { avgSalary: 1 } },
        ]);

        return res.status(200).json({
            success: true,
            benchmark,
            distribution,
            jobTitle,
        });
    } catch (error) {
        console.error("Get benchmark error:", error);
        return res.status(500).json({ success: false, message: "Failed to get benchmark" });
    }
};

// Search salaries
export const searchSalaries = async (req, res) => {
    try {
        const { query, experienceLevel, location, page = 1, limit = 20 } = req.query;

        const filter = { status: "approved" };
        if (query) filter.$text = { $search: query };
        if (experienceLevel) filter.experienceLevel = experienceLevel;
        if (location) filter["location.country"] = location;

        const salaries = await SalaryData.find(filter)
            .select("-submittedBy")
            .sort({ "salary.base": -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await SalaryData.countDocuments(filter);

        return res.status(200).json({
            success: true,
            salaries,
            pagination: { page: parseInt(page), limit: parseInt(limit), total },
        });
    } catch (error) {
        console.error("Search salaries error:", error);
        return res.status(500).json({ success: false, message: "Failed to search" });
    }
};

// Get trending jobs (by salary)
export const getTrendingJobs = async (req, res) => {
    try {
        const trending = await SalaryData.aggregate([
            { $match: { status: "approved", year: new Date().getFullYear() } },
            { $group: { _id: "$normalizedTitle", avgSalary: { $avg: "$salary.base" }, count: { $sum: 1 } } },
            { $match: { count: { $gte: 3 } } },
            { $sort: { avgSalary: -1 } },
            { $limit: 10 },
        ]);

        return res.status(200).json({ success: true, trending });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to get trending" });
    }
};
