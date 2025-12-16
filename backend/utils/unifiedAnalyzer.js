/**
 * Unified AI Analysis Engine - Industrial Standard
 * Combines 3 engines for best accuracy with fast, live responses:
 * 1. Python ML (TF-IDF, skill matching) - Fast, local
 * 2. JavaScript Regex (fallback) - Instant
 * 3. GPT-4o-mini AI (semantic understanding) - Most accurate
 * 
 * Features:
 * - Parallel execution for speed
 * - Consensus scoring from all engines
 * - Streaming/progressive responses
 * - Automatic fallback on errors
 * - Real-time WebSocket updates
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { callAI, parseAIJson } from './aiServiceV3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../temp');
let tempDirReady = false;

// ═══════════════════════════════════════════════════════════════
// ENGINE 1: PYTHON ML (TF-IDF + Cosine Similarity)
// ═══════════════════════════════════════════════════════════════

const runPythonML = async (resumeText, jobDescription) => {
    return new Promise(async (resolve) => {
        const startTime = Date.now();

        try {
            // Create temp files
            if (!tempDirReady) {
                await fs.mkdir(TEMP_DIR, { recursive: true });
                tempDirReady = true;
            }

            const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const resumePath = path.join(TEMP_DIR, `resume_${uniqueId}.txt`);
            const jobPath = path.join(TEMP_DIR, `job_${uniqueId}.txt`);

            await Promise.all([
                fs.writeFile(resumePath, resumeText),
                fs.writeFile(jobPath, jobDescription)
            ]);

            const pythonScript = path.resolve(__dirname, '../../Models/AI-powered-Resume-Screening-and-Ranking-System/app.py');

            const pythonProcess = spawn('python', [
                pythonScript,
                '--mode', 'api',
                '--resume', resumePath,
                '--job', jobPath
            ]);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            // Timeout after 10 seconds
            const timeout = setTimeout(() => {
                pythonProcess.kill();
                resolve({
                    engine: 'python-ml',
                    success: false,
                    error: 'Timeout',
                    latency: Date.now() - startTime
                });
            }, 10000);

            pythonProcess.on('close', async (code) => {
                clearTimeout(timeout);

                // Cleanup temp files
                try {
                    await fs.unlink(resumePath);
                    await fs.unlink(jobPath);
                } catch (e) { }

                if (code === 0 && output) {
                    try {
                        const result = JSON.parse(output.trim());
                        resolve({
                            engine: 'python-ml',
                            success: true,
                            score: result.score,
                            data: result,
                            latency: Date.now() - startTime
                        });
                    } catch (e) {
                        resolve({
                            engine: 'python-ml',
                            success: false,
                            error: 'Parse error',
                            latency: Date.now() - startTime
                        });
                    }
                } else {
                    resolve({
                        engine: 'python-ml',
                        success: false,
                        error: errorOutput || 'Unknown error',
                        latency: Date.now() - startTime
                    });
                }
            });

        } catch (error) {
            resolve({
                engine: 'python-ml',
                success: false,
                error: error.message,
                latency: Date.now() - startTime
            });
        }
    });
};

// ═══════════════════════════════════════════════════════════════
// ENGINE 2: JAVASCRIPT REGEX (Instant, Local)
// Industrial-Standard Skills Database (150+ skills from Streamlit)
// ═══════════════════════════════════════════════════════════════

const SKILLS_DATABASE = {
    languages: [
        'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang',
        'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
        'dart', 'lua', 'haskell', 'elixir', 'clojure', 'objective-c'
    ],
    frontend: [
        'react', 'reactjs', 'vue', 'vuejs', 'angular', 'svelte', 'next.js', 'nextjs',
        'nuxt', 'gatsby', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less',
        'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui', 'chakra-ui',
        'styled-components', 'webpack', 'vite', 'rollup', 'jquery'
    ],
    backend: [
        'node', 'nodejs', 'express', 'expressjs', 'fastify', 'nestjs', 'koa',
        'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot',
        'laravel', 'rails', 'ruby on rails', 'asp.net', '.net', 'dotnet',
        'graphql', 'rest', 'restful', 'api', 'microservices', 'grpc'
    ],
    databases: [
        'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'sqlite',
        'oracle', 'mssql', 'mariadb', 'cassandra', 'dynamodb', 'firebase',
        'supabase', 'prisma', 'mongoose', 'sequelize', 'typeorm', 'elasticsearch',
        'neo4j', 'couchdb', 'cockroachdb'
    ],
    cloud: [
        'aws', 'amazon web services', 'azure', 'gcp', 'google cloud',
        'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
        'github actions', 'gitlab ci', 'circleci', 'vercel', 'netlify',
        'heroku', 'digitalocean', 'cloudflare', 'nginx', 'apache', 'lambda'
    ],
    data_ai: [
        'machine learning', 'ml', 'deep learning', 'ai', 'artificial intelligence',
        'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
        'data science', 'data analysis', 'data engineering', 'etl', 'spark',
        'hadoop', 'airflow', 'tableau', 'power bi', 'looker', 'nlp',
        'computer vision', 'opencv', 'huggingface', 'transformers'
    ],
    mobile: [
        'react native', 'flutter', 'ios', 'android', 'swift', 'kotlin',
        'xamarin', 'ionic', 'cordova', 'expo', 'mobile development'
    ],
    tools: [
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
        'figma', 'sketch', 'adobe xd', 'photoshop', 'linux', 'bash',
        'agile', 'scrum', 'kanban', 'ci/cd', 'tdd', 'testing', 'jest',
        'cypress', 'selenium', 'postman', 'swagger', 'vim', 'vscode'
    ],
    soft: [
        'leadership', 'communication', 'teamwork', 'problem solving',
        'project management', 'time management', 'critical thinking',
        'adaptability', 'creativity', 'collaboration', 'mentoring'
    ]
};

const ALL_SKILLS = Object.values(SKILLS_DATABASE).flat();

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsSkill = (text, skill) => {
    const pattern = `\\b${escapeRegex(skill)}\\b`;
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
};

const runJavaScriptAnalysis = async (resumeText, jobDescription) => {
    const startTime = Date.now();

    try {
        const resumeLower = resumeText.toLowerCase();
        const jobLower = jobDescription.toLowerCase();

        const resumeSkills = ALL_SKILLS.filter(s => containsSkill(resumeLower, s));
        const jobSkills = ALL_SKILLS.filter(s => containsSkill(jobLower, s));

        let matchedSkills;
        let missingSkills;

        if (jobSkills.length === 0) {
            matchedSkills = resumeSkills;
            missingSkills = [];
        } else {
            matchedSkills = resumeSkills.filter(s => jobSkills.includes(s));
            missingSkills = jobSkills.filter(s => !resumeSkills.includes(s));
        }

        // Extract experience
        const expMatch = resumeText.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
        const experience = expMatch ? parseInt(expMatch[1]) : null;

        // Education
        const eduLevels = [
            { keywords: ['phd', 'doctorate'], level: 'PhD', score: 100 },
            { keywords: ['master', 'mba', 'msc'], level: 'Master', score: 85 },
            { keywords: ['bachelor', 'bsc', 'degree'], level: 'Bachelor', score: 70 },
            { keywords: ['diploma', 'associate'], level: 'Associate', score: 50 }
        ];

        let education = { level: 'Not specified', score: 50 };
        for (const edu of eduLevels) {
            if (edu.keywords.some(k => resumeLower.includes(k))) {
                education = { level: edu.level, score: edu.score };
                break;
            }
        }

        // Calculate score
        const skillMatch = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 100 : 50;
        const expScore = Math.min(100, (experience || 3) * 15);

        const overallScore = Math.round(
            (skillMatch * 0.4) +
            (expScore * 0.3) +
            (education.score * 0.3)
        );

        return {
            engine: 'javascript-regex',
            success: true,
            score: Math.max(20, Math.min(95, overallScore)),
            data: {
                score: overallScore,
                keySkillsMatch: matchedSkills,
                missingSkills: missingSkills.slice(0, 10),
                experienceYears: experience,
                educationLevel: education.level,
                totalSkillsFound: resumeSkills.length
            },
            latency: Date.now() - startTime
        };
    } catch (error) {
        return {
            engine: 'javascript-regex',
            success: false,
            error: error.message,
            latency: Date.now() - startTime
        };
    }
};

// ═══════════════════════════════════════════════════════════════
// ENGINE 3: GPT-4o-mini AI (Industrial-Standard Comprehensive Analysis)
// ═══════════════════════════════════════════════════════════════

const runAIAnalysis = async (resumeText, jobDescription, candidateContext = {}) => {
    const startTime = Date.now();
    console.log('🤖 [AI Engine] Starting industrial-standard GPT-4o-mini analysis...');

    try {
        const { candidateName, candidateRole, candidateEmail } = candidateContext || {};

        const systemPrompt = `You are an Elite Career Coach, ATS Expert, and Senior Technical Recruiter with 25+ years experience at FAANG companies (Google, Meta, Amazon, Apple, Netflix).

YOUR EXPERTISE INCLUDES:
- Resume optimization for ATS systems (Workday, Greenhouse, Lever, iCIMS, Taleo)
- Career coaching and professional development strategy
- Technical skill assessment and gap analysis
- Industry-specific hiring trends and requirements
- Interview preparation and candidate positioning

CRITICAL REQUIREMENTS FOR YOUR ANALYSIS:
1. BE EXTREMELY SPECIFIC: Never give generic advice. Every suggestion must reference ACTUAL content from the resume.
2. PROVIDE CONCRETE EXAMPLES: Include specific wording improvements, exact phrases to add, and real actions to take.
3. QUANTIFY EVERYTHING: Use metrics, percentages, and specific numbers in your assessments.
4. PERSONALIZE: Address the candidate by name if provided. Reference their specific experience and skills.
5. PRIORITIZE: Rank suggestions by impact - what will get them more interviews fastest?
6. BE HONEST BUT CONSTRUCTIVE: Don't sugarcoat issues, but always provide a path forward.
7. INCLUDE LEARNING RESOURCES: For skill gaps, suggest specific courses, certifications, or projects.

You evaluate resumes using the same rigorous standards as: LinkedIn Talent Solutions, Google Hiring, Amazon Bar Raiser, and top tech recruiters.`;

        const candidateHeader = candidateName
            ? `CANDIDATE CONTEXT:
Name: ${candidateName}
${candidateRole ? `Target role or goal: ${candidateRole}\n` : ''}${candidateEmail ? `Email: ${candidateEmail}\n` : ''}`
            : '';

        const userPrompt = `Perform an ELITE-LEVEL, COMPREHENSIVE resume analysis with HIGHLY SPECIFIC and ACTIONABLE recommendations.

${candidateHeader ? `${candidateHeader}\n` : ''}═══════════════════════════════════════════
RESUME TEXT:
═══════════════════════════════════════════
${resumeText.substring(0, 8000)}

═══════════════════════════════════════════
JOB REQUIREMENTS:
═══════════════════════════════════════════
${jobDescription ? jobDescription.substring(0, 3000) : 'General software engineering role - evaluate for broad technical competency across frontend, backend, and full-stack positions'}

═══════════════════════════════════════════
ANALYSIS REQUIREMENTS - BE EXTREMELY DETAILED:
═══════════════════════════════════════════

Return ONLY valid JSON with this EXACT structure. EVERY field must contain SPECIFIC, ACTIONABLE information based on the actual resume content:

{
    "score": <0-100 overall ATS match score>,
    "atsScore": <0-100 ATS parsing compatibility>,
    "recommendation": "<Strong Match|Good Match|Partial Match|Needs Improvement|Not Recommended>",
    "overallFit": "<Excellent|Strong|Good|Fair|Poor>",
    
    "sectionScores": {
        "experience": {"score": <0-100>, "years": <number>, "relevance": "<High|Medium|Low>"},
        "education": {"score": <0-100>, "level": "<PhD|Master|Bachelor|Other>", "field": "<field>"},
        "skills": {"score": <0-100>, "technicalDepth": "<Expert|Advanced|Intermediate|Beginner>"},
        "projects": {"score": <0-100>, "complexity": "<High|Medium|Low>"},
        "certifications": {"score": <0-100>, "count": <number>}
    },
    
    "skillAnalysis": {
        "matched": [
            {
                "skill": "<exact skill name>",
                "proficiency": "<Expert|Advanced|Intermediate>",
                "evidence": "<SPECIFIC quote or reference from resume proving this skill>"
            }
        ],
        "missing": [
            {
                "skill": "<missing skill>",
                "importance": "<Critical|Important|Nice-to-have>",
                "suggestion": "<SPECIFIC learning path: exact course name, certification, or project to build>",
                "timeToAcquire": "<estimated time: e.g., '2-4 weeks', '1-2 months'>"
            }
        ],
        "bonus": ["<valuable skills that exceed job requirements>"]
    },
    
    "experienceAnalysis": {
        "totalYears": <number>,
        "relevantYears": <number>,
        "seniorityLevel": "<Entry|Junior|Mid|Senior|Lead|Principal>",
        "industryFit": "<Excellent|Good|Moderate|Low>",
        "highlights": ["<SPECIFIC achievements from their resume that stand out>"],
        "gaps": ["<SPECIFIC experience gaps and exactly what to do about them>"]
    },
    
    "keyStrengths": ["<5 SPECIFIC strengths with evidence from resume>"],
    "concerns": ["<SPECIFIC red flags with exactly how to address them>"],
    
    "detailedSuggestions": [
        {
            "priority": "<Critical|High|Medium|Low>",
            "category": "<Skills|Experience|Format|ATS|Content|Achievements>",
            "title": "<short descriptive title>",
            "currentState": "<what the resume currently shows>",
            "suggestion": "<SPECIFIC action to take>",
            "example": "<EXACT wording or change to make>",
            "impact": "<why this matters for getting interviews>"
        }
    ],
    
    "quickWins": [
        "<3-5 easy improvements that can be done in under 30 minutes each>"
    ],
    
    "atsOptimizationTips": [
        "<SPECIFIC ATS improvements: exact keywords to add, formatting fixes, section naming>"
    ],
    
    "learningResources": [
        {
            "skill": "<skill to develop>",
            "resource": "<specific course, certification, or tutorial name>",
            "platform": "<Coursera|Udemy|LinkedIn Learning|freeCodeCamp|etc>",
            "estimatedTime": "<time to complete>",
            "priority": "<Critical|High|Medium>"
        }
    ],
    
    "interviewQuestions": [
        {
            "question": "<behavioral question based on their experience>",
            "reason": "<why interviewer would ask this>",
            "howToPrepare": "<SPECIFIC guidance on answering>"
        },
        {
            "question": "<technical question based on their skills>",
            "reason": "<what skill this tests>",
            "howToPrepare": "<SPECIFIC topics to review>"
        }
    ],
    
    "competitorComparison": {
        "marketPosition": "<Top 10%|Top 25%|Average|Below Average>",
        "standoutFactor": "<what makes this candidate unique vs other applicants>",
        "competitiveAdvantage": "<how to leverage their strengths in applications>"
    },
    
    "keywords": {
        "found": ["<ATS keywords currently in resume>"],
        "missing": ["<SPECIFIC keywords to add with context on where to place them>"]
    },
    
    "improvements": [
        "<Top 5 MOST IMPACTFUL improvements with SPECIFIC actions>"
    ]
}`;

        const result = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], {
            temperature: 0.2,
            maxTokens: 4000,
            feature: 'RESUME_ANALYSIS'
        });

        const analysis = parseAIJson(result.content);
        console.log(`✅ [AI Engine] Analysis complete | Score: ${analysis.score} | Model: ${result.model}`);

        return {
            engine: 'gpt-4o-mini',
            success: true,
            score: analysis.score,
            data: analysis,
            model: result.model,
            latency: Date.now() - startTime
        };
    } catch (error) {
        console.error('❌ [AI Engine] Analysis failed:', error.message);
        return {
            engine: 'gpt-4o-mini',
            success: false,
            error: error.message,
            latency: Date.now() - startTime
        };
    }
};


// ═══════════════════════════════════════════════════════════════
// UNIFIED ANALYZER - RUNS ALL 3 IN PARALLEL
// ═══════════════════════════════════════════════════════════════

/**
 * Run all 3 analysis engines in parallel
 * Returns consensus result with confidence score
 */
