import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Interview } from './models/interview.model.js';
import { User } from './models/user.model.js';
import { Job } from './models/job.model.js';
import { Company } from './models/company.model.js';

dotenv.config();

async function checkPopulate() {
    try {
        const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/jobportal";
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Use the recruiter ID found in the previous debug step
        const recruiterId = "6952f76d32bf958189eb3154";

        console.log(`Finding interviews for recruiter: ${recruiterId}`);

        // Replicate the exact controller query but with .lean()
        const interviews = await Interview.find({ recruiterId })
            .populate("jobId", "title")
            .populate("studentId", "fullname email profile.profilePhoto")
            .populate("companyId", "name")
            .sort({ scheduledAt: -1 })
            .lean();

        console.log(`Successfully populated ${interviews.length} interviews`);

        if (interviews.length > 0) {
            // Log the first one to check structure
            console.log('First Interview Sample:', JSON.stringify(interviews[0], null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('CRITICAL ERROR during populate:');
        console.error(error);
        process.exit(1);
    }
}

checkPopulate();
