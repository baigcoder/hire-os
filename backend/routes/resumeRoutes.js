import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pdfParse from 'pdf-parse';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { User } from '../models/user.model.js';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { analyzeResume } from '../utils/resumeAnalyzer.js';
import { analyzeResumeWithGPT5 } from '../utils/aiService.js';
// Unified AI Analyzer (Python ML + JS Regex + GPT-4o-mini)
import { analyzeResumeUnified, analyzeResumeQuick } from '../utils/unifiedAnalyzer.js';
import { aiLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// Flask API URL (run flask-resume-api.py on this port)
const FLASK_API_URL = process.env.FLASK_RESUME_API || 'http://localhost:5001';
const GPT5_API_KEY = process.env.GPT5_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Memory storage for PDF parsing (no disk write needed)
const memoryStorage = multer.memoryStorage();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Route to upload and analyze resume
router.post('/upload/:jobId', isAuthenticated, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a resume' });
    }

    const jobId = req.params.jobId;
    const userId = req.id;
    const resumePath = req.file.path;

    // Analyze the resume
    const analysisResult = await analyzeResume(resumePath, jobId);

    // Save the analysis result
    const resumeAnalysis = await ResumeAnalysis.create({
      userId,
      jobId,
      resumePath,
      analysisScore: analysisResult.score,
      keySkillsMatch: analysisResult.keySkillsMatch,
      experienceMatch: analysisResult.experienceMatch,
      educationMatch: analysisResult.educationMatch,
      overallFit: analysisResult.overallFit
    });

    res.status(201).json({
      message: 'Resume uploaded and analyzed successfully',
      analysis: resumeAnalysis
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ message: 'Server error during resume upload and analysis' });
  }
});

