import mongoose from "mongoose";

const jobTemplateSchema = new mongoose.Schema(
    {
        // Company that owns the template
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },

        // Created by user
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Template name for easy identification
        name: {
            type: String,
            required: [true, "Template name is required"],
            trim: true,
            maxlength: [100, "Template name cannot exceed 100 characters"],
        },

        // Category for organization
        category: {
            type: String,
            enum: [
                "engineering",
                "product",
                "design",
                "marketing",
                "sales",
                "operations",
                "finance",
                "hr",
                "customer_support",
                "data",
                "legal",
                "other",
            ],
            default: "other",
            index: true,
        },

        // Description of when to use this template
        description: {
            type: String,
            maxlength: [500, "Description cannot exceed 500 characters"],
        },

        // Make template available to other companies
        isPublic: {
            type: Boolean,
            default: false,
            index: true,
        },

        // Is this an official HIRE.OS template?
        isOfficial: {
            type: Boolean,
            default: false,
        },

        // Template content
        template: {
            title: {
                type: String,
                required: true,
                trim: true,
            },
            description: {
                type: String,
                required: true,
            },
            requirements: [{
                type: String,
                trim: true,
            }],
            skills: [{
                type: String,
                trim: true,
            }],
            benefits: [{
                type: String,
                trim: true,
            }],
            salaryRange: {
                min: Number,
                max: Number,
                currency: {
                    type: String,
                    default: "PKR",
                },
                type: {
                    type: String,
                    enum: ["yearly", "monthly", "hourly"],
                    default: "monthly",
                },
            },
            jobType: {
                type: String,
                enum: ["Full-time", "Part-time", "Contract", "Internship", "Freelance", "Remote"],
                default: "Full-time",
            },
            experienceLevel: {
                type: Number,
                min: 0,
                max: 50,
                default: 0,
            },
            educationRequired: {
                type: String,
                enum: ["High School", "Associate", "Bachelor", "Master", "PhD", "Any"],
                default: "Any",
            },
            department: String,
            industry: String,
            isRemote: {
                type: Boolean,
                default: false,
            },
        },

        // Usage tracking
        usageCount: {
            type: Number,
            default: 0,
        },
        lastUsedAt: Date,

        // Tags for search
        tags: [{
            type: String,
            trim: true,
            lowercase: true,
        }],

        // Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
jobTemplateSchema.index({ company: 1, category: 1 });
jobTemplateSchema.index({ isPublic: 1, category: 1 });
jobTemplateSchema.index({ name: "text", "template.title": "text", tags: "text" });
jobTemplateSchema.index({ usageCount: -1 });

// Method to increment usage
jobTemplateSchema.methods.recordUsage = function () {
    this.usageCount += 1;
    this.lastUsedAt = new Date();
    return this.save();
};

// Static method to get popular templates
jobTemplateSchema.statics.getPopular = function (limit = 10) {
    return this.find({ isPublic: true, isDeleted: false })
        .sort({ usageCount: -1 })
        .limit(limit)
        .populate("company", "name logo");
};

// Virtual for formatted salary
jobTemplateSchema.virtual("formattedSalary").get(function () {
    if (!this.template.salaryRange?.min && !this.template.salaryRange?.max) {
        return "Negotiable";
    }
    const min = this.template.salaryRange.min?.toLocaleString() || "0";
    const max = this.template.salaryRange.max?.toLocaleString() || "0";
    const currency = this.template.salaryRange.currency || "PKR";
    return `${currency} ${min} - ${max}`;
});

// Ensure virtuals are included in JSON
jobTemplateSchema.set("toJSON", { virtuals: true });
jobTemplateSchema.set("toObject", { virtuals: true });

export const JobTemplate = mongoose.model("JobTemplate", jobTemplateSchema);
