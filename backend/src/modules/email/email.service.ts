import { getEmailTransporter, createEmailTransporter } from '../../config/email';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { ScrapedJob, EmailPayload } from '../../shared/types';
import { generateJobDigestHtml, generateJobDigestText } from './email.templates';
import { Workflow } from '../workflows/workflow.model';

// Simple delay helper with jitter
const delay = (ms: number) => new Promise(resolve => 
  setTimeout(resolve, ms + Math.random() * 1000)
);

export class EmailService {
  private readonly maxRetries = 5;
  private readonly baseDelayMs = 5000; // 5 seconds base delay

  async send(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    let transporter = getEmailTransporter();

    const mailOptions = {
      from: config.email.from,
      to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
    };

    // Retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await transporter.sendMail(mailOptions);

        logger.info('Email sent successfully', {
          to: payload.to,
          subject: payload.subject,
          messageId: result.messageId,
          attempt,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isLastAttempt = attempt === this.maxRetries;
        const isRetryable = this.isRetryableError(errorMessage);

        logger.warn(`Email send attempt ${attempt}/${this.maxRetries} failed`, {
          to: payload.to,
          subject: payload.subject,
          error: errorMessage,
          willRetry: !isLastAttempt && isRetryable,
        });

        if (isLastAttempt || !isRetryable) {
          logger.error('Failed to send email after all retries', {
            to: payload.to,
            subject: payload.subject,
            error: errorMessage,
            attempts: attempt,
          });
          return { success: false, error: errorMessage };
        }

        // Exponential backoff: 5s, 10s, 20s, 40s, 80s
        const waitTime = this.baseDelayMs * Math.pow(2, attempt - 1);
        logger.info(`Waiting ${waitTime}ms before retry...`);
        await delay(waitTime);

        // On connection errors, recreate the transporter
        if (errorMessage.toLowerCase().includes('connection') || 
            errorMessage.toLowerCase().includes('socket') ||
            errorMessage.toLowerCase().includes('timeout')) {
          logger.info('Recreating email transporter due to connection error...');
          transporter = createEmailTransporter();
        }
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'connection',
      'socket',
      'temporary',
      'try again',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'service unavailable',
      'too many connections',
    ];
    
    return retryablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  async sendJobDigest(
    recipients: string,
    jobs: ScrapedJob[],
    workflowId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (jobs.length === 0) {
      logger.info('No jobs to send in digest', { workflowId });
      return { success: true };
    }

    const subject = `🚀 Your Daily Job Digest - ${jobs.length} New Jobs`;
    const html = generateJobDigestHtml(jobs, workflowId);
    const text = generateJobDigestText(jobs, workflowId);

    const result = await this.send({
      to: recipients,
      subject,
      html,
      text,
    });

    if (result.success) {
      await this.updateEmailStats(workflowId);
    }

    return result;
  }

  private async updateEmailStats(workflowId: string): Promise<void> {
    try {
      await Workflow.updateOne(
        { workflowId },
        {
          $set: { 'emailConfig.lastSentAt': new Date() },
          $inc: { 'emailConfig.sentCount': 1 },
        }
      );
    } catch (error) {
      logger.error('Failed to update email stats', {
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    return this.send({
      to,
      subject: '🧪 Test Email from JobFlow',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1 style="color: #6366f1;">✅ Email Configuration Working!</h1>
          <p>If you're seeing this email, your SMTP configuration is correct.</p>
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
      text: 'Email configuration is working! Sent at: ' + new Date().toISOString(),
    });
  }
}

export const emailService = new EmailService();
export default emailService;
