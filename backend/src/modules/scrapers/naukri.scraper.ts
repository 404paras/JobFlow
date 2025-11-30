import puppeteer, { Browser } from 'puppeteer';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { withRetry, generateJobUid, cleanText, extractSalary } from './scraper.utils';
import { ScrapedJob, JobSource } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

export class NaukriScraper implements IScraper {
  readonly source: JobSource = 'naukri';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    // Format keywords for URL
    const formattedKeywords = keywords.replace(/\s+/g, '-').toLowerCase();
    const url = `https://www.naukri.com/${formattedKeywords}-jobs-in-${location.toLowerCase()}`;

    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(getRandomUserAgent());
      await page.setViewport({ width: 1920, height: 1080 });

      await withRetry(
        async () => {
          await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout,
          });
        },
        { maxAttempts: config.scraper.retryAttempts },
        'Naukri page load'
      );

      // Wait for job listings
      await page.waitForSelector('.jobTuple, .srp-jobtuple-wrapper, .cust-job-tuple', {
        timeout: 10000,
      }).catch(() => {
        logger.warn('Naukri: Job selector timeout, attempting to scrape anyway');
      });

      // Extract job data - runs in browser context
      const scrapedData: Array<{
        title: string;
        company: string;
        location: string;
        salary: string;
        description: string;
        url: string;
      }> = await page.evaluate(() => {
        const jobNodes = Array.from(
          document.querySelectorAll('.jobTuple, .srp-jobtuple-wrapper, .cust-job-tuple')
        );
        
        return jobNodes.map((node) => {
          const titleEl = node.querySelector('a.title, .title, .jobTitle');
          const companyEl = node.querySelector('.subTitle, .comp-name, .companyInfo');
          const locationEl = node.querySelector('.location, .locWdth, .loc');
          const salaryEl = node.querySelector('.salary, .sal, .salaryText');
          const descEl = node.querySelector('.job-description, .ellipsis, .job-desc');
          const linkEl = node.querySelector('a') as HTMLAnchorElement | null;

          return {
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            salary: salaryEl?.textContent?.trim() || '',
            description: descEl?.textContent?.trim() || '',
            url: linkEl?.href || '',
          };
        }).filter((job) => job.title && job.company);
      });

      // Process scraped data
      for (const data of scrapedData) {
        jobs.push({
          uid: generateJobUid(this.source, data.title, data.company, data.location),
          title: cleanText(data.title),
          company: cleanText(data.company),
          location: cleanText(data.location) || location,
          description: cleanText(data.description) || 'No description available',
          url: data.url,
          source: this.source,
          postedAt: new Date(),
          salary: extractSalary(data.salary),
        });
      }

      logger.info('Naukri scrape completed', {
        keywords,
        location,
        jobsFound: jobs.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('Naukri scrape failed', { error: message });
    } finally {
      if (browser) {
        await browser.close();
      }
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
}

export const naukriScraper = new NaukriScraper();
export default naukriScraper;

