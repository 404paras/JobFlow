import { logger } from '../../shared/utils/logger';
import { RetryConfig, DEFAULT_RETRY_CONFIG } from './scraper.types';

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operationName: string = 'operation'
): Promise<T> {
  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffMultiplier,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        logger.warn(`${operationName} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms`, {
          error: lastError.message,
        });
        
        await sleep(delay);
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  logger.error(`${operationName} failed after ${maxAttempts} attempts`, {
    error: lastError?.message,
  });
  
  throw lastError;
}

/**
 * Generate a unique job ID
 */
export function generateJobUid(source: string, title: string, company: string, location: string): string {
  const data = `${title}_${company}_${location}`.toLowerCase();
  const hash = Buffer.from(data).toString('base64').substring(0, 20);
  return `${source}_${hash}`;
}

/**
 * Parse relative date strings (e.g., "2 days ago", "1 week ago")
 */
export function parseRelativeDate(dateStr: string): Date {
  const now = new Date();
  const lower = dateStr.toLowerCase().trim();

  if (lower.includes('just now') || lower.includes('today')) {
    return now;
  }

  const match = lower.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/);
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'minute':
        return new Date(now.getTime() - value * 60 * 1000);
      case 'hour':
        return new Date(now.getTime() - value * 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - value * 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - value * 30 * 24 * 60 * 60 * 1000);
    }
  }

  // Try to parse as regular date
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? now : parsed;
}

/**
 * Clean and normalize text
 */
export function cleanText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n');
}

/**
 * Extract salary from text
 */
export function extractSalary(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  
  // Match common salary patterns
  const patterns = [
    /₹[\d,]+\s*-\s*₹[\d,]+/,
    /\$[\d,]+\s*-\s*\$[\d,]+/,
    /[\d,]+\s*-\s*[\d,]+\s*(LPA|lpa|k|K)/,
    /₹[\d,]+\s*(LPA|lpa|k|K)?/,
    /\$[\d,]+\s*(k|K)?/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

