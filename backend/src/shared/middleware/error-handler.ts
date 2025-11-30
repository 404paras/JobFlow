import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

// ============================================
// Custom Error Classes
// ============================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message, 400, true, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

// ============================================
// Error Handler Middleware
// ============================================

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log the error
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    const response: ApiResponse = {
      success: false,
      message: 'Validation failed',
      errors,
    };

    res.status(400).json(response);
    return;
  }

  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    const response: ApiResponse = {
      success: false,
      message: err.message,
      errors: err.errors,
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const response: ApiResponse = {
      success: false,
      message: 'Duplicate entry found',
    };

    res.status(409).json(response);
    return;
  }

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    const mongooseErrors = Object.values((err as any).errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));

    const response: ApiResponse = {
      success: false,
      message: 'Validation failed',
      errors: mongooseErrors,
    };

    res.status(400).json(response);
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const response: ApiResponse = {
      success: false,
      message: 'Invalid ID format',
    };

    res.status(400).json(response);
    return;
  }

  // Default error response
  const response: ApiResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  };

  res.status(500).json(response);
}

// ============================================
// Not Found Handler
// ============================================

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  };

  res.status(404).json(response);
}

