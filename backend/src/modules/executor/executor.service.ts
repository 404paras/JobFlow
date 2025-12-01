import { randomUUID } from 'crypto';
import { Workflow, IWorkflowDocument } from '../workflows/workflow.model';
import { Execution, IExecutionDocument } from './execution.model';
import { JobListing } from '../jobs/job.model';
import { scraperService } from '../scrapers/scraper.service';
import { logger } from '../../shared/utils/logger';
import { 
  WorkflowNode, 
  WorkflowEdge, 
  ScrapedJob, 
  JobSource,
  ExecutionLog,
} from '../../shared/types';

interface ExecutionContext {
  workflowId: string;
  executionId: string;
  userId: string;
  jobs: ScrapedJob[];
  logs: ExecutionLog[];
}

interface NodeHandler {
  execute(node: WorkflowNode, context: ExecutionContext): Promise<void>;
}

interface RunningWorkflow {
  workflowId: string;
  executionId: string;
  userId?: string;
  startedAt: Date;
  abortController: AbortController;
}

class TriggerNodeHandler implements NodeHandler {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    logger.info('Trigger node executed', { nodeId: node.id, workflowId: context.workflowId });
  }
}

class JobSourceNodeHandler implements NodeHandler {
  private readonly MAX_JOBS_PER_SOURCE = 100;

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const metadata = node.data.metadata || {};
    const source = node.data.jobType as JobSource;
    
    if (!source) {
      throw new Error(`Job source node missing jobType: ${node.id}`);
    }

    const keywords = metadata.jobType || 'software engineer';
    const location = metadata.location || 'India';

    logger.info('Scraping jobs', { source, keywords, location, nodeId: node.id });

    const result = await scraperService.scrapeSource(source, {
      keywords,
      location,
      maxResults: this.MAX_JOBS_PER_SOURCE,
    });

    const limitedJobs = result.jobs.slice(0, this.MAX_JOBS_PER_SOURCE);
    context.jobs.push(...limitedJobs);

    logger.info('Jobs scraped', {
      source,
      count: limitedJobs.length,
      maxLimit: this.MAX_JOBS_PER_SOURCE,
    });
  }
}

class NormalizeNodeHandler implements NodeHandler {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const metadata = node.data.metadata || {};
    const beforeCount = context.jobs.length;
    
    const removeDuplicates = metadata.removeDuplicates !== 'No';

    context.jobs = context.jobs.map((job) => ({
      ...job,
      title: job.title?.trim().replace(/\s+/g, ' ') || '',
      company: job.company?.trim().replace(/\s+/g, ' ') || '',
      location: job.location?.trim().replace(/\s+/g, ' ') || '',
      description: job.description?.trim().replace(/\s+/g, ' ').substring(0, 500) || '',
    }));

