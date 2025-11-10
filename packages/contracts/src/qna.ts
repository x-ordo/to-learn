import { z } from 'zod';

/**
 * Q&A Workflow Contracts
 * ----------------------
 * 요약 또는 원문 텍스트를 입력으로 받아 질의응답 쌍을 생성하는 규격입니다.
 */
const SummaryLineSchema = z.string().trim().min(1);

export const QnaRequestSchema = z
  .object({
    text: z.string().trim().min(1).optional(),
    summary: z
      .array(SummaryLineSchema)
      .min(1, 'summary requires at least one line')
      .max(5, 'summary must be within five lines')
      .optional(),
    count: z.number().int().min(1).max(10).default(3).optional()
  })
  .refine((data) => (data.text && data.text.length > 0) || (data.summary && data.summary.length > 0), {
    message: 'Either `text` or `summary` must be provided.',
    path: ['text']
  });

export type QnaRequest = z.infer<typeof QnaRequestSchema>;

export const QnaItemSchema = z.object({
  q: z.string().trim().min(1),
  a: z.string().trim().min(1)
});

export type QnaItem = z.infer<typeof QnaItemSchema>;

export const QnaResponseSchema = z.object({
  items: z.array(QnaItemSchema).min(1)
});

export type QnaResponse = z.infer<typeof QnaResponseSchema>;
