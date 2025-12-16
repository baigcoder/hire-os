/**
 * Resume Analyzer - GPT-5 Enhanced
 * Accurate resume analysis using GPT-5 with Gemini fallback
 * Supports full text extraction and comprehensive scoring
 */

import { Job } from '../models/job.model.js';
import crypto from 'crypto';
import { analyzeResumeWithGPT5, callGPT5, parseAIJson } from './aiService.js';

// API configuration
const GPT5_API_KEY = process.env.GPT5_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-1.5-flash'; // Fallback model

// In-memory cache with TTL (use Redis in production for multi-instance)
const analysisCache = new Map();
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours

// Clean cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      analysisCache.delete(key);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

/**
 * Generate cache key
 */
const getCacheKey = (resumeText, jobId) => {
  const hash = crypto.createHash('md5')
    .update((resumeText || '').substring(0, 1000) + jobId)
    .digest('hex');
  return `resume_${hash}`;
};

/**
 * Extended skills database for accurate matching
 */
const SKILLS_DATABASE = {
  // Programming Languages
  languages: [
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang',
    'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
    'objective-c', 'dart', 'lua', 'haskell', 'elixir', 'clojure'
  ],
  // Frontend
  frontend: [
    'react', 'reactjs', 'vue', 'vuejs', 'angular', 'svelte', 'next.js', 'nextjs',
    'nuxt', 'gatsby', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less',
    'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui', 'chakra',
    'styled-components', 'emotion', 'webpack', 'vite', 'rollup', 'parcel'
  ],
  // Backend
  backend: [
    'node', 'nodejs', 'express', 'expressjs', 'fastify', 'nestjs', 'koa',
    'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot',
    'laravel', 'rails', 'ruby on rails', 'asp.net', '.net', 'dotnet',
    'graphql', 'rest', 'restful', 'api', 'microservices'
  ],
  // Databases
  databases: [
    'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'sqlite',
    'oracle', 'mssql', 'mariadb', 'cassandra', 'dynamodb', 'firebase',
    'supabase', 'prisma', 'mongoose', 'sequelize', 'typeorm', 'elasticsearch'
  ],
  // Cloud & DevOps
  cloud: [
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud',
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
    'github actions', 'gitlab ci', 'circleci', 'vercel', 'netlify',
    'heroku', 'digitalocean', 'cloudflare', 'nginx', 'apache'
  ],
  // Data & AI
  data: [
    'machine learning', 'ml', 'deep learning', 'ai', 'artificial intelligence',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
    'data science', 'data analysis', 'data engineering', 'etl', 'spark',
    'hadoop', 'airflow', 'tableau', 'power bi', 'looker', 'nlp'
  ],
  // Mobile
  mobile: [
    'react native', 'flutter', 'ios', 'android', 'swift', 'kotlin',
    'xamarin', 'ionic', 'cordova', 'expo', 'mobile development'
  ],
  // Tools & Others
  tools: [
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
    'figma', 'sketch', 'adobe xd', 'photoshop', 'linux', 'bash',
    'agile', 'scrum', 'kanban', 'ci/cd', 'tdd', 'testing', 'jest',
    'cypress', 'selenium', 'postman', 'swagger'
  ],
  // Soft Skills
  soft: [
    'leadership', 'communication', 'teamwork', 'problem solving',
    'project management', 'time management', 'critical thinking',
    'adaptability', 'creativity', 'collaboration', 'mentoring'
  ]
};

// Flatten skills for quick lookup
const ALL_SKILLS = Object.values(SKILLS_DATABASE).flat();

/**
 * Extract skills from text (fast, regex-based)
 */
const extractSkills = (text) => {
  if (!text) return [];
  const lowerText = text.toLowerCase();
  return ALL_SKILLS.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lowerText);
  });
};

/**
 * Extract years of experience
 */