export const analyzeResumeUnified = async (resumeText, jobDescription, options = {}) => {
    console.log('🚀 [Resume UNIFIED] Starting industrial-standard 3-engine analysis...');
    console.log(`📄 [Resume UNIFIED] Resume: ${resumeText.length} chars | Job: ${jobDescription.length} chars`);

    const {
        includeEngines = ['python-ml', 'javascript-regex', 'gpt-4o-mini'],
        onProgress = null,
        timeout = 15000,
        candidateName = null,
        candidateRole = null,
        candidateEmail = null
    } = options;

    const startTime = Date.now();
    const results = {
        engines: {},
        consensus: null,
        meta: {
            startTime: new Date().toISOString(),
            enginesRequested: includeEngines
        }
    };

    // Notify progress
    const notifyProgress = (engine, status, data = null) => {
        if (onProgress) {
            onProgress({ engine, status, data, timestamp: Date.now() });
        }
    };

    // Run engines in parallel
    const enginePromises = [];

    if (includeEngines.includes('javascript-regex')) {
        notifyProgress('javascript-regex', 'started');
        enginePromises.push(
            runJavaScriptAnalysis(resumeText, jobDescription)
                .then(r => { notifyProgress('javascript-regex', 'completed', r); return r; })
        );
    }

    if (includeEngines.includes('python-ml')) {
        notifyProgress('python-ml', 'started');
        enginePromises.push(
            runPythonML(resumeText, jobDescription)
                .then(r => { notifyProgress('python-ml', 'completed', r); return r; })
        );
    }

    if (includeEngines.includes('gpt-4o-mini')) {
        notifyProgress('gpt-4o-mini', 'started');
        enginePromises.push(
            runAIAnalysis(resumeText, jobDescription, { candidateName, candidateRole, candidateEmail })
                .then(r => { notifyProgress('gpt-4o-mini', 'completed', r); return r; })
        );
    }

    // Wait for all engines (with timeout)
    const engineResults = await Promise.race([
        Promise.all(enginePromises),
        new Promise(resolve => setTimeout(() => resolve([]), timeout))
    ]);

    // Process results
    const successfulEngines = [];
    const scores = [];

    for (const result of engineResults) {
        results.engines[result.engine] = result;

        if (result.success) {
            successfulEngines.push(result);
            scores.push(result.score);
        }
    }

    // Calculate consensus score (weighted average) - 2 ENGINE SYSTEM
    if (scores.length > 0) {
        // Updated weights for 2-engine industrial-standard analysis
        const weights = {
            'gpt-4o-mini': 0.6,      // AI is most accurate (primary)
            'python-ml': 0.4         // ML provides additional validation
        };

        let weightedSum = 0;
        let totalWeight = 0;

        for (const engine of successfulEngines) {
            const weight = weights[engine.engine] || 0.33;
            weightedSum += engine.score * weight;
            totalWeight += weight;
        }

        const consensusScore = Math.round(weightedSum / totalWeight);

        const mergedData = {};

        const priority = ['gpt-4o-mini', 'python-ml', 'javascript-regex'];
        for (const engineName of priority) {
            const engine = results.engines[engineName];
            if (engine?.success && engine.data) {
                Object.assign(mergedData, engine.data);
            }
        }

        const aiData = results.engines['gpt-4o-mini']?.data || {};

        const aiMatchedSkills = Array.isArray(aiData.skillAnalysis?.matched)
            ? aiData.skillAnalysis.matched.map((m) => m.skill).filter(Boolean)
            : [];

        const aiMissingSkills = Array.isArray(aiData.skillAnalysis?.missing)
            ? aiData.skillAnalysis.missing.map((m) => m.skill).filter(Boolean)
            : [];

        const combinedMatchedSkills = [
            ...(Array.isArray(mergedData.keySkillsMatch) ? mergedData.keySkillsMatch : []),
            ...aiMatchedSkills
        ].filter((value, index, self) => value && self.indexOf(value) === index);

        if (combinedMatchedSkills.length > 0) {
            mergedData.keySkillsMatch = combinedMatchedSkills;
        }

        const combinedMissingSkills = [
            ...(Array.isArray(mergedData.missingSkills) ? mergedData.missingSkills : []),
            ...aiMissingSkills
        ].filter((value, index, self) => value && self.indexOf(value) === index);

        if (combinedMissingSkills.length > 0) {
            mergedData.missingSkills = combinedMissingSkills;
        }

        if (!mergedData.experienceYears && aiData.experienceAnalysis?.totalYears != null) {
            mergedData.experienceYears = aiData.experienceAnalysis.totalYears;
        }

        if (!mergedData.educationLevel && aiData.sectionScores?.education?.level) {
            mergedData.educationLevel = aiData.sectionScores.education.level;
        }

        if (!mergedData.atsScore && typeof aiData.atsScore === 'number') {
            mergedData.atsScore = aiData.atsScore;
        }

        const suggestionsRaw = [];

        if (Array.isArray(mergedData.suggestions)) {
            suggestionsRaw.push(...mergedData.suggestions);
        } else if (typeof mergedData.suggestions === 'string') {
            suggestionsRaw.push(mergedData.suggestions);
        }

        if (Array.isArray(aiData.improvements)) {
            suggestionsRaw.push(...aiData.improvements);
        }

        if (Array.isArray(aiData.suggestions)) {
            suggestionsRaw.push(...aiData.suggestions);
        }

        if (Array.isArray(aiData.skillAnalysis?.missing)) {
            aiData.skillAnalysis.missing.forEach((item) => {
                if (!item) return;
                if (typeof item === 'string') {
                    suggestionsRaw.push(item);
                    return;
                }
                const parts = [];
                if (item.skill) {
                    parts.push(`Develop skill: ${item.skill}`);
                }
                if (item.importance) {
                    parts.push(`(${item.importance})`);
                }
                if (item.suggestion) {
                    parts.push(`- ${item.suggestion}`);
                }
                if (item.timeToAcquire) {
                    parts.push(`[${item.timeToAcquire}]`);
                }
                const text = parts.join(' ').trim();
                if (text) {
                    suggestionsRaw.push(text);
                }
            });
        }

        const normalizedSuggestions = normalizeSuggestions(suggestionsRaw);

        if (normalizedSuggestions.length > 0) {
            mergedData.suggestions = normalizedSuggestions;
        } else {
            delete mergedData.suggestions;
        }

        // ═══════════════════════════════════════════════════════════════
        // MERGE NEW DETAILED AI ANALYSIS FIELDS
        // ═══════════════════════════════════════════════════════════════

        // Detailed Suggestions (prioritized, categorized)
        if (Array.isArray(aiData.detailedSuggestions) && aiData.detailedSuggestions.length > 0) {
            mergedData.detailedSuggestions = aiData.detailedSuggestions;
        }

        // Quick Wins (easy improvements)
        if (Array.isArray(aiData.quickWins) && aiData.quickWins.length > 0) {
            mergedData.quickWins = aiData.quickWins;
        }

        // ATS Optimization Tips
        if (Array.isArray(aiData.atsOptimizationTips) && aiData.atsOptimizationTips.length > 0) {
            mergedData.atsOptimizationTips = aiData.atsOptimizationTips;
        }

        // Learning Resources (for skill gaps)
        if (Array.isArray(aiData.learningResources) && aiData.learningResources.length > 0) {
            mergedData.learningResources = aiData.learningResources;
        }

        // Interview Questions (with preparation guidance)
        if (Array.isArray(aiData.interviewQuestions) && aiData.interviewQuestions.length > 0) {
            mergedData.interviewQuestions = aiData.interviewQuestions;
        }

        // Section Scores (detailed breakdown)
        if (aiData.sectionScores) {
            mergedData.sectionScores = aiData.sectionScores;
        }

        // Full Skill Analysis (with proficiency levels and evidence)
        if (aiData.skillAnalysis) {
            mergedData.skillAnalysis = aiData.skillAnalysis;
        }

        // Experience Analysis (detailed)
        if (aiData.experienceAnalysis) {
            mergedData.experienceAnalysis = aiData.experienceAnalysis;
        }

        // Key Strengths (with evidence)
        if (Array.isArray(aiData.keyStrengths) && aiData.keyStrengths.length > 0) {
            mergedData.keyStrengths = aiData.keyStrengths;
        }

        // Concerns (red flags with solutions)
        if (Array.isArray(aiData.concerns) && aiData.concerns.length > 0) {
            mergedData.concerns = aiData.concerns;
        }

        // Competitor Comparison
        if (aiData.competitorComparison) {
            mergedData.competitorComparison = aiData.competitorComparison;
        }

        // Keywords (found and missing)
        if (aiData.keywords) {
            mergedData.keywords = aiData.keywords;
        }


        // Calculate confidence based on agreement
        const scoreVariance = scores.length > 1
            ? Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - consensusScore, 2), 0) / scores.length)
            : 0;
        const confidence = Math.max(0.5, 1 - (scoreVariance / 50));

        results.consensus = {
            score: Math.max(20, Math.min(95, consensusScore)),
            confidence: Math.round(confidence * 100),
            recommendation: getRecommendation(consensusScore),
            agreementLevel: getAgreementLevel(scoreVariance),
            ...mergedData,
            analysisMethod: 'unified-multi-engine',
            enginesUsed: successfulEngines.map(e => e.engine),
            engineScores: successfulEngines.map(e => ({ engine: e.engine, score: e.score }))
        };
    } else {
        // All engines failed - return minimal result
        results.consensus = {
            score: 50,
            confidence: 0,
            recommendation: 'Unable to analyze',
            error: 'All analysis engines failed',
            analysisMethod: 'unified-multi-engine-failed'
        };
    }

    results.meta.totalLatency = Date.now() - startTime;
    results.meta.successfulEngines = successfulEngines.length;
    results.meta.completedAt = new Date().toISOString();

    return results;
};

