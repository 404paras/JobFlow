import { Router, Request, Response } from 'express';
import { executorService } from './executor.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { ApiResponse } from '../../shared/types';
import { AuthRequest } from '../users/auth.middleware';

const router = Router();

router.post(
  '/:workflowId',
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { workflowId } = req.params;
    const userId = req.userId;

    const execution = await executorService.execute(workflowId, 'api', userId);

    const response: ApiResponse = {
      success: true,
      message: 'Workflow execution started',
      data: execution,
    };

    res.json(response);
  })
);

router.post(
  '/:workflowId/stop',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.params;

    const stopped = await executorService.stopWorkflow(workflowId);

    if (!stopped) {
      res.status(404).json({
        success: false,
        message: 'Workflow is not running',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      message: 'Workflow execution stopped',
    };

    res.json(response);
  })
);

router.get(
  '/running',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const runningWorkflows = executorService.getRunningWorkflows();

    const response: ApiResponse = {
      success: true,
      data: runningWorkflows.map((w) => ({
        workflowId: w.workflowId,
        executionId: w.executionId,
        startedAt: w.startedAt,
        userId: w.userId,
      })),
    };

    res.json(response);
  })
);

router.get(
  '/:workflowId/status',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.params;

    const isRunning = executorService.isWorkflowRunning(workflowId);
    const runningWorkflows = executorService.getRunningWorkflows();
    const runningInfo = runningWorkflows.find((w) => w.workflowId === workflowId);

    const response: ApiResponse = {
      success: true,
      data: {
        isRunning,
        executionId: runningInfo?.executionId,
        startedAt: runningInfo?.startedAt,
      },
    };

    res.json(response);
  })
);

router.get(
  '/:workflowId/history',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { workflowId } = req.params;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const executions = await executorService.getExecutionHistory(workflowId, limit);

    const response: ApiResponse = {
      success: true,
      data: executions,
    };

    res.json(response);
  })
);

router.get(
  '/execution/:executionId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { executionId } = req.params;

    const execution = await executorService.getExecution(executionId);

    if (!execution) {
      res.status(404).json({
        success: false,
        message: 'Execution not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: execution,
    };

    res.json(response);
  })
);

export default router;
