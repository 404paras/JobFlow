import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { config } from './index';
import { logger } from '../shared/utils/logger';

let transporter: Transporter | null = null;
let resendClient: Resend | null = null;

export type EmailProvider = 'smtp' | 'resend';

export function getEmailProvider(): EmailProvider {
  return config.email.provider;
}

export function createResendClient(): Resend {
  if (resendClient) {
    return resendClient;
  }

  if (!config.email.resendApiKey) {
    logger.warn('Resend API key not configured');
    resendClient = new Resend('');
    return resendClient;
  }

  logger.info('Creating Resend email client');
  resendClient = new Resend(config.email.resendApiKey);
  return resendClient;
}

export function getResendClient(): Resend {
  if (!resendClient) {
    return createResendClient();
  }
  return resendClient;
}

export function createEmailTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  if (!config.email.user || !config.email.pass) {
    logger.warn('SMTP credentials not configured. Using JSON transport.');
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  const isGmail = config.email.host.includes('gmail') || config.email.user.includes('gmail');
  
  logger.info('Creating SMTP email transporter', {
    host: config.email.host,
    user: config.email.user.substring(0, 3) + '***',
  });
  
  if (isGmail) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  } else {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

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
