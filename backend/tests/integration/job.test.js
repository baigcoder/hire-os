import request from 'supertest';
import { app } from '../../index.js';
import { User } from '../../models/user.model.js';
import { Job } from '../../models/job.model.js';
import mongoose from 'mongoose';

describe('Job Integration Tests', () => {
    let recruiterToken;
    let studentToken;
    let recruiterId;

    beforeEach(async () => {
        // Create a company admin (CEO)
        const recruiterRes = await request(app)
            .post('/api/v1/user/register')
            .send({
                fullname: 'Company Admin',
                email: 'admin@company.com',
                phoneNumber: '1112223333',
                password: 'Password123!',
                role: 'company_admin'
            });

        // Debug: Log registration response
        if (!recruiterRes.body.success) {
            console.log('Registration failed:', recruiterRes.body);
        }

        recruiterToken = recruiterRes.body.token;
        recruiterId = recruiterRes.body.user?._id;

        if (!recruiterId) {
            throw new Error(`Registration failed: ${recruiterRes.body.message || 'No user returned'}`);
        }

        // Create a company for the admin
        const { Company } = await import('../../models/company.model.js');
        const company = await Company.create({
            name: 'Test Company',
            email: 'company@test.com',
            description: 'A test company description',
            website: 'https://test.com',
            location: 'Remote',
            logo: 'https://test.com/logo.png',
            userId: recruiterId,
            adminUser: recruiterId,
            subscription: { status: 'active', endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
        });

        // Update user with companyId
        await User.findByIdAndUpdate(recruiterId, { companyId: company._id });

        // Store companyId for tests
        global.testCompanyId = company._id;



        // Create a student
        const studentRes = await request(app)
            .post('/api/v1/user/register')
            .send({
                fullname: 'Student User',
                email: 'student@example.com',
                phoneNumber: '4445556666',
                password: 'Password123!',
                role: 'student'
            });
        studentToken = studentRes.body.token;
    });

    describe('POST /api/v1/job/post', () => {
        it('should allow recruiter to post a job', async () => {
            const jobData = {
                title: 'Software Engineer',
                description: 'This is a detailed job description that meets the minimum length requirement of fifty characters to pass validation.',
                requirements: ['Node.js', 'React'],
                salary: 100000,
                location: 'Remote',
                jobType: 'Full-time',
                experience: 2,
                position: 1,
                companyId: global.testCompanyId // Use valid company ID
            };

            const res = await request(app)
                .post('/api/v1/job/post')
                .set('Cookie', `token=${recruiterToken}`)
                .send(jobData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.job.title).toBe(jobData.title);
        });

        it('should deny student from posting a job', async () => {
            const jobData = {
                title: 'Software Engineer',
                description: 'This is a detailed job description that meets the minimum length requirement of fifty characters to pass validation.',
                requirements: ['Node.js'],
                salary: 100000,
                location: 'Remote',
                jobType: 'Full-time',
                experienceLevel: 1,
                position: 1,
                companyId: new mongoose.Types.ObjectId()
            };

            const res = await request(app)
                .post('/api/v1/job/post')
                .set('Cookie', `token=${studentToken}`)
                .send(jobData);

            expect(res.statusCode).toBe(403);
        });
    });

    describe('GET /api/v1/job/get', () => {
        it('should get all jobs', async () => {
            // Seed a job
            await Job.create({
                title: 'Test Job',
                description: 'This is a detailed job description that meets the minimum length requirement of fifty characters to pass validation.',
                requirements: ['Test'],
                salary: 50000,
                location: 'Test Loc',
                jobType: 'Part-time',
                experienceLevel: 0,
                position: 1,
                company: new mongoose.Types.ObjectId(),
                created_by: recruiterId
            });

            const res = await request(app)
                .get('/api/v1/job/get');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.jobs.length).toBeGreaterThan(0);
        });
    });
});
