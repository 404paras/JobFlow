import { getEmailTransporter } from '../../config/email';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { ScrapedJob, EmailPayload } from '../../shared/types';
import { generateJobDigestHtml, generateJobDigestText } from './email.templates';
import { Workflow } from '../workflows/workflow.model';

// Simple delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class EmailService {
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 5000; // 5 seconds between retries

  async send(payload: EmailPayload): Promise<boolean> {
    const transporter = getEmailTransporter();

    const mailOptions = {
      from: config.email.from,
      to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
    };

    // Retry logic for transient failures
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await transporter.sendMail(mailOptions);

        logger.info('Email sent successfully', {
          to: payload.to,
          subject: payload.subject,
          messageId: result.messageId,
          attempt,
        });

        return true;
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
          return false;
        }

        // Wait before retry
        await delay(this.retryDelayMs * attempt); // Exponential backoff
      }
    }

    return false;
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
    ];
    
    return retryablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  async sendJobDigest(
    recipients: string,
    jobs: ScrapedJob[],
    workflowId: string
  ): Promise<boolean> {
    const subject = `🚀 Your Daily Job Digest - ${jobs.length} New Jobs`;
    const html = generateJobDigestHtml(jobs, workflowId);
    const text = generateJobDigestText(jobs, workflowId);

    const success = await this.send({
      to: recipients,
      subject,
      html,
      text,
    });

    if (success) {
      await this.updateEmailStats(workflowId);
    }

    return success;
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

  async sendTestEmail(to: string): Promise<boolean> {
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
