import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // PostgreSQL unique violation: 23505 | Prisma unique constraint violation: P2002
  if (
    err.code === '23505' ||
    err.code === 'P2002' ||
    err.statusCode === 409 ||
    err.status === 409 ||
    (err.message && err.message.toLowerCase().includes('already been recorded')) ||
    (err.message && err.message.toLowerCase().includes('already exists')) ||
    (err.message && err.message.toLowerCase().includes('concurrent edit conflict'))
  ) {
    res.status(409).json({
      success: false,
      error: err.message || 'Conflict: Record already exists or was modified concurrently.',
      code: 'CONFLICT',
      details: err.detail || err.meta,
    });
    return;
  }

  // PostgreSQL foreign key violation: 23503 | Prisma: P2003
  if (err.code === '23503' || err.code === 'P2003') {
    res.status(400).json({
      success: false,
      error: 'Foreign key constraint violation: referenced entity does not exist.',
      code: 'FOREIGN_KEY_VIOLATION',
    });
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code,
  });
};
