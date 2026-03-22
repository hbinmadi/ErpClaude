import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
    }
    req[source] = result.data;
    next();
  };
}
