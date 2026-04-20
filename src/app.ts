import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import submissionsRoutes from './routes/submissions.js';
import analyticsRoutes from './routes/analytics.js';
import documentsRoutes from './routes/documents.js';
import forumRoutes from './routes/forum.js';
import coursesRoutes from './routes/courses.js';
import messagesRoutes from './routes/messages.js';
import profileRoutes from './routes/profile.js';
import usersRoutes from './routes/users.js';
import quizzesRoutes from './routes/quizzes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.use(helmet());

// CORS — FRONTEND_URL can be comma-separated; in development, any localhost / 127.0.0.1 port is allowed (Vite port shifts when 5173 is taken).
const frontendUrlRaw = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = frontendUrlRaw.split(',').map((s) => s.trim()).filter(Boolean);
const isDev = process.env.NODE_ENV !== 'production';

const corsOrigin: cors.CorsOptions['origin'] = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  if (isDev && /^https?:\/\/localhost(?::\d+)?$/i.test(origin)) {
    callback(null, true);
    return;
  }
  if (isDev && /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked origin: ${origin}`));
};

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

/** General API cap per IP (window below). In dev, HMR + React Strict Mode + many routes can burn through a low cap quickly. */
function readApiRateLimitMax(): number {
  const raw = process.env.API_RATE_LIMIT_MAX;
  if (raw != null && raw !== '') {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return isDev ? 10_000 : 100;
}

function readAuthRateLimitMax(): number {
  const raw = process.env.AUTH_RATE_LIMIT_MAX;
  if (raw != null && raw !== '') {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return isDev ? 500 : 20;
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: readApiRateLimitMax(),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: readAuthRateLimitMax(),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many login attempts, please try again later' } },
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no rate limit)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/students', apiLimiter, studentsRoutes);
app.use('/api/v1/submissions', apiLimiter, submissionsRoutes);
app.use('/api/v1/analytics', apiLimiter, analyticsRoutes);
app.use('/api/v1/documents', apiLimiter, documentsRoutes);
app.use('/api/v1/forum', apiLimiter, forumRoutes);
app.use('/api/v1/courses', apiLimiter, coursesRoutes);
app.use('/api/v1/messages', apiLimiter, messagesRoutes);
app.use('/api/v1/profile', apiLimiter, profileRoutes);
app.use('/api/v1/users', apiLimiter, usersRoutes);
app.use('/api/v1/quizzes', apiLimiter, quizzesRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

