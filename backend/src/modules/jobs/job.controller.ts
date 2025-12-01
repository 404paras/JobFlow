import { Response } from 'express';
import { jobService } from './job.service';
import {
  JobQueryParams,
  UserJobQueryParams,
  BulkCreateJobsInput,
  FilterCriteria,
  NormalizationConfig,
  QualityCheckConfig,
  UpdateJobStatusInput,
} from './job.schema';
import { AuthRequest } from '../users/auth.middleware';
import { asyncHandler } from '../../shared/utils/async-handler';
import { ApiResponse } from '../../shared/types';

export class JobController {
  getUserJobs = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const params = (req as any).validatedData?.query || req.query;

    const result = await jobService.findUserJobs(userId, params as UserJobQueryParams);
    res.json(result);
  });

  getJobCounts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const counts = await jobService.getJobCounts(userId);

    res.json({
      success: true,
      data: counts,
    });
  });

  markJobAsRead = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { id } = req.params;

    const job = await jobService.markJobAsRead(userId, id);

    res.json({
      success: true,
      data: job,
    });
  });

  markAllJobsAsRead = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const result = await jobService.markAllJobsAsRead(userId);

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} jobs as read`,
      data: result,
    });
  });

  updateJobStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { id } = req.params;
    const { applicationStatus } = req.body as UpdateJobStatusInput;

    const job = await jobService.updateJobStatus(userId, id, applicationStatus);

    res.json({
      success: true,
      data: job,
    });
  });

  toggleBookmark = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { id } = req.params;

    const job = await jobService.toggleBookmark(userId, id);

    res.json({
      success: true,
      data: job,
    });
  });

  deleteUserJob = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { id } = req.params;

    await jobService.deleteUserJob(userId, id);

    res.json({
      success: true,
      message: 'Job deleted successfully',
    });
  });

  calculateMatchScores = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
      res.status(400).json({
        success: false,
        message: 'Skills array is required',
      });
      return;
    }

    const count = await jobService.calculateMatchScoresForUser(userId, skills);

    res.json({
      success: true,
      message: `Calculated match scores for ${count} jobs`,
      data: { updatedCount: count },
    });
  });

  findAll = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const params = ((req as any).validatedData?.query || req.query) as unknown as JobQueryParams;
    const result = await jobService.findAll(params);
    res.json(result);
  });

  findById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const job = await jobService.findById(id);

    const response: ApiResponse = {
      success: true,
      data: job,
    };

    res.json(response);
  });

  bulkCreate = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const data = req.body as BulkCreateJobsInput;
    const result = await jobService.bulkCreate(data);

    const response: ApiResponse = {
      success: true,
      message: 'Jobs created successfully',
      data: result,
    };

    res.status(201).json(response);
  });

  filter = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const criteria = req.body as FilterCriteria;
    const result = await jobService.filter(criteria);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.json(response);
  });

  normalize = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const config = req.body as NormalizationConfig;
    const result = await jobService.normalize(config);

    const response: ApiResponse = {
      success: true,
      message: 'Jobs normalized successfully',
      data: result,
    };

    res.json(response);
  });

  qualityCheck = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const config = req.body as QualityCheckConfig;
    const result = await jobService.qualityCheck(config);

    const response: ApiResponse = {
      success: true,
      message: 'Quality check completed',
      data: result,
    };

    res.json(response);
  });

  deleteByWorkflowId = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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