// Route to get resume analysis for a specific job application
router.get('/:jobId/:userId', isAuthenticated, async (req, res) => {
  try {
    const { jobId, userId } = req.params;

    // Check if the requesting user is the job poster or the applicant
    const analysis = await ResumeAnalysis.findOne({ jobId, userId });

    if (!analysis) {
      return res.status(404).json({ message: 'Resume analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error fetching resume analysis:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to download resume
router.get('/download/:resumePath', isAuthenticated, (req, res) => {
  try {
    const resumePath = path.join(__dirname, '../uploads', req.params.resumePath);

    if (!fs.existsSync(resumePath)) {
      return res.status(404).json({ message: 'Resume file not found' });
    }

    res.download(resumePath);
  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to analyze resume text (for student dashboard)
router.post('/analyze-text', isAuthenticated, async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText) {
      return res.status(400).json({ success: false, message: 'Resume text is required' });
    }

    // Use a generic job description if none provided
    const jobText = jobDescription || `
      Looking for a skilled professional with experience in:
      - Programming (JavaScript, Python, Java)
      - Web development (React, Node.js, HTML, CSS)
      - Database management (SQL, MongoDB)
      - Version control (Git)
      - Problem solving and teamwork
    `;

    // Quick JavaScript-based analysis
    const result = analyzeResumeText(resumeText, jobText);

    res.status(200).json({
      success: true,
      analysis: result
    });
  } catch (error) {
    console.error('Resume text analysis error:', error);
    res.status(500).json({ success: false, message: 'Analysis failed' });
  }
});

// ═══════════════════════════════════════════════════════════════
// UNIFIED AI ANALYSIS (3 Engines: Python ML + JS Regex + GPT-4o-mini)
// Industrial-standard with consensus scoring and confidence metrics
// ═══════════════════════════════════════════════════════════════

/**
 * @route POST /api/resume/unified-analyze
 * @desc Analyze resume using all 3 AI engines for best accuracy
 * @access Private
 */
router.post('/unified-analyze', isAuthenticated, aiLimiter, async (req, res) => {
  try {
    const { resumeText, jobDescription, candidateId } = req.body;
    let candidateName = null;

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        message: 'Resume text is required'
      });
    }

    const startTime = Date.now();
    const progressUpdates = [];

    try {
      const idToLookup = candidateId || req.id;
      if (idToLookup) {
        const user = await User.findById(idToLookup).select('fullname name profile').lean();
        if (user) {
          candidateName = user.fullname || user.name || user.profile?.fullName || null;
        }
      }
    } catch (e) {
      console.warn('Could not load candidate name for unified analyze:', e.message);
    }

    // Run unified analysis with all 3 engines
    const result = await analyzeResumeUnified(resumeText, jobDescription || '', {
      onProgress: (update) => {
        progressUpdates.push({
          ...update,
          timestamp: Date.now() - startTime
        });
      },
      candidateName
    });

    // Save to database if candidateId provided
    if (candidateId && result.consensus) {
      try {
        await ResumeAnalysis.findOneAndUpdate(
          { userId: candidateId },
          {
            userId: candidateId,
            analysisScore: result.consensus.score,
            keySkillsMatch: result.consensus.keySkillsMatch || [],
            experienceMatch: result.consensus.experienceYears || null,
            overallFit: result.consensus.recommendation,
            analysisMethod: 'unified-multi-engine',
            engineResults: Object.entries(result.engines).map(([name, data]) => ({
              engine: name,
              score: data.score,
              success: data.success,
              latency: data.latency
            })),
            confidence: result.consensus.confidence
          },
          { upsert: true, new: true }
        );
      } catch (saveError) {
        console.warn('Could not save analysis:', saveError.message);
      }
    }

    res.status(200).json({
      success: true,
      analysis: result.consensus,
      engines: Object.entries(result.engines).map(([name, data]) => ({
        engine: name,
        score: data.score,
        success: data.success,
        latency: data.latency
      })),
      progress: progressUpdates,
      meta: result.meta
    });

  } catch (error) {
    console.error('Unified analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/resume/quick-analyze
 * @desc Fast JavaScript-only analysis (instant, no API calls)
 * @access Private
 */
router.post('/quick-analyze', isAuthenticated, async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText) {
      return res.status(400).json({
        success: false,
        message: 'Resume text is required'
      });
    }

    const result = await analyzeResumeQuick(resumeText, jobDescription || '');

    res.status(200).json({
      success: true,
      analysis: result,
      method: 'quick-javascript'
    });

  } catch (error) {
    console.error('Quick analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis failed'
    });
  }
});

// Quick resume score endpoint

router.get('/quick-score', isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;

    // Get most recent analysis for this user
    const analysis = await ResumeAnalysis.findOne({ userId })
      .sort({ createdAt: -1 });

    if (analysis) {
      return res.status(200).json({
        success: true,
        score: analysis.analysisScore,
        lastAnalyzed: analysis.createdAt,
        fit: analysis.overallFit
      });
    }

    // Default response if no analysis exists
    res.status(200).json({
      success: true,
      score: null,
      message: 'Upload your resume to get a score'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get score' });
  }
});

// Helper function for text-based analysis
function analyzeResumeText(resumeText, jobText) {
  const lowerResume = resumeText.toLowerCase();
  const lowerJob = jobText.toLowerCase();

  // Skills database
  const skillsDB = {
    languages: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin'],
    frontend: ['react', 'vue', 'angular', 'svelte', 'next.js', 'html', 'css', 'tailwind', 'bootstrap', 'sass'],
    backend: ['node', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'graphql', 'rest', 'api'],
    databases: ['sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'sqlite', 'firebase', 'supabase'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'github actions'],
    tools: ['git', 'github', 'jira', 'figma', 'linux', 'agile', 'scrum', 'ci/cd', 'testing']
  };

  const allSkills = Object.values(skillsDB).flat();

  // Extract skills
  const resumeSkills = allSkills.filter(skill =>
    new RegExp(`\\b${skill}\\b`, 'i').test(lowerResume)
  );
  const jobSkills = allSkills.filter(skill =>
    new RegExp(`\\b${skill}\\b`, 'i').test(lowerJob)
  );

  const matchedSkills = resumeSkills.filter(s => jobSkills.includes(s));
  const missingSkills = jobSkills.filter(s => !resumeSkills.includes(s)).slice(0, 5);

  // Extract experience
  const expMatch = lowerResume.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
  const experienceYears = expMatch ? parseInt(expMatch[1]) : null;

  // Extract education
  const educations = [
    { keywords: ['phd', 'doctorate'], level: 'PhD', score: 100 },
    { keywords: ['master', 'msc', 'mba'], level: 'Master', score: 85 },
    { keywords: ['bachelor', 'bsc', 'degree'], level: 'Bachelor', score: 70 },
    { keywords: ['associate', 'diploma'], level: 'Associate', score: 50 }
  ];

  let education = { level: 'Not specified', score: 50 };
  for (const edu of educations) {
    if (edu.keywords.some(k => lowerResume.includes(k))) {
      education = { level: edu.level, score: edu.score };
      break;
    }
  }

  // Calculate scores
  const skillMatch = jobSkills.length > 0 ? (matchedSkills.length / jobSkills.length) * 100 : 50;
  const expScore = experienceYears ? Math.min(100, experienceYears * 15) : 60;
  const overallScore = Math.round((skillMatch * 0.4) + (expScore * 0.3) + (education.score * 0.3));
  const clampedScore = Math.max(25, Math.min(95, overallScore));

  let overallFit = 'Poor';
  if (clampedScore >= 80) overallFit = 'Excellent';
  else if (clampedScore >= 65) overallFit = 'Good';
  else if (clampedScore >= 50) overallFit = 'Fair';

  return {
    score: clampedScore,
    keySkillsMatch: matchedSkills,
    missingSkills: missingSkills,
    experienceYears: experienceYears,
    experienceMatch: expScore,
    educationLevel: education.level,
    educationMatch: education.score,
    overallFit: overallFit,
    totalSkillsFound: resumeSkills.length
  };
}

// =============================================
// ENHANCED FLASK API INTEGRATION ENDPOINTS
// =============================================

// Helper: Try Flask API, fallback to JS analyzer
async function analyzeWithFlaskOrFallback(resumeText, jobDescription = null) {
  try {
    // Try Flask API first
    const response = await axios.post(`${FLASK_API_URL}/analyze`, {
      resumeText,
      jobDescription
    }, { timeout: 10000 });

    if (response.data.success) {
      return { ...response.data.analysis, source: 'flask-ml' };
    }
  } catch (error) {
    console.log('Flask API unavailable, using JS fallback:', error.message);
  }

  // Fallback to JS analyzer
  const result = analyzeResumeText(resumeText, jobDescription || '');
  return { ...result, source: 'js-fallback' };
}

// Enhanced analyze endpoint - NOW USES UNIFIED 3-ENGINE ANALYZER
// Industrial-standard: Python ML + JavaScript Regex + GPT-4o-mini
router.post('/enhanced-analyze', isAuthenticated, async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    let candidateName = null;
    console.log('🔥 [Resume] Enhanced analyze request received');

    if (!resumeText || resumeText.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: 'Resume text is too short (minimum 50 characters)'
      });
    }

    console.log('🚀 [Resume] Starting unified 3-engine analysis...');

    try {
      if (req.id) {
        const user = await User.findById(req.id).select('fullname name profile').lean();
        if (user) {
          candidateName = user.fullname || user.name || user.profile?.fullName || null;
        }
      }
    } catch (e) {
      console.warn('Could not load candidate name for enhanced analyze:', e.message);
    }

    // Use unified analyzer with all 3 engines
    const result = await analyzeResumeUnified(resumeText, jobDescription || '', {
      onProgress: (update) => {
        console.log(`📊 [Resume] Engine ${update.engine}: ${update.status}`);
      },
      candidateName
    });

    const analysis = result.consensus || {};
    console.log(`✅ [Resume] Unified analysis complete | Score: ${analysis.score} | Confidence: ${analysis.confidence}%`);

    // Save analysis to database
    const userId = req.id;
    await ResumeAnalysis.findOneAndUpdate(
      { userId, type: 'practice' },
      {
        userId,
        analysisScore: analysis.score,
        keySkillsMatch: analysis.keySkillsMatch || [],
        missingSkills: analysis.missingSkills || [],
        experienceMatch: analysis.experienceYears ? analysis.experienceYears * 15 : 50,
        educationMatch: analysis.educationLevel === 'PhD' ? 100 : analysis.educationLevel === 'Master' ? 85 : 70,
        overallFit: analysis.recommendation || 'Fair',
        atsScore: analysis.score,
        type: 'practice',
        analysisMethod: 'unified-3-engine',
        enginesUsed: analysis.enginesUsed || [],
        confidence: analysis.confidence,
        analyzedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      analysis: {
        ...analysis,
        meta: result.meta
      }
    });
  } catch (error) {
    console.error('❌ [Resume] Enhanced analyze error:', error);
    res.status(500).json({ success: false, message: 'Analysis failed' });
  }
});

