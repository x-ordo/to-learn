import 'express';

/**
 * Express 타입 보강
 * ------------------
 * requestId 미들웨어가 주입하는 `req.id`를 TypeScript에서 인식하도록 확장합니다.
 */
declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
  }
}
