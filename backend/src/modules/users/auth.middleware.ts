import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { UnauthorizedError } from '../../shared/middleware/error-handler';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
}

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    const payload = userService.verifyToken(token);
    
    req.userId = payload.userId;
    req.userEmail = payload.email;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next();
    }

    const payload = userService.verifyToken(token);
    
    req.userId = payload.userId;
    req.userEmail = payload.email;

    next();
  } catch (error) {
    // Ignore token errors for optional auth
    next();
  }
}

export default authenticate;

