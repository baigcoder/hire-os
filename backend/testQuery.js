import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Import all models to ensure they're registered with Mongoose
import { Interview, User, Job, Company } from './models/index.js';

dotenv.config();

async function testRecruiterQuery() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find a recruiter
        const recruiter = await User.findOne({ role: 'recruiter' });
        if (!recruiter) {
            console.log('No recruiter found in database');
            process.exit(0);
        }

        console.log(`Testing with recruiter: ${recruiter._id} (${recruiter.fullname})`);

        // Test the exact query from controller with .lean()
        const interviews = await Interview.find({ recruiterId: recruiter._id })
            .populate("jobId", "title")
            .populate("studentId", "fullname email profile.profilePhoto")
            .populate("companyId", "name")
            .sort({ scheduledAt: -1 })
            .lean();

        console.log(`Found ${interviews.length} interviews`);

        // Test serialization
        const jsonResult = JSON.stringify({
            success: true,
            interviews,
            total: interviews.length
        });

        console.log('Serialization successful!');
        console.log('Response size:', jsonResult.length, 'bytes');

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testRecruiterQuery();
