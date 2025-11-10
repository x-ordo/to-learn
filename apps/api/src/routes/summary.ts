import { Router } from 'express';
import { SummaryRequestSchema } from '@to-learn/contracts';
import { asyncHandler } from '../utils/asyncHandler';
import { respondWithZodError } from '../utils/validation';
import { generateSummary } from '../services/workflows';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = SummaryRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondWithZodError(res, parsed.error);
    }

    const summary = await generateSummary(parsed.data);
    res.json(summary);
  })
);

export const summaryRouter = router;
