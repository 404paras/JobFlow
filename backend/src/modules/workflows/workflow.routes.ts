import { Router } from 'express';
import { workflowController } from './workflow.controller';
import { validate } from '../../shared/middleware/validate';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowQuerySchema,
  workflowIdParamSchema,
} from './workflow.schema';

const router = Router();

/**
 * @route   GET /api/workflows
 * @desc    Get all workflows with pagination
 * @access  Public (or Private with auth)
 */
router.get(
  '/',
  validate(workflowQuerySchema, 'query'),
  workflowController.findAll
);

/**
 * @route   GET /api/workflows/:id
 * @desc    Get a single workflow by ID
 * @access  Public (or Private with auth)
 */
router.get(
  '/:id',
  validate(workflowIdParamSchema, 'params'),
  workflowController.findById
);

/**
 * @route   POST /api/workflows
 * @desc    Create a new workflow
 * @access  Public (or Private with auth)
 */
router.post(
  '/',
  validate(createWorkflowSchema, 'body'),
  workflowController.create
);

/**
 * @route   PUT /api/workflows/:id
 * @desc    Update a workflow
 * @access  Public (or Private with auth)
 */
router.put(
  '/:id',
  validate(workflowIdParamSchema, 'params'),
  validate(updateWorkflowSchema, 'body'),
  workflowController.update
);

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Delete a workflow
 * @access  Public (or Private with auth)
 */
router.delete(
  '/:id',
  validate(workflowIdParamSchema, 'params'),
  workflowController.delete
);

/**
 * @route   POST /api/workflows/:id/publish
 * @desc    Publish a workflow
 * @access  Public (or Private with auth)
 */
router.post(
  '/:id/publish',
  validate(workflowIdParamSchema, 'params'),
  workflowController.publish
);

/**
 * @route   POST /api/workflows/:id/pause
 * @desc    Pause a workflow
 * @access  Public (or Private with auth)
 */
router.post(
  '/:id/pause',
  validate(workflowIdParamSchema, 'params'),
  workflowController.pause
);

export default router;

