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

export type ApplicationStatus = 'none' | 'applied' | 'interview' | 'offer' | 'rejected';

export type JobSource = 'linkedin' | 'naukri' | 'remoteok' | 'wellfound';

export type Job = {
  _id: string;
  uid: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  postedAt: string;
  description: string;
  url: string;
  source: JobSource;
  workflowId: string;
  userId: string;
  isUnread: boolean;
  viewedAt?: string;
  isBookmarked: boolean;
  applicationStatus: ApplicationStatus;
  appliedAt?: string;
  matchScore?: number;
  createdAt: string;
  updatedAt: string;
};

export type JobCounts = {
  total: number;
  new: number;
  bookmarked: number;
  applied: number;
};

export type JobFilters = {
  source?: JobSource;
  isUnread?: boolean;
  isBookmarked?: boolean;
  applicationStatus?: ApplicationStatus;
  search?: string;
  sortBy?: 'createdAt' | 'postedAt' | 'matchScore' | 'company';
  sortOrder?: 'asc' | 'desc';
};

export type JobsConfig = {
  retentionDays: number;
  maxJobs: number;
  notifications: boolean;
  notifyThreshold: number;
  defaultSort: 'newest' | 'match' | 'company';
  autoMarkReadDays: number;
};

export type Workflow = {
  _id: string;
  workflowId: string;
  title: string;
  status: 'draft' | 'published' | 'paused';
  nodes: any[];
  edges: any[];
  nodeCount: number;
  jobsConfig?: JobsConfig;
  isActive: boolean;
  activatedAt?: string;
  deactivatesAt?: string;
  lastExecutedAt?: string;
  executionCount: number;
  jobCount?: number;
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
  jobsSaved: number;
  error?: string;
};