const extractExperience = (text) => {
  if (!text) return null;
  const patterns = [
    /(\d+)\+?\s*years?\s+(?:of\s+)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s+(?:in|as|of)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return null;
};

/**
 * Extract education level
 */
const extractEducation = (text) => {
  if (!text) return null;
  const lowerText = text.toLowerCase();

  const levels = [
    { keywords: ['phd', 'ph.d', 'doctorate', 'doctoral'], level: 'PhD', score: 100 },
    { keywords: ['master', 'msc', 'mba', 'ms ', 'm.s.'], level: 'Master', score: 85 },
    { keywords: ['bachelor', 'bsc', 'b.sc', 'b.s.', 'bs ', 'undergraduate'], level: 'Bachelor', score: 70 },
    { keywords: ['associate', 'diploma'], level: 'Associate', score: 50 },
    { keywords: ['high school', 'secondary'], level: 'High School', score: 30 }
  ];

  for (const { keywords, level, score } of levels) {
    if (keywords.some(k => lowerText.includes(k))) {
      return { level, score };
    }
  }
  return { level: 'Not specified', score: 50 };
};

/**
 * Fast keyword-based analysis (< 100ms)
 * Used as fallback or for initial quick assessment
 */
const quickAnalysis = (resumeText, jobRequirements) => {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobRequirements);

  const matchedSkills = resumeSkills.filter(s => jobSkills.includes(s));
  const missingSkills = jobSkills.filter(s => !resumeSkills.includes(s));

  const skillMatch = jobSkills.length > 0
    ? (matchedSkills.length / jobSkills.length) * 100
    : 50;

  const experience = extractExperience(resumeText);
  const education = extractEducation(resumeText);

  // Calculate overall score
  const score = Math.round(
    (skillMatch * 0.5) +
    (education.score * 0.2) +
    (experience ? Math.min(experience * 10, 100) * 0.3 : 50 * 0.3)
  );

  return {
    score: Math.min(95, Math.max(20, score)),
    keySkillsMatch: matchedSkills,
    missingSkills: missingSkills.slice(0, 10),
    experienceYears: experience,
    educationLevel: education.level,
    experienceMatch: experience ? Math.min(100, experience * 15) : 60,
    educationMatch: education.score,
    overallFit: score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Poor',
    analysisMethod: 'quick-keyword',
    processingTime: 'fast'
  };
};

/**
 * GPT-5 AI analysis (most accurate, uses full resume text)
 */
const gpt5Analysis = async (resumeText, job) => {
  if (!GPT5_API_KEY) {
    console.log('⚠️ GPT5_API_KEY not configured, trying Gemini...');
    return null;
  }

  try {
    console.log('🚀 Analyzing resume with GPT-5...');
    const jobDescription = `${job.title}\n${job.description || ''}\nRequired Skills: ${(job.skills || []).join(', ')}\nRequirements: ${(job.requirements || []).slice(0, 5).join(', ')}`;

    const analysis = await analyzeResumeWithGPT5(resumeText, jobDescription);

    // Map to standard format
    return {
      score: analysis.score,
      keySkillsMatch: analysis.skills?.matched || analysis.skills?.technical || [],
      missingSkills: analysis.skills?.missing || [],
      experienceMatch: analysis.scoreBreakdown?.experience ? Math.round(analysis.scoreBreakdown.experience * 4) : 70,
      educationMatch: analysis.scoreBreakdown?.education ? Math.round(analysis.scoreBreakdown.education * 6.67) : 60,
      overallFit: analysis.overallFit,
      highlights: analysis.candidate?.strengths || [],
      recommendation: analysis.suggestions?.[0] || 'Review recommended',
      experience: analysis.experience,
      projects: analysis.projects,
      scoreBreakdown: analysis.scoreBreakdown,
      interviewQuestions: analysis.interviewQuestions,
      atsScore: analysis.atsScore,
      analysisMethod: 'gpt-5',
      processingTime: 'accurate'
    };
  } catch (error) {
    console.error('GPT-5 analysis error:', error.message);
    return null;
  }
};

/**
 * Gemini AI analysis (fallback, < 2 seconds)
 */
