import { Router } from 'express';
import { getConversationWithMessages } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../middleware/errorHandler';

/**
 * Conversation Router
 * -------------------
 * 단일 대화 ID에 대한 메타데이터 + 메시지 히스토리를 반환합니다.
 * 저장소 구현(SQLite/메모리)은 db 모듈이 숨기므로 여기서는 단순히 조회만 수행합니다.
 */
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
