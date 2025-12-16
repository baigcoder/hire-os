#!/usr/bin/env python3
"""
AI Resume Screening & Ranking System - Optimized for Speed
Fast, accurate resume analysis with caching and parallel processing
"""

import argparse
import json
import sys
import re
import hashlib
from pathlib import Path
from typing import List, Dict, Optional
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor

# Lazy imports for faster startup
_pdf_reader = None
_vectorizer = None

def get_pdf_reader():
    global _pdf_reader
    if _pdf_reader is None:
        from PyPDF2 import PdfReader
        _pdf_reader = PdfReader
    return _pdf_reader

def get_vectorizer():
    global _vectorizer
    if _vectorizer is None:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity
        _vectorizer = (TfidfVectorizer, cosine_similarity)
    return _vectorizer

# Extended skills database (150+ skills)
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

# Education levels with scores
EDUCATION_LEVELS = [
    (['phd', 'ph.d', 'doctorate', 'doctoral'], 'PhD', 100),
    (['master', 'msc', 'mba', 'ms ', 'm.s.', 'postgraduate'], 'Master', 85),
    (['bachelor', 'bsc', 'b.sc', 'b.s.', 'bs ', 'undergraduate', 'degree'], 'Bachelor', 70),
    (['associate', 'diploma', 'certification'], 'Associate', 50),
    (['high school', 'secondary', 'matric'], 'High School', 30)
]


@lru_cache(maxsize=100)
def extract_text_from_pdf_cached(file_path: str) -> str:
    """Extract text from PDF with caching"""
    try:
        PdfReader = get_pdf_reader()
        pdf = PdfReader(file_path)
        text = ""
        for page in pdf.pages[:20]:  # Limit to 20 pages for speed
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip() if text else "No readable text found."
    except Exception as e:
        return f"Error reading PDF: {str(e)}"


def extract_text_from_pdf(file) -> str:
    """Extract text from PDF file object"""
    try:
        PdfReader = get_pdf_reader()
        pdf = PdfReader(file)
        text = ""
        for page in pdf.pages[:20]:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip() if text else "No readable text found."
    except Exception as e:
        return f"Error reading PDF: {str(e)}"


def extract_skills(text: str) -> List[str]:
    """Fast skill extraction using regex"""
    if not text:
        return []
    
    lower_text = text.lower()
    found_skills = []
    
    for skill in ALL_SKILLS:
        # Use word boundary matching
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, lower_text, re.IGNORECASE):
            found_skills.append(skill)
    
    return list(set(found_skills))


def extract_experience_years(text: str) -> Optional[int]:
    """Extract years of experience from text"""
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


def extract_education(text: str) -> Dict:
    """Extract highest education level"""
    if not text:
        return {'level': 'Not specified', 'score': 50}
    
    lower_text = text.lower()
    
    for keywords, level, score in EDUCATION_LEVELS:
        if any(k in lower_text for k in keywords):
            return {'level': level, 'score': score}
    
    return {'level': 'Not specified', 'score': 50}


def calculate_similarity(job_text: str, resume_text: str) -> float:
    """Calculate TF-IDF cosine similarity"""
    try:
        TfidfVectorizer, cosine_similarity = get_vectorizer()
        documents = [job_text, resume_text]
        vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        vectors = vectorizer.fit_transform(documents)
        similarity = cosine_similarity(vectors[0:1], vectors[1:2])[0][0]
        return float(similarity * 100)
    except Exception:
        return 50.0


def determine_fit(score: float) -> str:
    """Determine overall fit category"""
    if score >= 80:
        return "Excellent"
    elif score >= 65:
        return "Good"
    elif score >= 50:
        return "Fair"
    else:
        return "Poor"


def analyze_resume(resume_text: str, job_text: str) -> Dict:
    """
    Main analysis function - fast and accurate
    Returns comprehensive resume analysis
    """
    # Extract data
    resume_skills = extract_skills(resume_text)
    job_skills = extract_skills(job_text)
    experience = extract_experience_years(resume_text)
    education = extract_education(resume_text)
    
    # Calculate matches
    matched_skills = [s for s in resume_skills if s in job_skills]
    missing_skills = [s for s in job_skills if s not in resume_skills][:10]
    
    skill_match = (len(matched_skills) / len(job_skills) * 100) if job_skills else 50
    similarity_score = calculate_similarity(job_text, resume_text)
    
    # Experience score
    exp_score = min(100, (experience or 3) * 15) if experience else 60
    
    # Calculate overall score (weighted)
    overall_score = int(
        (similarity_score * 0.35) +
        (skill_match * 0.35) +
        (exp_score * 0.15) +
        (education['score'] * 0.15)
    )
    
    overall_score = max(20, min(95, overall_score))
    
    return {
        "score": overall_score,
        "keySkillsMatch": matched_skills,
        "missingSkills": missing_skills,
        "experienceYears": experience,
        "experienceMatch": exp_score,
        "educationLevel": education['level'],
        "educationMatch": education['score'],
        "overallFit": determine_fit(overall_score),
        "similarityScore": round(similarity_score, 2),
        "totalSkillsFound": len(resume_skills)
    }