// Compare resume to specific job
router.post('/compare-to-job', isAuthenticated, async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: 'Both resume and job description are required'
      });
    }

    try {
      // Try Flask API
      const response = await axios.post(`${FLASK_API_URL}/compare`, {
        resumeText,
        jobDescription
      }, { timeout: 10000 });

      if (response.data.success) {
        return res.json(response.data);
      }
    } catch (e) {
      console.log('Flask compare unavailable, using JS fallback');
    }

    // JS fallback
    const result = analyzeResumeText(resumeText, jobDescription);
    res.json({
      success: true,
      comparison: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Comparison failed' });
  }
});

// Get user's latest analysis
router.get('/my-analysis', isAuthenticated, async (req, res) => {
  try {
    const userId = req.id;

    const analysis = await ResumeAnalysis.findOne({ userId })
      .sort({ analyzedAt: -1 });

    if (!analysis) {
      return res.json({
        success: true,
        analysis: null,
        message: 'No analysis found. Upload your resume to get started.'
      });
    }

    res.json({
      success: true,
      analysis: {
        score: analysis.analysisScore,
        overallFit: analysis.overallFit,
        keySkills: analysis.keySkillsMatch,
        missingSkills: analysis.missingSkills,
        experienceMatch: analysis.experienceMatch,
        educationMatch: analysis.educationMatch,
        atsScore: analysis.atsScore,
        analyzedAt: analysis.analyzedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get analysis' });
  }
});

// Health check for Flask API
router.get('/flask-status', async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_API_URL}/health`, { timeout: 3000 });
    res.json({
      success: true,
      flask: 'online',
      ...response.data
    });
  } catch (error) {
    res.json({
      success: true,
      flask: 'offline',
      message: 'Flask API not available, using JS fallback'
    });
  }
});

// ==================== ENHANCED PDF RESUME ANALYZER ====================

// PDF upload with memory storage for parsing
const pdfUpload = multer({
  storage: memoryStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Enhanced PDF Resume Analyzer
 * POST /api/v1/resume/analyze-pdf
 * - Accepts single-page PDF
 * - Extracts text using pdf-parse
 * - Validates content (blocks empty resumes)
 * - Uses Gemini AI for accurate ML-powered scoring
 */
router.post('/analyze-pdf', isAuthenticated, pdfUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF resume file'
      });
    }

    let pdfData;
    try {
      pdfData = await pdfParse(req.file.buffer);
    } catch (pdfError) {
      console.error('PDF parse error:', pdfError);
      return res.status(400).json({
        success: false,
        message: 'Failed to parse PDF. Please ensure it is a valid PDF file.'
      });
    }

    const extractedText = pdfData.text || '';
    const normalizedText = normalizeResumeText(extractedText);
    const pageCount = pdfData.numpages || 1;

    // Validate PDF content
    if (normalizedText.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Resume appears to be empty or contains too little text. Please upload a complete resume.',
        code: 'EMPTY_RESUME'
      });
    }

    // Warn about multi-page PDFs
    const warnings = [];
    if (pageCount > 2) {
      warnings.push(`Your resume has ${pageCount} pages. Consider condensing to 1-2 pages for better ATS performance.`);
    }

    // Get optional job description for matching
    const jobDescription = req.body.jobDescription || '';

    const onePageText = buildOnePageExcerpt(normalizedText, 4000);

    const analysis = await analyzeResumeWithAI(normalizedText, jobDescription);

    analysis.onePageText = onePageText;
    analysis.suggestedRoles = deriveSuggestedRoles(analysis);
    analysis.onePageSummary = buildOnePageSummary(analysis, onePageText);

    // Add warnings to response
    analysis.warnings = [...(analysis.warnings || []), ...warnings];
    analysis.pageCount = pageCount;
    analysis.characterCount = extractedText.length;

    // Save analysis to database
    try {
      await ResumeAnalysis.findOneAndUpdate(
        { userId: req.id },
        {
          userId: req.id,
          resumeText: onePageText.substring(0, 5000),
          analysisScore: analysis.score,
          overallFit: analysis.overallFit,
          keySkillsMatch: analysis.skills?.matched || [],
          missingSkills: analysis.skills?.missing || [],
          atsScore: analysis.atsScore,
          analyzedAt: new Date(),
          source: analysis.source || 'pdf-ai'
        },
        { upsert: true, new: true }
      );
    } catch (dbErr) {
      console.log('DB save error (non-fatal):', dbErr.message);
    }

    res.json({
      success: true,
      message: 'Resume analyzed successfully',
      analysis
    });

  } catch (error) {
    console.error('PDF analysis error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze resume'
    });
  }
});

function normalizeResumeText(text) {
  if (!text) return '';
  const withoutControl = text.replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ');
  const withoutMultipleSpaces = withoutControl.replace(/\s+/g, ' ');
  return withoutMultipleSpaces.trim();
}

function buildOnePageExcerpt(text, maxChars = 4000) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (lastSentenceEnd > maxChars * 0.6) {
    return slice.slice(0, lastSentenceEnd + 1);
  }
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.6) {
    return slice.slice(0, lastSpace);
  }
  return slice;
}

function deriveSuggestedRoles(analysis) {
  const roles = new Set();
  const skillsFromAnalysis = analysis.skills?.matched || analysis.keySkillsMatch || [];
  const skills = skillsFromAnalysis.map((s) => String(s).toLowerCase());
  const text = (analysis.onePageText || '').toLowerCase();
  const experienceYears = analysis.experience?.yearsEstimate || analysis.experienceYears || null;
  const addIfSkill = (keywords, role) => {
    if (keywords.some((k) => skills.includes(k))) {
      roles.add(role);
    }
  };
  addIfSkill(['react', 'next.js', 'nextjs', 'vue', 'angular'], 'Frontend Developer');
  addIfSkill(['node', 'node.js', 'express', 'django', 'flask', 'spring'], 'Backend Developer');
  addIfSkill(['full stack', 'full-stack'], 'Full Stack Developer');
  addIfSkill(['python', 'pandas', 'numpy', 'machine learning', 'ml'], 'Data Analyst');
  addIfSkill(['machine learning', 'deep learning', 'pytorch', 'tensorflow'], 'ML Engineer');
  addIfSkill(['aws', 'azure', 'gcp', 'docker', 'kubernetes'], 'DevOps Engineer');
  addIfSkill(['react native', 'flutter', 'android', 'ios'], 'Mobile Developer');
  if (text.includes('intern')) {
    roles.add('Software Engineering Intern');
  }
  if (experienceYears !== null && experienceYears >= 5) {
    roles.add('Senior Software Engineer');
  }
  if (roles.size === 0) {
    roles.add('Software Engineer');
  }
  return Array.from(roles);
}

function buildOnePageSummary(analysis, onePageText) {
  const score = analysis.score ?? analysis.atsScore ?? null;
  const overallFit = analysis.overallFit || analysis.recommendation || 'Fair';
  const matchedSkills = analysis.skills?.matched || analysis.keySkillsMatch || [];
  const missingSkills = analysis.skills?.missing || analysis.missingSkills || [];
  const years = analysis.experience?.yearsEstimate || analysis.experienceYears || null;
  const improvementAreas = [];
  if (missingSkills.length > 0) {
    const topMissing = missingSkills.slice(0, 5).join(', ');
    improvementAreas.push(`Add or highlight skills: ${topMissing}.`);
  }
  if (analysis.experience?.hasQuantifiedResults === false) {
    improvementAreas.push('Add quantified results to experience (e.g. "Improved load time by 30%").');
  }
  const lowerText = (onePageText || '').toLowerCase();
  if (!/linkedin\.com/.test(lowerText)) {
    improvementAreas.push('Include a LinkedIn profile link in the contact section.');
  }
  if (!/github\.com/.test(lowerText) && !/gitlab\.com/.test(lowerText)) {
    improvementAreas.push('Add links to GitHub or live projects where relevant.');
  }
  if (!/summary|objective/i.test(onePageText || '')) {
    improvementAreas.push('Add a concise professional summary at the top of the resume.');
  }
  if (improvementAreas.length === 0 && Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0) {
    improvementAreas.push(...analysis.suggestions);
  }
  const headlineScore = score !== null ? `${score}/100` : 'N/A';
  return {
    headline: `Overall fit: ${overallFit} (${headlineScore})`,
    summary: `This one-page view focuses on your most relevant experience and skills for ATS screening.`,
    topSkills: matchedSkills.slice(0, 10),
    improvementAreas
  };
}

/**
 * Analyze resume using AI - GPT-5 first, then Gemini fallback
 */
async function analyzeResumeWithAI(resumeText, jobDescription = '') {
  // Try GPT-5 first (most accurate)
  if (GPT5_API_KEY) {
    try {
      console.log('🚀 Analyzing PDF resume with GPT-5.1...');
      const analysis = await analyzeResumeWithGPT5(resumeText, jobDescription);
      return analysis;
    } catch (error) {
      console.log('GPT-5 failed, trying Gemini:', error.message);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    return await analyzeWithGemini(resumeText, jobDescription);
  }

  // Final fallback
  return fallbackResumeAnalysis(resumeText);
}

/**
 * Gemini fallback analysis
 */
async function analyzeWithGemini(resumeText, jobDescription = '') {
  const prompt = `You are an expert resume analyst and ATS (Applicant Tracking System) specialist.

Analyze this resume and provide a comprehensive evaluation:

RESUME:
"""
${resumeText.substring(0, 8000)}
"""

${jobDescription ? `JOB DESCRIPTION FOR MATCHING:\n"""\n${jobDescription.substring(0, 2000)}\n"""` : ''}

Provide a detailed JSON response with the following structure:
{
  "score": <overall score 0-100>,
  "overallFit": "<Excellent|Strong|Good|Fair|Needs Improvement>",
  "atsScore": <ATS compatibility 0-100>,
  
  "sections": {
    "found": ["contact", "summary", "experience", "education", "skills", "projects"],
    "missing": ["certifications", "achievements"]
  },
  
  "skills": {
    "matched": ["JavaScript", "React", "Python"],
    "missing": ["Docker", "AWS"],
    "byCategory": {
      "programming": ["JavaScript", "Python"],
      "frontend": ["React"],
      "cloud": []
    }
  },
  
  "experience": {
    "yearsEstimate": 3,
    "level": "<Entry|Mid|Senior>",
    "hasQuantifiedResults": true,
    "actionVerbsUsed": ["Led", "Developed", "Implemented"]
  },
  
  "education": {
    "level": "<PhD|Masters|Bachelors|Associate|High School|Not Detected>",
    "score": <0-15>
  },
  
  "projects": {
    "count": 3,
    "hasLinks": true,
    "quality": "<Excellent|Good|Fair|Poor>"
  },
  
  "scoreBreakdown": {
    "skills": <0-30>,
    "experience": <0-25>,
    "projects": <0-20>,
    "education": <0-15>,
    "ats": <0-10>
  },
  
  "suggestions": [
    "Add quantified achievements to experience section",
    "Include more technical skills keywords"
  ],
  
  "warnings": [
    "Missing LinkedIn profile link",
    "No certifications section"
  ]
}

Be accurate and professional. Score fairly based on industry standards.
Return ONLY the JSON object, no markdown or explanation.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      analysis.source = 'gemini-ai';
      analysis.analyzedAt = new Date();
      return analysis;
    }

    throw new Error('Failed to parse Gemini response');
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return fallbackResumeAnalysis(resumeText);
  }
}

