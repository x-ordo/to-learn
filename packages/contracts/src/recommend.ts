import { z } from 'zod';

/**
 * Recommendation Workflow Contracts
 * ---------------------------------
 * 외부 검색 + 검증된 링크를 종합해 학습 자료를 제안할 때 사용하는 규격입니다.
 */
export const RecommendProviderEnum = z.enum(['tavily', 'dart', 'kif_edu']);
export type RecommendProvider = z.infer<typeof RecommendProviderEnum>;

export const RecommendRequestSchema = z
  .object({
    topic: z.string().trim().min(1).optional(),
    keywords: z.array(z.string().trim().min(1)).min(1).max(8).optional(),
    limit: z.number().int().min(1).max(5).default(3).optional(),
    providers: z.array(RecommendProviderEnum).min(1).optional()
  })
  .refine((data) => Boolean(data.topic) || Boolean(data.keywords?.length), {
    message: 'Provide at least a topic or one keyword.',
    path: ['topic']
  });

export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;

export const RecommendItemSchema = z.object({
  source: RecommendProviderEnum,
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  link: z.string().url(),
  reason: z.string().trim().min(1),
  verified: z.boolean(),
  meta: z.record(z.string(), z.unknown()).optional()
});

export type RecommendItem = z.infer<typeof RecommendItemSchema>;

export const RecommendResponseSchema = z.object({
  items: z.array(RecommendItemSchema).min(1)
});

export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;
