import { z } from 'zod';

// ============================================
// Node Schemas
// ============================================

const WorkflowNodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const WorkflowNodeDataSchema = z.object({
  label: z.string(),
  type: z.enum(['trigger', 'job-source', 'normalize-data', 'filter', 'daily-email']),
  jobType: z.enum(['linkedin', 'indeed', 'naukri']).optional(),
  filterCount: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: WorkflowNodePositionSchema,
  data: WorkflowNodeDataSchema,
});

const WorkflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

const EmailConfigSchema = z.object({
  recipients: z.string().email().or(z.string().regex(/^[\w\.-]+@[\w\.-]+\.\w+$/)),
  schedule: z.enum(['daily-9am', 'daily-6pm', 'weekly']).default('daily-9am'),
  format: z.enum(['html', 'plain', 'pdf']).default('html'),
  isActive: z.boolean().default(true),
}).optional();

// ============================================
// Request Schemas
// ============================================

export const createWorkflowSchema = z.object({
  workflowId: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  status: z.enum(['draft', 'published', 'paused']).default('draft'),
  nodes: z.array(WorkflowNodeSchema).default([]),
  edges: z.array(WorkflowEdgeSchema).default([]),
  emailConfig: EmailConfigSchema,
});

export const updateWorkflowSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(['draft', 'published', 'paused']).optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
  emailConfig: EmailConfigSchema,
});

export const workflowIdParamSchema = z.object({
  id: z.string().min(1),
});

export const workflowQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['draft', 'published', 'paused']).optional(),
  userId: z.string().optional(),
});

// ============================================
// Type Exports
// ============================================

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type WorkflowQueryParams = z.infer<typeof workflowQuerySchema>;

