import { NextFunction, Request, Response } from 'express';

/**
 * 커스텀 ApiError
 * ---------------
 * HTTP 상태코드, 식별 가능한 에러 코드, 세부 정보를 함께 보관하여
 * 클라이언트가 에러 유형을 손쉽게 분류할 수 있도록 돕습니다.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * 전역 에러 핸들러
 * ----------------
 * Express 라우터 어디에서든 throw된 에러를 JSON 응답으로 정규화합니다.
 * - 5xx 에러는 서버 로그에 남기고, request-id를 함께 출력해 추적성을 확보합니다.
 * - 민감 정보는 details에 전달하지 않고, 필요한 경우 추가 컨텍스트만 제공합니다.
 */
export const errorHandler = (err: Error | ApiError, req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof ApiError ? err.status : 500;
  const code = err instanceof ApiError ? err.code : 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'Unexpected error';

  if (status >= 500) {
    console.error(`[${req.id ?? 'n/a'}]`, err);
  }

  res.status(status).json({
    error: {
      code,
      message,
      details: err instanceof ApiError ? err.details : undefined
    }
  });
};
