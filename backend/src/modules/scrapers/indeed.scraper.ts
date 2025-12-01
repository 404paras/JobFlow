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
    let jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    // Try RSS feed first (more reliable, less likely to be blocked)
    try {
      jobs = await this.scrapeViaRss(keywords, location, timeout);
      if (jobs.length > 0) {
        logger.info('Indeed RSS scrape completed', {
          keywords,
          location,
          jobsFound: jobs.length,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Indeed RSS scrape failed, trying HTML fallback', { error: message });
    }

    // Fallback to HTML scraping if RSS didn't work
    if (jobs.length === 0) {
      try {
        jobs = await this.scrapeViaHtml(keywords, location, timeout);
        logger.info('Indeed HTML scrape completed', {
          keywords,
          location,
          jobsFound: jobs.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(message);
        logger.error('Indeed scrape failed', { error: message });
      }
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

  /**
   * Scrape via Indeed's RSS feed (more reliable)
   */
  private async scrapeViaRss(
    keywords: string,
    location: string,
    timeout: number
  ): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    
    // Indeed RSS feed URL
    const rssUrl = `https://www.indeed.com/rss?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&sort=date`;

    const response = await axios.get(rssUrl, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      timeout,
    });

    const $ = cheerio.load(response.data, { xmlMode: true });

    $('item').each((_, el) => {
      const title = cleanText($(el).find('title').text());
      const link = $(el).find('link').text().trim();
      const description = cleanText($(el).find('description').text());
      const pubDate = $(el).find('pubDate').text();

      // Extract company and location from title or description
      // Indeed RSS format: "Job Title - Company - Location"
      const titleParts = title.split(' - ');
      const jobTitle = titleParts[0] || title;
      const company = titleParts[1] || 'Unknown';
      const jobLocation = titleParts[2] || location;

      if (jobTitle) {
        jobs.push({
          uid: generateJobUid(this.source, jobTitle, company, jobLocation),
          title: jobTitle,
          company,
          location: jobLocation,
          description: description || 'No description available',
          url: link,
          source: this.source,
          postedAt: pubDate ? new Date(pubDate) : new Date(),
          salary: extractSalary(description),
        });
      }
    });

    return jobs;
  }

  /**
   * Scrape via HTML (fallback, may be blocked)
   */
  private async scrapeViaHtml(
    keywords: string,
    location: string,
    timeout: number
  ): Promise<ScrapedJob[]> {
    const jobs: ScrapedJob[] = [];
    const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(location)}&sort=date`;

    const html = await withRetry(
      async () => {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cache-Control': 'max-age=0',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
          },
          timeout,
          maxRedirects: 5,
        });
        return response.data;
      },
      { maxAttempts: config.scraper.retryAttempts },
      'Indeed HTML scrape'
    );

    const $ = cheerio.load(html);

    // Check if we're blocked
    if (html.includes('captcha') || html.includes('blocked') || html.includes('unusual traffic')) {
      logger.warn('Indeed blocking detected - CAPTCHA or rate limit');
      return jobs;
    }

    // Try multiple selector patterns (Indeed changes these frequently)
    const selectors = [
      '.job_seen_beacon',
      '.jobsearch-ResultsList > li',
      '.resultContent',
      '[data-testid="job-card"]',
      '.tapItem',
    ];

    for (const selector of selectors) {
      if (jobs.length > 0) break;

      $(selector).each((_, el) => {
        const $el = $(el);
        
        // Title selectors
        const title = cleanText(
          $el.find('h2.jobTitle span, .jobTitle, [data-testid="jobTitle"], .jcs-JobTitle').first().text()
        );
        
        // Company selectors
        const company = cleanText(
          $el.find('.companyName, [data-testid="company-name"], .company_location .companyName').first().text()
        );
        
        // Location selectors
        const jobLocation = cleanText(
          $el.find('.companyLocation, [data-testid="text-location"], .company_location .companyLocation').first().text()
        ) || location;
        
        // Description
        const description = cleanText(
          $el.find('.job-snippet, [data-testid="job-snippet"], .jobCardShelfContainer').first().text()
        );
        
        // URL
        const href = $el.find('a.jcs-JobTitle, h2.jobTitle a, a[data-jk], .jobTitle a').first().attr('href');
        
        // Salary
        const salary = extractSalary(
          $el.find('.salary-snippet, [data-testid="attribute_snippet_testid"], .salaryOnly').first().text()
        );

        if (title && (company || jobLocation)) {
          const jobUrl = href 
            ? (href.startsWith('http') ? href : `https://in.indeed.com${href}`)
            : `https://in.indeed.com/jobs?q=${encodeURIComponent(title)}`;

          jobs.push({
            uid: generateJobUid(this.source, title, company || 'Unknown', jobLocation),
            title,
            company: company || 'Unknown',
            location: jobLocation,
            description: description || 'No description available',
            url: jobUrl,
            source: this.source,
            postedAt: new Date(),
            salary,
          });
        }
      });
    }

    return jobs;
  }
}

export const indeedScraper = new IndeedScraper();
export default indeedScraper;
