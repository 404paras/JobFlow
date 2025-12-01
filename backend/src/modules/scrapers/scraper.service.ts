import { JobSource, ScrapedJob } from '../../shared/types';
import { IScraper, ScraperConfig, ScraperResult } from './scraper.types';
import { linkedInScraper } from './linkedin.scraper';
import { remoteOKScraper } from './remoteok.scraper';
import { naukriScraper } from './naukri.scraper';
import { googleJobsScraper } from './google.scraper';
import { wellfoundScraper } from './wellfound.scraper';
import { sleep } from './scraper.utils';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

export class ScraperService {
  private scrapers: Map<JobSource, IScraper>;

  constructor() {
    this.scrapers = new Map([
      ['linkedin', linkedInScraper],
      ['remoteok', remoteOKScraper],
      ['naukri', naukriScraper],
      ['google', googleJobsScraper],
      ['wellfound', wellfoundScraper],
    ]);
  }

  /**
   * Get scraper by source
   */
  getScraper(source: JobSource): IScraper {
    const scraper = this.scrapers.get(source);
    if (!scraper) {
      throw new Error(`Unknown scraper source: ${source}`);
    }
    return scraper;
  }

  /**
   * Scrape jobs from a single source
   */
  async scrapeSource(source: JobSource, scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const scraper = this.getScraper(source);
    return scraper.scrape(scraperConfig);
  }

  /**
   * Scrape jobs from multiple sources
   */
  async scrapeMultiple(
    sources: JobSource[],
    scraperConfig: ScraperConfig
  ): Promise<Map<JobSource, ScraperResult>> {
    const results = new Map<JobSource, ScraperResult>();

    for (const source of sources) {
      try {
        const result = await this.scrapeSource(source, scraperConfig);
        results.set(source, result);

        // Rate limit between sources
        if (sources.indexOf(source) < sources.length - 1) {
          await sleep(config.scraper.rateLimitDelay);
        }
      } catch (error) {
        logger.error(`Failed to scrape ${source}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        results.set(source, {
          jobs: [],
          source,
          totalFound: 0,
          scrapedAt: new Date(),
          duration: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }
    }

    return results;
  }

  /**
   * Scrape all sources and combine results
   */
  async scrapeAll(scraperConfig: ScraperConfig): Promise<{
    jobs: ScrapedJob[];
    results: Map<JobSource, ScraperResult>;
    totalDuration: number;
  }> {
    const startTime = Date.now();
    const sources: JobSource[] = ['linkedin', 'remoteok', 'naukri', 'google', 'wellfound'];
    
    const results = await this.scrapeMultiple(sources, scraperConfig);
    
    // Combine all jobs
    const allJobs: ScrapedJob[] = [];
    results.forEach((result) => {
      allJobs.push(...result.jobs);
    });

    // Remove duplicates based on title + company
    const seen = new Set<string>();
    const uniqueJobs = allJobs.filter((job) => {
      const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    logger.info('All sources scraped', {
      totalJobs: uniqueJobs.length,
      sources: sources.length,
      duration: Date.now() - startTime,
    });

    return {
      jobs: uniqueJobs,
      results,
      totalDuration: Date.now() - startTime,
    };
  }
}

export const scraperService = new ScraperService();
export default scraperService;

