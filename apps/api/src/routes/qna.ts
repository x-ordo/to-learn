import { Router } from 'express';
import { QnaRequestSchema } from '@to-learn/contracts';
import { asyncHandler } from '../utils/asyncHandler';
import { respondWithZodError } from '../utils/validation';
import { generateQna } from '../services/workflows';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = QnaRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondWithZodError(res, parsed.error);
    }

    const qna = await generateQna(parsed.data);
    res.json(qna);
  })
);

export const qnaRouter = router;
