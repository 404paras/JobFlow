import axios from 'axios';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { generateJobUid, cleanText } from './scraper.utils';
import { ScrapedJob, JobSource, ExperienceLevel } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links: { next?: string };
  meta: { total: number };
}

export class ArbeitnowScraper implements IScraper {
  readonly source: JobSource = 'arbeitnow';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 100 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    const url = 'https://www.arbeitnow.com/api/job-board-api';

    try {
      const response = await axios.get<ArbeitnowResponse>(url, {
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'application/json',
        },
        timeout,
      });

      const keywordsLower = keywords.toLowerCase();
      const locationLower = location.toLowerCase();

      for (const job of response.data.data) {
        const titleLower = job.title.toLowerCase();
        const descLower = job.description.toLowerCase();
        const jobLocationLower = job.location.toLowerCase();
        const tagsLower = job.tags.map(t => t.toLowerCase()).join(' ');

        const matchesKeyword = 
          titleLower.includes(keywordsLower) ||
          descLower.includes(keywordsLower) ||
          tagsLower.includes(keywordsLower);

        const matchesLocation = 
          location === 'All' ||
          location === 'Remote' && job.remote ||
          jobLocationLower.includes(locationLower);

        if (matchesKeyword && matchesLocation) {
          jobs.push({
            uid: generateJobUid(this.source, job.title, job.company_name, job.location),
            title: cleanText(job.title),
            company: cleanText(job.company_name),
            location: job.remote ? 'Remote' : cleanText(job.location),
            description: cleanText(job.description.substring(0, 1000)),
            url: job.url,
            source: this.source,
            postedAt: new Date(job.created_at * 1000),
            experienceLevel: this.detectExperienceLevel(job.title),
            tags: job.tags,
          });
        }

        if (jobs.length >= maxResults) break;
      }

      logger.info('Arbeitnow scrape completed', {
        keywords,
        location,
        jobsFound: jobs.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('Arbeitnow scrape failed', { error: message });
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

  private detectExperienceLevel(title: string): ExperienceLevel {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('senior') || lowerTitle.includes('lead') || lowerTitle.includes('principal')) return 'senior';
    if (lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerTitle.includes('intern')) return 'entry';
    if (lowerTitle.includes('mid')) return 'mid';
    return 'any';
  }
}

export const arbeitnowScraper = new ArbeitnowScraper();
export default arbeitnowScraper;

