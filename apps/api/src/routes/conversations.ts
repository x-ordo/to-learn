import { Router } from 'express';
import { getConversationWithMessages, listConversationsByUser } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../middleware/errorHandler';

/**
 * Conversation Router
 * -------------------
 * 단일 대화 ID에 대한 메타데이터 + 메시지 히스토리를 반환합니다.
 * 저장소 구현(SQLite/메모리)은 db 모듈이 숨기므로 여기서는 단순히 조회만 수행합니다.
 */
const router = Router();

// 내 대화 목록
router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new ApiError(401, 'UNAUTHORIZED', '로그인이 필요합니다.');
    }
    const limit = Number(req.query.limit ?? 20);
    const items = listConversationsByUser(req.user.id, Math.max(1, Math.min(100, limit)));
    res.json({ items });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { conversation, messages } = getConversationWithMessages(id);

    if (!conversation) {
      throw new ApiError(404, 'NOT_FOUND', '해당 대화를 찾을 수 없습니다.');
    }
    // 소유 검증: 대화가 특정 사용자에 귀속된 경우, 본인만 접근 가능
    if (conversation.userId && (!req.user || req.user.id !== conversation.userId)) {
      throw new ApiError(403, 'FORBIDDEN', '대화에 접근할 수 없습니다.');
    }
    res.json({ conversation, messages });
  })
);

export const conversationsRouter = router;
