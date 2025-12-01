import { Workflow, IWorkflowDocument } from './workflow.model';
import { User } from '../users/user.model';
import { CreateWorkflowInput, UpdateWorkflowInput, WorkflowQueryParams } from './workflow.schema';
import { NotFoundError, ConflictError } from '../../shared/middleware/error-handler';
import { logger } from '../../shared/utils/logger';
import { PaginatedResponse, WorkflowNode, WorkflowEdge } from '../../shared/types';

export class WorkflowService {
  private deduplicateJobsOutputNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const outputNodes = nodes.filter(n => n.data?.type === 'jobs-output');
    
    if (outputNodes.length <= 1) {
      return { nodes, edges };
    }

    const outputGroups = new Map<string, WorkflowNode[]>();
    
    for (const node of outputNodes) {
      const metadata = node.data.metadata || {};
      const signature = JSON.stringify({
        schedule: metadata.schedule || 'daily-9am',
        maxJobs: metadata.maxJobs || 100,
      });
      
      if (!outputGroups.has(signature)) {
        outputGroups.set(signature, []);
      }
      outputGroups.get(signature)!.push(node);
    }

    const nodesToRemove = new Set<string>();
    const edgeUpdates = new Map<string, string>();

    for (const [, group] of outputGroups) {
      if (group.length > 1) {
        const keepNode = group[0];
        
        for (let i = 1; i < group.length; i++) {
          const duplicateNode = group[i];
          nodesToRemove.add(duplicateNode.id);
          edgeUpdates.set(duplicateNode.id, keepNode.id);
        }

        logger.info('Merged duplicate jobs output nodes', {
          keptNodeId: keepNode.id,
          removedCount: group.length - 1,
        });
      }
    }

    if (nodesToRemove.size === 0) {
      return { nodes, edges };
    }

    const filteredNodes = nodes.filter(n => !nodesToRemove.has(n.id));

    const updatedEdges = edges
      .map(edge => {
        const newTarget = edgeUpdates.get(edge.target);
        if (newTarget) {
          return { ...edge, target: newTarget };
        }
        return edge;
      })
      .filter((edge, index, self) => {
        const key = `${edge.source}-${edge.target}`;
        return index === self.findIndex(e => `${e.source}-${e.target}` === key);
      })
      .filter(edge => !nodesToRemove.has(edge.source));

    return { nodes: filteredNodes, edges: updatedEdges };
  }

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

    const { nodes, edges } = this.deduplicateJobsOutputNodes(
      (data.nodes || []) as WorkflowNode[],
      (data.edges || []) as WorkflowEdge[]
    );

    const workflow = new Workflow({
      ...data,
      nodes,
      edges,
      userId,
      userEmail,
      nodeCount: nodes.length,
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
    if (data.nodes !== undefined || data.edges !== undefined) {
      const inputNodes = (data.nodes || workflow.nodes) as WorkflowNode[];
      const inputEdges = (data.edges || workflow.edges) as WorkflowEdge[];
      
      const { nodes, edges } = this.deduplicateJobsOutputNodes(inputNodes, inputEdges);
      
      workflow.nodes = nodes as any;
      workflow.edges = edges as any;
      workflow.nodeCount = nodes.length;
      
      const jobsOutputNode = nodes.find((n: any) => n.data?.type === 'jobs-output');
      if (jobsOutputNode?.data?.metadata) {
        const metadata = jobsOutputNode.data.metadata;
        workflow.jobsConfig = {
          retentionDays: metadata.retentionDays || 30,
          maxJobs: metadata.maxJobs || 100,
          notifications: metadata.notifications !== false,
          notifyThreshold: 1,
          defaultSort: 'newest',
          autoMarkReadDays: 0,
        };
      }
    }
    if (data.jobsConfig !== undefined) {
      workflow.jobsConfig = {
        retentionDays: data.jobsConfig.retentionDays ?? 30,
        maxJobs: data.jobsConfig.maxJobs ?? 100,
        notifications: data.jobsConfig.notifications ?? true,
        notifyThreshold: data.jobsConfig.notifyThreshold ?? 1,
        defaultSort: data.jobsConfig.defaultSort ?? 'newest',
        autoMarkReadDays: data.jobsConfig.autoMarkReadDays ?? 0,
      };
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
    await workflow.save();
    logger.info('Workflow paused', { workflowId: id });

    return workflow;
  }

  async findActiveWorkflows(): Promise<IWorkflowDocument[]> {
    return Workflow.find({
      status: 'published',
      isActive: true,
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

  async activate(workflowId: string, userId: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ workflowId });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    if (workflow.status !== 'published') {
      throw new ConflictError('Only published workflows can be activated');
    }

    const existingActive = await Workflow.findOne({ 
      userId, 
      isActive: true,
      workflowId: { $ne: workflowId }
    });

    if (existingActive) {
      existingActive.isActive = false;
      existingActive.activatedAt = undefined;
      existingActive.deactivatesAt = undefined;
      await existingActive.save();
      logger.info('Previous workflow deactivated', { workflowId: existingActive.workflowId });
    }

    const now = new Date();
    const deactivatesAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    workflow.isActive = true;
    workflow.activatedAt = now;
    workflow.deactivatesAt = deactivatesAt;

    await workflow.save();
    logger.info('Workflow activated', { 
      workflowId, 
      activatedAt: now, 
      deactivatesAt 
    });

    return workflow;
  }

  async deactivate(workflowId: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ workflowId });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    workflow.isActive = false;
    workflow.activatedAt = undefined;
    workflow.deactivatesAt = undefined;

    await workflow.save();
    logger.info('Workflow deactivated', { workflowId });

    return workflow;
  }

  async getActiveWorkflow(userId: string): Promise<IWorkflowDocument | null> {
    return Workflow.findOne({ userId, isActive: true });
  }

  async deactivateExpiredWorkflows(): Promise<number> {
    const now = new Date();
    const result = await Workflow.updateMany(
      { isActive: true, deactivatesAt: { $lte: now } },
      { 
        $set: { isActive: false },
        $unset: { activatedAt: 1, deactivatesAt: 1 }
      }
    );
    
    if (result.modifiedCount > 0) {
      logger.info('Deactivated expired workflows', { count: result.modifiedCount });
    }
    
    return result.modifiedCount;
  }
}

export const workflowService = new WorkflowService();
export default workflowService;
