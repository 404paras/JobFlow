import nodemailer, { Transporter } from 'nodemailer';
import { config } from './index';
import { logger } from '../shared/utils/logger';

let transporter: Transporter | null = null;

export function createEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  if (!config.email.user || !config.email.pass) {
    logger.warn('Email credentials not configured. Email functionality will be disabled.');
    
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    
    return transporter;
  }

  // Determine if using Gmail
  const isGmail = config.email.host.includes('gmail');
  
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure, // true for 465, false for other ports
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    // Connection settings
    connectionTimeout: 30000, // 30 seconds to establish connection
    greetingTimeout: 30000,   // 30 seconds for SMTP greeting
    socketTimeout: 60000,     // 60 seconds socket timeout
    // Pool settings for better reliability
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    rateDelta: 2000,
    rateLimit: 3,
    // TLS settings
    tls: {
      rejectUnauthorized: config.env === 'production',
      minVersion: 'TLSv1.2',
    },
    // Debug in development
    debug: config.env !== 'production',
    logger: config.env !== 'production',
  });

  // Verify connection asynchronously (don't block startup)
  setTimeout(() => {
    transporter?.verify((error) => {
      if (error) {
        logger.error('Email transporter verification failed', { 
          error: error.message,
          host: config.email.host,
          port: config.email.port,
        });
      } else {
        logger.info('Email transporter verified and ready', {
          host: config.email.host,
          port: config.email.port,
        });
      }
    });
  }, 5000); // Delay verification to let server fully start

  return transporter;
}

export function getEmailTransporter(): Transporter {
  if (!transporter) {
    return createEmailTransporter();
  }
  return transporter;
}

export async function closeEmailTransporter(): Promise<void> {
  if (transporter) {
    transporter.close();
    transporter = null;
    logger.info('Email transporter closed');
  }
}
