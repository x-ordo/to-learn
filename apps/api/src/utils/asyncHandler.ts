import { NextFunction, Request, Response } from 'express';

// Express 비동기 핸들러에서 throw된 에러를 next()로 전달해
// 전역 에러 미들웨어가 처리하도록 돕는 헬퍼입니다.

export const asyncHandler = <T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  handler: T
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};
