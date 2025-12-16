/**
 * Test Unified AI Engines
 * Tests all 3 engines: Python ML, JavaScript, GPT-4o-mini
 * Run: node tests/testUnifiedAI.js
 */

import dotenv from 'dotenv';
dotenv.config();

import { analyzeResumeUnified, analyzeResumeQuick } from '../utils/unifiedAnalyzer.js';
import { matchJobsUnified } from '../utils/unifiedJobMatcher.js';
import { rankApplicantsUnified } from '../utils/unifiedApplicantRanker.js';

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const results = { passed: 0, failed: 0, tests: [] };

async function test(name, fn) {
    console.log(`\n${colors.cyan}━━━ Testing: ${name} ━━━${colors.reset}`);
    try {
        const startTime = Date.now();
        const result = await fn();
        const latency = Date.now() - startTime;

        console.log(`${colors.green}✓ PASSED${colors.reset} (${latency}ms)`);
        results.passed++;
        results.tests.push({ name, status: 'PASSED', latency });
        return result;
    } catch (error) {
        console.log(`${colors.red}✗ FAILED: ${error.message}${colors.reset}`);
        results.failed++;
        results.tests.push({ name, status: 'FAILED', error: error.message });
        return null;
    }
}

// Test data
const sampleResume = `
John Smith
Senior Full Stack Developer
john.smith@email.com | (555) 123-4567

SUMMARY
Experienced software engineer with 6+ years of experience in React, Node.js, TypeScript, and Python.
Led development of microservices architecture serving 1M+ users.

SKILLS
- Frontend: React, Vue.js, TypeScript, JavaScript, HTML5, CSS3, Tailwind
- Backend: Node.js, Express, Python, Django, GraphQL, REST APIs
- Database: PostgreSQL, MongoDB, Redis, Elasticsearch
- Cloud: AWS (EC2, S3, Lambda), Docker, Kubernetes, CI/CD
- Tools: Git, Jira, Figma, Agile/Scrum

EXPERIENCE
Senior Developer | TechCorp Inc. | 2020 - Present
- Built React dashboard serving 500K daily users
- Designed microservices with Node.js and Python
- Reduced API latency by 60% through optimization

Software Engineer | StartupXYZ | 2018 - 2020
- Developed full-stack features using React and Node.js
- Implemented PostgreSQL database schema
- Led team of 5 developers

EDUCATION
Master of Science in Computer Science
University of Technology | 2018
`;

const sampleJob = `
Senior Full Stack Developer

We're looking for an experienced Full Stack Developer to join our engineering team.

Requirements:
- 5+ years experience in web development
- Strong proficiency in React, TypeScript, Node.js
- Experience with PostgreSQL and MongoDB
- Knowledge of AWS or similar cloud platforms
- Experience with Docker and Kubernetes
- Bachelor's degree in CS or related field

Nice to have:
- Python experience
- GraphQL knowledge
- Experience with microservices

Responsibilities:
- Build and maintain React frontend applications
- Design and implement REST and GraphQL APIs
- Work with cloud infrastructure (AWS)
- Mentor junior developers
`;

