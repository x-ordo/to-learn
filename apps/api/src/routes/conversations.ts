import { Router } from 'express';
import { getConversationWithMessages } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../middleware/errorHandler';
// 저장된 대화 스냅샷을 조회하는 라우트

const router = Router();

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { conversation, messages } = getConversationWithMessages(id);

    if (!conversation) {
      throw new ApiError(404, 'NOT_FOUND', '해당 대화를 찾을 수 없습니다.');
    }

    res.json({ conversation, messages });
  })
);

export const conversationsRouter = router;
