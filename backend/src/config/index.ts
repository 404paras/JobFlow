import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  mongodb: {
    uri: string;
  };
  frontend: {
    url: string;
  };
  email: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  };
  scraper: {
    timeout: number;
    retryAttempts: number;
    rateLimitDelay: number;
  };
  logging: {
    level: string;
  };
}

const requiredEnvVars = ['MONGODB_URI'];

// Validate required environment variables
function validateEnv(): void {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Only validate in non-test environments
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
}

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  
  mongodb: {
    uri: process.env.MONGODB_URI || '',
  },
  
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
  
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'Job Alerts <noreply@example.com>',
  },
  
  scraper: {
    timeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.SCRAPER_RETRY_ATTEMPTS || '3', 10),
    rateLimitDelay: parseInt(process.env.SCRAPER_RATE_LIMIT_DELAY || '2000', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

export default config;

