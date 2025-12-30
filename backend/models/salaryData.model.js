import mongoose from "mongoose";

const salaryDataSchema = new mongoose.Schema(
    {
        // Job identification
        jobTitle: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        normalizedTitle: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
        },
        // Location
        location: {
            city: String,
            country: { type: String, default: "Pakistan" },
            region: String,
        },
        // Experience
        experienceLevel: {
            type: String,
            enum: ["entry", "junior", "mid", "senior", "lead", "executive"],
            required: true,
            index: true,
        },
        yearsOfExperience: { type: Number, min: 0, max: 50 },
        // Company (optional - for verified data)
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
        },
        companySize: {
            type: String,
            enum: ["startup", "small", "medium", "large", "enterprise"],
        },
        industry: String,
        // Salary breakdown
        salary: {
            base: { type: Number, required: true },
            bonus: Number,
            stocks: Number,
            other: Number,
            total: Number,
            currency: { type: String, default: "PKR" },
            period: { type: String, enum: ["yearly", "monthly"], default: "monthly" },
        },
        // Submitter info
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isAnonymous: { type: Boolean, default: true },
        // Verification
        verified: { type: Boolean, default: false },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        verificationMethod: {
            type: String,
            enum: ["offer_letter", "payslip", "linkedin", "self_reported"],
            default: "self_reported",
        },
        // Metadata
        year: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
            index: true,
        },
        // Additional info
        education: {
            type: String,
            enum: ["high_school", "bachelors", "masters", "phd", "other"],
        },
        skills: [String],
        benefits: [String],
    },
    { timestamps: true }
);

// Indexes
salaryDataSchema.index({ normalizedTitle: 1, "location.country": 1 });
salaryDataSchema.index({ "salary.base": 1 });
salaryDataSchema.index({ year: -1 });

// Pre-save: normalize title and calculate total
salaryDataSchema.pre("save", function (next) {
    if (this.jobTitle) {
        this.normalizedTitle = this.jobTitle.toLowerCase().trim();
    }
    // Calculate total compensation
    this.salary.total = (this.salary.base || 0) +
        (this.salary.bonus || 0) +
        (this.salary.stocks || 0) +
        (this.salary.other || 0);
    next();
});

// Static: Get salary benchmark
salaryDataSchema.statics.getBenchmark = async function (jobTitle, location, experienceLevel) {
    const query = {
        status: "approved",
        normalizedTitle: jobTitle.toLowerCase().trim(),
    };
    if (location) query["location.country"] = location;
    if (experienceLevel) query.experienceLevel = experienceLevel;

    const result = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                avgBase: { $avg: "$salary.base" },
                minBase: { $min: "$salary.base" },
                maxBase: { $max: "$salary.base" },
                avgTotal: { $avg: "$salary.total" },
                p25: { $percentile: { input: "$salary.base", p: [0.25], method: "approximate" } },
                p50: { $percentile: { input: "$salary.base", p: [0.5], method: "approximate" } },
                p75: { $percentile: { input: "$salary.base", p: [0.75], method: "approximate" } },
            },
        },
    ]);
    return result[0] || null;
};

export const SalaryData = mongoose.model("SalaryData", salaryDataSchema);
