import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

export {};
