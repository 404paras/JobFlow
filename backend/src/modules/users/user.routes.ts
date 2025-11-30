import { Router } from 'express';
import { userController } from './user.controller';
import { validate } from '../../shared/middleware/validate';
import { registerSchema, loginSchema, updateUserSchema } from './user.schema';
import { authenticate } from './auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validate(registerSchema, 'body'),
  userController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  validate(loginSchema, 'body'),
  userController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  userController.getCurrentUser
);

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user
 * @access  Private
 */
router.put(
  '/me',
  authenticate,
  validate(updateUserSchema, 'body'),
  userController.updateCurrentUser
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  userController.logout
);

export default router;

