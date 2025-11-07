import { Router } from 'express';
// 간단한 헬스 체크 엔드포인트. Render/Vercel 업타임 모니터용.

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const healthRouter = router;
