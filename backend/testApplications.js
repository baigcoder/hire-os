import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Application, User, Job, Company } from './models/index.js';

dotenv.config();

async function testApplicationsQuery() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find a recruiter
        const recruiter = await User.findOne({ role: 'recruiter' });
        if (!recruiter) {
            console.log('No recruiter found');
            process.exit(0);
        }

        console.log(`Testing with recruiter: ${recruiter._id} (${recruiter.fullname})`);
        console.log(`Recruiter companyId: ${recruiter.companyId}`);

        if (!recruiter.companyId) {
            console.log('Recruiter has no company assigned!');
            process.exit(0);
        }

        // Get jobs for the company
        const jobs = await Job.find({ company: recruiter.companyId });
        console.log(`Found ${jobs.length} jobs for company`);

        const jobIds = jobs.map(j => j._id);
        console.log('Job IDs:', jobIds);

        // Get all applications for those jobs
        const applications = await Application.find({ job: { $in: jobIds } })
            .populate("applicant")
            .populate("job")
            .sort({ createdAt: -1 });

        console.log(`Found ${applications.length} applications`);

        // Log all statuses
        applications.forEach((app, i) => {
            console.log(`  App ${i + 1}: status="${app.status}", applicant=${app.applicant?.fullname}, job=${app.job?.title}`);
        });

        // Filter eligible
        const eligible = applications.filter(app =>
            ["pending", "reviewing", "shortlisted"].includes(app.status)
        );

        console.log(`Eligible candidates (pending/reviewing/shortlisted): ${eligible.length}`);

        if (eligible.length > 0) {
            console.log('First eligible:');
            console.log('  - ID:', eligible[0]._id);
            console.log('  - Status:', eligible[0].status);
            console.log('  - Applicant:', eligible[0].applicant?.fullname);
            console.log('  - Job:', eligible[0].job?.title);
        }

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

testApplicationsQuery();
