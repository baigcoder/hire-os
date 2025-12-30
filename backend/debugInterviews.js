import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Interview } from './models/interview.model.js';
import { User } from './models/user.model.js';
import { Job } from './models/job.model.js';
import { Company } from './models/company.model.js';

dotenv.config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const interviews = await Interview.find({}).limit(5).sort({ createdAt: -1 });
        console.log('Recent Interviews:', JSON.stringify(interviews, null, 2));

        const total = await Interview.countDocuments({});
        console.log('Total Interviews:', total);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
