import cron, { ScheduledTask } from 'node-cron';
import { Workflow, IWorkflowDocument } from '../workflows/workflow.model';
import { executorService } from '../executor/executor.service';
import { workflowService } from '../workflows/workflow.service';
import { logger } from '../../shared/utils/logger';

type Schedule = 'daily-9am' | 'daily-6pm' | 'weekly';

interface ScheduledWorkflow {
  workflowId: string;
  task: ScheduledTask;
  schedule: Schedule;
}

export class SchedulerService {
  private scheduledWorkflows: Map<string, ScheduledWorkflow> = new Map();
  private deactivationTask: ScheduledTask | null = null;
  private isRunning = false;

  private getCronExpression(schedule: Schedule): string {
    switch (schedule) {
      case 'daily-9am':
        return '0 9 * * *';
      case 'daily-6pm':
        return '0 18 * * *';
      case 'weekly':
        return '0 9 * * 1';
      default:
        return '0 9 * * *';
    }
  }

  scheduleWorkflow(workflow: IWorkflowDocument): void {
    const workflowId = workflow.workflowId;

    this.unscheduleWorkflow(workflowId);

    if (workflow.status !== 'published' || !workflow.isActive) {
      logger.debug('Workflow not eligible for scheduling', {
        workflowId,
        status: workflow.status,
        isActive: workflow.isActive,
      });
      return;
    }

    const jobsOutputNode = workflow.nodes.find(n => n.data.type === 'jobs-output');
    const schedule: Schedule = jobsOutputNode?.data.metadata?.schedule || 'daily-9am';
    const cronExpression = this.getCronExpression(schedule);

    const task = cron.schedule(cronExpression, async () => {
      logger.info('Scheduled workflow execution starting', { workflowId, schedule });
      
      try {
        await executorService.execute(workflowId, 'schedule');
        logger.info('Scheduled workflow execution completed', { workflowId });
      } catch (error) {
        logger.error('Scheduled workflow execution failed', {
          workflowId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, {
      timezone: 'Asia/Kolkata',
    });

    this.scheduledWorkflows.set(workflowId, {
      workflowId,
      task,
      schedule,
    });

    if (this.isRunning) {
      task.start();
    }

    logger.info('Workflow scheduled', {
      workflowId,
      schedule,
      cronExpression,
    });
  }

  unscheduleWorkflow(workflowId: string): void {
    const scheduled = this.scheduledWorkflows.get(workflowId);
    if (scheduled) {
      scheduled.task.stop();
      this.scheduledWorkflows.delete(workflowId);
      logger.info('Workflow unscheduled', { workflowId });
    }
  }

  async loadAllWorkflows(): Promise<void> {
    try {
      const workflows = await Workflow.find({
        status: 'published',
        isActive: true,
      });

      logger.info('Loading scheduled workflows', { count: workflows.length });

      for (const workflow of workflows) {
        this.scheduleWorkflow(workflow);
      }
    } catch (error) {
      logger.error('Failed to load scheduled workflows', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async checkExpiredWorkflows(): Promise<void> {
    try {
      const count = await workflowService.deactivateExpiredWorkflows();
      if (count > 0) {
        await this.refresh();
      }
    } catch (error) {
      logger.error('Failed to check expired workflows', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;

    await this.loadAllWorkflows();

    this.deactivationTask = cron.schedule('0 * * * *', async () => {
      logger.info('Checking for expired workflows...');
      await this.checkExpiredWorkflows();
    }, {
      timezone: 'Asia/Kolkata',
    });
    this.deactivationTask.start();

    this.scheduledWorkflows.forEach((scheduled) => {
      scheduled.task.start();
    });

    logger.info('Scheduler started', {
      activeWorkflows: this.scheduledWorkflows.size,
    });
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    this.scheduledWorkflows.forEach((scheduled) => {
      scheduled.task.stop();
    });

    logger.info('Scheduler stopped');
  }

  getStatus(): {
    isRunning: boolean;
    scheduledCount: number;
    workflows: Array<{ workflowId: string; schedule: Schedule }>;
  } {
    return {
      isRunning: this.isRunning,
      scheduledCount: this.scheduledWorkflows.size,
      workflows: Array.from(this.scheduledWorkflows.values()).map((s) => ({
        workflowId: s.workflowId,
        schedule: s.schedule,
      })),
    };
  }

  async refresh(): Promise<void> {
    logger.info('Refreshing scheduler');
    
    this.scheduledWorkflows.forEach((scheduled) => {
      scheduled.task.stop();
    });
    this.scheduledWorkflows.clear();

    await this.loadAllWorkflows();

    if (this.isRunning) {
      this.scheduledWorkflows.forEach((scheduled) => {
        scheduled.task.start();
      });
    }

    logger.info('Scheduler refreshed', {
      activeWorkflows: this.scheduledWorkflows.size,
    });
  }
}

export const schedulerService = new SchedulerService();
export default schedulerService;
