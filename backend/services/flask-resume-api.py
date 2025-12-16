#!/usr/bin/env python3
"""
HIRE.OS Resume Analysis Flask API
Fast, accurate resume scoring via REST endpoints
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import re
import os
import sys
from functools import lru_cache

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173', 'http://localhost:8000', 'http://localhost:3000'])

# ========== SKILLS DATABASE ==========
SKILLS_DATABASE = {
    'languages': [
        'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'golang',
        'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl',
        'dart', 'lua', 'haskell', 'elixir', 'clojure', 'objective-c'
    ],
    'frontend': [
        'react', 'reactjs', 'vue', 'vuejs', 'angular', 'svelte', 'next.js', 'nextjs',
        'nuxt', 'gatsby', 'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less',
        'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui', 'chakra-ui',
        'styled-components', 'webpack', 'vite', 'rollup', 'jquery'
    ],
    'backend': [
        'node', 'nodejs', 'express', 'expressjs', 'fastify', 'nestjs', 'koa',
        'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot',
        'laravel', 'rails', 'ruby on rails', 'asp.net', '.net', 'dotnet',
        'graphql', 'rest', 'restful', 'api', 'microservices', 'grpc'
    ],
    'databases': [
        'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'sqlite',
        'oracle', 'mssql', 'mariadb', 'cassandra', 'dynamodb', 'firebase',
        'supabase', 'prisma', 'mongoose', 'sequelize', 'typeorm', 'elasticsearch',
        'neo4j', 'couchdb', 'cockroachdb'
    ],
    'cloud': [
        'aws', 'amazon web services', 'azure', 'gcp', 'google cloud',
        'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins',
        'github actions', 'gitlab ci', 'circleci', 'vercel', 'netlify',
        'heroku', 'digitalocean', 'cloudflare', 'nginx', 'apache', 'lambda'
    ],
    'data_ai': [
        'machine learning', 'ml', 'deep learning', 'ai', 'artificial intelligence',
        'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
        'data science', 'data analysis', 'data engineering', 'etl', 'spark',
        'hadoop', 'airflow', 'tableau', 'power bi', 'looker', 'nlp',
        'computer vision', 'opencv', 'huggingface', 'transformers'
    ],
    'mobile': [
        'react native', 'flutter', 'ios', 'android', 'swift', 'kotlin',
        'xamarin', 'ionic', 'cordova', 'expo', 'mobile development'
    ],
    'tools': [
        'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
        'figma', 'sketch', 'adobe xd', 'photoshop', 'linux', 'bash',
        'agile', 'scrum', 'kanban', 'ci/cd', 'tdd', 'testing', 'jest',
        'cypress', 'selenium', 'postman', 'swagger', 'vim', 'vscode'
    ],
    'soft': [
        'leadership', 'communication', 'teamwork', 'problem solving',
        'project management', 'time management', 'critical thinking',
        'adaptability', 'creativity', 'collaboration', 'mentoring'
    ]
}

ALL_SKILLS = [skill for category in SKILLS_DATABASE.values() for skill in category]

# Education levels
EDUCATION_LEVELS = [
    (['phd', 'ph.d', 'doctorate', 'doctoral'], 'PhD', 100),
    (['master', 'msc', 'mba', 'ms ', 'm.s.', 'postgraduate'], 'Master', 85),
    (['bachelor', 'bsc', 'b.sc', 'b.s.', 'bs ', 'undergraduate', 'degree'], 'Bachelor', 70),
    (['associate', 'diploma', 'certification'], 'Associate', 50),
    (['high school', 'secondary', 'matric'], 'High School', 30)
]

# ========== ANALYSIS FUNCTIONS ==========

def extract_skills(text):
    """Extract skills from text"""
    if not text:
        return []
    
    lower_text = text.lower()
    found_skills = []
    
    for skill in ALL_SKILLS:
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, lower_text, re.IGNORECASE):
            found_skills.append(skill)
    
    return list(set(found_skills))


def categorize_skills(skills):
    """Categorize skills by type"""
    categorized = {}
    for category, category_skills in SKILLS_DATABASE.items():
        matched = [s for s in skills if s in category_skills]
        if matched:
            categorized[category] = matched
    return categorized


def extract_experience_years(text):
    """Extract years of experience"""
    if not text:
        return None
    
    patterns = [
        r'(\d+)\+?\s*years?\s+(?:of\s+)?experience',
        r'experience[:\s]+(\d+)\+?\s*years?',
        r'(\d+)\+?\s*years?\s+(?:in|as|of)\s+\w+',
        r'over\s+(\d+)\s*years?',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    
    return None


def extract_education(text):
    """Extract education level"""
    if not text:
        return {'level': 'Not specified', 'score': 50}
    
    lower_text = text.lower()
    
    for keywords, level, score in EDUCATION_LEVELS:
        if any(k in lower_text for k in keywords):
            return {'level': level, 'score': score}
    
    return {'level': 'Not specified', 'score': 50}


def calculate_ats_score(resume_text, job_text=None):
    """Calculate ATS compatibility score"""
    score_components = {
        'keywords': 0,
        'formatting': 0,
        'length': 0,
        'sections': 0
    }
    
    resume_lower = resume_text.lower()
    
    # Keywords check
    resume_skills = extract_skills(resume_text)
    if len(resume_skills) >= 10:
        score_components['keywords'] = 25
    elif len(resume_skills) >= 5:
        score_components['keywords'] = 20
    elif len(resume_skills) >= 2:
        score_components['keywords'] = 15
    else:
        score_components['keywords'] = 5
    
    # Length check (300-800 words is optimal)
    word_count = len(resume_text.split())
    if 300 <= word_count <= 800:
        score_components['length'] = 25
    elif 200 <= word_count <= 1000:
        score_components['length'] = 20
    else:
        score_components['length'] = 10
    
    # Section detection
    sections = ['experience', 'education', 'skills', 'projects', 'summary', 'objective']
    found_sections = sum(1 for s in sections if s in resume_lower)
    score_components['sections'] = min(25, found_sections * 5)
    
    # Formatting (check for proper structure)
    has_email = bool(re.search(r'\b[\w.-]+@[\w.-]+\.\w+\b', resume_text))
    has_phone = bool(re.search(r'\b\d{10,}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', resume_text))
    score_components['formatting'] = 25 if (has_email and has_phone) else 15
    
    return sum(score_components.values())


def analyze_resume(resume_text, job_text=None):
    """
    Main analysis function
    Returns comprehensive resume analysis with score
    """
    # Use generic job description if none provided
    if not job_text:
        job_text = """
            We are looking for a skilled professional with experience in:
            - Programming (JavaScript, Python, Java, TypeScript)
            - Web development (React, Node.js, HTML, CSS)
            - Database management (SQL, MongoDB, PostgreSQL)
            - Cloud platforms (AWS, Azure, GCP)
            - Version control (Git, GitHub)
            - Agile development practices
            Requirements: Bachelor's degree in Computer Science or related field
            3+ years of experience preferred
        """
    
    # Extract data
    resume_skills = extract_skills(resume_text)
    job_skills = extract_skills(job_text)
    experience = extract_experience_years(resume_text)
    education = extract_education(resume_text)
    ats_score = calculate_ats_score(resume_text, job_text)
    
    # Calculate skill match
    matched_skills = [s for s in resume_skills if s in job_skills]
    missing_skills = [s for s in job_skills if s not in resume_skills][:8]
    additional_skills = [s for s in resume_skills if s not in job_skills][:5]
    
    skill_match = (len(matched_skills) / max(len(job_skills), 1)) * 100
    
    # Experience score
    exp_score = min(100, (experience or 2) * 15) if experience else 50
    
    # Calculate overall score (weighted)
    overall_score = int(
        (skill_match * 0.35) +
        (exp_score * 0.20) +
        (education['score'] * 0.15) +
        (ats_score * 0.30)
    )
    
    overall_score = max(20, min(98, overall_score))
    
    # Generate suggestions
    suggestions = []
    if len(resume_skills) < 5:
        suggestions.append("Add more relevant technical skills to your resume")
    if not experience:
        suggestions.append("Include years of experience more explicitly")
    if education['level'] == 'Not specified':
        suggestions.append("Add your educational qualifications")
    if len(missing_skills) > 3:
        suggestions.append(f"Consider adding these skills: {', '.join(missing_skills[:3])}")
    if ats_score < 70:
        suggestions.append("Improve resume formatting for better ATS compatibility")
    
    # Determine fit category
    if overall_score >= 85:
        overall_fit = "Excellent"
        fit_color = "#00FF94"
    elif overall_score >= 70:
        overall_fit = "Strong"
        fit_color = "#22C55E"
    elif overall_score >= 55:
        overall_fit = "Good"
        fit_color = "#FFD700"
    elif overall_score >= 40:
        overall_fit = "Fair"
        fit_color = "#F59E0B"
    else:
        overall_fit = "Needs Improvement"
        fit_color = "#EF4444"
    
    return {
        "score": overall_score,
        "overallFit": overall_fit,
        "fitColor": fit_color,
        "atsScore": ats_score,
        "skillMatch": round(skill_match, 1),
        "keySkillsMatch": matched_skills,
        "missingSkills": missing_skills,
        "additionalSkills": additional_skills,
        "categorizedSkills": categorize_skills(resume_skills),
        "experienceYears": experience,
        "experienceScore": exp_score,
        "educationLevel": education['level'],
        "educationScore": education['score'],
        "totalSkillsFound": len(resume_skills),
        "suggestions": suggestions,
        "wordCount": len(resume_text.split()),
        "analysisMethod": "flask-ml"
    }


# ========== API ENDPOINTS ==========

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "resume-analyzer"})


@app.route('/analyze', methods=['POST'])
def analyze():
    """Analyze resume text against optional job description"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        job_description = data.get('jobDescription', None)
        
        if not resume_text or len(resume_text.strip()) < 50:
            return jsonify({
                "success": False,
                "error": "Resume text is too short (minimum 50 characters)"
            }), 400
        
        result = analyze_resume(resume_text, job_description)
        
        return jsonify({
            "success": True,
            "analysis": result
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/quick-score', methods=['POST'])
def quick_score():
    """Quick scoring endpoint - just returns score and fit"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        
        if not resume_text:
            return jsonify({"success": False, "error": "Resume text required"}), 400
        
        result = analyze_resume(resume_text)
        
        return jsonify({
            "success": True,
            "score": result['score'],
            "fit": result['overallFit'],
            "fitColor": result['fitColor'],
            "skillsCount": result['totalSkillsFound']
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/extract-skills', methods=['POST'])
def extract_skills_endpoint():
    """Extract and categorize skills from text"""
    try:
        data = request.json
        text = data.get('text', '')
        
        skills = extract_skills(text)
        categorized = categorize_skills(skills)
        
        return jsonify({
            "success": True,
            "skills": skills,
            "categorized": categorized,
            "count": len(skills)
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/compare', methods=['POST'])
def compare_to_job():
    """Compare resume to specific job posting"""
    try:
        data = request.json
        resume_text = data.get('resumeText', '')
        job_text = data.get('jobDescription', '')
        
        if not resume_text or not job_text:
            return jsonify({
                "success": False, 
                "error": "Both resume and job description are required"
            }), 400
        
        result = analyze_resume(resume_text, job_text)
        
        # Add match percentage for this specific job
        result['jobMatchPercentage'] = result['skillMatch']
        
        return jsonify({
            "success": True,
            "comparison": result
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('FLASK_PORT', 5001))
    print(f"🚀 HIRE.OS Resume Analysis API running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
