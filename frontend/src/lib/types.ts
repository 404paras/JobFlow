// ============================================
// Shared Types
// ============================================

export type User = {
  _id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type Workflow = {
  _id: string;
  workflowId: string;
  title: string;
  status: 'draft' | 'published' | 'paused';
  nodes: any[];
  edges: any[];
  nodeCount: number;
  emailConfig?: {
    recipients: string;
    schedule: string;
    format: string;
    lastSentAt?: string;
    sentCount: number;
    isActive: boolean;
  };
  lastExecutedAt?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Execution = {
  _id: string;
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  jobsScraped: number;
  emailsSent: number;
  error?: string;
};

