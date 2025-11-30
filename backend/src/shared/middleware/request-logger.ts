import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger } from '../utils/logger';

/**
 * Middleware that adds request logging and correlation IDs
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-ID', requestId);

  const reqLogger = createRequestLogger(requestId);
  reqLogger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    reqLogger[level]('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}

/**
 * Skip logging for certain paths (like health checks)
 */
export function requestLoggerWithSkip(skipPaths: string[] = ['/health']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (skipPaths.includes(req.path)) {
      return next();
    }
    
    requestLogger(req, res, next);
  };
}

export default requestLogger;

