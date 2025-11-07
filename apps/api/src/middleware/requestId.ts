import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const existingId = (req.headers['x-request-id'] as string) || uuid();
  req.id = existingId;
  res.setHeader('x-request-id', existingId);
  next();
};
