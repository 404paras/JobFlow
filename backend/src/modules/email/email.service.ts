import { getEmailTransporter, createEmailTransporter, getResendClient, getEmailProvider } from '../../config/email';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { ScrapedJob, EmailPayload } from '../../shared/types';
import { generateJobDigestHtml, generateJobDigestText } from './email.templates';
import { Workflow } from '../workflows/workflow.model';

const delay = (ms: number) => new Promise(resolve => 
  setTimeout(resolve, ms + Math.random() * 1000)
);

export class EmailService {
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 2000;

  async send(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    const provider = getEmailProvider();
    
    if (provider === 'resend') {
      return this.sendWithResend(payload);
    }
    
    return this.sendWithSMTP(payload);
  }

  private async sendWithResend(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    const resend = getResendClient();
    const to = Array.isArray(payload.to) ? payload.to : [payload.to];

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const { data, error } = await resend.emails.send({
          from: config.email.from,
          to: to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });

        if (error) {
          throw new Error(error.message);
        }

        logger.info('Email sent via Resend', {
          to: payload.to,
          subject: payload.subject,
          id: data?.id,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isLastAttempt = attempt === this.maxRetries;

        logger.warn(`Resend attempt ${attempt}/${this.maxRetries} failed`, {
          to: payload.to,
          error: errorMessage,
          willRetry: !isLastAttempt,
        });

        if (isLastAttempt) {
          logger.error('Failed to send email via Resend', {
            to: payload.to,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }

        await delay(this.baseDelayMs * attempt);
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  private async sendWithSMTP(payload: EmailPayload): Promise<{ success: boolean; error?: string }> {
    let transporter = getEmailTransporter();

    const mailOptions = {
      from: config.email.from,
      to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await transporter.sendMail(mailOptions);

        logger.info('Email sent via SMTP', {
          to: payload.to,
          subject: payload.subject,
          messageId: result.messageId,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isLastAttempt = attempt === this.maxRetries;

        logger.warn(`SMTP attempt ${attempt}/${this.maxRetries} failed`, {
          to: payload.to,
          error: errorMessage,
          willRetry: !isLastAttempt,
        });

        if (isLastAttempt) {
          logger.error('Failed to send email via SMTP', {
            to: payload.to,
            error: errorMessage,
          });
          return { success: false, error: errorMessage };
        }

        await delay(this.baseDelayMs * attempt);
        transporter = createEmailTransporter();
      }
    }

    return { success: false, error: 'Max retries exceeded' };
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
          <p>Your email is configured correctly using <strong>${getEmailProvider().toUpperCase()}</strong>.</p>
          <p style="color: #6b7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
      text: `Email configuration is working! Provider: ${getEmailProvider()}. Sent at: ${new Date().toISOString()}`,
    });
  }
}

export const emailService = new EmailService();
export default emailService;
