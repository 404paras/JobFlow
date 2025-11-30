import { Workflow, IWorkflowDocument } from './workflow.model';
import { User } from '../users/user.model';
import { CreateWorkflowInput, UpdateWorkflowInput, WorkflowQueryParams } from './workflow.schema';
import { NotFoundError, ConflictError } from '../../shared/middleware/error-handler';
import { logger } from '../../shared/utils/logger';
import { PaginatedResponse } from '../../shared/types';

export class WorkflowService {
  async create(data: CreateWorkflowInput, userId?: string): Promise<IWorkflowDocument> {
    const existing = await Workflow.findOne({ workflowId: data.workflowId });
    if (existing) {
      throw new ConflictError(`Workflow with ID ${data.workflowId} already exists`);
    }

    let userEmail: string | undefined;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        userEmail = user.email;
      }
    }

    const workflow = new Workflow({
      ...data,
      userId,
      userEmail,
      nodeCount: data.nodes?.length || 0,
    });

    await workflow.save();
    
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        await user.addWorkflow(workflow._id as any);
      }
    }
    
    logger.info('Workflow created', { workflowId: workflow.workflowId, userId, userEmail });

    return workflow;
  }

  async findAll(
    params: WorkflowQueryParams,
    userId?: string
  ): Promise<PaginatedResponse<IWorkflowDocument>> {
    const { page, limit, sortBy, sortOrder, status } = params;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};
    if (userId) {
      query.userId = userId;
    }
    if (status) {
      query.status = status;
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [workflows, total] = await Promise.all([
      Workflow.find(query).sort(sort).skip(skip).limit(limit).lean(),
      Workflow.countDocuments(query),
    ]);

    return {
      success: true,
      data: workflows as IWorkflowDocument[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ workflowId: id });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }
    return workflow;
  }

  async findByMongoId(id: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findById(id);
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }
    return workflow;
  }

  async update(id: string, data: UpdateWorkflowInput): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ workflowId: id });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    if (data.title !== undefined) {
      workflow.title = data.title;
    }
    if (data.status !== undefined) {
      workflow.status = data.status;
    }
    if (data.nodes !== undefined) {
      workflow.nodes = data.nodes as any;
      workflow.nodeCount = data.nodes.length;
      
      const emailNode = data.nodes.find((n: any) => n.data?.type === 'daily-email');
      if (emailNode?.data?.metadata) {
        const metadata = emailNode.data.metadata;
        workflow.emailConfig = {
          recipients: metadata.recipients || '',
          schedule: metadata.schedule === 'Daily at 9 AM' ? 'daily-9am' : 
                    metadata.schedule === 'Daily at 6 PM' ? 'daily-6pm' : 
                    metadata.schedule === 'Weekly' ? 'weekly' : 'daily-9am',
          format: metadata.format === 'HTML' ? 'html' : 
                  metadata.format === 'Plain Text' ? 'plain' : 'html',
          sentCount: workflow.emailConfig?.sentCount || 0,
          isActive: workflow.status === 'published',
        } as any;
      }
    }
    if (data.edges !== undefined) {
      workflow.edges = data.edges as any;
    }
    if (data.emailConfig !== undefined) {
      workflow.emailConfig = {
        ...data.emailConfig,
        sentCount: workflow.emailConfig?.sentCount || 0,
      } as any;
    }

    await workflow.save();
    
    logger.info('Workflow updated', { workflowId: workflow.workflowId });

    return workflow;
  }

  async delete(id: string): Promise<void> {
    const workflow = await Workflow.findOne({ workflowId: id });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    if (workflow.userId) {
      const user = await User.findById(workflow.userId);
      if (user) {
        await user.removeWorkflow(workflow._id as any);
      }
    }

    const { Execution } = await import('../executor/execution.model');
    await Execution.deleteMany({ workflowId: id });

    await workflow.deleteOne();
    logger.info('Workflow deleted', { workflowId: id });
  }

  async publish(id: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ workflowId: id });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    workflow.status = 'published';
    if (workflow.emailConfig) {
      workflow.emailConfig.isActive = true;
    }

    await workflow.save();
    logger.info('Workflow published', { workflowId: id });

    return workflow;
  }

  async pause(id: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ workflowId: id });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    workflow.status = 'paused';
    if (workflow.emailConfig) {
      workflow.emailConfig.isActive = false;
      workflow.emailConfig.pausedAt = new Date();
    }

    await workflow.save();
    logger.info('Workflow paused', { workflowId: id });

    return workflow;
  }

  async findActiveEmailWorkflows(): Promise<IWorkflowDocument[]> {
    return Workflow.find({
      status: 'published',
      'emailConfig.isActive': true,
    });
  }

  async updateExecutionStats(id: string): Promise<void> {
    await Workflow.updateOne(
      { workflowId: id },
      {
        $set: { lastExecutedAt: new Date() },
        $inc: { executionCount: 1 },
      }
    );
  }
}

export const workflowService = new WorkflowService();
export default workflowService;
