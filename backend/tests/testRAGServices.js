/**
 * RAG Services Test Suite
 * Tests: Embeddings, Vector Store, RAG-enhanced AI
 * Run: node tests/testRAGServices.js
 */

import dotenv from 'dotenv';
dotenv.config();

import {
    generateEmbedding,
    cosineSimilarity,
    prepareResumeText
} from '../utils/embeddingService.js';

import {
    addResumeVector,
    findSimilarResumes,
    addJobVector,
    findMatchingJobs,
    getVectorStoreStats,
    clearAllStores
} from '../utils/vectorStore.js';

import {
    analyzeResumeWithRAG,
    generateCEOReportWithRAG,
    getRAGStats
} from '../utils/ragService.js';

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
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

async function runTests() {
    console.log(`${colors.cyan}╔══════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║              RAG SERVICES TEST SUITE                          ║${colors.reset}`);
    console.log(`${colors.cyan}╚══════════════════════════════════════════════════════════════╝${colors.reset}`);

    // Clear stores before testing
    clearAllStores();

    // Test 1: Generate embedding
    const embedding1 = await test('Generate Embedding', async () => {
        const text = 'Senior React developer with 5 years experience in TypeScript and Node.js';
        const embedding = await generateEmbedding(text);

        if (!embedding || embedding.length !== 1536) {
            throw new Error(`Expected 1536 dimensions, got ${embedding?.length}`);
        }
        console.log(`  Dimensions: ${embedding.length}`);
        return embedding;
    });

    // Test 2: Cosine similarity
    await test('Cosine Similarity', async () => {
        const text2 = 'Senior JavaScript developer with 5 years React experience';
        const embedding2 = await generateEmbedding(text2);

        const similarity = cosineSimilarity(embedding1, embedding2);
        console.log(`  Similarity: ${(similarity * 100).toFixed(1)}%`);

        if (similarity < 0.7) {
            throw new Error('Similar texts should have >70% similarity');
        }
        return similarity;
    });

    // Test 3: Add resume to vector store
    await test('Add Resume Vector', async () => {
        await addResumeVector('candidate_001', {
            name: 'John Developer',
            title: 'Senior React Developer',
            skills: ['React', 'TypeScript', 'Node.js'],
            experience: '5 years',
            rawText: 'Senior React developer with expertise in TypeScript...'
        });

        await addResumeVector('candidate_002', {
            name: 'Jane Engineer',
            title: 'Backend Python Developer',
            skills: ['Python', 'Django', 'PostgreSQL'],
            experience: '4 years',
            rawText: 'Backend developer specializing in Python and Django...'
        });

        const stats = getVectorStoreStats();
        console.log(`  Resumes in store: ${stats.resumes.count}`);

        if (stats.resumes.count !== 2) {
            throw new Error('Expected 2 resumes in store');
        }
        return stats;
    });

    // Test 4: Add job to vector store
    await test('Add Job Vector', async () => {
        await addJobVector('job_001', {
            title: 'Senior React Developer',
            company: 'TechCorp',
            skills: ['React', 'TypeScript', 'Node.js'],
            description: 'We need a senior React developer...'
        });

        await addJobVector('job_002', {
            title: 'Python Backend Engineer',
            company: 'DataCo',
            skills: ['Python', 'Django', 'AWS'],
            description: 'Backend engineer for data platform...'
        });

        const stats = getVectorStoreStats();
        console.log(`  Jobs in store: ${stats.jobs.count}`);
        return stats;
    });

    // Test 5: Find similar resumes
    await test('Find Similar Resumes', async () => {
        const results = await findSimilarResumes('Looking for React TypeScript developer');

        console.log(`  Found: ${results.length} matches`);
        if (results.length > 0) {
            console.log(`  Top match: ${results[0].metadata.name} (${(results[0].score * 100).toFixed(1)}%)`);
        }

        // First result should be the React developer
        if (results[0]?.metadata?.name !== 'John Developer') {
            throw new Error('Expected John Developer as top match');
        }
        return results;
    });

    // Test 6: Find matching jobs
    await test('Find Matching Jobs', async () => {
        const results = await findMatchingJobs('Python developer with Django experience');

        console.log(`  Found: ${results.length} matches`);
        if (results.length > 0) {
            console.log(`  Top match: ${results[0].metadata.title} (${results[0].matchPercentage}%)`);
        }
        return results;
    });

    // Test 7: RAG-enhanced resume analysis
    await test('RAG Resume Analysis', async () => {
        const analysis = await analyzeResumeWithRAG(
            'Full-stack developer with 5 years React and Node.js experience. Built scalable apps.',
            'We need a senior full-stack developer for our React/Node team.',
            'candidate_003'
        );

        console.log(`  Score: ${analysis.overallScore}/100`);
        console.log(`  Recommendation: ${analysis.recommendation}`);
        console.log(`  RAG context: ${analysis.ragContext?.similarCandidates || 0} similar candidates`);

        return analysis;
    });

    // Test 8: Vector store stats
    await test('Vector Store Stats', async () => {
        const stats = getVectorStoreStats();
        console.log(`  Total vectors: ${stats.totalVectors}`);
        console.log(`  Memory: ${stats.memoryEstimate}`);
        return stats;
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
}

runTests().catch(console.error);
