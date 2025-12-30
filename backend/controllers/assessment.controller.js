import { Assessment } from "../models/assessment.model.js";
import { AssessmentSubmission } from "../models/assessmentSubmission.model.js";
import { Application } from "../models/application.model.js";
import { User } from "../models/user.model.js";

// Create a new assessment
export const createAssessment = async (req, res) => {
    try {
        const userId = req.id;
        const { title, description, type, category, duration, passingScore, questions, isPublic, proctoring, tags, difficulty } = req.body;

        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({
                success: false,
                message: "You must be associated with a company",
            });
        }

        if (!title || !questions || questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Title and at least one question are required",
            });
        }

        const assessment = await Assessment.create({
            company: user.companyId,
            createdBy: userId,
            title,
            description,
            type: type || "mixed",
            category: category || "general",
            duration: duration || 60,
            passingScore: passingScore || 60,
            questions,
            isPublic: isPublic || false,
            proctoring: proctoring || {},
            tags: tags || [],
            difficulty: difficulty || "intermediate",
        });

        return res.status(201).json({
            success: true,
            message: "Assessment created successfully",
            assessment,
        });
    } catch (error) {
        console.error("Create assessment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create assessment",
            error: error.message,
        });
    }
};

// Get company assessments
export const getCompanyAssessments = async (req, res) => {
    try {
        const userId = req.id;
        const { category, type, page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found",
            });
        }

        const query = { company: user.companyId, isActive: true };
        if (category && category !== "all") query.category = category;
        if (type && type !== "all") query.type = type;

        const assessments = await Assessment.find(query)
            .populate("createdBy", "fullname")
            .select("-questions.correctAnswer") // Hide answers
            .sort({ updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Assessment.countDocuments(query);

        return res.status(200).json({
            success: true,
            assessments,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("Get assessments error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assessments" });
    }
};

// Get assessment library (public)
export const getAssessmentLibrary = async (req, res) => {
    try {
        const { category, difficulty, type, search, page = 1, limit = 20 } = req.query;

        const query = { isPublic: true, isActive: true };
        if (category && category !== "all") query.category = category;
        if (difficulty && difficulty !== "all") query.difficulty = difficulty;
        if (type && type !== "all") query.type = type;
        if (search) query.$text = { $search: search };

        const assessments = await Assessment.find(query)
            .populate("company", "name logo")
            .select("-questions") // Don't expose questions in library
            .sort({ usageCount: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Assessment.countDocuments(query);

        // Category stats
        const categoryStats = await Assessment.aggregate([
            { $match: { isPublic: true, isActive: true } },
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        return res.status(200).json({
            success: true,
            assessments,
            categories: categoryStats,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("Get library error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch library" });
    }
};

// Get single assessment (for taking)
export const getAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;

        const assessment = await Assessment.findById(id)
            .populate("company", "name logo");

        if (!assessment || !assessment.isActive) {
            return res.status(404).json({ success: false, message: "Assessment not found" });
        }

        // Check if user has a submission
        const submission = await AssessmentSubmission.findOne({
            assessment: id,
            candidate: userId,
        });

        // If taking the test, hide correct answers
        const assessmentData = assessment.toObject();
        if (!submission || submission.status !== "graded") {
            assessmentData.questions = assessmentData.questions.map((q) => ({
                ...q,
                correctAnswer: undefined,
                explanation: undefined,
            }));
        }

        return res.status(200).json({
            success: true,
            assessment: assessmentData,
            submission: submission ? { status: submission.status, score: submission.score } : null,
        });
    } catch (error) {
        console.error("Get assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assessment" });
    }
};

// Update assessment
export const updateAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;
        const updates = req.body;

        const user = await User.findById(userId);
        const assessment = await Assessment.findById(id);

        if (!assessment) {
            return res.status(404).json({ success: false, message: "Assessment not found" });
        }

        if (assessment.company.toString() !== user?.companyId?.toString()) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const allowed = ["title", "description", "type", "category", "duration", "passingScore", "questions", "isPublic", "proctoring", "tags", "difficulty", "isActive"];
        allowed.forEach((field) => {
            if (updates[field] !== undefined) assessment[field] = updates[field];
        });

        await assessment.save();

        return res.status(200).json({
            success: true,
            message: "Assessment updated",
            assessment,
        });
    } catch (error) {
        console.error("Update assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to update" });
    }
};

