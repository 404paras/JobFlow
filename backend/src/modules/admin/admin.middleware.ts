import { Response, NextFunction } from 'express';
import { AuthRequest } from '../users/auth.middleware';
import { User } from '../users/user.model';
import { UnauthorizedError, ForbiddenError } from '../../shared/middleware/error-handler';

export async function adminAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isAdmin) {
      throw new ForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}

export default adminAuth;

