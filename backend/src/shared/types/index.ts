import { Request } from 'express';

// ============================================
// Common Types
// ============================================

export type JobSource = 'linkedin' | 'indeed' | 'naukri';

export type WorkflowStatus = 'draft' | 'published' | 'paused';

export type NodeType = 'trigger' | 'job-source' | 'normalize-data' | 'filter' | 'daily-email';

export type EmailSchedule = 'daily-9am' | 'daily-6pm' | 'weekly';

export type EmailFormat = 'html' | 'plain' | 'pdf';

// ============================================
// Workflow Node Types
// ============================================

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

// ============================================
// Job Types
// ============================================

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
  normalized?: boolean;
  filtered?: boolean;
  qualityScore?: number;
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
  raw?: Record<string, any>;
}

// ============================================
// Filter & Normalize Types
// ============================================

export interface FilterCriteria {
  title?: string;
  company?: string;
  location?: string;
  minSalary?: number;
  source?: JobSource | 'any';
}

export interface NormalizationConfig {
  fieldMapping: 'auto' | 'manual' | 'custom';
  dataFormat: 'json' | 'csv' | 'xml';
  removeDuplicates: boolean;
  textCleaning: 'standard' | 'aggressive' | 'none';
}

// ============================================
// Quality Check Types
// ============================================

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

// ============================================
// Execution Types
// ============================================

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

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

// ============================================
// Email Types
// ============================================

export interface EmailConfig {
  recipients: string;
  schedule: EmailSchedule;
  format: EmailFormat;
  lastSentAt?: Date;
  sentCount: number;
  isActive: boolean;
  pausedAt?: Date;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

// ============================================
// API Types
// ============================================

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

// ============================================
// Request Extensions
// ============================================

export interface RequestWithLogger extends Request {
  requestId?: string;
  startTime?: number;
}

