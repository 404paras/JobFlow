import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import { requestLoggerWithSkip } from './shared/middleware/request-logger';
import { errorHandler, notFoundHandler } from './shared/middleware/error-handler';

import workflowRoutes from './modules/workflows/workflow.routes';
import jobRoutes from './modules/jobs/job.routes';
import userRoutes from './modules/users/user.routes';
import executorRoutes from './modules/executor/executor.routes';
import schedulerRoutes from './modules/scheduler/scheduler.routes';
import resumeRoutes from './modules/resume/resume.routes';

export function createApp(): Application {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        config.frontend.url,
        'http://localhost:5173',
        'http://localhost:3000',
      ].filter(Boolean);
      
      // Check if origin is allowed
      if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
        return callback(null, true);
      }
      
      // Also allow any Vercel preview deployments
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use(requestLoggerWithSkip(['/health', '/api/health']));

  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: config.env,
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
    });
  });

  app.use('/api/auth', userRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/execute', executorRoutes);
  app.use('/api/scheduler', schedulerRoutes);
  app.use('/api/resume', resumeRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
