import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../types';

type ValidationType = 'body' | 'query' | 'params';

/**
 * Middleware factory for validating request data against Zod schemas
 */
export function validate(
  schema: ZodSchema,
  type: ValidationType = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[type];
      const validated = schema.parse(dataToValidate);
      
      // For body, we can replace it. For query/params, store in a custom property
      if (type === 'body') {
        req.body = validated;
      } else {
        // Store validated data in a custom property since query/params are read-only in Express 5
        (req as any).validatedData = (req as any).validatedData || {};
        (req as any).validatedData[type] = validated;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
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

      next(error);
    }
  };
}

/**
 * Validate multiple parts of the request at once
 */
export function validateMultiple(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Array<{ field: string; message: string }> = [];

    try {
      if (schemas.body) {
        const result = schemas.body.safeParse(req.body);
        if (!result.success) {
          allErrors.push(
            ...result.error.errors.map((e) => ({
              field: `body.${e.path.join('.')}`,
              message: e.message,
            }))
          );
        } else {
          req.body = result.data;
        }
      }

      if (schemas.query) {
        const result = schemas.query.safeParse(req.query);
        if (!result.success) {
          allErrors.push(
            ...result.error.errors.map((e) => ({
              field: `query.${e.path.join('.')}`,
              message: e.message,
            }))
          );
        } else {
          req.query = result.data;
        }
      }

      if (schemas.params) {
        const result = schemas.params.safeParse(req.params);
        if (!result.success) {
          allErrors.push(
            ...result.error.errors.map((e) => ({
              field: `params.${e.path.join('.')}`,
              message: e.message,
            }))
          );
        } else {
          req.params = result.data;
        }
      }

      if (allErrors.length > 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Validation failed',
          errors: allErrors,
        };

        res.status(400).json(response);
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export default validate;

