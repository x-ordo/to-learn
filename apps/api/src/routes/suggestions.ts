import { Router } from 'express';
import { CategoryEnum } from '../types';
import { getSuggestionsForCategory } from '../services/suggestions';
// 추천 프롬프트 목록 API. 카테고리 쿼리를 검증하여 상위 추천을 반환합니다.

const router = Router();

router.get('/', (req, res) => {
  const categoryQuery = typeof req.query.category === 'string' ? req.query.category : undefined;
  const parsed = categoryQuery ? CategoryEnum.safeParse(categoryQuery) : undefined;
  const category = parsed?.success ? parsed.data : undefined;

  res.json({ suggestions: getSuggestionsForCategory(category) });
});

export const suggestionsRouter = router;
