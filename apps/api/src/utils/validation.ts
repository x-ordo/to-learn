import { Response } from 'express';
import { ZodError } from 'zod';

/**
 * 공통 Zod 에러 응답 포맷터
 * ------------------------
 * 신규 워크플로우 API(요약/Q&A/퀴즈/추천/업로드)는 모두 JSON 계약이 고정되어 있으므로
 * 동일한 오류 응답 구조를 재사용합니다.
 */
export const respondWithZodError = (res: Response, error: ZodError) => {
  return res.status(422).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: error.issues.map((issue) => issue.message).join(', '),
      details: error.flatten()
    }
  });
};
