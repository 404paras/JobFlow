import { Request, Response } from 'express';
import { jobService } from './job.service';
import {
  JobQueryParams,
  BulkCreateJobsInput,
  FilterCriteria,
  NormalizationConfig,
  QualityCheckConfig,
} from './job.schema';
import { asyncHandler } from '../../shared/utils/async-handler';
import { ApiResponse } from '../../shared/types';

export class JobController {
  /**
   * Get all jobs with pagination
   * GET /api/jobs
   */
  findAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Use validated query params or fall back to raw query
    const params = ((req as any).validatedData?.query || req.query) as unknown as JobQueryParams;

    const result = await jobService.findAll(params);

    res.json(result);
  });

  /**
   * Get a single job by ID
   * GET /api/jobs/:id
   */
  findById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const job = await jobService.findById(id);

    const response: ApiResponse = {
      success: true,
      data: job,
    };

    res.json(response);
  });

  /**
   * Bulk create jobs
   * POST /api/jobs/bulk
   */
  bulkCreate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data = req.body as BulkCreateJobsInput;

    const result = await jobService.bulkCreate(data);

    const response: ApiResponse = {
      success: true,
      message: 'Jobs created successfully',
      data: result,
    };

    res.status(201).json(response);
  });

  /**
   * Filter jobs by criteria
   * POST /api/jobs/filter
   */
  filter = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const criteria = req.body as FilterCriteria;

    const result = await jobService.filter(criteria);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  });

  /**
   * Normalize jobs
   * POST /api/jobs/normalize
   */
  normalize = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const config = req.body as NormalizationConfig;

    const result = await jobService.normalize(config);

    const response: ApiResponse = {
      success: true,
      message: 'Jobs normalized successfully',
      data: result,
    };

    res.json(response);
  });

  /**
   * Quality check jobs
   * POST /api/jobs/quality-check
   */
  qualityCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const config = req.body as QualityCheckConfig;

    const result = await jobService.qualityCheck(config);

    const response: ApiResponse = {
      success: true,
      message: 'Quality check completed',
      data: result,
    };

    res.json(response);
  });

  /**
   * Delete all jobs for a workflow
   * DELETE /api/jobs/workflow/:workflowId
   */
  deleteByWorkflowId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.params;

    const result = await jobService.deleteByWorkflowId(workflowId);

    const response: ApiResponse = {
      success: true,
      message: 'Jobs deleted successfully',
      data: result,
    };

    res.json(response);
  });
}

export const jobController = new JobController();
export default jobController;

