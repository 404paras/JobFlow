import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handling middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Alternative wrapper that also handles synchronous errors
 */
export function wrapController<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export default asyncHandler;

