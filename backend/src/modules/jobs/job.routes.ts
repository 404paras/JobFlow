import { Router } from 'express';
import { jobController } from './job.controller';
import { validate } from '../../shared/middleware/validate';
import {
  jobQuerySchema,
  bulkCreateJobsSchema,
  filterCriteriaSchema,
  normalizationConfigSchema,
  qualityCheckConfigSchema,
} from './job.schema';

const router = Router();

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with pagination
 * @access  Public
 */
router.get(
  '/',
  validate(jobQuerySchema, 'query'),
  jobController.findAll
);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get a single job by ID
 * @access  Public
 */
router.get(
  '/:id',
  jobController.findById
);

/**
 * @route   POST /api/jobs/bulk
 * @desc    Bulk create jobs
 * @access  Public
 */
router.post(
  '/bulk',
  validate(bulkCreateJobsSchema, 'body'),
  jobController.bulkCreate
);

/**
 * @route   POST /api/jobs/filter
 * @desc    Filter jobs by criteria
 * @access  Public
 */
router.post(
  '/filter',
  validate(filterCriteriaSchema, 'body'),
  jobController.filter
);

/**
 * @route   POST /api/jobs/normalize
 * @desc    Normalize jobs
 * @access  Public
 */
router.post(
  '/normalize',
  validate(normalizationConfigSchema, 'body'),
  jobController.normalize
);

/**
 * @route   POST /api/jobs/quality-check
 * @desc    Quality check jobs
 * @access  Public
 */
router.post(
  '/quality-check',
  validate(qualityCheckConfigSchema, 'body'),
  jobController.qualityCheck
);

/**
 * @route   DELETE /api/jobs/workflow/:workflowId
 * @desc    Delete all jobs for a workflow
 * @access  Public
 */
router.delete(
  '/workflow/:workflowId',
  jobController.deleteByWorkflowId
);

export default router;

