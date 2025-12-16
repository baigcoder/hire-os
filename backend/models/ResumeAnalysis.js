import mongoose from "mongoose";

const ResumeAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  resumePath: {
    type: String,
    required: true
  },
  analysisScore: {
    type: Number,
    required: true
  },
  keySkillsMatch: [String],
  experienceMatch: {
    type: Number,
    default: 0
  },
  educationMatch: {
    type: Number,
    default: 0
  },
  overallFit: {
    type: String,
    enum: ['Poor', 'Fair', 'Good', 'Excellent'],
    default: 'Fair'
  },
  analysisDate: {
    type: Date,
    default: Date.now
  }
});

export const ResumeAnalysis = mongoose.model('ResumeAnalysis', ResumeAnalysisSchema);