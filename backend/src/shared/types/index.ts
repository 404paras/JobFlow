export type JobSource = 'linkedin' | 'remoteok' | 'naukri' | 'arbeitnow' | 'jobicy';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'any';
export type DatePosted = 'any' | '24h' | 'week' | 'month';
export type WorkflowStatus = 'draft' | 'published' | 'paused';
export type NodeType = 'trigger' | 'job-source' | 'normalize-data' | 'filter' | 'jobs-output';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ApplicationStatus = 'none' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  jobType?: JobSource;
  filterCount?: number;
  metadata?: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: WorkflowNodePosition;
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface JobListing {
  uid: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  postedAt: Date;
  description: string;
  url: string;
  source: JobSource;
  raw?: Record<string, any>;
  workflowId: string;
  userId: string;
  normalized?: boolean;
  filtered?: boolean;
  qualityScore?: number;
  isUnread: boolean;
  viewedAt?: Date;
  isBookmarked: boolean;
  applicationStatus: ApplicationStatus;
  appliedAt?: Date;
  matchScore?: number;
}

export interface ScrapedJob {
  uid: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  source: JobSource;
  postedAt: Date;
  experienceLevel?: ExperienceLevel;
  tags?: string[];
  remote?: boolean;
  raw?: Record<string, any>;
}

export interface FilterCriteria {
  title?: string;
  company?: string;
  location?: string;
  minSalary?: number;
  source?: JobSource | 'any';
  experienceLevel?: ExperienceLevel;
  datePosted?: DatePosted;
  remote?: boolean;
}

export interface NormalizationConfig {
  fieldMapping: 'auto' | 'manual' | 'custom';
  dataFormat: 'json' | 'csv' | 'xml';
  removeDuplicates: boolean;
  textCleaning: 'standard' | 'aggressive' | 'none';
}

export interface QualityCheckResult {
  isValid: boolean;
  score: number;
  issues: string[];
  warnings: string[];
  metadata: {
    hasTitle: boolean;
    hasCompany: boolean;
    hasLocation: boolean;
    hasDescription: boolean;
    hasUrl: boolean;
    hasValidUrl: boolean;
    hasRecentDate: boolean;
    titleLength: number;
    descriptionLength: number;
    isSpam: boolean;
    isDuplicate: boolean;
  };
}

export interface QualityConfig {
  minTitleLength: number;
  minDescriptionLength: number;
  maxDaysOld: number;
  checkSpam: boolean;
  strictMode: boolean;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  startedAt: Date;
  jobs: JobListing[];
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  nodeId: string;
  nodeType: NodeType;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  inputCount?: number;
  outputCount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface JobsConfig {
  retentionDays: number;
  maxJobs: number;
  notifications: boolean;
  notifyThreshold: number;
  defaultSort: 'newest' | 'match' | 'company';
  autoMarkReadDays: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}