def rank_resumes(job_text: str, resumes: List[str]) -> List[Dict]:
    """Rank multiple resumes against a job description"""
    results = []
    
    # Parallel processing for speed
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(analyze_resume, resume, job_text)
            for resume in resumes
        ]
        results = [f.result() for f in futures]
    
    # Sort by score descending
    return sorted(results, key=lambda x: x['score'], reverse=True)


def api_mode(resume_path: str, job_path: str) -> int:
    """API mode for backend integration"""
    try:
        # Read job description
        with open(job_path, 'r', encoding='utf-8') as f:
            job_text = f.read()
        
        # Read resume
        if resume_path.endswith('.pdf'):
            resume_text = extract_text_from_pdf_cached(resume_path)
        else:
            with open(resume_path, 'r', encoding='utf-8') as f:
                resume_text = f.read()
        
        # Analyze
        result = analyze_resume(resume_text, job_text)
        result['analysisMethod'] = 'python-ml'
        
        # Output JSON
        print(json.dumps(result))
        return 0
        
    except Exception as e:
        error_result = {
            "score": 50,
            "error": str(e),
            "overallFit": "Fair",
            "analysisMethod": "python-error"
        }
        print(json.dumps(error_result))
        return 1


def streamlit_mode():
    """Streamlit UI mode"""
    try:
        import streamlit as st
    except ImportError:
        print("Streamlit not installed. Run: pip install streamlit")
        return
    
    st.set_page_config(page_title="AI Resume Screening", page_icon="📄", layout="wide")
    
    st.title("🚀 AI Resume Screening & Ranking System")
    st.markdown("*Fast, accurate resume analysis powered by ML*")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        job_description = st.text_area(
            "📋 Job Description",
            height=200,
            placeholder="Paste job description here..."
        )
    
    with col2:
        uploaded_files = st.file_uploader(
            "📄 Upload Resumes (PDF)",
            type=["pdf"],
            accept_multiple_files=True
        )
    
    if st.button("🔍 Analyze Resumes", type="primary"):
        if not job_description:
            st.error("Please enter a job description")
            return
        
        if not uploaded_files:
            st.error("Please upload at least one resume")
            return
        
        with st.spinner("Analyzing resumes..."):
            results = []
            
            for file in uploaded_files:
                resume_text = extract_text_from_pdf(file)
                result = analyze_resume(resume_text, job_description)
                result['filename'] = file.name
                results.append(result)
            
            # Sort by score
            results.sort(key=lambda x: x['score'], reverse=True)
        
        st.success(f"✅ Analyzed {len(results)} resume(s)")
        st.markdown("---")
        
        for i, result in enumerate(results, 1):
            with st.expander(f"#{i} • {result['filename']} • Score: {result['score']}%", expanded=(i==1)):
                cols = st.columns(4)
                
                cols[0].metric("Overall Score", f"{result['score']}%")
                cols[1].metric("Experience", f"{result['experienceYears'] or 'N/A'} yrs")
                cols[2].metric("Education", result['educationLevel'])
                cols[3].metric("Fit", result['overallFit'])
                
                if result['keySkillsMatch']:
                    st.success(f"✅ Matched Skills: {', '.join(result['keySkillsMatch'][:10])}")
                
                if result['missingSkills']:
                    st.warning(f"⚠️ Missing Skills: {', '.join(result['missingSkills'][:5])}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='AI Resume Screening Tool')
    parser.add_argument('--mode', choices=['streamlit', 'api'], default='streamlit')
    parser.add_argument('--resume', help='Resume file path (for API mode)')
    parser.add_argument('--job', help='Job description file path (for API mode)')
    
    args = parser.parse_args()
    
    if args.mode == 'api':
        if not args.resume or not args.job:
            print('{"error": "Both --resume and --job required for API mode"}')
            sys.exit(1)
        sys.exit(api_mode(args.resume, args.job))
    else:
        streamlit_mode()