    if (removeDuplicates) {
      const seen = new Set<string>();
      context.jobs = context.jobs.filter((job) => {
        const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    context.jobs.sort((a, b) => {
      const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return dateB - dateA;
    });

    logger.info('Jobs normalized', { 
      before: beforeCount,
      after: context.jobs.length,
      duplicatesRemoved: beforeCount - context.jobs.length,
      nodeId: node.id,
    });
  }
}

class FilterNodeHandler implements NodeHandler {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const metadata = node.data.metadata || {};
    const filters = metadata.filters || [];

    const titleKeywords: string[] = [];
    const companyKeywords: string[] = [];
    const locationKeywords: string[] = [];
    let minSalary: number | undefined;
    const sourceFilters: string[] = [];
    let experienceLevel: string | undefined;
    let datePosted: string | undefined;

    for (const filter of filters) {
      if (typeof filter === 'string') {
        const colonIndex = filter.indexOf(':');
        if (colonIndex === -1) continue;

        const type = filter.substring(0, colonIndex).trim().toLowerCase();
        const value = filter.substring(colonIndex + 1).trim();
        const values = value.split(',').map(v => v.trim().toLowerCase()).filter(v => v);

        switch (type) {
          case 'title':
            titleKeywords.push(...values);
            break;
          case 'company':
            companyKeywords.push(...values);
            break;
          case 'location':
            locationKeywords.push(...values);
            break;
          case 'salary':
            const salaryNum = parseInt(value.replace(/[^\d]/g, ''), 10);
            if (salaryNum) minSalary = salaryNum;
            break;
          case 'source':
            sourceFilters.push(...values);
            break;
          case 'experience':
          case 'level':
            experienceLevel = values[0];
            break;
          case 'date':
          case 'posted':
          case 'dateposted':
            datePosted = values[0];
            break;
        }
      }
    }

    const beforeCount = context.jobs.length;

    context.jobs = context.jobs.filter((job) => {
      if (titleKeywords.length > 0) {
        const jobTitle = job.title.toLowerCase();
        if (!titleKeywords.some(kw => jobTitle.includes(kw))) {
          return false;
        }
      }

      if (companyKeywords.length > 0) {
        const jobCompany = job.company.toLowerCase();
        if (!companyKeywords.some(kw => jobCompany.includes(kw))) {
          return false;
        }
      }

      if (locationKeywords.length > 0) {
        const jobLocation = job.location.toLowerCase();
        if (!locationKeywords.some(kw => jobLocation.includes(kw))) {
          return false;
        }
      }

      if (minSalary && job.salary) {
        const salary = this.extractSalary(job.salary);
        if (salary < minSalary) return false;
      }

      if (sourceFilters.length > 0) {
        if (!sourceFilters.includes(job.source)) {
          return false;
        }
      }

      if (experienceLevel && experienceLevel !== 'any') {
        const detectedLevel = this.detectExperienceLevel(job.title + ' ' + (job.description || ''));
        if (detectedLevel !== experienceLevel && detectedLevel !== 'any') {
          return false;
        }
      }

      if (datePosted && datePosted !== 'any') {
        const jobDate = job.postedAt ? new Date(job.postedAt) : new Date();
        const now = new Date();
        const diffHours = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60);
        
        switch (datePosted) {
          case '24h':
            if (diffHours > 24) return false;
            break;
          case 'week':
            if (diffHours > 24 * 7) return false;
            break;
          case 'month':
            if (diffHours > 24 * 30) return false;
            break;
        }
      }

      return true;
    });

    logger.info('Jobs filtered', {
      before: beforeCount,
      after: context.jobs.length,
      criteria: { titleKeywords, companyKeywords, locationKeywords, minSalary, sourceFilters, experienceLevel, datePosted },
      nodeId: node.id,
    });
  }

  private extractSalary(salaryString: string): number {
    const cleaned = salaryString.replace(/[$,]/g, '');
    const match = cleaned.match(/(\d+(?:\.\d+)?)\s*k?/i);
    if (!match) return 0;
    
    let salary = parseFloat(match[1]) || 0;
    if (cleaned.toLowerCase().includes('k')) {
      salary *= 1000;
    }
    return salary;
  }

  private detectExperienceLevel(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('senior') || lowerText.includes('sr.') || lowerText.includes('lead') || lowerText.includes('principal') || lowerText.includes('staff')) {
      return 'senior';
    }
    if (lowerText.includes('junior') || lowerText.includes('jr.') || lowerText.includes('entry') || lowerText.includes('fresher') || lowerText.includes('intern') || lowerText.includes('graduate')) {
      return 'entry';
    }
    if (lowerText.includes('mid') || lowerText.includes('intermediate')) {
      return 'mid';
    }
    
    return 'any';
  }
}

class JobsOutputNodeHandler implements NodeHandler {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const metadata = node.data.metadata || {};

    if (context.jobs.length === 0) {
      logger.info('No jobs to save', { nodeId: node.id });
      return;
    }

