import { JobListing, IJobListingDocument, ApplicationStatus } from './job.model';
import {
  CreateJobInput,
  BulkCreateJobsInput,
  JobQueryParams,
  UserJobQueryParams,
  FilterCriteria,
  NormalizationConfig,
  QualityCheckConfig,
} from './job.schema';
import { NotFoundError } from '../../shared/middleware/error-handler';
import { logger } from '../../shared/utils/logger';
import { PaginatedResponse, JobSource } from '../../shared/types';

interface QualityCheckResult {
  isValid: boolean;
  score: number;
  issues: string[];
  warnings: string[];
}

class JobQualityChecker {
  private config: QualityCheckConfig;
  
  private spamKeywords = [
    'work from home scam',
    'pay upfront',
    'guaranteed income',
    'no experience needed earn',
    'click here now',
    'limited time offer',
    'get rich quick',
    'mlm',
    'pyramid scheme',
  ];

  constructor(config: Partial<QualityCheckConfig>) {
    this.config = {
      workflowId: config.workflowId || '',
      minTitleLength: config.minTitleLength || 5,
      minDescriptionLength: config.minDescriptionLength || 50,
      maxDaysOld: config.maxDaysOld || 90,
      checkSpam: config.checkSpam !== false,
      strictMode: config.strictMode || false,
      autoRemoveInvalid: config.autoRemoveInvalid || false,
    };
  }

  checkJob(job: any): QualityCheckResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    if (!job.title || job.title.length < this.config.minTitleLength) {
      issues.push(`Title too short (min ${this.config.minTitleLength} chars)`);
      score -= 20;
    }

    if (!job.company) {
      issues.push('Missing company name');
      score -= 25;
    }

    if (!job.location) {
      issues.push('Missing location');
      score -= 15;
    }

    if (!job.description || job.description.length < this.config.minDescriptionLength) {
      issues.push(`Description too short (min ${this.config.minDescriptionLength} chars)`);
      score -= 20;
    }

    if (!job.url) {
      issues.push('Missing URL');
      score -= 10;
    }

    if (this.config.checkSpam) {
      const text = `${job.title} ${job.description} ${job.company}`.toLowerCase();
      for (const keyword of this.spamKeywords) {
        if (text.includes(keyword)) {
          issues.push(`Potential spam: contains "${keyword}"`);
          score -= 40;
          break;
        }
      }
    }

    if (job.postedAt) {
      const daysDiff = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > this.config.maxDaysOld) {
        warnings.push(`Job is ${Math.floor(daysDiff)} days old`);
        score -= 10;
      }
    }

    score = Math.max(0, Math.min(100, score));

    const isValid = this.config.strictMode
      ? score >= 80 && issues.length === 0
      : score >= 60;

    return { isValid, score, issues, warnings };
  }

  checkBatch(jobs: any[]): {
    valid: any[];
    invalid: any[];
    results: Map<string, QualityCheckResult>;
  } {
    const valid: any[] = [];
    const invalid: any[] = [];
    const results = new Map<string, QualityCheckResult>();
    const seen = new Set<string>();

    jobs.forEach((job, index) => {
      const result = this.checkJob(job);
      const key = `${job.title?.toLowerCase()}-${job.company?.toLowerCase()}`;

      if (seen.has(key)) {
        result.isValid = false;
        result.issues.push('Duplicate job in batch');
        result.score -= 20;
      } else {
        seen.add(key);
      }

      const jobId = job.uid || `job_${index}`;
      results.set(jobId, result);

      if (result.isValid) {
        valid.push(job);
      } else {
        invalid.push(job);
      }
    });

    return { valid, invalid, results };
  }
}

class DataNormalizer {
  private config: NormalizationConfig;

  constructor(config: NormalizationConfig) {
    this.config = config;
  }

