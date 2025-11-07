import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/_health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