/**
 * Fallback analysis if Gemini fails
 */
function fallbackResumeAnalysis(resumeText) {
  const text = resumeText.toLowerCase();

  // Basic skill extraction
  const skills = {
    matched: [],
    missing: [],
    byCategory: {}
  };

  const skillKeywords = ['javascript', 'python', 'react', 'node', 'sql', 'git', 'html', 'css'];
  skillKeywords.forEach(skill => {
    if (text.includes(skill)) skills.matched.push(skill);
  });

  skills.missing = skillKeywords.filter(skill => !skills.matched.includes(skill));

  // Calculate basic score
  const skillScore = Math.min(skills.matched.length * 5, 30);
  const hasExperience = /experience|work|employed/i.test(text) ? 20 : 5;
  const hasEducation = /education|degree|university|college/i.test(text) ? 15 : 5;
  const hasProjects = /project|built|developed/i.test(text) ? 15 : 5;

  const score = skillScore + hasExperience + hasEducation + hasProjects;

  const suggestions = [];

  if (skills.matched.length === 0) {
    suggestions.push('Add a dedicated skills section with your main technologies.');
  } else if (skills.matched.length < 3) {
    suggestions.push('Add more technical skills that reflect your experience and tools.');
  }

  if (skills.missing.length > 0) {
    suggestions.push(`Consider learning or highlighting skills such as ${skills.missing.slice(0, 3).join(', ')} where relevant.`);
  }

  if (!/experience|work|employed/i.test(text)) {
    suggestions.push('Include a work experience section with roles, companies, and dates.');
  }

  if (!/project|built|developed/i.test(text)) {
    suggestions.push('Add a projects section describing what you built, tech stack, and impact.');
  }

  if (!/education|degree|university|college/i.test(text)) {
    suggestions.push('Include an education section with degree, institution, and graduation year.');
  }

  if (!/github\.com|gitlab\.com|bitbucket\.org|linkedin\.com/i.test(text)) {
    suggestions.push('Add links to your GitHub or LinkedIn profile where appropriate.');
  }

  const uniqueSuggestions = suggestions.filter((value, index, self) => value && self.indexOf(value) === index);

  return {
    score: Math.min(score, 100),
    overallFit: score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Improvement',
    atsScore: 60,
    skills,
    experience: { yearsEstimate: null, level: 'Unknown' },
    education: { level: 'Not Detected', score: hasEducation },
    projects: { count: 0, hasLinks: false },
    suggestions: uniqueSuggestions.length > 0 ? uniqueSuggestions : ['Add more detail so we can generate specific suggestions.'],
    warnings: ['Analysis performed with fallback method - AI unavailable'],
    source: 'fallback',
    analyzedAt: new Date()
  };
}

export default router;
