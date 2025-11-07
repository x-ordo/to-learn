import { NextFunction, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';

/**
 * 요청/응답 모두에 `x-request-id`를 부여하여
 * 서버 로그와 클라이언트 에러 리포트를 서로 연동할 수 있도록 합니다.
 * 클라이언트가 헤더를 제공하면 그대로 사용하고, 없다면 UUID를 생성합니다.
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const existingId = (req.headers['x-request-id'] as string) || uuid();
  req.id = existingId;
  res.setHeader('x-request-id', existingId);
  next();
};
