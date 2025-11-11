import { Router } from 'express';

/**
 * 내부 헬스 체크 라우터 — Render/Vercel와 동일 포맷을 유지합니다.
 */
export const healthRouter = Router();

healthRouter.get('/_health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
