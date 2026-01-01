# HIRE.OS — Industrial-Grade AI Recruitment Platform

<div align="center">
  <img src="https://img.shields.io/badge/Version-2.0-FFD700?style=for-the-badge&logo=github" alt="Version"/>
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js" alt="Node"/>
  <img src="https://img.shields.io/badge/AI-GPT--5%20%7C%20Gemini-8B5CF6?style=for-the-badge" alt="AI"/>
  <img src="https://img.shields.io/badge/Real--time-Supabase-3FCF8E?style=for-the-badge" alt="Realtime"/>
</div>

<br/>

**HIRE.OS** is an enterprise-grade talent acquisition platform that combines multi-model AI, real-time collaboration, and advanced proctoring to transform how companies hire and candidates find jobs.

> 🏆 **Live Demo:** [hire-os.vercel.app](https://hire-os.vercel.app)

---

## 🎯 Core Product Features

### 🧠 AI-Powered Resume Analyzer
Upload PDF resumes for instant, comprehensive analysis:
- **ATS Compatibility Score** — Check how well your resume passes Applicant Tracking Systems
- **Skills Matching** — Detect matched and missing skills for target roles
- **Personalized Interview Questions** — 4 realistic interview questions with preparation tips
- **Key Strengths Identification** — AI-detected standout qualities from your CV
- **Quick Wins** — Actionable improvements you can make in 30 minutes
- **Learning Resources** — Specific courses (Coursera, Udemy, etc.) to fill skill gaps
- **Market Position** — How you compare to other candidates (Top 10%, Top 25%, etc.)

### 🤖 AI Career Coach
Real-time conversational AI for career guidance:
- Resume feedback and improvement suggestions
- Interview preparation tips
- Career path recommendations
- Salary negotiation strategies
- Job search optimization

### 🎤 Live Video Interviews
Production-ready video interviewing system:
- **HD Video/Audio** using WebRTC peer-to-peer connections
- **Screen Sharing** for technical interviews and presentations
- **Interview Recording** with cloud storage
- **Real-time Chat** during interviews
- **AI-Generated Reports** with CEO approval workflow

### 📝 AI-Generated MCQ Assessments
Intelligent skill testing:
- **Dynamic Question Generation** — AI creates role-specific MCQ tests
- **Difficulty Distribution** — Automatic mix of easy (30%), medium (50%), hard (20%)
- **Categories** — Technical, problem-solving, and behavioral questions
- **Anti-Cheating** — Tab switch detection, fullscreen enforcement, face detection
- **Instant Scoring** with detailed explanations

### 🔍 Job Matching Engine
Smart job recommendations:
- AI-powered skill matching with percentage scores
- Personalized job feed based on profile
- Saved jobs with notifications
- Daily job alerts based on preferences
- Company culture fit analysis

### 💼 Multi-Role Dashboard System

#### For Candidates (Students)
- Real-time application tracking with live updates
- AI interview coaching and mock tests
- Skill gap analysis with learning paths
- Salary benchmarking by role, location, and experience
- Referral program with reward tracking
- Interview calendar and scheduling
- Direct messaging with recruiters

#### For Recruiters
- **Candidate Pipeline** — Kanban-style tracking (Applied → Screening → Interview → Offer)
- **AI Applicant Ranking** — Auto-score candidates by resume relevance
- **Email Templates** — Customizable templates for outreach
- **Offer Letters** — Generate and send offer letters
- **Interview Scheduling** — Calendar integration with candidates
- **Analytics Dashboard** — Time-to-hire, source tracking, conversion rates
- **Talent Pool** — Save promising candidates for future roles
- **Job Templates** — Reusable job posting templates

#### For Company Admins (CEO)
- Executive dashboard with hiring metrics
- Interview report review and approval workflow
- Team management and recruiter permissions
- Company branding and profile customization
- Subscription and billing management

---

## 🛡️ Advanced Security & Proctoring

### Fraud Detection System
- Tab/window switch monitoring
- Copy-paste attempt detection
- Rapid answer detection (< 5 seconds)
- Face detection and away-from-screen alerts
- Fullscreen exit monitoring
- Idle period tracking
- AI-powered risk scoring (0-100)

### Authentication
- JWT-based authentication with refresh tokens
- Google OAuth 2.0 integration
- OTP verification via email
- Password reset flow
- Session management

---

## 📡 Real-Time Features (Supabase Realtime)

- **Live Dashboard Updates** — Stats update instantly when applications change
- **Real-time Chat** — Instant messaging between candidates and recruiters
- **Typing Indicators** — See when someone is typing
- **Online Presence** — Know who's online
- **WebRTC Signaling** — Peer-to-peer video call setup
- **Push Notifications** — Browser and in-app notifications

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Redux Toolkit, Framer Motion |
| **UI** | Tailwind CSS, Shadcn/ui, Lucide Icons |
| **Backend** | Node.js, Express.js, Mongoose |
| **Database** | MongoDB Atlas, Redis (Upstash) |
| **AI Models** | GPT-5.1, GPT-4o-mini, Gemini 1.5 Flash, DeepSeek-R1 |
| **Realtime** | Supabase Realtime (WebSocket) |
| **Video** | WebRTC, PeerJS |
| **Storage** | Cloudinary |
| **Payments** | Paddle (Subscriptions) |
| **Deployment** | Vercel (Frontend + Serverless Backend) |

### AI Model Strategy
```
Feature               → Model           → Latency
─────────────────────────────────────────────────
Resume Analysis       → GPT-5.1-ca      → ~2800ms (Deep analysis)
MCQ Generation        → GPT-5-ca        → ~1900ms (Accurate)
Live Interview        → GPT-4o-mini     → ~980ms  (Real-time)
Fraud Detection       → GPT-4o-mini     → ~980ms  (Instant)
CEO Reports           → DeepSeek-R1     → ~58s    (Chain-of-thought)
Job Matching          → GPT-5-mini-ca   → ~1300ms (Fast)
Fallback              → Gemini 1.5 Flash
```

---

## 📦 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Redis (Upstash recommended)
- Cloudinary account
- API Keys: GPT-5 (ChatAnywhere), Gemini, Supabase

### Installation

```bash
# Clone repository
git clone https://github.com/baigcoder/hire-os.git
cd hire-os

# Install backend
cd backend && npm install

# Install frontend
cd ../frontend && npm install
```

### Environment Variables

**Backend (.env)**
```env
PORT=8000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
GPT5_API_KEY=your-chatanywhere-key
GEMINI_API_KEY=your-gemini-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
REDIS_URL=redis://...
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

### Run Development

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 📊 API Endpoints

### Core APIs
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/resume/analyze-pdf` | AI resume analysis |
| POST | `/api/v1/mcq/generate` | Generate MCQ test |
| POST | `/api/v1/interview/live` | Start live interview |
| GET | `/api/v1/job/ai-matched` | AI job recommendations |
| POST | `/api/v1/ai/career-coach` | AI career coaching |
| GET | `/api/v1/salary/benchmark` | Salary insights |
| POST | `/api/v1/application/apply/:id` | Apply to job |

### 37+ Total API Routes
- User authentication & profiles
- Job CRUD & search
- Applications & tracking
- Interviews & MCQ tests
- AI analysis & coaching
- Real-time messaging
- Analytics & reporting
- Payments & subscriptions

---

## 🎨 Design System

**Theme:** Industrial Premium Dark
- Primary: `#FFD700` (Gold)
- Accent: `#00FF94` (Neon Green)
- Background: `#0A0A0A`
- Grid pattern overlays
- Corner accent decorations
- Monospace fonts (Space Grotesk)
- Micro-animations throughout

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Frontend
cd frontend
vercel --prod

# Backend (Serverless)
cd backend
vercel --prod
```

Set environment variables in Vercel dashboard.

---

## 📈 Roadmap

- [x] AI Resume Analyzer v2.0
- [x] Live Video Interviews
- [x] Multi-model AI integration
- [x] Real-time dashboard updates
- [ ] Mobile app (React Native)
- [ ] LinkedIn integration
- [ ] Calendar sync (Google, Outlook)
- [ ] Advanced analytics (Mixpanel)

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <strong>Built with ❤️ for the future of hiring</strong>
  <br/>
  <sub>HIRE.OS — Industrial Grade Talent Acquisition</sub>
</div>
