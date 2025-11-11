import { z } from 'zod';

/**
 * Quiz Workflow Contracts
 * -----------------------
 * 요약 결과나 원문을 바탕으로 객관식/주관식 문제를 생성하는 규격입니다.
 */
export const QuizTypeEnum = z.enum(['objective', 'subjective']);
export type QuizType = z.infer<typeof QuizTypeEnum>;

export const QuizRequestSchema = z.object({
  text: z.string().trim().min(1, 'text is required'),
  type: QuizTypeEnum.default('objective'),
  count: z.number().int().min(3).max(5).default(3)
});

export type QuizRequest = z.infer<typeof QuizRequestSchema>;

const normalizeQuizType = (value: unknown) => {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower.includes('객관') || lower === 'objective') {
      return 'objective';
    }
    if (lower.includes('주관') || lower === 'subjective') {
      return 'subjective';
    }
  }
  return value;
};

export const QuizProblemSchema = z
  .object({
    type: z.preprocess(normalizeQuizType, QuizTypeEnum),
    question: z.string().trim().min(1),
    choices: z.array(z.string().trim().min(1)).min(2).max(5).optional(),
    answer: z.string().trim().min(1),
    explanation: z.string().trim().min(1)
  })
  .superRefine((problem, ctx) => {
    if (problem.type === 'objective' && (!problem.choices || problem.choices.length < 2)) {
      ctx.addIssue({
        path: ['choices'],
        code: z.ZodIssueCode.custom,
        message: 'Objective problems require at least two choices.'
      });
    }
  });

export type QuizProblem = z.infer<typeof QuizProblemSchema>;

export const QuizResponseSchema = z.object({
  problems: z.array(QuizProblemSchema).min(1)
});

export type QuizResponse = z.infer<typeof QuizResponseSchema>;
