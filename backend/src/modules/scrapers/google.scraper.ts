import axios from 'axios';
import * as cheerio from 'cheerio';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { withRetry, generateJobUid, cleanText } from './scraper.utils';
import { ScrapedJob, JobSource, ExperienceLevel } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

export class GoogleJobsScraper implements IScraper {
  readonly source: JobSource = 'google';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    // Google Jobs search URL - uses ibp parameter for jobs
    const query = `${keywords} jobs ${location}`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&ibp=htl;jobs`;

    try {
      const html = await withRetry(
        async () => {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': getRandomUserAgent(),
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Accept-Encoding': 'gzip, deflate, br',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
            },
            timeout,
          });
          return response.data;
        },
        { maxAttempts: config.scraper.retryAttempts },
        'Google Jobs scrape'
      );

      const $ = cheerio.load(html);

      // Try to extract job data from the page
      // Google embeds job data in script tags
      $('script').each((_, el) => {
        const scriptContent = $(el).html() || '';
        
        // Look for job posting data in various formats
        if (scriptContent.includes('JobPosting') || scriptContent.includes('job_title')) {
          try {
            // Try to extract JSON-LD
            const jsonMatch = scriptContent.match(/\{[^{}]*"@type"\s*:\s*"JobPosting"[^{}]*\}/g);
            if (jsonMatch) {
              jsonMatch.forEach(jsonStr => {
                try {
                  const job = JSON.parse(jsonStr);
                  this.parseJobPosting(job, jobs, location);
                } catch {}
              });
            }
          } catch {}
        }
      });

      // Fallback: Try to parse visible job cards
      if (jobs.length === 0) {
        // Google Jobs uses various div structures
        $('[data-ved]').each((_, el) => {
          const $el = $(el);
          const text = $el.text();
          
          // Look for job-like content
          if (text.length > 50 && text.length < 2000) {
            const titleEl = $el.find('h3, [role="heading"]').first();
            const title = cleanText(titleEl.text());
            
            if (title && title.length > 5 && title.length < 200) {
              // Try to extract company and other details
              const fullText = $el.text();
              const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
              
              let company = 'Unknown';
              let jobLocation = location;
              
              // Heuristic: company is usually after title
              if (lines.length > 1) {
                const potentialCompany = lines.find(l => 
                  l !== title && 
                  l.length > 2 && 
                  l.length < 100 && 
                  !l.includes('ago') &&
                  !l.includes('Apply')
                );
                if (potentialCompany) company = potentialCompany;
              }

              // Check if we already have this job
              const uid = generateJobUid(this.source, title, company, jobLocation);
              if (!jobs.some(j => j.uid === uid)) {
                jobs.push({
                  uid,
                  title,
                  company,
                  location: jobLocation,
                  description: cleanText(fullText.substring(0, 500)),
                  url: `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + company + ' jobs')}`,
                  source: this.source,
                  postedAt: new Date(),
                });
              }
            }
          }
        });
      }

      logger.info('Google Jobs scrape completed', {
        keywords,
        location,
        jobsFound: jobs.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('Google Jobs scrape failed', { error: message });
    }

    // Sort by date (latest first) before limiting
    const sortedJobs = jobs.sort((a, b) => {
      const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return dateB - dateA;
    });

    return {
      jobs: sortedJobs.slice(0, maxResults),
      source: this.source,
      totalFound: jobs.length,
      scrapedAt: new Date(),
      duration: Date.now() - startTime,
      errors,
    };
  }

  private parseJobPosting(job: any, jobs: ScrapedJob[], defaultLocation: string): void {
    const title = cleanText(job.title || job.job_title || '');
    const company = cleanText(job.hiringOrganization?.name || job.company || 'Unknown');
    const location = cleanText(
      job.jobLocation?.address?.addressLocality ||
      job.location ||
      defaultLocation
    );
    const description = cleanText(job.description || '');
    const url = job.url || '';
    const postedAt = job.datePosted ? new Date(job.datePosted) : new Date();

    if (title && company) {
      jobs.push({
        uid: generateJobUid(this.source, title, company, location),
        title,
        company,
        location,
        description: description || 'No description available',
        url,
        source: this.source,
        postedAt,
        experienceLevel: this.detectExperienceLevel(title + ' ' + description),
      });
    }
  }

  private detectExperienceLevel(text: string): ExperienceLevel {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('senior') || lowerText.includes('sr.') || lowerText.includes('lead') || lowerText.includes('principal')) {
      return 'senior';
    }
    if (lowerText.includes('junior') || lowerText.includes('jr.') || lowerText.includes('entry') || lowerText.includes('fresher') || lowerText.includes('graduate')) {
      return 'entry';
    }
    if (lowerText.includes('mid') || lowerText.includes('intermediate')) {
      return 'mid';
    }
    
    return 'any';
  }
}

export const googleJobsScraper = new GoogleJobsScraper();
export default googleJobsScraper;

