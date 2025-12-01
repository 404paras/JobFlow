import { Workflow, IWorkflowDocument } from './workflow.model';
import { User } from '../users/user.model';
import { CreateWorkflowInput, UpdateWorkflowInput, WorkflowQueryParams } from './workflow.schema';
import { NotFoundError, ConflictError } from '../../shared/middleware/error-handler';
import { logger } from '../../shared/utils/logger';
import { PaginatedResponse, WorkflowNode, WorkflowEdge } from '../../shared/types';

export class WorkflowService {
  /**
   * Deduplicate email nodes with same configuration.
   * If multiple email nodes have same recipients/schedule/format, merge them into one
   * and redirect all incoming edges to the single node.
   */
  private deduplicateEmailNodes(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    // Find all email nodes
    const emailNodes = nodes.filter(n => n.data?.type === 'daily-email');
    
    if (emailNodes.length <= 1) {
      return { nodes, edges };
    }

    // Group email nodes by their config signature
    const emailGroups = new Map<string, WorkflowNode[]>();
    
    for (const node of emailNodes) {
      const metadata = node.data.metadata || {};
      // Create a signature from the email config
      const signature = JSON.stringify({
        recipients: (metadata.recipients || '').toLowerCase().trim(),
        schedule: metadata.schedule || 'Daily at 9 AM',
        format: metadata.format || 'HTML',
      });
      
      if (!emailGroups.has(signature)) {
        emailGroups.set(signature, []);
      }
      emailGroups.get(signature)!.push(node);
    }

    // Find duplicates and merge
    const nodesToRemove = new Set<string>();
    const edgeUpdates = new Map<string, string>(); // oldNodeId -> newNodeId

    for (const [, group] of emailGroups) {
      if (group.length > 1) {
        // Keep the first node, remove the rest
        const keepNode = group[0];
        
        for (let i = 1; i < group.length; i++) {
          const duplicateNode = group[i];
          nodesToRemove.add(duplicateNode.id);
          edgeUpdates.set(duplicateNode.id, keepNode.id);
        }

        logger.info('Merged duplicate email nodes', {
          keptNodeId: keepNode.id,
          removedCount: group.length - 1,
          recipients: keepNode.data.metadata?.recipients,
        });
      }
    }

    if (nodesToRemove.size === 0) {
      return { nodes, edges };
    }

    // Filter out removed nodes
    const filteredNodes = nodes.filter(n => !nodesToRemove.has(n.id));

    // Update edges: redirect edges pointing to removed nodes
    const updatedEdges = edges
      .map(edge => {
        const newTarget = edgeUpdates.get(edge.target);
        if (newTarget) {
          return { ...edge, target: newTarget };
        }
        return edge;
      })
      // Remove duplicate edges (same source -> same target)
      .filter((edge, index, self) => {
        const key = `${edge.source}-${edge.target}`;
        return index === self.findIndex(e => `${e.source}-${e.target}` === key);
      })
      // Remove edges from removed nodes
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

    // Deduplicate email nodes with same config
    const { nodes, edges } = this.deduplicateEmailNodes(
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
      // Get current or new nodes/edges
      const inputNodes = (data.nodes || workflow.nodes) as WorkflowNode[];
      const inputEdges = (data.edges || workflow.edges) as WorkflowEdge[];
      
      // Deduplicate email nodes with same config
      const { nodes, edges } = this.deduplicateEmailNodes(inputNodes, inputEdges);
      
      workflow.nodes = nodes as any;
      workflow.edges = edges as any;
      workflow.nodeCount = nodes.length;
      
      // Update email config from the (possibly merged) email node
      const emailNode = nodes.find((n: any) => n.data?.type === 'daily-email');
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
      isActive: true,
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

  async activate(workflowId: string, userId: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ workflowId });
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    if (workflow.status !== 'published') {
      throw new ConflictError('Only published workflows can be activated');
    }

    // Check if user already has an active workflow
    const existingActive = await Workflow.findOne({ 
      userId, 
      isActive: true,
      workflowId: { $ne: workflowId }
    });

    if (existingActive) {
      // Deactivate the existing active workflow
      existingActive.isActive = false;
      existingActive.activatedAt = undefined;
      existingActive.deactivatesAt = undefined;
      await existingActive.save();
      logger.info('Previous workflow deactivated', { workflowId: existingActive.workflowId });
    }

    // Activate the new workflow for 2 days
    const now = new Date();
    const deactivatesAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

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
