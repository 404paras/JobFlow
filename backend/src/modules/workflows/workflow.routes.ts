import { Router } from 'express';
import { workflowController } from './workflow.controller';
import { validate } from '../../shared/middleware/validate';
import { authenticate } from '../users/auth.middleware';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowQuerySchema,
  workflowIdParamSchema,
} from './workflow.schema';

const router = Router();

router.get(
  '/',
  authenticate,
  validate(workflowQuerySchema, 'query'),
  workflowController.findAll
);

router.get(
  '/active',
  authenticate,
  workflowController.getActive
);

router.get(
  '/:id',
  authenticate,
  validate(workflowIdParamSchema, 'params'),
  workflowController.findById
);

router.post(
  '/',
  authenticate,
  validate(createWorkflowSchema, 'body'),
  workflowController.create
);

router.put(
  '/:id',
  authenticate,
  validate(workflowIdParamSchema, 'params'),
  validate(updateWorkflowSchema, 'body'),
  workflowController.update
);

router.delete(
  '/:id',
  authenticate,
  validate(workflowIdParamSchema, 'params'),
  workflowController.delete
);

router.post(
  '/:id/publish',
  authenticate,
  validate(workflowIdParamSchema, 'params'),
  workflowController.publish
);

router.post(
  '/:id/pause',
  authenticate,
  validate(workflowIdParamSchema, 'params'),
  workflowController.pause
);

router.post(
  '/:id/activate',
  authenticate,
  validate(workflowIdParamSchema, 'params'),
  workflowController.activate
);

router.post(
  '/:id/deactivate',
  authenticate,
  validate(workflowIdParamSchema, 'params'),
  workflowController.deactivate
);

export default router;
