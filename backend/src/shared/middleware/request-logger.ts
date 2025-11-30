import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger, createRequestLogger } from '../utils/logger';
import { RequestWithLogger } from '../types';

/**
 * Middleware that adds request logging and correlation IDs
 */
export function requestLogger(
  req: RequestWithLogger,
  res: Response,
  next: NextFunction
): void {
  // Generate unique request ID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  const requestLogger = createRequestLogger(requestId);
  requestLogger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    requestLogger[level]('Request completed', {
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
  return (req: RequestWithLogger, res: Response, next: NextFunction): void => {
    if (skipPaths.includes(req.path)) {
      return next();
    }
    
    requestLogger(req, res, next);
  };
}

export default requestLogger;

