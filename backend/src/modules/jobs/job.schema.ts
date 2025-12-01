import { z } from 'zod';

export const jobSourceEnum = z.enum(['linkedin', 'naukri', 'remoteok']);
export const applicationStatusEnum = z.enum(['none', 'applied', 'interview', 'offer', 'rejected']);

export const createJobSchema = z.object({
  uid: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  salary: z.string().optional(),
  postedAt: z.coerce.date(),
  description: z.string().min(1),
  url: z.string().url(),
  source: jobSourceEnum,
  raw: z.record(z.any()).optional(),
  workflowId: z.string().min(1),
  userId: z.string().min(1),
});

export const bulkCreateJobsSchema = z.object({
  workflowId: z.string().min(1),
  userId: z.string().min(1),
  jobs: z.array(createJobSchema.omit({ workflowId: true, userId: true })).min(1),
});

export const userJobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'postedAt', 'matchScore', 'company']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  source: jobSourceEnum.optional(),
  isUnread: z.coerce.boolean().optional(),
  isBookmarked: z.coerce.boolean().optional(),
  applicationStatus: applicationStatusEnum.optional(),
  search: z.string().optional(),
});

export const jobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'postedAt', 'title', 'company']).default('postedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  workflowId: z.string().optional(),
  source: jobSourceEnum.optional(),
});

export const updateJobStatusSchema = z.object({
  applicationStatus: applicationStatusEnum,
});

export const updateJobBookmarkSchema = z.object({
  isBookmarked: z.boolean(),
});

export const filterCriteriaSchema = z.object({
  workflowId: z.string().min(1),
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  minSalary: z.coerce.number().positive().optional(),
  source: z.enum(['linkedin', 'naukri', 'remoteok', 'any']).optional(),
});

export const normalizationConfigSchema = z.object({
  workflowId: z.string().min(1),
  fieldMapping: z.enum(['auto', 'manual', 'custom']).default('auto'),
  dataFormat: z.enum(['json', 'csv', 'xml']).default('json'),
  removeDuplicates: z.boolean().default(true),
  textCleaning: z.enum(['standard', 'aggressive', 'none']).default('standard'),
});

export const qualityCheckConfigSchema = z.object({
  workflowId: z.string().min(1),
  minTitleLength: z.number().int().positive().default(5),
  minDescriptionLength: z.number().int().positive().default(50),
  maxDaysOld: z.number().int().positive().default(90),
  checkSpam: z.boolean().default(true),
  strictMode: z.boolean().default(false),
  autoRemoveInvalid: z.boolean().default(false),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type BulkCreateJobsInput = z.infer<typeof bulkCreateJobsSchema>;
export type UserJobQueryParams = z.infer<typeof userJobQuerySchema>;
export type JobQueryParams = z.infer<typeof jobQuerySchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
export type UpdateJobBookmarkInput = z.infer<typeof updateJobBookmarkSchema>;
export type FilterCriteria = z.infer<typeof filterCriteriaSchema>;
export type NormalizationConfig = z.infer<typeof normalizationConfigSchema>;
export type QualityCheckConfig = z.infer<typeof qualityCheckConfigSchema>;