    // Sort jobs by postedAt (latest first)
    const sortedJobs = [...context.jobs].sort((a, b) => {
      const dateA = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const dateB = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return dateB - dateA;
    });

    const jobsToSave = sortedJobs;
    
    const existingUids = await JobListing.find({
      userId: context.userId,
      uid: { $in: jobsToSave.map(j => j.uid) }
    }).distinct('uid');

    const newJobs = jobsToSave.filter(job => !existingUids.includes(job.uid));

    if (newJobs.length === 0) {
      logger.info('All jobs already exist, skipping', { nodeId: node.id });
      return;
    }

    const jobDocuments = newJobs.map(job => ({
      uid: job.uid,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      postedAt: job.postedAt || new Date(),
      description: job.description,
      url: job.url,
      source: job.source,
      raw: job.raw,
      workflowId: context.workflowId,
      userId: context.userId,
      normalized: true,
      filtered: true,
      isUnread: true,
      isBookmarked: false,
      applicationStatus: 'none',
    }));

    try {
      const result = await JobListing.insertMany(jobDocuments, { ordered: false });
      
      logger.info('Jobs saved to platform', {
        total: context.jobs.length,
        saved: result.length,
        skippedDuplicates: jobsToSave.length - newJobs.length,
        nodeId: node.id,
        userId: context.userId,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        const inserted = error.insertedDocs?.length || 0;
        logger.info('Jobs saved with some duplicates skipped', {
          inserted,
          duplicates: newJobs.length - inserted,
          nodeId: node.id,
        });
      } else {
        throw error;
      }
    }
  }
}

export class ExecutorService {
  private handlers: Map<string, NodeHandler>;
  private runningWorkflows: Map<string, RunningWorkflow> = new Map();
  private userRunningWorkflow: Map<string, string> = new Map();

  constructor() {
    this.handlers = new Map([
      ['trigger', new TriggerNodeHandler()],
      ['job-source', new JobSourceNodeHandler()],
      ['normalize-data', new NormalizeNodeHandler()],
      ['filter', new FilterNodeHandler()],
      ['jobs-output', new JobsOutputNodeHandler()],
    ]);
  }

  getUserRunningWorkflow(userId?: string): RunningWorkflow | null {
    if (!userId) return null;
    
    const workflowId = this.userRunningWorkflow.get(userId);
    if (workflowId) {
      return this.runningWorkflows.get(workflowId) || null;
    }
    return null;
  }

  isWorkflowRunning(workflowId: string): boolean {
    return this.runningWorkflows.has(workflowId);
  }

  getRunningWorkflows(): RunningWorkflow[] {
    return Array.from(this.runningWorkflows.values());
  }

  async stopWorkflow(workflowId: string): Promise<boolean> {
    const running = this.runningWorkflows.get(workflowId);
    if (!running) {
      return false;
    }

    running.abortController.abort();

    const execution = await Execution.findOne({ executionId: running.executionId });
    if (execution && execution.status === 'running') {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = Date.now() - running.startedAt.getTime();
      execution.error = 'Workflow stopped by user';
      await execution.save();
    }

    this.runningWorkflows.delete(workflowId);
    if (running.userId) {
      this.userRunningWorkflow.delete(running.userId);
    }

    logger.info('Workflow stopped', { workflowId, executionId: running.executionId });
    return true;
  }

