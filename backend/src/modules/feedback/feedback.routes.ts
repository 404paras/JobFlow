import { Router, Request, Response } from 'express';
import { Feedback } from './feedback.model';
import { authenticate, AuthRequest } from '../users/auth.middleware';
import { logger } from '../../shared/utils/logger';

const router = Router();

// Submit feedback (public or authenticated)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, message, rating, email } = req.body;

    if (!type || !message) {
      res.status(400).json({
        success: false,
        message: 'Type and message are required',
      });
      return;
    }

    const feedback = await Feedback.create({
      type,
      message,
      rating,
      userEmail: email,
    });

    logger.info('Feedback submitted', { feedbackId: feedback._id, type });

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: { id: feedback._id },
    });
  } catch (error) {
    logger.error('Failed to submit feedback', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
});

// Submit feedback (authenticated - links to user)
router.post('/authenticated', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, message, rating } = req.body;

    if (!type || !message) {
      res.status(400).json({
        success: false,
        message: 'Type and message are required',
      });
      return;
    }

    const feedback = await Feedback.create({
      type,
      message,
      rating,
      userId: req.userId,
      userEmail: req.userEmail,
    });

    logger.info('Authenticated feedback submitted', { 
      feedbackId: feedback._id, 
      type,
      userId: req.userId,
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: { id: feedback._id },
    });
  } catch (error) {
    logger.error('Failed to submit feedback', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
    });
  }
});

export default router;

