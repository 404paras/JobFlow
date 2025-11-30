import { ScrapedJob } from '../../shared/types';

export function generateJobDigestHtml(jobs: ScrapedJob[], workflowId: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const jobCards = jobs
    .slice(0, 10)
    .map(
      (job) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #f1f5f9;">
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td>
                <a href="${escapeHtml(job.url)}" style="text-decoration: none;">
                  <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; color: #1e293b;">
                    ${escapeHtml(job.title)}
                  </h3>
                </a>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6366f1; font-weight: 500;">
                  ${escapeHtml(job.company)}
                </p>
                <p style="margin: 0; font-size: 13px; color: #64748b;">
                  📍 ${escapeHtml(job.location)}${job.salary ? ` • 💰 ${escapeHtml(job.salary)}` : ''}
                </p>
              </td>
              <td style="text-align: right; vertical-align: top; width: 80px;">
                <span style="display: inline-block; padding: 4px 10px; background: ${getSourceColor(job.source)}; color: white; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase;">
                  ${job.source}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 0 auto; padding: 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 32px; text-align: center;">
              <h1 style="margin: 0 0 8px 0; color: white; font-size: 24px; font-weight: 700;">
                🎯 ${jobs.length} New Jobs Found!
              </h1>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                ${today} • Your Daily Digest
              </p>
            </td>
          </tr>
        </table>

        <!-- Quick Stats -->
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
          <tr>
            <td style="background: white; border-radius: 12px; padding: 16px; text-align: center; width: 33%;">
              <div style="font-size: 20px; font-weight: 700; color: #0077b5;">${countBySource(jobs, 'linkedin')}</div>
              <div style="font-size: 11px; color: #64748b;">LinkedIn</div>
            </td>
            <td style="width: 8px;"></td>
            <td style="background: white; border-radius: 12px; padding: 16px; text-align: center; width: 33%;">
              <div style="font-size: 20px; font-weight: 700; color: #2164f3;">${countBySource(jobs, 'indeed')}</div>
              <div style="font-size: 11px; color: #64748b;">Indeed</div>
            </td>
            <td style="width: 8px;"></td>
            <td style="background: white; border-radius: 12px; padding: 16px; text-align: center; width: 33%;">
              <div style="font-size: 20px; font-weight: 700; color: #ff7555;">${countBySource(jobs, 'naukri')}</div>
              <div style="font-size: 11px; color: #64748b;">Naukri</div>
            </td>
          </tr>
        </table>

        <!-- Jobs List -->
        <table cellpadding="0" cellspacing="0" width="100%" style="background: white; border-radius: 16px; padding: 20px;">
          <tr>
            <td style="padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;">
              <h2 style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">
                ✨ Today's Opportunities
              </h2>
            </td>
          </tr>
          ${jobCards}
          ${jobs.length > 10 ? `
          <tr>
            <td style="padding-top: 16px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                + ${jobs.length - 10} more jobs available
              </p>
            </td>
          </tr>
          ` : ''}
        </table>

        <!-- Footer -->
        <table cellpadding="0" cellspacing="0" width="100%" style="margin-top: 20px;">
          <tr>
            <td style="text-align: center; padding: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">
                Powered by <strong style="color: #6366f1;">JobFlow</strong>
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                Automate your job search • Built by Paras Garg
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function generateJobDigestText(jobs: ScrapedJob[], workflowId: string): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const header = `
🎯 ${jobs.length} NEW JOBS FOUND!
${today} • Your Daily Digest
${'─'.repeat(40)}

`;

  const jobList = jobs
    .slice(0, 10)
    .map(
      (job, index) => `
${index + 1}. ${job.title}
   🏢 ${job.company}
   📍 ${job.location}${job.salary ? ` • 💰 ${job.salary}` : ''}
   🔗 ${job.url}
`
    )
    .join('');

  const footer = `
${'─'.repeat(40)}
${jobs.length > 10 ? `+ ${jobs.length - 10} more jobs\n` : ''}
Powered by JobFlow • Built by Paras Garg
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

function getSourceColor(source: string): string {
  switch (source.toLowerCase()) {
    case 'linkedin':
      return '#0077b5';
    case 'indeed':
      return '#2164f3';
    case 'naukri':
      return '#ff7555';
    default:
      return '#6b7280';
  }
}

function countBySource(jobs: ScrapedJob[], source: string): number {
  return jobs.filter((j) => j.source === source).length;
}