const normalizeSuggestions = (items) => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return item.trim();
            if (typeof item === 'object') {
                const text = item.text || item.suggestion || item.message || null;
                if (typeof text === 'string') return text.trim();
                try {
                    return JSON.stringify(item);
                } catch {
                    return null;
                }
            }
            return String(item).trim();
        })
        .filter((value, index, self) => value && self.indexOf(value) === index);
};

const getRecommendation = (score) => {
    if (score >= 80) return 'Strong Match';
    if (score >= 65) return 'Good Match';
    if (score >= 50) return 'Partial Match';
    return 'Not Recommended';
};

const getAgreementLevel = (variance) => {
    if (variance < 5) return 'High Agreement';
    if (variance < 15) return 'Moderate Agreement';
    return 'Low Agreement';
};

// ═══════════════════════════════════════════════════════════════
// STREAMING ANALYSIS (Real-time WebSocket Updates)
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze with real-time streaming updates via WebSocket
 */
export const analyzeResumeStreaming = async (resumeText, jobDescription, socket, eventName = 'analysis_progress') => {
    const results = await analyzeResumeUnified(resumeText, jobDescription, {
        onProgress: (update) => {
            socket.emit(eventName, {
                type: 'engine_update',
                ...update
            });
        }
    });

    // Emit final result
    socket.emit(eventName, {
        type: 'complete',
        results: results.consensus,
        meta: results.meta
    });

    return results;
};

// ═══════════════════════════════════════════════════════════════
// QUICK ANALYSIS (JS only - for instant feedback)
// ═══════════════════════════════════════════════════════════════

export const analyzeResumeQuick = async (resumeText, jobDescription) => {
    const result = await runJavaScriptAnalysis(resumeText, jobDescription);
    return {
        score: result.score,
        ...result.data,
        analysisMethod: 'quick-javascript',
        latency: result.latency
    };
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export default {
    analyzeResumeUnified,
    analyzeResumeStreaming,
    analyzeResumeQuick,
    runPythonML,
    runJavaScriptAnalysis,
    runAIAnalysis
};