async function runTests() {
    console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║         UNIFIED AI ENGINES TEST SUITE                        ║${colors.reset}`);
    console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`);

    // Test 1: Quick Analysis (JS only)
    await test('Quick Analysis (JavaScript)', async () => {
        const result = await analyzeResumeQuick(sampleResume, sampleJob);
        console.log(`  Score: ${result.score}/100`);
        console.log(`  Skills found: ${result.totalSkillsFound}`);
        console.log(`  Method: ${result.analysisMethod}`);

        if (!result.score) throw new Error('No score returned');
        return result;
    });

    // Test 2: Unified Analysis (All 3 engines)
    const unifiedResult = await test('Unified Analysis (All Engines)', async () => {
        console.log('  Running 3 engines in parallel...');

        const result = await analyzeResumeUnified(sampleResume, sampleJob, {
            onProgress: (update) => {
                console.log(`  ${colors.magenta}→ ${update.engine}: ${update.status}${colors.reset}`);
            }
        });

        console.log(`\n  ${colors.yellow}CONSENSUS RESULTS:${colors.reset}`);
        console.log(`  Score: ${result.consensus.score}/100`);
        console.log(`  Confidence: ${result.consensus.confidence}%`);
        console.log(`  Agreement: ${result.consensus.agreementLevel}`);
        console.log(`  Recommendation: ${result.consensus.recommendation}`);

        console.log(`\n  ${colors.yellow}ENGINE SCORES:${colors.reset}`);
        for (const [engine, data] of Object.entries(result.engines)) {
            const status = data.success ? colors.green + '✓' : colors.red + '✗';
            console.log(`  ${status} ${engine}: ${data.score || 'N/A'} (${data.latency}ms)${colors.reset}`);
        }

        if (!result.consensus.score) throw new Error('No consensus score');
        return result;
    });

    // Test 3: Job Matching
    await test('Job Matching (Multi-Engine)', async () => {
        const candidate = {
            resumeText: sampleResume,
            skills: ['react', 'node.js', 'typescript', 'python', 'postgresql', 'docker']
        };

        const jobs = [
            {
                _id: '1',
                title: 'Senior React Developer',
                description: sampleJob,
                requirements: ['react', 'typescript', 'node.js', 'postgresql']
            },
            {
                _id: '2',
                title: 'Python Backend Engineer',
                description: 'Python developer needed for data pipeline...',
                requirements: ['python', 'django', 'postgresql', 'aws']
            }
        ];

        const result = await matchJobsUnified(candidate, jobs, {
            useAI: false, // Skip AI for speed
            useEmbeddings: true
        });

        console.log(`  Jobs matched: ${result.matches.length}`);
        result.matches.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.job.title}: ${m.match.score}% (${m.match.fitLevel})`);
        });

        return result;
    });

    // Test 4: Applicant Ranking
    await test('Applicant Ranking', async () => {
        const applicants = [
            {
                _id: '1',
                name: 'John Smith',
                resumeText: sampleResume,
                skills: ['react', 'node.js', 'typescript', 'aws'],
                experience: { years: 6 },
                education: { level: 'Master' }
            },
            {
                _id: '2',
                name: 'Jane Doe',
                skills: ['react', 'javascript'],
                experience: { years: 2 },
                education: { level: 'Bachelor' }
            }
        ];

        const job = {
            title: 'Senior Developer',
            description: sampleJob,
            requirements: ['react', 'typescript', 'node.js']
        };

        const result = await rankApplicantsUnified(applicants, job, {
            useAI: false
        });

        console.log(`  Ranked: ${result.ranked.length} applicants`);
        result.ranked.forEach(r => {
            console.log(`  #${r.rank} ${r.applicant.name}: ${r.scores.final}% (${r.tier})`);
        });

        return result;
    });

    // Print Summary
    console.log(`\n\n${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║                      TEST SUMMARY                             ║${colors.reset}`);
    console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`);

    console.log(`\n${colors.yellow}Results:${colors.reset}`);
    results.tests.forEach(t => {
        const icon = t.status === 'PASSED' ? colors.green + '✓' : colors.red + '✗';
        console.log(`  ${icon} ${t.name}${colors.reset} ${t.latency ? `(${t.latency}ms)` : ''}`);
    });

    console.log(`\n${colors.yellow}Summary:${colors.reset}`);
    console.log(`  Total: ${results.passed + results.failed}`);
    console.log(`  ${colors.green}Passed: ${results.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${results.failed}${colors.reset}`);
    console.log(`  Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    console.log(`\n${colors.magenta}Engine Performance:${colors.reset}`);
    if (unifiedResult) {
        for (const [engine, data] of Object.entries(unifiedResult.engines)) {
            console.log(`  ${engine}: ${data.latency}ms`);
        }
        console.log(`  Total: ${unifiedResult.meta.totalLatency}ms`);
    }
}

runTests().catch(console.error);
