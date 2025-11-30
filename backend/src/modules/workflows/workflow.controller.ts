import { Request, Response } from 'express';
import { workflowService } from './workflow.service';
import { CreateWorkflowInput, UpdateWorkflowInput, WorkflowQueryParams } from './workflow.schema';
import { asyncHandler } from '../../shared/utils/async-handler';
import { ApiResponse } from '../../shared/types';

export class WorkflowController {
  /**
   * Create a new workflow
   * POST /api/workflows
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = req.body as CreateWorkflowInput;
    const userId = (req as any).userId; // From auth middleware

    const workflow = await workflowService.create(data, userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workflow created successfully',
      data: workflow,
    };

    res.status(201).json(response);
  });

  /**
   * Get all workflows with pagination
   * GET /api/workflows
   */
  findAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Use validated query params or fall back to raw query
    const params = ((req as any).validatedData?.query || req.query) as unknown as WorkflowQueryParams;
    const userId = (req as any).userId;

    const result = await workflowService.findAll(params, userId);

    res.json(result);
  });

  /**
   * Get a single workflow by ID
   * GET /api/workflows/:id
   */
  findById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const workflow = await workflowService.findById(id);

    const response: ApiResponse = {
      success: true,
      data: workflow,
    };

    res.json(response);
  });

  /**
   * Update a workflow
   * PUT /api/workflows/:id
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = req.body as UpdateWorkflowInput;

    const workflow = await workflowService.update(id, data);

    const response: ApiResponse = {
      success: true,
      message: 'Workflow updated successfully',
      data: workflow,
    };

    res.json(response);
  });

  /**
   * Delete a workflow
   * DELETE /api/workflows/:id
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await workflowService.delete(id);

    const response: ApiResponse = {
      success: true,
      message: 'Workflow deleted successfully',
    };

    res.json(response);
  });

  /**
   * Publish a workflow
   * POST /api/workflows/:id/publish
   */
  publish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const workflow = await workflowService.publish(id);

    const response: ApiResponse = {
      success: true,
      message: 'Workflow published successfully',
      data: workflow,
    };

    res.json(response);
  });

  /**
   * Pause a workflow
   * POST /api/workflows/:id/pause
   */
  pause = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const workflow = await workflowService.pause(id);

    const response: ApiResponse = {
      success: true,
      message: 'Workflow paused successfully',
      data: workflow,
    };

    res.json(response);
  });
}

export const workflowController = new WorkflowController();
export default workflowController;

