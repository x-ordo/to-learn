import { Router } from 'express';

/**
 * 헬스 체크 라우터
 * ----------------
 * 오케스트레이터(Render 등)에서 주기적으로 호출하여
 * 프로세스가 응답 가능한지 확인합니다.
 */
const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const healthRouter = router;
