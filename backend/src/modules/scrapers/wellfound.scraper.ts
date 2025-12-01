import axios from 'axios';
import * as cheerio from 'cheerio';
import { IScraper, ScraperConfig, ScraperResult, getRandomUserAgent } from './scraper.types';
import { withRetry, generateJobUid, cleanText } from './scraper.utils';
import { ScrapedJob, JobSource, ExperienceLevel } from '../../shared/types';
import { logger } from '../../shared/utils/logger';
import { config } from '../../config';

export class WellfoundScraper implements IScraper {
  readonly source: JobSource = 'wellfound';

  async scrape(scraperConfig: ScraperConfig): Promise<ScraperResult> {
    const startTime = Date.now();
    const jobs: ScrapedJob[] = [];
    const errors: string[] = [];

    const { keywords, location, maxResults = 25 } = scraperConfig;
    const timeout = scraperConfig.timeout || config.scraper.timeout;

    // Wellfound search URL
    const locationSlug = location.toLowerCase().replace(/\s+/g, '-');
    const keywordSlug = keywords.toLowerCase().replace(/\s+/g, '-');
    const url = `https://wellfound.com/role/${keywordSlug}`;

    try {
      const html = await withRetry(
        async () => {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': getRandomUserAgent(),
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
              'Cache-Control': 'no-cache',
            },
            timeout,
          });
          return response.data;
        },
        { maxAttempts: config.scraper.retryAttempts },
        'Wellfound scrape'
      );

      const $ = cheerio.load(html);

      // Parse job listings from the page
      // Wellfound uses React, but initial HTML has job data
      $('[data-test="StartupResult"], .styles_component__jzHbe, [class*="JobListing"], [class*="job-listing"]').each((_, el) => {
        const $el = $(el);
        
        const title = cleanText($el.find('[data-test="JobTitle"], [class*="title"], h2, h3').first().text());
        const company = cleanText($el.find('[data-test="StartupName"], [class*="company"], [class*="startup"]').first().text());
        const jobLocation = cleanText($el.find('[data-test="Location"], [class*="location"]').first().text()) || location;
        const salary = cleanText($el.find('[data-test="Compensation"], [class*="salary"], [class*="compensation"]').first().text());
        const jobUrl = $el.find('a').first().attr('href') || '';
        
        if (title) {
          jobs.push({
            uid: generateJobUid(this.source, title, company || 'Startup', jobLocation),
            title,
            company: company || 'Startup',
            location: jobLocation,
            description: 'Startup opportunity - Apply for details',
            url: jobUrl.startsWith('http') ? jobUrl : `https://wellfound.com${jobUrl}`,
            source: this.source,
            postedAt: new Date(),
            salary: salary || undefined,
            experienceLevel: this.detectExperienceLevel(title),
            tags: ['startup'],
          });
        }
      });

      // Try alternative selectors if no jobs found
      if (jobs.length === 0) {
        // Parse Next.js data if available
        $('script#__NEXT_DATA__').each((_, el) => {
          try {
            const data = JSON.parse($(el).html() || '{}');
            const jobListings = this.extractJobsFromNextData(data, location);
            jobs.push(...jobListings);
          } catch {}
        });
      }

      // Final fallback: Look for any job-like content
      if (jobs.length === 0) {
        $('a[href*="/jobs/"], a[href*="/role/"]').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href') || '';
          const text = cleanText($el.text());
          
          if (text.length > 10 && text.length < 200 && !text.includes('See all')) {
            const title = text.split(' at ')[0] || text;
            const company = text.split(' at ')[1]?.split(' - ')[0] || 'Startup';
            
            jobs.push({
              uid: generateJobUid(this.source, title, company, location),
              title: cleanText(title),
              company: cleanText(company),
              location,
              description: 'Startup opportunity on Wellfound',
              url: href.startsWith('http') ? href : `https://wellfound.com${href}`,
              source: this.source,
              postedAt: new Date(),
              experienceLevel: this.detectExperienceLevel(title),
              tags: ['startup'],
            });
          }
        });
      }

      // Deduplicate
      const seen = new Set<string>();
      const uniqueJobs = jobs.filter(job => {
        if (seen.has(job.uid)) return false;
        seen.add(job.uid);
        return true;
      });

      logger.info('Wellfound scrape completed', {
        keywords,
        location,
        jobsFound: uniqueJobs.length,
      });

      jobs.length = 0;
      jobs.push(...uniqueJobs);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      logger.error('Wellfound scrape failed', { error: message });
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

  private extractJobsFromNextData(data: any, defaultLocation: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    
    try {
      // Navigate through Next.js data structure
      const findJobs = (obj: any): void => {
        if (!obj || typeof obj !== 'object') return;
        
        if (obj.title && obj.company) {
          jobs.push({
            uid: generateJobUid(this.source, obj.title, obj.company.name || obj.company, defaultLocation),
            title: cleanText(obj.title),
            company: cleanText(obj.company.name || obj.company),
            location: cleanText(obj.location || defaultLocation),
            description: cleanText(obj.description || 'Startup opportunity'),
            url: obj.url || `https://wellfound.com/jobs`,
            source: this.source,
            postedAt: obj.postedAt ? new Date(obj.postedAt) : new Date(),
            salary: obj.compensation || obj.salary,
            experienceLevel: this.detectExperienceLevel(obj.title),
            tags: ['startup'],
          });
        }
        
        if (Array.isArray(obj)) {
          obj.forEach(findJobs);
        } else {
          Object.values(obj).forEach(findJobs);
        }
      };
      
      findJobs(data);
    } catch {}
    
    return jobs;
  }

  private detectExperienceLevel(title: string): ExperienceLevel {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('senior') || lowerTitle.includes('sr.') || lowerTitle.includes('lead') || lowerTitle.includes('principal') || lowerTitle.includes('staff')) {
      return 'senior';
    }
    if (lowerTitle.includes('junior') || lowerTitle.includes('jr.') || lowerTitle.includes('entry') || lowerTitle.includes('intern') || lowerTitle.includes('associate')) {
      return 'entry';
    }
    if (lowerTitle.includes('mid') || lowerTitle.includes('intermediate')) {
      return 'mid';
    }
    
    return 'any';
  }
}

export const wellfoundScraper = new WellfoundScraper();
export default wellfoundScraper;

