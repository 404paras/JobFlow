import { Router, Request, Response } from 'express';
import { schedulerService } from './scheduler.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { ApiResponse } from '../../shared/types';

const router = Router();

/**
 * @route   GET /api/scheduler/status
 * @desc    Get scheduler status
 * @access  Public
 */
router.get(
  '/status',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const status = schedulerService.getStatus();

    const response: ApiResponse = {
      success: true,
      data: status,
    };

    res.json(response);
  })
);

/**
 * @route   POST /api/scheduler/refresh
 * @desc    Refresh scheduler (reload workflows)
 * @access  Public
 */
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await schedulerService.refresh();
    const status = schedulerService.getStatus();

    const response: ApiResponse = {
      success: true,
      message: 'Scheduler refreshed',
      data: status,
    };

    res.json(response);
  })
);

/**
 * @route   POST /api/scheduler/start
 * @desc    Start the scheduler
 * @access  Public
 */
router.post(
  '/start',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    await schedulerService.start();
    const status = schedulerService.getStatus();

    const response: ApiResponse = {
      success: true,
      message: 'Scheduler started',
      data: status,
    };

    res.json(response);
  })
);

/**
 * @route   POST /api/scheduler/stop
 * @desc    Stop the scheduler
 * @access  Public
 */
router.post(
  '/stop',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    schedulerService.stop();
    const status = schedulerService.getStatus();

    const response: ApiResponse = {
      success: true,
      message: 'Scheduler stopped',
      data: status,
    };

    res.json(response);
  })
);

export default router;

