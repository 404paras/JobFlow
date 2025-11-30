import { ScrapedJob } from '../../shared/types';

export function generateJobDigestHtml(jobs: ScrapedJob[], workflowId: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const jobCards = jobs
    .map(
      (job) => `
      <div style="background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #1a1a2e;">
              ${escapeHtml(job.title)}
            </h3>
            <p style="margin: 0; font-size: 14px; color: #6366f1; font-weight: 600;">
              ${escapeHtml(job.company)}
            </p>
          </div>
          <span style="padding: 6px 12px; background: ${getSourceGradient(job.source)}; color: white; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            ${job.source}
          </span>
        </div>
        
        <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 13px;">
            <span style="font-size: 16px;">📍</span>
            ${escapeHtml(job.location)}
          </div>
          ${job.salary ? `
          <div style="display: flex; align-items: center; gap: 6px; color: #10b981; font-size: 13px; font-weight: 600;">
            <span style="font-size: 16px;">💰</span>
            ${escapeHtml(job.salary)}
          </div>
          ` : ''}
          ${job.postedAt ? `
          <div style="display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 13px;">
            <span style="font-size: 16px;">🕐</span>
            ${new Date(job.postedAt).toLocaleDateString()}
          </div>
          ` : ''}
        </div>
        
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
          ${escapeHtml(job.description?.substring(0, 180) || 'No description available')}${job.description && job.description.length > 180 ? '...' : ''}
        </p>
        
        <a href="${escapeHtml(job.url)}" 
           style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                  color: white; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 600; 
                  box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.4);">
          Apply Now →
        </a>
      </div>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Job Digest from JobFlow</title>
      </head>
      <body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; margin: 0 auto;">
          <tr>
            <td style="padding: 40px 20px;">
              
              <!-- Header Card -->
              <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); border-radius: 24px; padding: 40px 32px; text-align: center; margin-bottom: 24px; box-shadow: 0 20px 25px -5px rgba(99, 102, 241, 0.3);">
                <div style="width: 64px; height: 64px; background: white; border-radius: 16px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                  <span style="font-size: 32px;">🚀</span>
                </div>
                <h1 style="margin: 0 0 8px 0; color: white; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">
                  Your Daily Job Digest
                </h1>
                <p style="margin: 0 0 16px 0; color: rgba(255,255,255,0.9); font-size: 15px;">
                  ${today}
                </p>
                <div style="display: inline-block; padding: 10px 20px; background: rgba(255,255,255,0.2); border-radius: 30px; backdrop-filter: blur(10px);">
                  <span style="color: white; font-size: 16px; font-weight: 700;">
                    🎯 ${jobs.length} New ${jobs.length === 1 ? 'Opportunity' : 'Opportunities'}
                  </span>
                </div>
              </div>

              <!-- Stats Cards -->
              <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                <div style="flex: 1; background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <div style="font-size: 28px; font-weight: 800; color: #0077b5;">${countBySource(jobs, 'linkedin')}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">LinkedIn</div>
                </div>
                <div style="flex: 1; background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <div style="font-size: 28px; font-weight: 800; color: #2164f3;">${countBySource(jobs, 'indeed')}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Indeed</div>
                </div>
                <div style="flex: 1; background: white; border-radius: 16px; padding: 20px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                  <div style="font-size: 28px; font-weight: 800; color: #ff7555;">${countBySource(jobs, 'naukri')}</div>
                  <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Naukri</div>
                </div>
              </div>

              <!-- Section Title -->
              <div style="margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1e293b;">
                  ✨ Today's Top Picks
                </h2>
              </div>

              <!-- Job Cards -->
              ${jobCards}

              <!-- Footer -->
              <div style="background: white; border-radius: 16px; padding: 32px; text-align: center; margin-top: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 20px; font-weight: 800;">J</span>
                </div>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">
                  Powered by <strong style="color: #6366f1;">JobFlow</strong>
                </p>
                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                  Workflow ID: ${workflowId}
                </p>
              </div>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function generateJobDigestText(jobs: ScrapedJob[], workflowId: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const header = `
🚀 YOUR DAILY JOB DIGEST
${today}
${'='.repeat(50)}
🎯 ${jobs.length} New ${jobs.length === 1 ? 'Opportunity' : 'Opportunities'} Found!

`;

  const jobList = jobs
    .map(
      (job, index) => `
📌 JOB ${index + 1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${job.title}
🏢 ${job.company}
📍 ${job.location}
${job.salary ? `💰 ${job.salary}` : ''}
🏷️ Source: ${job.source.toUpperCase()}

${job.description?.substring(0, 200) || 'No description available'}${job.description && job.description.length > 200 ? '...' : ''}

🔗 Apply: ${job.url}
`
    )
    .join('\n');

  const footer = `
${'='.repeat(50)}
Powered by JobFlow
Workflow ID: ${workflowId}
`;

  return header + jobList + footer;
}

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
}

function getSourceGradient(source: string): string {
  switch (source.toLowerCase()) {
    case 'linkedin':
      return 'linear-gradient(135deg, #0077b5, #00a0dc)';
    case 'indeed':
      return 'linear-gradient(135deg, #2164f3, #4285f4)';
    case 'naukri':
      return 'linear-gradient(135deg, #ff7555, #ff9a7a)';
    default:
      return 'linear-gradient(135deg, #6b7280, #9ca3af)';
  }
}

function countBySource(jobs: ScrapedJob[], source: string): number {
  return jobs.filter((j) => j.source === source).length;
}

