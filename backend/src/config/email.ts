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
  
  // Use port 465 with SSL for better compatibility with cloud providers
  // Port 587 with STARTTLS is often blocked by firewalls
  const useSSL = config.email.secure || config.email.port === 465;
  const port = useSSL ? 465 : config.email.port;
  
  logger.info('Creating email transporter', {
    host: config.email.host,
    port: port,
    secure: useSSL,
    user: config.email.user.substring(0, 3) + '***',
  });
  
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: port,
    secure: useSSL, // true for 465, false for 587
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    // Increased connection settings for cloud environments
    connectionTimeout: 60000, // 60 seconds to establish connection
    greetingTimeout: 60000,   // 60 seconds for SMTP greeting
    socketTimeout: 120000,    // 120 seconds socket timeout
    // Pool settings for better reliability
    pool: true,
    maxConnections: 2,
    maxMessages: 30,
    rateDelta: 3000,
    rateLimit: 2,
    // TLS settings
    tls: {
      rejectUnauthorized: false, // Accept self-signed certs (needed for some cloud providers)
      minVersion: 'TLSv1.2',
    },
    // Debug in development
    debug: config.env !== 'production',
    logger: config.env !== 'production',
  });

  // Verify connection asynchronously (don't block startup)
  setTimeout(async () => {
    try {
      await transporter?.verify();
      logger.info('Email transporter verified and ready', {
        host: config.email.host,
        port: port,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Email transporter verification failed', { 
        error: errorMessage,
        host: config.email.host,
        port: port,
      });
      
      // Try fallback to port 587 if SSL failed
      if (useSSL && config.email.port !== 587) {
        logger.info('Attempting fallback to port 587 with STARTTLS...');
        try {
          const fallbackTransporter = nodemailer.createTransport({
            host: config.email.host,
            port: 587,
            secure: false,
            auth: {
              user: config.email.user,
              pass: config.email.pass,
            },
            connectionTimeout: 60000,
            greetingTimeout: 60000,
            socketTimeout: 120000,
            tls: {
              rejectUnauthorized: false,
              minVersion: 'TLSv1.2',
            },
          });
          
          await fallbackTransporter.verify();
          transporter = fallbackTransporter;
          logger.info('Fallback email transporter (port 587) verified and ready');
        } catch (fallbackError) {
          logger.error('Fallback email transporter also failed', {
            error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          });
        }
      }
    }
  }, 3000); // Delay verification to let server fully start

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
