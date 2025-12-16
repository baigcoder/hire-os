import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Job title is required'],
        trim: true,
        minlength: [3, 'Title must be at least 3 characters'],
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Job description is required'],
        minlength: [50, 'Description must be at least 50 characters']
    },
    requirements: [{
        type: String,
        trim: true
    }],
    skills: [{
        type: String,
        trim: true
    }],
    salary: {
        type: Number,
        required: [true, 'Salary is required'],
        min: [0, 'Salary cannot be negative']
    },
    salaryType: {
        type: String,
        enum: ['yearly', 'monthly', 'hourly'],
        default: 'yearly'
    },
    experienceLevel: {
        type: Number,
        required: true,
        min: 0,
        max: 50
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    jobType: {
        type: String,
        required: [true, 'Job type is required'],
        enum: {
            values: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance', 'Remote'],
            message: 'Invalid job type'
        }
    },
    position: {
        type: Number,
        required: true,
        min: [1, 'At least 1 position is required']
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: [true, 'Company is required']
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    applications: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Application'
    }],
    // New fields
    benefits: [{
        type: String,
        trim: true
    }],
    deadline: {
        type: Date
    },
    isRemote: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    views: {
        type: Number,
        default: 0
    },
    industry: {
        type: String,
        trim: true
    },
    department: {
        type: String,
        trim: true
    },
    educationRequired: {
        type: String,
        enum: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD', 'Any'],
        default: 'Any'
    },
    urgentHiring: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for better search performance
jobSchema.index({ title: 'text', description: 'text', skills: 'text' });
jobSchema.index({ location: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ salary: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ created_by: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ isActive: 1 });
jobSchema.index({ experienceLevel: 1 });

// Virtual for checking if deadline passed
jobSchema.virtual('isExpired').get(function () {
    if (!this.deadline) return false;
    return new Date() > this.deadline;
});

// Virtual for application count
jobSchema.virtual('applicationCount').get(function () {
    return this.applications ? this.applications.length : 0;
});

// Pre-save hook to deactivate expired jobs
jobSchema.pre('save', function (next) {
    if (this.deadline && new Date() > this.deadline) {
        this.isActive = false;
    }
    next();
});

// Ensure virtuals are included in JSON
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

export const Job = mongoose.model("Job", jobSchema);