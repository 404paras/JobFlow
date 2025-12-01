import axios from 'axios';
import * as cheerio from 'cheerio';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { withRetry, generateJobUid, cleanText, parseRelativeDate } from './scraper.utils';
import { ScrapedJob, JobSource } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

export class LinkedInScraper implements IScraper {
  readonly source: JobSource = 'linkedin';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    const url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&start=0`;

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
        'LinkedIn scrape'
      );

      const $ = cheerio.load(html);

      // Parse JSON-LD structured data
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).text());
          const processJob = (j: any) => {
            if (j['@type'] === 'JobPosting') {
              const title = cleanText(j.title);
              const company = cleanText(j.hiringOrganization?.name) || 'Unknown';
              const locationData = j.jobLocation?.address;
              const jobLocation = cleanText(
                locationData?.addressLocality || locationData?.addressRegion || location
              );
              const postedAt = j.datePosted ? new Date(j.datePosted) : new Date();
              const description = cleanText(j.description) || 'No description available';
              const jobUrl = j.url || '';

              if (title && company) {
                jobs.push({
                  uid: generateJobUid(this.source, title, company, jobLocation),
                  title,
                  company,
                  location: jobLocation,
                  postedAt,
                  description,
                  url: jobUrl,
                  source: this.source,
                  raw: j,
                });
              }
            }
          };

          if (Array.isArray(json)) {
            json.forEach(processJob);
          } else {
            processJob(json);
          }
        } catch {
          // Ignore JSON parse errors
        }
      });

      // Fallback: parse visible cards
      if (jobs.length === 0) {
        $('.base-card, .job-search-card').each((_, el) => {
          const title = cleanText($(el).find('.base-search-card__title, .job-search-card__title').text());
          const company = cleanText($(el).find('.base-search-card__subtitle, .job-search-card__subtitle').text());
          const jobLocation = cleanText($(el).find('.job-search-card__location').text()) || location;
          const jobUrl = $(el).find('a.base-card__full-link, a.job-search-card__link-wrapper').attr('href') || '';

          if (title && jobUrl) {
            jobs.push({
              uid: generateJobUid(this.source, title, company || 'Unknown', jobLocation),
              title,
              company: company || 'Unknown',
              location: jobLocation,
              description: 'No description available',
              url: jobUrl,
              source: this.source,
              postedAt: new Date(),
            });
          }
        });
      }

      logger.info('LinkedIn scrape completed', {
        keywords,
        location,
        jobsFound: jobs.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('LinkedIn scrape failed', { error: message });
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

export const linkedInScraper = new LinkedInScraper();
export default linkedInScraper;

