# HIRE.OS - AI-Powered Job Portal Platform

HIRE.OS is a next-generation recruitment platform that leverages Artificial Intelligence to streamline the hiring process. From AI-driven resume parsing and job matching to real-time video interviews and automated skill assessments, HIRE.OS provides a comprehensive solution for students, recruiters, and companies.

## 🚀 Key Features

### For Job Seekers (Students)
- **AI Career Insights:** Get real-time salary analytics and market trends based on your profile and location.
- **Smart Job Matching:** Our AI algorithm matches your skills and resume with the perfect job opportunities.
- **Skill Gap Analysis:** Identify missing skills and get recommendations to improve your employability.
- **AI Mock Interviews:** Practice with our AI Interview Coach to prepare for real technical and behavioral interviews.
- **Resume Analysis:** Instant feedback on your resume's ATS compatibility and content.
- **Real-time Notifications:** Stay updated on application status, interview invites, and new job alerts.

### For Recruiters & Companies
- **AI Applicant Ranking:** Automatically rank candidates based on resume relevance and skill match.
- **Video Interviewing:** Integrated HD video calling with screen sharing and recording capabilities.
- **MCQ Assessment Engine:** Create and administer custom technical tests with automated grading.
- **Fraud Detection:** Advanced proctoring system to ensure integrity during online assessments.
- **Analytics Dashboard:** Visual insights into hiring pipelines, time-to-hire, and candidate demographics.
- **Collaborative Hiring:** Team management features for multi-recruiter workflows.

## 🛠️ Technology Stack

### Frontend
- **Framework:** React.js (Vite)
- **State Management:** Redux Toolkit
- **Styling:** Tailwind CSS, Framer Motion (Animations)
- **UI Components:** Shadcn/ui, Lucide React Icons
- **Real-time:** Socket.io Client

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose), Redis (Caching)
- **Real-time:** Socket.io
- **AI Integration:** Gemini AI
- **Storage:** Cloudinary
- **Authentication:** JWT, Google OAuth

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB
- Redis
- Cloudinary Account
- Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/hire-os.git
cd hire-os
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the following variables:
```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GEMINI_API_KEY=your_gemini_api_key
REDIS_URI=your_redis_connection_string
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

## 🚀 Deployment

The project is configured for deployment on **Vercel** for both the frontend and backend.

### Backend Deployment
1. Import the `backend` directory as a project in Vercel.
2. Set the Framework Preset to "Other".
3. Add your environment variables in the Vercel project settings.
4. Deploy.

### Frontend Deployment
1. Import the `frontend` directory as a project in Vercel.
2. Set the Framework Preset to "Vite".
3. Add any necessary public environment variables (e.g., `VITE_API_URL`).
4. Deploy.

## 🤝 Contributing

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
