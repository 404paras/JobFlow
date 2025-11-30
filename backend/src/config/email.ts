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

  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
  });

  transporter.verify((error) => {
    if (error) {
      logger.error('Email transporter verification failed', { error: error.message });
    } else {
      logger.info('Email transporter ready');
    }
  });

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