// Delete assessment
export const deleteAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;

        const user = await User.findById(userId);
        const assessment = await Assessment.findById(id);

        if (!assessment) {
            return res.status(404).json({ success: false, message: "Assessment not found" });
        }

        if (assessment.company.toString() !== user?.companyId?.toString()) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        assessment.isActive = false;
        await assessment.save();

        return res.status(200).json({ success: true, message: "Assessment deleted" });
    } catch (error) {
        console.error("Delete assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to delete" });
    }
};

// Assign assessment to candidate
export const assignAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const { candidateId, applicationId, deadline } = req.body;
        const userId = req.id;

        const user = await User.findById(userId);
        const assessment = await Assessment.findById(id);

        if (!assessment) {
            return res.status(404).json({ success: false, message: "Assessment not found" });
        }

        // Check if already assigned
        const existing = await AssessmentSubmission.findOne({
            assessment: id,
            candidate: candidateId,
        });

        if (existing) {
            return res.status(400).json({ success: false, message: "Already assigned to this candidate" });
        }

        const submission = await AssessmentSubmission.create({
            assessment: id,
            candidate: candidateId,
            application: applicationId,
            company: user.companyId,
            invitedBy: userId,
            invitedAt: new Date(),
            deadline: deadline ? new Date(deadline) : null,
            proctoring: { enabled: assessment.proctoring?.enabled || false },
        });

        await assessment.recordUsage();

        // TODO: Send email notification to candidate

        return res.status(201).json({
            success: true,
            message: "Assessment assigned successfully",
            submission,
        });
    } catch (error) {
        console.error("Assign assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to assign" });
    }
};

// Start assessment (candidate)
export const startAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;
        const { browserInfo } = req.body;

        const submission = await AssessmentSubmission.findOne({
            assessment: id,
            candidate: userId,
        }).populate("assessment");

        if (!submission) {
            return res.status(404).json({ success: false, message: "You are not assigned this assessment" });
        }

        if (submission.status === "submitted" || submission.status === "graded") {
            return res.status(400).json({ success: false, message: "Assessment already completed" });
        }

        if (submission.deadline && new Date() > submission.deadline) {
            submission.status = "expired";
            await submission.save();
            return res.status(400).json({ success: false, message: "Assessment deadline has passed" });
        }

        // Start if not already started
        if (submission.status === "invited") {
            submission.status = "in_progress";
            submission.startedAt = new Date();
            submission.browserInfo = browserInfo || {};
            await submission.save();
        }

        return res.status(200).json({
            success: true,
            message: "Assessment started",
            submission: {
                _id: submission._id,
                status: submission.status,
                startedAt: submission.startedAt,
                assessment: submission.assessment,
                timeRemaining: submission.timeRemaining,
            },
        });
    } catch (error) {
        console.error("Start assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to start" });
    }
};

