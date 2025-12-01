import axios from 'axios';
import * as cheerio from 'cheerio';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { withRetry, generateJobUid, cleanText, extractSalary } from './scraper.utils';
import { ScrapedJob, JobSource } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

export class IndeedScraper implements IScraper {
  readonly source: JobSource = 'indeed';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&start=0`;

    try {
      const html = await withRetry(
        async () => {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': getRandomUserAgent(),
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
            },
            timeout,
          });
          return response.data;
        },
        { maxAttempts: config.scraper.retryAttempts },
        'Indeed scrape'
      );

      const $ = cheerio.load(html);

      $('.jobsearch-SerpJobCard, .job_seen_beacon, .resultContent').each((_, el) => {
        const titleEl = $(el).find('h2.jobTitle, .jobTitle span, [data-testid="jobTitle"]');
        const title = cleanText(titleEl.text());
        const company = cleanText($(el).find('.companyName, [data-testid="company-name"]').text());
        const jobLocation = cleanText($(el).find('.companyLocation, [data-testid="text-location"]').text());
        const description = cleanText($(el).find('.job-snippet, [data-testid="job-snippet"]').text());
        
        const href = $(el).find('a.jcs-JobTitle, h2.jobTitle a, [data-testid="jobTitle-link"]').attr('href');
        const salaryEl = $(el).find('.salary-snippet, [data-testid="attribute_snippet_testid"]');
        const salary = extractSalary(salaryEl.text());

        if (title && company && jobLocation) {
          const jobUrl = href 
            ? (href.startsWith('http') ? href : `https://in.indeed.com${href}`)
            : `https://in.indeed.com/jobs?q=${encodeURIComponent(title)}`;

          jobs.push({
            uid: generateJobUid(this.source, title, company, jobLocation),
            title,
            company,
            location: jobLocation,
            description: description || 'No description available',
            url: jobUrl,
            source: this.source,
            postedAt: new Date(),
            salary,
          });
        }
      });

      logger.info('Indeed scrape completed', {
        keywords,
        location,
        jobsFound: jobs.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('Indeed scrape failed', { error: message });
    }

    // Sort by date (latest first) before limiting
    const sortedJobs = jobs.sort((a, b) => {
      const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return dateB - dateA; // Latest first
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

export const indeedScraper = new IndeedScraper();
export default indeedScraper;

