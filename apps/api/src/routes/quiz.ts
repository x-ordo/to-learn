import { Router } from 'express';
import { QuizRequestSchema } from '@to-learn/contracts';
import { asyncHandler } from '../utils/asyncHandler';
import { respondWithZodError } from '../utils/validation';
import { generateQuiz } from '../services/workflows';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = QuizRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondWithZodError(res, parsed.error);
    }

    const quiz = await generateQuiz(parsed.data);
    res.json(quiz);
  })
);

export const quizRouter = router;