const geminiAnalysis = async (resumeText, job) => {
  if (!GEMINI_API_KEY) {
    console.log('⚠️ GEMINI_API_KEY not configured');
    return null;
  }

  const prompt = `Analyze this resume for job fit. Be concise and accurate.

JOB: ${job.title}
REQUIREMENTS: ${job.requirements?.slice(0, 5).join(', ') || job.description?.substring(0, 500)}
SKILLS NEEDED: ${job.skills?.join(', ') || 'Not specified'}

RESUME (full text):
${resumeText.substring(0, 8000)}

Return ONLY valid JSON:
{"score":<0-100>,"keySkillsMatch":[<matched skills>],"missingSkills":[<missing required skills>],"experienceMatch":<0-100>,"educationMatch":<0-100>,"overallFit":"<Excellent|Good|Fair|Poor>","highlights":[<3 strengths>],"recommendation":"<1 sentence>"}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
            responseMimeType: "application/json"
          }
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return null;

    const result = JSON.parse(text);
    result.analysisMethod = 'gemini-ai';
    result.processingTime = 'accurate';

    console.log('✅ Gemini analysis complete, score:', result.score);
    return result;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('⏱️ Gemini timeout, using fallback');
    } else {
      console.error('Gemini error:', error.message);
    }
    return null;
  }
};

/**
 * Main analysis function - GPT-5 Enhanced
 * Strategy: Try GPT-5 first (most accurate), then Gemini, then quick analysis (fast)
 */
export const analyzeResume = async (resumePathOrText, jobId) => {
  const startTime = Date.now();

  try {
    // Get job details
    const job = await Job.findById(jobId).lean();
    if (!job) {
      throw new Error('Job not found');
    }

    // Handle both file path and text content
    let resumeText = resumePathOrText;
    if (resumePathOrText.endsWith('.pdf') || resumePathOrText.includes('/')) {
      // It's a path - in Vercel, we'd need to fetch from storage
      console.log('⚠️ PDF parsing not supported in serverless, using metadata');
      resumeText = '';
    }

    // Check cache first
    const cacheKey = getCacheKey(resumeText, jobId);
    const cached = analysisCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📦 Cache hit for resume analysis');
      return { ...cached.data, fromCache: true };
    }

    // Build job requirements string
    const jobRequirements = [
      job.title,
      job.description,
      ...(job.requirements || []),
      ...(job.skills || [])
    ].join(' ');

    let result;

    // Try GPT-5 first for most accurate analysis
    if (resumeText && GPT5_API_KEY) {
      console.log('🔄 Attempting GPT-5 analysis...');
      result = await gpt5Analysis(resumeText, job);
    }

    // Fallback to Gemini if GPT-5 fails or unavailable
    if (!result && resumeText && GEMINI_API_KEY) {
      console.log('🔄 Falling back to Gemini analysis...');
      result = await geminiAnalysis(resumeText, job);
    }

    // Final fallback to quick keyword-based analysis
    if (!result) {
      console.log('🔄 Using quick keyword analysis...');
      result = quickAnalysis(resumeText, jobRequirements);
    }

    // Add metadata
    result.jobId = jobId;
    result.analyzedAt = new Date().toISOString();
    result.processingMs = Date.now() - startTime;

    // Cache the result
    analysisCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Limit cache size
    if (analysisCache.size > 500) {
      const firstKey = analysisCache.keys().next().value;
      analysisCache.delete(firstKey);
    }

    console.log(`✅ Resume analysis complete in ${result.processingMs}ms`);
    return result;

  } catch (error) {
    console.error('Resume analysis error:', error);
    return {
      score: 50,
      keySkillsMatch: [],
      missingSkills: [],
      experienceMatch: 50,
      educationMatch: 50,
      overallFit: 'Fair',
      error: error.message,
      analysisMethod: 'fallback-error',
      processingMs: Date.now() - startTime
    };
  }
};

/**
 * Quick analysis API (for real-time UI feedback)
 * Always returns in < 100ms
 */
export const quickAnalyzeResume = (resumeText, jobDescription) => {
  return quickAnalysis(resumeText, jobDescription);
};

/**
 * Batch analysis for multiple resumes
 */
export const batchAnalyzeResumes = async (resumes, jobId) => {
  const results = await Promise.all(
    resumes.map(resume => analyzeResume(resume, jobId))
  );
  return results.sort((a, b) => b.score - a.score);
};

/**
 * Get cache stats
 */
export const getCacheStats = () => ({
  size: analysisCache.size,
  maxSize: 500,
  ttlHours: CACHE_TTL / (60 * 60 * 1000)
});

/**
 * Clear cache
 */
export const clearCache = () => {
  const size = analysisCache.size;
  analysisCache.clear();
  return { cleared: size };
};

export default {
  analyzeResume,
  quickAnalyzeResume,
  batchAnalyzeResumes,
  getCacheStats,
  clearCache
};