import axios from 'axios';
import * as cheerio from 'cheerio';
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

    // Format keywords for URL - Naukri uses hyphenated format
    const formattedKeywords = keywords.replace(/\s+/g, '-').toLowerCase();
    const formattedLocation = location.replace(/\s+/g, '-').toLowerCase();
    const url = `https://www.naukri.com/${formattedKeywords}-jobs-in-${formattedLocation}`;

    try {
      const html = await withRetry(
        async () => {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': getRandomUserAgent(),
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Cache-Control': 'max-age=0',
            },
            timeout,
          });
          return response.data;
        },
        { maxAttempts: config.scraper.retryAttempts },
        'Naukri scrape'
      );

      const $ = cheerio.load(html);

      // Try to parse JSON-LD structured data first (most reliable)
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).text());
          
          const processJob = (j: any) => {
            if (j['@type'] === 'JobPosting') {
              const title = cleanText(j.title);
              const company = cleanText(j.hiringOrganization?.name) || 'Unknown';
              const jobLocation = cleanText(
                j.jobLocation?.address?.addressLocality || 
                j.jobLocation?.address?.addressRegion || 
                location
              );
              const postedAt = j.datePosted ? new Date(j.datePosted) : new Date();
              const description = cleanText(j.description) || 'No description available';
              const jobUrl = j.url || '';
              const salary = j.baseSalary?.value?.value 
                ? `₹${j.baseSalary.value.value}` 
                : extractSalary(j.baseSalary?.value?.toString() || '');

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
                  salary,
                  raw: j,
                });
              }
            }
          };

          if (Array.isArray(json)) {
            json.forEach(processJob);
          } else if (json['@graph']) {
            json['@graph'].forEach(processJob);
          } else {
            processJob(json);
          }
        } catch {
          // Ignore JSON parse errors
        }
      });

      // Fallback: parse visible job cards
      if (jobs.length === 0) {
        // Naukri uses various class patterns for job listings
        const selectors = [
          '.jobTuple',
          '.srp-jobtuple-wrapper', 
          '.cust-job-tuple',
          '[class*="jobTuple"]',
          'article[class*="job"]',
        ];

        $(selectors.join(', ')).each((_, el) => {
          const $el = $(el);
          
          // Try multiple selector patterns for each field
          const title = cleanText(
            $el.find('a.title, .title, .jobTitle, [class*="title"] a, h2 a').first().text()
          );
          const company = cleanText(
            $el.find('.subTitle, .comp-name, .companyInfo, [class*="company"], .comp-dtls-wrap a').first().text()
          );
          const jobLocation = cleanText(
            $el.find('.location, .locWdth, .loc, [class*="location"], .loc-wrap').first().text()
          ) || location;
          const salaryText = cleanText(
            $el.find('.salary, .sal, .salaryText, [class*="salary"], .sal-wrap').first().text()
          );
          const description = cleanText(
            $el.find('.job-description, .ellipsis, .job-desc, [class*="desc"]').first().text()
          ) || 'No description available';
          const jobUrl = $el.find('a.title, a[class*="title"], h2 a, a').first().attr('href') || '';

          if (title) {
            jobs.push({
              uid: generateJobUid(this.source, title, company || 'Unknown', jobLocation),
              title,
              company: company || 'Unknown',
              location: jobLocation,
              description,
              url: jobUrl.startsWith('http') ? jobUrl : `https://www.naukri.com${jobUrl}`,
              source: this.source,
              postedAt: new Date(),
              salary: extractSalary(salaryText),
            });
          }
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

export const naukriScraper = new NaukriScraper();
export default naukriScraper;
