import { getEmailTransporter } from '../../config/email';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { ScrapedJob, EmailPayload } from '../../shared/types';
import { generateJobDigestHtml, generateJobDigestText } from './email.templates';
import { Workflow } from '../workflows/workflow.model';

export class EmailService {
  async send(payload: EmailPayload): Promise<boolean> {
    const transporter = getEmailTransporter();

    try {
      const mailOptions = {
        from: config.email.from,
        to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments,
      };

      const result = await transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to: payload.to,
        subject: payload.subject,
        messageId: result.messageId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        to: payload.to,
        subject: payload.subject,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
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