// Submit answer for a question
export const submitAnswer = async (req, res) => {
    try {
        const { id } = req.params; // assessment id
        const { questionId, answer, code, language, timeSpent } = req.body;
        const userId = req.id;

        const submission = await AssessmentSubmission.findOne({
            assessment: id,
            candidate: userId,
            status: "in_progress",
        }).populate("assessment");

        if (!submission) {
            return res.status(404).json({ success: false, message: "Active submission not found" });
        }

        // Find the question
        const question = submission.assessment.questions.find((q) => q._id.toString() === questionId);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }

        // Calculate points
        let points = 0;
        let isCorrect = false;

        if (question.type === "mcq") {
            isCorrect = answer === question.correctAnswer;
            points = isCorrect ? question.points : 0;
        } else if (question.type === "code") {
            // For coding, we'd run test cases here (simplified for now)
            // In production, integrate with Judge0 or similar
            points = question.points; // Placeholder
        } else if (question.type === "text") {
            points = question.points; // Manual grading needed
        }

        // Update or add answer
        const existingIdx = submission.answers.findIndex((a) => a.questionId.toString() === questionId);
        const answerData = {
            questionId,
            answer,
            code,
            language,
            points,
            maxPoints: question.points,
            isCorrect,
            timeSpent: timeSpent || 0,
        };

        if (existingIdx >= 0) {
            submission.answers[existingIdx] = { ...submission.answers[existingIdx], ...answerData };
        } else {
            submission.answers.push(answerData);
        }

        await submission.save();

        return res.status(200).json({
            success: true,
            message: "Answer saved",
            saved: true,
        });
    } catch (error) {
        console.error("Submit answer error:", error);
        return res.status(500).json({ success: false, message: "Failed to save answer" });
    }
};

// Submit entire assessment
export const submitAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.id;

        const submission = await AssessmentSubmission.findOne({
            assessment: id,
            candidate: userId,
            status: "in_progress",
        }).populate("assessment");

        if (!submission) {
            return res.status(404).json({ success: false, message: "Active submission not found" });
        }

        await submission.submit();

        return res.status(200).json({
            success: true,
            message: "Assessment submitted successfully",
            result: {
                score: submission.score,
                maxScore: submission.maxScore,
                percentage: submission.percentage,
                passed: submission.percentage >= submission.assessment.passingScore,
                timeTaken: submission.timeTaken,
            },
        });
    } catch (error) {
        console.error("Submit assessment error:", error);
        return res.status(500).json({ success: false, message: "Failed to submit" });
    }
};

// Get submission results
export const getSubmissionResults = async (req, res) => {
    try {
        const { submissionId } = req.params;
        const userId = req.id;

        const submission = await AssessmentSubmission.findById(submissionId)
            .populate("assessment")
            .populate("candidate", "fullname email profile.profilePhoto");

        if (!submission) {
            return res.status(404).json({ success: false, message: "Submission not found" });
        }

        // Check access (candidate or recruiter)
        const user = await User.findById(userId);
        const isCandidate = submission.candidate._id.toString() === userId;
        const isRecruiter = submission.company.toString() === user?.companyId?.toString();

        if (!isCandidate && !isRecruiter) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        return res.status(200).json({
            success: true,
            submission,
        });
    } catch (error) {
        console.error("Get results error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch results" });
    }
};

// Record proctoring event
export const recordProctoringEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, details } = req.body;
        const userId = req.id;

        const submission = await AssessmentSubmission.findOne({
            assessment: id,
            candidate: userId,
            status: "in_progress",
        });

        if (!submission) {
            return res.status(404).json({ success: false, message: "Active submission not found" });
        }

        await submission.recordProctoringEvent(type, details);

        return res.status(200).json({
            success: true,
            trustScore: submission.proctoring.trustScore,
            tabSwitches: submission.proctoring.tabSwitches,
        });
    } catch (error) {
        console.error("Record proctoring error:", error);
        return res.status(500).json({ success: false, message: "Failed to record" });
    }
};

// Get company submissions (recruiter view)
export const getCompanySubmissions = async (req, res) => {
    try {
        const userId = req.id;
        const { assessmentId, status, page = 1, limit = 20 } = req.query;

        const user = await User.findById(userId);
        if (!user || !user.companyId) {
            return res.status(400).json({ success: false, message: "Company not found" });
        }

        const query = { company: user.companyId };
        if (assessmentId) query.assessment = assessmentId;
        if (status && status !== "all") query.status = status;

        const submissions = await AssessmentSubmission.find(query)
            .populate("assessment", "title duration")
            .populate("candidate", "fullname email profile.profilePhoto")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await AssessmentSubmission.countDocuments(query);

        return res.status(200).json({
            success: true,
            submissions,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("Get submissions error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch submissions" });
    }
};