  async execute(
    workflowId: string,
    triggeredBy: 'schedule' | 'manual' | 'api' = 'manual',
    userId?: string
  ): Promise<IExecutionDocument> {
    if (this.isWorkflowRunning(workflowId)) {
      throw new Error('This workflow is already running');
    }

    if (userId) {
      const existingRunning = this.getUserRunningWorkflow(userId);
      if (existingRunning) {
        throw new Error(`You already have a workflow running: ${existingRunning.workflowId}. Stop it first or wait for it to complete.`);
      }
    }

    const workflow = await Workflow.findOne({ workflowId });
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (!workflow.isActive) {
      throw new Error('This workflow is not active. Please activate it first before running.');
    }

    if (workflow.deactivatesAt && new Date(workflow.deactivatesAt) < new Date()) {
      workflow.isActive = false;
      workflow.activatedAt = undefined;
      workflow.deactivatesAt = undefined;
      await workflow.save();
      throw new Error('This workflow has expired. Please reactivate it to run.');
    }

    const workflowUserId = workflow.userId?.toString() || userId || '';

    const executionId = `exec_${randomUUID().substring(0, 8)}`;
    const abortController = new AbortController();
    
    const runningWorkflow: RunningWorkflow = {
      workflowId,
      executionId,
      userId,
      startedAt: new Date(),
      abortController,
    };
    
    this.runningWorkflows.set(workflowId, runningWorkflow);
    if (userId) {
      this.userRunningWorkflow.set(userId, workflowId);
    }

    const execution = new Execution({
      executionId,
      workflowId,
      status: 'running',
      startedAt: new Date(),
      triggeredBy,
      nodeLogs: [],
    });
    await execution.save();

    const context: ExecutionContext = {
      workflowId,
      executionId,
      userId: workflowUserId,
      jobs: [],
      logs: [],
    };

    try {
      const orderedNodes = this.getExecutionOrder(workflow.nodes, workflow.edges);

      for (const node of orderedNodes) {
        if (abortController.signal.aborted) {
          throw new Error('Workflow execution was stopped');
        }

        const nodeType = node.data.type;
        const handler = this.handlers.get(nodeType);

        if (!handler) {
          logger.warn(`No handler for node type: ${nodeType}`);
          continue;
        }

        const nodeLog: ExecutionLog = {
          nodeId: node.id,
          nodeType: nodeType as any,
          status: 'running',
          startedAt: new Date(),
          inputCount: context.jobs.length,
        };

        try {
          await handler.execute(node, context);
          
          nodeLog.status = 'completed';
          nodeLog.completedAt = new Date();
          nodeLog.outputCount = context.jobs.length;
        } catch (error) {
          nodeLog.status = 'failed';
          nodeLog.completedAt = new Date();
          nodeLog.error = error instanceof Error ? error.message : 'Unknown error';
          throw error;
        }

        context.logs.push(nodeLog);
        execution.nodeLogs.push(nodeLog);
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = Date.now() - execution.startedAt.getTime();
      execution.jobsScraped = context.jobs.length;
      execution.jobsFiltered = context.jobs.length;
      execution.jobsSaved = context.jobs.length;

      await execution.save();

      workflow.lastExecutedAt = new Date();
      workflow.executionCount += 1;
      await workflow.save();

      logger.info('Workflow execution completed', {
        workflowId,
        executionId,
        jobsSaved: execution.jobsSaved,
        duration: execution.duration,
      });

      return execution;
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = Date.now() - execution.startedAt.getTime();
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      await execution.save();

      logger.error('Workflow execution failed', {
        workflowId,
        executionId,
        error: execution.error,
      });

      throw error;
    } finally {
      this.runningWorkflows.delete(workflowId);
      if (userId) {
        this.userRunningWorkflow.delete(userId);
      }
    }
  }

  private getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((node) => {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    });

    edges.forEach((edge) => {
      const targets = adjacency.get(edge.source) || [];
      targets.push(edge.target);
      adjacency.set(edge.source, targets);

      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    const result: WorkflowNode[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (node) result.push(node);

      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return result;
  }

  async getExecutionHistory(workflowId: string, limit = 10): Promise<IExecutionDocument[]> {
    return Execution.find({ workflowId })
      .sort({ startedAt: -1 })
      .limit(limit);
  }

  async getExecution(executionId: string): Promise<IExecutionDocument | null> {
    return Execution.findOne({ executionId });
  }
}

export const executorService = new ExecutorService();
export default executorService;
