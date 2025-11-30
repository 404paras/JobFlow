import cron, { ScheduledTask } from 'node-cron';
import { Workflow, IWorkflowDocument } from '../workflows/workflow.model';
import { executorService } from '../executor/executor.service';
import { logger } from '../../shared/utils/logger';
import { EmailSchedule } from '../../shared/types';

interface ScheduledWorkflow {
  workflowId: string;
  task: ScheduledTask;
  schedule: EmailSchedule;
}

export class SchedulerService {
  private scheduledWorkflows: Map<string, ScheduledWorkflow> = new Map();
  private isRunning = false;

  /**
   * Convert email schedule to cron expression
   */
  private getCronExpression(schedule: EmailSchedule): string {
    switch (schedule) {
      case 'daily-9am':
        return '0 9 * * *'; // Every day at 9 AM
      case 'daily-6pm':
        return '0 18 * * *'; // Every day at 6 PM
      case 'weekly':
        return '0 9 * * 1'; // Every Monday at 9 AM
      default:
        return '0 9 * * *'; // Default to daily 9 AM
    }
  }

  /**
   * Schedule a workflow for execution
   */
  scheduleWorkflow(workflow: IWorkflowDocument): void {
    const workflowId = workflow.workflowId;

    // Remove existing schedule if any
    this.unscheduleWorkflow(workflowId);

    // Only schedule if workflow is published and has email config
    if (workflow.status !== 'published' || !workflow.emailConfig?.isActive) {
      logger.debug('Workflow not eligible for scheduling', {
        workflowId,
        status: workflow.status,
        emailConfigActive: workflow.emailConfig?.isActive,
      });
      return;
    }

    const schedule = workflow.emailConfig.schedule || 'daily-9am';
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
      timezone: 'Asia/Kolkata', // IST timezone
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

  /**
   * Unschedule a workflow
   */
  unscheduleWorkflow(workflowId: string): void {
    const scheduled = this.scheduledWorkflows.get(workflowId);
    if (scheduled) {
      scheduled.task.stop();
      this.scheduledWorkflows.delete(workflowId);
      logger.info('Workflow unscheduled', { workflowId });
    }
  }

  /**
   * Load and schedule all active workflows
   */
  async loadAllWorkflows(): Promise<void> {
    try {
      const workflows = await Workflow.find({
        status: 'published',
        'emailConfig.isActive': true,
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

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;

    // Load all active workflows
    await this.loadAllWorkflows();

    // Start all scheduled tasks
    this.scheduledWorkflows.forEach((scheduled) => {
      scheduled.task.start();
    });

    logger.info('Scheduler started', {
      activeWorkflows: this.scheduledWorkflows.size,
    });
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop all scheduled tasks
    this.scheduledWorkflows.forEach((scheduled) => {
      scheduled.task.stop();
    });

    logger.info('Scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    scheduledCount: number;
    workflows: Array<{ workflowId: string; schedule: EmailSchedule }>;
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

  /**
   * Refresh schedules (reload from database)
   */
  async refresh(): Promise<void> {
    logger.info('Refreshing scheduler');
    
    // Stop all current schedules
    this.scheduledWorkflows.forEach((scheduled) => {
      scheduled.task.stop();
    });
    this.scheduledWorkflows.clear();

    // Reload from database
    await this.loadAllWorkflows();

    // Restart if was running
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

