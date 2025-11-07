import { NextFunction, Request, Response } from 'express';

// 에러 표현용 커스텀 타입. 상태코드/에러코드/세부정보를 보존합니다.
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

// 전역 에러 핸들러 — JSON 포맷으로 일관 응답, 서버 에러는 콘솔 로깅
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
