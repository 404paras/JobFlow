import { Router } from 'express';
import { jobController } from './job.controller';
import { authenticate } from '../users/auth.middleware';
import { validate } from '../../shared/middleware/validate';
import {
  userJobQuerySchema,
  jobQuerySchema,
  bulkCreateJobsSchema,
  filterCriteriaSchema,
  normalizationConfigSchema,
  qualityCheckConfigSchema,
  updateJobStatusSchema,
} from './job.schema';

const router = Router();

router.get(
  '/user',
  authenticate,
  validate(userJobQuerySchema, 'query'),
  jobController.getUserJobs
);

router.get(
  '/user/counts',
  authenticate,
  jobController.getJobCounts
);

router.get(
  '/user/analytics',
  authenticate,
  jobController.getAnalytics
);

router.patch(
  '/user/:id/read',
  authenticate,
  jobController.markJobAsRead
);

router.patch(
  '/user/read-all',
  authenticate,
  jobController.markAllJobsAsRead
);

router.patch(
  '/user/:id/status',
  authenticate,
  validate(updateJobStatusSchema, 'body'),
  jobController.updateJobStatus
);

router.patch(
  '/user/:id/bookmark',
  authenticate,
  jobController.toggleBookmark
);

router.delete(
  '/user/:id',
  authenticate,
  jobController.deleteUserJob
);

router.post(
  '/user/calculate-match',
  authenticate,
  jobController.calculateMatchScores
);

router.get(
  '/',
  validate(jobQuerySchema, 'query'),
  jobController.findAll
);

router.get(
  '/:id',
  jobController.findById
);

router.post(
  '/bulk',
  validate(bulkCreateJobsSchema, 'body'),
  jobController.bulkCreate
);

router.post(
  '/filter',
  validate(filterCriteriaSchema, 'body'),
  jobController.filter
);

router.post(
  '/normalize',
  validate(normalizationConfigSchema, 'body'),
  jobController.normalize
);

router.post(
  '/quality-check',
  validate(qualityCheckConfigSchema, 'body'),
  jobController.qualityCheck
);

router.delete(
  '/workflow/:workflowId',
  jobController.deleteByWorkflowId
);

export default router;
