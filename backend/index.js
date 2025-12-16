import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import os from "os";
import connectDB, { checkDBHealth } from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import companyRoute from "./routes/company.route.js";
import jobRoute from "./routes/job.route.js";
import applicationRoute from "./routes/application.route.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import otpRoute from "./routes/otp.route.js";
import subscriptionRoute from "./routes/subscription.route.js";
import paymentRoute from "./routes/payment.route.js";
import paddleRoute from "./routes/paddle.route.js";
import notificationRoute from "./routes/notification.route.js";
import interviewRoute from "./routes/interview.route.js";
import mcqRoute from "./routes/mcq.route.js";
import statsRoute from "./routes/stats.route.js";
import practiceRoute from "./routes/practice.route.js";
import mockInterviewRoute from "./routes/mockInterviewRoutes.js";
import liveInterviewRoute from "./routes/liveInterview.route.js";
import practiceHistoryRoute from "./routes/practiceHistory.route.js";
import trialRoute from "./routes/trial.route.js";
import insightsRoute from "./routes/insights.route.js";
import aiRoute from "./routes/ai.route.js";
import uploadRoute from "./routes/upload.route.js";
import messageRoute from "./routes/message.route.js";
import savedJobsRoute from "./routes/savedJobs.route.js";
import careerInsightsRoute from "./routes/careerInsights.route.js";
import connectionsRoute from "./routes/connections.route.js";
import jobAlertsRoute from "./routes/jobAlerts.route.js";
import recruiterAnalyticsRoute from "./routes/recruiterAnalytics.route.js";
import emailTemplatesRoute from "./routes/emailTemplates.route.js";
import interviewFeedbackRoute from "./routes/interviewFeedback.route.js";
import { rateLimiter } from "./middlewares/isAuthenticated.js";
import { createServer } from 'http';
import { Server } from 'socket.io';
import logger from "./utils/logger.js";

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app); // Create HTTP server for Socket.io


// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// ========== SECURITY MIDDLEWARE ==========
// TODO: Uncomment after running npm install
// Helmet - Set security HTTP headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.cloudinary.com", "wss:", "ws:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Data sanitization against NoSQL injection
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`⚠️ Sanitized NoSQL injection attempt in ${key}`);
    }
}));

// Prevent parameter pollution
app.use(hpp({
    whitelist: ['skills', 'location', 'jobType', 'salary']
}));


// Additional security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.removeHeader('X-Powered-By');
    next();
});

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Initialize Socket.io with enhanced manager
import { initializeSocketManager } from './utils/socketManager.js';
import { initializeDashboardSockets } from './utils/dashboardSocket.js';

// Import subscription monitor for trial/subscription expiry checking
import { subscriptionMonitor } from './utils/subscriptionMonitor.js';

// Socket.io will be initialized after server starts
let io = null;
const initSocketIO = async () => {
    io = await initializeSocketManager(httpServer, allowedOrigins);

    // Initialize dashboard real-time sockets
    initializeDashboardSockets(io);

    // Store io on app for controller access
    app.set('io', io);

    console.log('🚀 Enhanced Socket.io ready with room management, chat, WebRTC signaling, and dashboard updates');

    // Start subscription monitor cron jobs
    subscriptionMonitor.start();
};

// Legacy compatibility - simple socket events (kept for backward compatibility)
// The enhanced socketManager handles: join-interview, send-message, WebRTC signaling, typing, media state, etc.

// Request logging middleware
app.use((req, res, next) => {
    if (req.path.includes('/api/v1/otp')) {
        logger.info(`🔔 Incoming ${req.method} request to: ${req.path}`);
        logger.debug(`📦 Body:`, { body: req.body });
    }
    next();
});

// Rate limiting for API routes
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Database health check endpoint
app.get('/health/db', async (req, res) => {
    try {
        const dbHealth = await checkDBHealth();
        res.status(dbHealth.isConnected ? 200 : 503).json({
            status: dbHealth.isConnected ? 'OK' : 'ERROR',
            database: dbHealth
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            error: error.message
        });
    }
});

// API Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/company", companyRoute);
app.use("/api/v1/job", jobRoute);
app.use("/api/v1/application", applicationRoute);
app.use("/api/v1/resume", resumeRoutes);
app.use("/api/v1/otp", otpRoute);
app.use("/api/v1/subscription", subscriptionRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/paddle", paddleRoute);
app.use("/api/v1/notification", notificationRoute);
app.use("/api/v1/interview", interviewRoute);
app.use("/api/v1/mcq", mcqRoute);
app.use("/api/v1/stats", statsRoute);
app.use("/api/v1/practice", practiceRoute);
app.use("/api/v1/mock-interview", mockInterviewRoute);
app.use("/api/v1/live-interview", liveInterviewRoute); // ElevenLabs real-time voice interview
app.use("/api/v1/practice-history", practiceHistoryRoute); // Practice history tracking
app.use("/api/v1/trial", trialRoute);
app.use("/api/v1/insights", insightsRoute);
app.use("/api/v1/ai", aiRoute);
app.use("/api/v1/upload", uploadRoute);
app.use("/api/v1/message", messageRoute);
app.use("/api/v1/saved-jobs", savedJobsRoute);
app.use("/api/v1/career-insights", careerInsightsRoute);
app.use("/api/v1/connections", connectionsRoute);
app.use("/api/v1/job-alerts", jobAlertsRoute);
app.use("/api/v1/recruiter-analytics", recruiterAnalyticsRoute);
app.use("/api/v1/email-templates", emailTemplatesRoute);
app.use("/api/v1/interview-feedback", interviewFeedbackRoute);

// 404 handler for unknown routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled Error:', err);

    // CORS error
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS error: Origin not allowed'
        });
    }

    // MongoDB duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `${field} already exists`
        });
    }

    // MongoDB validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: messages
        });
    }

    // MongoDB CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Server configuration
const PORT = process.env.PORT || 8000;

// Graceful shutdown handler
const gracefulShutdown = () => {
    logger.info('Gracefully shutting down...');
    httpServer.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
    httpServer.listen(PORT, async () => {
        try {
            await connectDB();
            await initSocketIO();
            logger.info('JobPortal API Server started', {
                name: 'JobPortal API Server',
                status: 'running',
                port: PORT,
                mode: process.env.NODE_ENV || 'development',
                time: new Date().toISOString(),
                socket: 'Enhanced (Redis+WebRTC+Chat)',
                hostname: os.hostname(),
                pid: process.pid,
                version: process.env.npm_package_version || 'unknown'
            });
        } catch (error) {
            logger.error('Failed to start server:', error);
            process.exit(1);
        }
    });
}

export { app };

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown();
});

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
