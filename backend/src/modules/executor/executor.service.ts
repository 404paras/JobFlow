import { randomUUID } from 'crypto';
import { Workflow, IWorkflowDocument } from '../workflows/workflow.model';
import { Execution, IExecutionDocument } from './execution.model';
import { scraperService } from '../scrapers/scraper.service';
import { emailService } from '../email/email.service';
import { logger } from '../../shared/utils/logger';
import { 
  WorkflowNode, 
  WorkflowEdge, 
  ScrapedJob, 
  JobSource,
  ExecutionLog,
  FilterCriteria,
  NormalizationConfig,
} from '../../shared/types';

interface ExecutionContext {
  workflowId: string;
  executionId: string;
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
      maxResults: 50,
    });

    context.jobs.push(...result.jobs);

    logger.info('Jobs scraped', {
      source,
      count: result.jobs.length,
      errors: result.errors.length,
    });
  }
}

class NormalizeNodeHandler implements NodeHandler {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const metadata = node.data.metadata || {};
    
    const config: NormalizationConfig = {
      fieldMapping: this.mapFieldMapping(metadata.fieldMapping),
      dataFormat: this.mapDataFormat(metadata.dataFormat),
      removeDuplicates: metadata.removeDuplicates === 'Yes',
      textCleaning: this.mapTextCleaning(metadata.textCleaning),
    };

    if (config.textCleaning !== 'none') {
      context.jobs = context.jobs.map((job) => ({
        ...job,
        title: this.cleanText(job.title, config.textCleaning),
        company: this.cleanText(job.company, config.textCleaning),
        location: this.cleanText(job.location, config.textCleaning),
        description: job.description?.trim().replace(/\s+/g, ' ') || '',
      }));
    }

    if (config.removeDuplicates) {
      const seen = new Set<string>();
      context.jobs = context.jobs.filter((job) => {
        const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (config.fieldMapping === 'auto') {
      context.jobs = context.jobs.map((job) => ({
        ...job,
        salary: job.salary?.replace(/(\d+)k/gi, '$1000'),
        location: job.location
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' '),
      }));
    }

    logger.info('Jobs normalized', { count: context.jobs.length, nodeId: node.id });
  }

  private mapFieldMapping(value: string): 'auto' | 'manual' | 'custom' {
    if (value === 'Auto-detect Fields') return 'auto';
    if (value === 'Manual Mapping') return 'manual';
    if (value === 'Custom Schema') return 'custom';
    return 'auto';
  }

  private mapDataFormat(value: string): 'json' | 'csv' | 'xml' {
    if (value === 'JSON') return 'json';
    if (value === 'CSV') return 'csv';
    if (value === 'XML') return 'xml';
    return 'json';
  }

  private mapTextCleaning(value: string): 'standard' | 'aggressive' | 'none' {
    if (value === 'Standard') return 'standard';
    if (value === 'Aggressive') return 'aggressive';
    if (value === 'None') return 'none';
    return 'standard';
  }

  private cleanText(text: string, level: 'standard' | 'aggressive' | 'none'): string {
    if (level === 'none') return text;
    if (level === 'aggressive') {
      return text?.trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ') || '';
    }
    return text?.trim().replace(/\s+/g, ' ') || '';
  }
}

class FilterNodeHandler implements NodeHandler {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const metadata = node.data.metadata || {};
    const filters = metadata.filters || [];

    const criteria: FilterCriteria = {};

    for (const filter of filters) {
      if (typeof filter === 'string') {
        if (filter.startsWith('Title:')) criteria.title = filter.replace('Title: ', '');
        if (filter.startsWith('Company:')) criteria.company = filter.replace('Company: ', '');
        if (filter.startsWith('Location:')) criteria.location = filter.replace('Location: ', '');
        if (filter.startsWith('Salary:')) {
          const salary = filter.replace('Salary: ', '').replace('+', '');
          criteria.minSalary = parseInt(salary.replace(/[^\d]/g, ''), 10) || undefined;
        }
        if (filter.startsWith('Source:')) {
          const source = filter.replace('Source: ', '').toLowerCase();
          if (['linkedin', 'indeed', 'naukri'].includes(source)) {
            criteria.source = source as JobSource;
          }
        }
      }
    }

    const beforeCount = context.jobs.length;

    context.jobs = context.jobs.filter((job) => {
      if (criteria.title && !job.title.toLowerCase().includes(criteria.title.toLowerCase())) {
        return false;
      }
      if (criteria.company && !job.company.toLowerCase().includes(criteria.company.toLowerCase())) {
        return false;
      }
      if (criteria.location && !job.location.toLowerCase().includes(criteria.location.toLowerCase())) {
        return false;
      }
      if (criteria.minSalary && job.salary) {
        const salary = this.extractSalary(job.salary);
        if (salary < criteria.minSalary) return false;
      }
      if (criteria.source && criteria.source !== 'any') {
        if (job.source !== criteria.source) return false;
      }
      return true;
    });

    logger.info('Jobs filtered', {
      before: beforeCount,
      after: context.jobs.length,
      nodeId: node.id,
    });
  }

  private extractSalary(salaryString: string): number {
    const cleaned = salaryString.replace(/[^\d.]/g, '');
    let salary = parseFloat(cleaned) || 0;
    if (salaryString.toLowerCase().includes('k')) {
      salary *= 1000;
    }
    return salary;
  }
}

class DailyEmailNodeHandler implements NodeHandler {
  async execute(node: WorkflowNode, context: ExecutionContext): Promise<void> {
    const metadata = node.data.metadata || {};
    const recipients = metadata.recipients;

    if (!recipients || recipients === 'Not set') {
      logger.warn('Email node has no recipients configured', { nodeId: node.id });
      return;
    }

    if (context.jobs.length === 0) {
      logger.info('No jobs to send in email', { nodeId: node.id });
      return;
    }

    await emailService.sendJobDigest(recipients, context.jobs, context.workflowId);

    logger.info('Email sent', {
      recipients,
      jobCount: context.jobs.length,
      nodeId: node.id,
    });
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
      ['daily-email', new DailyEmailNodeHandler()],
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
      execution.emailsSent = context.logs.some((l) => l.nodeType === 'daily-email' && l.status === 'completed') ? 1 : 0;

      await execution.save();

      workflow.lastExecutedAt = new Date();
      workflow.executionCount += 1;
      await workflow.save();

      logger.info('Workflow execution completed', {
        workflowId,
        executionId,
        jobsScraped: execution.jobsScraped,
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
