import { NextFunction, Request, Response } from 'express';

/**
 * 비동기 라우트에서 try/catch 반복을 없애기 위한 래퍼.
 * Promise가 reject되면 자동으로 `next(err)`를 호출하여
 * 전역 `errorHandler`가 일괄 처리하도록 위임합니다.
 */
export const asyncHandler = <T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  handler: T
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};
