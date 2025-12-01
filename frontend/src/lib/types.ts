// ============================================
// Shared Types
// ============================================

export type User = {
  _id: string;
  email: string;
  name: string;
  isActive: boolean;
  isAdmin?: boolean;
  workflowCount?: number;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Feedback = {
  _id: string;
  type: 'bug' | 'feature' | 'improvement' | 'other';
  message: string;
  rating?: number;
  userEmail?: string;
  userId?: { name: string; email: string };
  status: 'new' | 'reviewed' | 'resolved';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminStats = {
  users: { total: number; active: number };
  workflows: { total: number; published: number };
  feedback: { total: number; new: number };
  recentUsers: User[];
  recentWorkflows: Workflow[];
  dailySignups: { _id: string; count: number }[];
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
  isActive: boolean;
  activatedAt?: string;
  deactivatesAt?: string;
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

