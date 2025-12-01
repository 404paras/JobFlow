import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../users/auth.middleware';
import { adminAuth } from './admin.middleware';
import { User } from '../users/user.model';
import { Workflow } from '../workflows/workflow.model';
import { Feedback } from '../feedback/feedback.model';
import { logger } from '../../shared/utils/logger';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(adminAuth);

// Get dashboard stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalWorkflows,
      publishedWorkflows,
      totalFeedback,
      newFeedback,
      recentUsers,
      recentWorkflows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Workflow.countDocuments(),
      Workflow.countDocuments({ status: 'published' }),
      Feedback.countDocuments(),
      Feedback.countDocuments({ status: 'new' }),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email createdAt isActive'),
      Workflow.find().sort({ createdAt: -1 }).limit(5).select('workflowId title status createdAt'),
    ]);

    // Get daily signups for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
        },
        workflows: {
          total: totalWorkflows,
          published: publishedWorkflows,
        },
        feedback: {
          total: totalFeedback,
          new: newFeedback,
        },
        recentUsers,
        recentWorkflows,
        dailySignups,
      },
    });
  } catch (error) {
    logger.error('Failed to get admin stats', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
    });
  }
});

// Get all users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('name email isActive isAdmin workflowCount lastLoginAt createdAt'),
      User.countDocuments(),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to get users', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
    });
  }
});

// Toggle user active status
router.patch('/users/:id/toggle-active', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    user.isActive = !user.isActive;
    await user.save();

    logger.info('User active status toggled', { 
      userId: user._id, 
      isActive: user.isActive,
      adminId: req.userId,
    });

    res.json({
      success: true,
      data: { isActive: user.isActive },
    });
  } catch (error) {
    logger.error('Failed to toggle user status', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
    });
  }
});

// Get all feedbacks
router.get('/feedbacks', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status && ['new', 'reviewed', 'resolved'].includes(status)) {
      query.status = status;
    }

    const [feedbacks, total] = await Promise.all([
      Feedback.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      Feedback.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: feedbacks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to get feedbacks', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get feedbacks',
    });
  }
});

// Update feedback status
router.patch('/feedbacks/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNotes } = req.body;
    
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      res.status(404).json({
        success: false,
        message: 'Feedback not found',
      });
      return;
    }

    if (status) feedback.status = status;
    if (adminNotes !== undefined) feedback.adminNotes = adminNotes;
    
    await feedback.save();

    logger.info('Feedback updated', { 
      feedbackId: feedback._id, 
      status,
      adminId: req.userId,
    });

    res.json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    logger.error('Failed to update feedback', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback',
    });
  }
});

// Get all workflows (admin view)
router.get('/workflows', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      Workflow.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('workflowId title status nodeCount executionCount isActive createdAt lastExecutedAt'),
      Workflow.countDocuments(),
    ]);

    res.json({
      success: true,
      data: workflows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Failed to get workflows', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get workflows',
    });
  }
});

export default router;