  normalize(jobs: any[]): any[] {
    let normalized = [...jobs];

    if (this.config.textCleaning !== 'none') {
      normalized = normalized.map((job) => this.cleanText(job));
    }

    if (this.config.removeDuplicates) {
      normalized = this.removeDuplicates(normalized);
    }

    if (this.config.fieldMapping === 'auto') {
      normalized = normalized.map((job) => this.autoMapFields(job));
    }

    return normalized;
  }

  private cleanText(job: any): any {
    const cleaned = { ...job };
    const clean = this.config.textCleaning === 'aggressive'
      ? (s: string) => s?.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ')
      : (s: string) => s?.trim().replace(/\s+/g, ' ');

    cleaned.title = clean(cleaned.title || '');
    cleaned.company = clean(cleaned.company || '');
    cleaned.location = clean(cleaned.location || '');
    cleaned.description = cleaned.description?.trim().replace(/\s+/g, ' ') || '';

    return cleaned;
  }

  private removeDuplicates(jobs: any[]): any[] {
    const seen = new Set<string>();
    return jobs.filter((job) => {
      const key = `${job.title?.toLowerCase()}-${job.company?.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private autoMapFields(job: any): any {
    const mapped = { ...job };

    if (mapped.salary) {
      mapped.salary = mapped.salary.replace(/(\d+)k/gi, '$1000');
    }

    if (mapped.location) {
      mapped.location = mapped.location
        .split(' ')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    return mapped;
  }
}

class DataFilter {
  private criteria: FilterCriteria;

  constructor(criteria: FilterCriteria) {
    this.criteria = criteria;
  }

  filter(jobs: any[]): any[] {
    return jobs.filter((job) => this.matchesCriteria(job));
  }

  private matchesCriteria(job: any): boolean {
    if (this.criteria.title) {
      if (!job.title?.toLowerCase().includes(this.criteria.title.toLowerCase())) {
        return false;
      }
    }

    if (this.criteria.company) {
      if (!job.company?.toLowerCase().includes(this.criteria.company.toLowerCase())) {
        return false;
      }
    }

    if (this.criteria.location) {
      if (!job.location?.toLowerCase().includes(this.criteria.location.toLowerCase())) {
        return false;
      }
    }

    if (this.criteria.minSalary && job.salary) {
      const salary = this.extractSalary(job.salary);
      if (salary < this.criteria.minSalary) {
        return false;
      }
    }

    if (this.criteria.source && this.criteria.source !== 'any') {
      if (job.source?.toLowerCase() !== this.criteria.source.toLowerCase()) {
        return false;
      }
    }

    return true;
  }

  private extractSalary(salaryString: string): number {
    if (!salaryString) return 0;
    const cleaned = salaryString.replace(/[^\d.]/g, '');
    let salary = parseFloat(cleaned) || 0;
    if (salaryString.toLowerCase().includes('k')) {
      salary *= 1000;
    }
    return salary;
  }
}

export class JobService {
  async findUserJobs(userId: string, params: UserJobQueryParams): Promise<PaginatedResponse<IJobListingDocument>> {
    const { page, limit, sortBy, sortOrder, source, isUnread, isBookmarked, applicationStatus, search } = params;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { userId };
    
    if (source) query.source = source;
    if (typeof isUnread === 'boolean') query.isUnread = isUnread;
    if (typeof isBookmarked === 'boolean') query.isBookmarked = isBookmarked;
    if (applicationStatus) query.applicationStatus = applicationStatus;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [jobs, total] = await Promise.all([
      JobListing.find(query).sort(sort).skip(skip).limit(limit).lean(),
      JobListing.countDocuments(query),
    ]);

    return {
      success: true,
      data: jobs as IJobListingDocument[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getJobCounts(userId: string): Promise<{ total: number; new: number; bookmarked: number; applied: number }> {
    const [total, newCount, bookmarked, applied] = await Promise.all([
      JobListing.countDocuments({ userId }),
      JobListing.countDocuments({ userId, isUnread: true }),
      JobListing.countDocuments({ userId, isBookmarked: true }),
      JobListing.countDocuments({ userId, applicationStatus: { $ne: 'none' } }),
    ]);

    return { total, new: newCount, bookmarked, applied };
  }

  async markJobAsRead(userId: string, jobId: string): Promise<IJobListingDocument> {
    const job = await JobListing.findOneAndUpdate(
      { _id: jobId, userId },
      { $set: { isUnread: false, viewedAt: new Date() } },
      { new: true }
    );

    if (!job) {
      throw new NotFoundError('Job');
    }

    return job;
  }

  async markAllJobsAsRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await JobListing.updateMany(
      { userId, isUnread: true },
      { $set: { isUnread: false, viewedAt: new Date() } }
    );

    return { modifiedCount: result.modifiedCount };
  }

  async updateJobStatus(userId: string, jobId: string, status: ApplicationStatus): Promise<IJobListingDocument> {
    const updateData: any = { applicationStatus: status };
    
    if (status === 'applied') {
      updateData.appliedAt = new Date();
    }

    const job = await JobListing.findOneAndUpdate(
      { _id: jobId, userId },
      { $set: updateData },
      { new: true }
    );

    if (!job) {
      throw new NotFoundError('Job');
    }

    logger.info('Job status updated', { jobId, userId, status });
    return job;
  }

  async toggleBookmark(userId: string, jobId: string): Promise<IJobListingDocument> {
    const job = await JobListing.findOne({ _id: jobId, userId });
    
    if (!job) {
      throw new NotFoundError('Job');
    }

    job.isBookmarked = !job.isBookmarked;
    await job.save();

    logger.info('Job bookmark toggled', { jobId, userId, isBookmarked: job.isBookmarked });
    return job;
  }

  async deleteUserJob(userId: string, jobId: string): Promise<void> {
    const result = await JobListing.deleteOne({ _id: jobId, userId });
    
    if (result.deletedCount === 0) {
      throw new NotFoundError('Job');
    }

    logger.info('Job deleted', { jobId, userId });
  }

  async calculateMatchScore(jobId: string, skills: string[]): Promise<number> {
    const job = await JobListing.findById(jobId);
    if (!job) return 0;

    const jobText = `${job.title} ${job.description}`.toLowerCase();
    const matchedSkills = skills.filter(skill => 
      jobText.includes(skill.toLowerCase())
    );

    const score = skills.length > 0 
      ? Math.round((matchedSkills.length / skills.length) * 100)
      : 0;

    await JobListing.updateOne({ _id: jobId }, { $set: { matchScore: score } });
    
    return score;
  }

  async calculateMatchScoresForUser(userId: string, skills: string[]): Promise<number> {
    if (skills.length === 0) return 0;

    const jobs = await JobListing.find({ userId, matchScore: { $exists: false } });
    
    const bulkOps = jobs.map(job => {
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      const matchedSkills = skills.filter(skill => 
        jobText.includes(skill.toLowerCase())
      );
      const score = Math.round((matchedSkills.length / skills.length) * 100);

      return {
        updateOne: {
          filter: { _id: job._id },
          update: { $set: { matchScore: score } },
        },
      };
    });

    if (bulkOps.length > 0) {
      await JobListing.bulkWrite(bulkOps);
    }

    return bulkOps.length;
  }

  async findAll(params: JobQueryParams): Promise<PaginatedResponse<IJobListingDocument>> {
    const { page, limit, sortBy, sortOrder, workflowId, source } = params;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (workflowId) query.workflowId = workflowId;
    if (source) query.source = source;

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [jobs, total] = await Promise.all([
      JobListing.find(query).sort(sort).skip(skip).limit(limit).lean(),
      JobListing.countDocuments(query),
    ]);

    return {
      success: true,
      data: jobs as IJobListingDocument[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<IJobListingDocument> {
    const job = await JobListing.findById(id);
    if (!job) {
      throw new NotFoundError('Job listing');
    }
    return job;
  }

  async bulkCreate(data: BulkCreateJobsInput): Promise<{ inserted: number; duplicates: number }> {
    const jobsWithMeta = data.jobs.map((job) => ({
      ...job,
      workflowId: data.workflowId,
      userId: data.userId,
      isUnread: true,
      isBookmarked: false,
      applicationStatus: 'none',
    }));

    try {
      const result = await JobListing.insertMany(jobsWithMeta, { ordered: false });
      logger.info('Bulk jobs created', { workflowId: data.workflowId, count: result.length });
      return { inserted: result.length, duplicates: 0 };
    } catch (error: any) {
      if (error.code === 11000) {
        const inserted = error.insertedDocs?.length || 0;
        const duplicates = jobsWithMeta.length - inserted;
        logger.info('Bulk jobs created with duplicates', { inserted, duplicates });
        return { inserted, duplicates };
      }
      throw error;
    }
  }

  async filter(criteria: FilterCriteria): Promise<{ total: number; filtered: number; jobs: any[] }> {
    const jobs = await JobListing.find({ workflowId: criteria.workflowId }).lean();
    const filter = new DataFilter(criteria);
    const filteredJobs = filter.filter(jobs);

    return {
      total: jobs.length,
      filtered: filteredJobs.length,
      jobs: filteredJobs,
    };
  }

  async normalize(config: NormalizationConfig): Promise<{ total: number; normalized: number }> {
    const jobs = await JobListing.find({ workflowId: config.workflowId }).lean();
    const normalizer = new DataNormalizer(config);
    const normalizedJobs = normalizer.normalize(jobs);

    const bulkOps = normalizedJobs.map((job: any) => ({
      updateOne: {
        filter: { uid: job.uid },
        update: { $set: { ...job, normalized: true } },
      },
    }));

    if (bulkOps.length > 0) {
      await JobListing.bulkWrite(bulkOps);
    }

    logger.info('Jobs normalized', { workflowId: config.workflowId, count: normalizedJobs.length });

    return {
      total: jobs.length,
      normalized: normalizedJobs.length,
    };
  }

  async qualityCheck(config: QualityCheckConfig): Promise<{
    stats: { total: number; valid: number; invalid: number; averageScore: number };
    results: Array<{ jobId: string; isValid: boolean; score: number; issues: string[] }>;
    autoRemovedCount: number;
  }> {
    const jobs = await JobListing.find({ workflowId: config.workflowId }).lean();
    
    if (jobs.length === 0) {
      return {
        stats: { total: 0, valid: 0, invalid: 0, averageScore: 0 },
        results: [],
        autoRemovedCount: 0,
      };
    }

    const checker = new JobQualityChecker(config);
    const { valid, invalid, results } = checker.checkBatch(jobs);

    let totalScore = 0;
    const detailedResults: Array<{ jobId: string; isValid: boolean; score: number; issues: string[] }> = [];

    results.forEach((result, jobId) => {
      totalScore += result.score;
      detailedResults.push({
        jobId,
        isValid: result.isValid,
        score: result.score,
        issues: result.issues,
      });
    });

    let autoRemovedCount = 0;
    if (config.autoRemoveInvalid && invalid.length > 0) {
      const invalidIds = invalid.map((j: any) => j._id);
      const deleteResult = await JobListing.deleteMany({ _id: { $in: invalidIds } });
      autoRemovedCount = deleteResult.deletedCount;
      logger.info('Invalid jobs removed', { workflowId: config.workflowId, count: autoRemovedCount });
    }

    return {
      stats: {
        total: jobs.length,
        valid: valid.length,
        invalid: invalid.length,
        averageScore: Math.round((totalScore / jobs.length) * 100) / 100,
      },
      results: detailedResults,
      autoRemovedCount,
    };
  }

  async deleteByWorkflowId(workflowId: string): Promise<{ deletedCount: number }> {
    const result = await JobListing.deleteMany({ workflowId });
    logger.info('Jobs deleted for workflow', { workflowId, count: result.deletedCount });
    return { deletedCount: result.deletedCount };
  }
}

export const jobService = new JobService();
export default jobService;
