import type { Category, ChatMetadata, ChatRequestBody, Difficulty } from '@to-learn/contracts';

export {
  CategoryEnum,
  ChatMetadataSchema,
  ChatRequestSchema,
  DifficultyEnum
} from '@to-learn/contracts';
export type { Category, ChatMetadata, ChatRequestBody, Difficulty } from '@to-learn/contracts';

/**
 * DB에 저장되는 대화 레코드 형태.
 * 모델/난이도/카테고리/출처는 선택 필드로 두어 점진적 확장을 지원합니다.
 */
export interface ConversationRecord {
  id: string;
  createdAt: string;
  model?: string | null;
  difficulty?: Difficulty | null;
  category?: Category | null;
  source?: string | null;
  topic?: string | null;
}

/**
 * 단일 메시지 레코드. server.ts → db.ts → routes 간에 공유합니다.
 */
export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

/**
 * 추천 프롬프트 레코드. 가중치(weight)가 클수록 먼저 노출됩니다.
 */
export interface SuggestionRecord {
  id: string;
  label: string;
  prompt: string;
  category?: Category | null;
  weight: number;
}
