import { Router } from 'express';
import { CategoryEnum } from '../types';
import { getSuggestionsForCategory } from '../services/suggestions';

/**
 * 추천 프롬프트 API
 * ----------------
 * 선택적인 category 쿼리 파라미터를 검증한 뒤
 * SQLite에 저장된 상위 추천 또는 폴백 추천을 반환합니다.
 */
const router = Router();

router.get('/', (req, res) => {
  const categoryQuery = typeof req.query.category === 'string' ? req.query.category : undefined;
  const parsed = categoryQuery ? CategoryEnum.safeParse(categoryQuery) : undefined;
  const category = parsed?.success ? parsed.data : undefined;

  res.json({ suggestions: getSuggestionsForCategory(category) });
});

export const suggestionsRouter = router;
