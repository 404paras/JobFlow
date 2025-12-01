import axios from 'axios';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { generateJobUid, cleanText } from './scraper.utils';
import { ScrapedJob, JobSource, ExperienceLevel } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo: string;
  jobIndustry: string[];
  jobType: string[];
  jobGeo: string;
  jobLevel: string;
  jobExcerpt: string;
  jobDescription: string;
  pubDate: string;
}

interface JobicyResponse {
  jobs: JobicyJob[];
}

export class JobicyScraper implements IScraper {
  readonly source: JobSource = 'jobicy';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    const url = `https://jobicy.com/api/v2/remote-jobs?count=${Math.min(maxResults * 2, 50)}&tag=${encodeURIComponent(keywords)}`;

    try {
      const response = await axios.get<JobicyResponse>(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
        },
        timeout,
      });

      const locationLower = location.toLowerCase();

      for (const job of response.data.jobs || []) {
        const jobGeoLower = (job.jobGeo || '').toLowerCase();
        
        const matchesLocation = 
          location === 'All' ||
          location === 'Remote' ||
          jobGeoLower.includes(locationLower) ||
          jobGeoLower.includes('worldwide') ||
          jobGeoLower.includes('anywhere');

        if (matchesLocation) {
          jobs.push({
            uid: generateJobUid(this.source, job.jobTitle, job.companyName, job.jobGeo),
            title: cleanText(job.jobTitle),
            company: cleanText(job.companyName),
            location: job.jobGeo || 'Remote',
            description: cleanText(job.jobDescription || job.jobExcerpt || ''),
            url: job.url,
            source: this.source,
            postedAt: new Date(job.pubDate),
            experienceLevel: this.mapJobLevel(job.jobLevel),
            tags: job.jobIndustry || [],
          });
        }

        if (jobs.length >= maxResults) break;
      }

      logger.info('Jobicy scrape completed', {
        keywords,
        location,
        jobsFound: jobs.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('Jobicy scrape failed', { error: message });
    }

    return {
      jobs: jobs.slice(0, maxResults),
      source: this.source,
      totalFound: jobs.length,
      scrapedAt: new Date(),
      duration: Date.now() - startTime,
      errors,
    };
  }

  private mapJobLevel(level: string): ExperienceLevel {
    const lowerLevel = (level || '').toLowerCase();
    if (lowerLevel.includes('senior') || lowerLevel.includes('lead')) return 'senior';
    if (lowerLevel.includes('junior') || lowerLevel.includes('entry')) return 'entry';
    if (lowerLevel.includes('mid')) return 'mid';
    return 'any';
  }
}

export const jobicyScraper = new JobicyScraper();
export default jobicyScraper;

