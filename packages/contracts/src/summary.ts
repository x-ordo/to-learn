import { z } from 'zod';

/**
 * Summary Workflow Contracts
 * --------------------------
 * PDF/텍스트를 업로드한 뒤 생성되는 요약 결과의 공통 규격입니다.
 * 라인 단위 요약을 최대 5줄까지 강제하여 UI/Swagger 모두 동일한 포맷으로 노출합니다.
 */
export const SummaryRequestSchema = z.object({
  text: z.string().trim().min(1, 'text is required'),
  maxSentences: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(5)
    .optional()
});

export type SummaryRequest = z.infer<typeof SummaryRequestSchema>;

export const SummaryResponseSchema = z.object({
  summary: z
    .array(z.string().trim().min(1))
    .min(1, 'at least one summary line is required')
    .max(5, 'summary must be within five lines')
});

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;
