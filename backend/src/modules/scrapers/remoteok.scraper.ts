import axios from 'axios';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { generateJobUid, cleanText, extractSalary } from './scraper.utils';
import { ScrapedJob, JobSource } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

interface RemoteOKJob {
  id: string;
  epoch: number;
  date: string;
  company: string;
  company_logo: string;
  position: string;
  tags: string[];
  description: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
}

export class RemoteOKScraper implements IScraper {
  readonly source: JobSource = 'remoteok';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    // RemoteOK has a public JSON API
    const url = 'https://remoteok.com/api';

    try {
      const response = await axios.get<RemoteOKJob[]>(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
        },
        timeout,
      });

      // First item is a message/legal notice, skip it
      const jobData = response.data.slice(1);

      // Filter by keywords if provided
      const keywordLower = keywords.toLowerCase();
      const filteredJobs = jobData.filter((job) => {
        if (!job.position || !job.company) return false;
        
        const searchText = `${job.position} ${job.company} ${job.tags?.join(' ') || ''} ${job.description || ''}`.toLowerCase();
        
        // Split keywords and check if any match
        const keywordParts = keywordLower.split(/\s+/);
        return keywordParts.some(kw => searchText.includes(kw));
      });

      for (const job of filteredJobs) {
        const title = cleanText(job.position);
        const company = cleanText(job.company);
        const jobLocation = job.location || 'Remote';
        
        // Format salary if available
        let salary: string | undefined;
        if (job.salary_min && job.salary_max) {
          salary = `$${(job.salary_min / 1000).toFixed(0)}k - $${(job.salary_max / 1000).toFixed(0)}k`;
        } else if (job.salary_min) {
          salary = `$${(job.salary_min / 1000).toFixed(0)}k+`;
        }

        // Parse description - remove HTML tags
        const description = job.description
          ? cleanText(job.description.replace(/<[^>]*>/g, ' ').substring(0, 500))
          : 'No description available';

        jobs.push({
          uid: generateJobUid(this.source, title, company, jobLocation),
          title,
          company,
          location: jobLocation,
          description,
          url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
          source: this.source,
          postedAt: job.date ? new Date(job.date) : new Date(job.epoch * 1000),
          salary,
          tags: job.tags,
        });
      }

      logger.info('RemoteOK scrape completed', {
        keywords,
        jobsFound: jobs.length,
        totalAvailable: jobData.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('RemoteOK scrape failed', { error: message });
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
}

export const remoteOKScraper = new RemoteOKScraper();
export default remoteOKScraper;

