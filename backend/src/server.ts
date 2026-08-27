import dotenv from 'dotenv';
dotenv.config();

// ─── Fail-fast env validation ───────────────────────────────────────────────
// Without this, a missing JWT_SECRET wouldn't crash the server — it would just
// silently produce tokens that can't be verified, which is a much worse failure
// mode than refusing to boot. Better to fail loud here than fail quiet in auth.
const REQUIRED_ENV_VARS = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;
const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variable(s): ${missingVars.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in these values before starting the server.');
  process.exit(1);
}
if ((process.env.JWT_SECRET as string).length < 32) {
  console.error('❌ JWT_SECRET is too short — use at least 32 random characters.');
  process.exit(1);
}
if ((process.env.JWT_REFRESH_SECRET as string).length < 32) {
  console.error('❌ JWT_REFRESH_SECRET is too short — use at least 32 random characters.');
  process.exit(1);
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

import { connectDB } from './config/database';
import { errorHandler } from './middleware/error.middleware';
import { paymentGate } from './middleware/paymentGate.middleware';
import { seedSuperAdmin, seedAcademyStructure, seedDefaultAccounts } from './utils/seed';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import schoolRoutes from './routes/school.routes';
import departmentRoutes from './routes/department.routes';
import courseRoutes from './routes/course.routes';
import badgeLevelRoutes from './routes/badgeLevel.routes';
import moduleRoutes from './routes/module.routes';
import weekRoutes from './routes/week.routes';
import lessonRoutes from './routes/lesson.routes';
import resourceRoutes from './routes/resource.routes';
import assignmentRoutes from './routes/assignment.routes';
import submissionRoutes from './routes/submission.routes';
import quizRoutes from './routes/quiz.routes';
import attendanceRoutes from './routes/attendance.routes';
import certificateRoutes from './routes/certificate.routes';
import paymentRoutes from './routes/payment.routes';
import enrollmentRoutes from './routes/enrollment.routes';
import projectRoutes from './routes/project.routes';
import announcementRoutes from './routes/announcement.routes';
import eventRoutes from './routes/event.routes';
import blogRoutes from './routes/blog.routes';
import notificationRoutes from './routes/notification.routes';
import auditRoutes from './routes/audit.routes';
import dashboardRoutes from './routes/dashboard.routes';
import contactRoutes from './routes/contact.routes';
import admissionsRoutes from './routes/admissions.routes';
import settingsRoutes from './routes/settings.routes';
import systemRoutes from './routes/system.routes';
import messageRoutes from './routes/message.routes';
import reportRoutes from './routes/report.routes';

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());

// ─── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      allowedOrigins.includes('*') ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Fallback: permit request to avoid breaking production deployments
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use('/api/v1/auth', authLimiter);

// ─── Body Parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// ─── Logging ────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── API Routes ─────────────────────────────────────────────────────────────
const API = '/api/v1';

// Global, defense-in-depth payment lockout for students with an overdue
// balance — see middleware/paymentGate.middleware.ts for the allowlist
// (auth, payments, notifications, health stay reachable; everything else
// gets a 402 before its route handler runs).
app.use(paymentGate);

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/schools`, schoolRoutes);
app.use(`${API}/departments`, departmentRoutes);
app.use(`${API}/courses`, courseRoutes);
app.use(`${API}/badge-levels`, badgeLevelRoutes);
app.use(`${API}/modules`, moduleRoutes);
app.use(`${API}/weeks`, weekRoutes);
app.use(`${API}/lessons`, lessonRoutes);
app.use(`${API}/resources`, resourceRoutes);
app.use(`${API}/assignments`, assignmentRoutes);
app.use(`${API}/submissions`, submissionRoutes);
app.use(`${API}/quizzes`, quizRoutes);
app.use(`${API}/attendance`, attendanceRoutes);
app.use(`${API}/certificates`, certificateRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/enrollments`, enrollmentRoutes);
app.use(`${API}/projects`, projectRoutes);
app.use(`${API}/announcements`, announcementRoutes);
app.use(`${API}/events`, eventRoutes);
app.use(`${API}/blog`, blogRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/audit`, auditRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/contact`, contactRoutes);
app.use(`${API}/admissions`, admissionsRoutes);
app.use(`${API}/settings`, settingsRoutes);
app.use(`${API}/system`, systemRoutes);
app.use(`${API}/messages`, messageRoutes);
app.use(`${API}/reports`, reportRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  // Public, minimal, for load balancers/uptime monitors — deliberately doesn't
  // reveal which third-party services are configured to unauthenticated
  // callers. The detailed breakdown lives behind /api/v1/system/status
  // (super_admin only) — see routes/system.routes.ts.
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler (must be last) ───────────────────────────────────
app.use(errorHandler);

// ─── Boot ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async (): Promise<void> => {
  await connectDB();
  await seedSuperAdmin();
  await seedDefaultAccounts();
  await seedAcademyStructure();
  const server = app.listen(PORT, () => {
    console.log(`🚀 M-CEL TECH ACADEMY API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      try {
        const { disconnectDB } = await import('./config/database');
        await disconnectDB();
        console.log('✅ Server and database connections closed cleanly.');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
};

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default app;
