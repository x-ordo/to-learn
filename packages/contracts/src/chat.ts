import { z } from 'zod';

// 공용 계약(Contracts) — 프론트/백/워크플로우(n8n) 모두가 공유하는 타입과 스키마입니다.
// 이 파일은 "진실의 근원"(single source of truth) 역할을 하며,
// - Zod 스키마(런타임 입력 검증)
// - 타입 정의(정적 타입 안정성)
// 를 동시에 제공합니다.

// 메시지 발화 주체. system은 시스템 지침(프롬프트) 등 내부 용도로 확장 여지를 둡니다.
export type ChatRole = 'user' | 'assistant' | 'system';

// 난이도/카테고리는 고정 Enum으로 정의하여 프론트 UI 선택지, 백엔드 저장/검증, 문서화가 일치하도록 유지합니다.
export const DifficultyEnum = z.enum(['하', '중', '상']);
export type Difficulty = z.infer<typeof DifficultyEnum>;

export const CategoryEnum = z.enum(['금융경제용어', '재무제표']);
export type Category = z.infer<typeof CategoryEnum>;

// 메타데이터는 학습 세션의 맥락(출처, 주제, 모델, 난이도, 카테고리 등)을 전달합니다.
// 선택적 필드로 정의하여 점진적으로 확장할 수 있습니다.
export const ChatMetadataSchema = z
  .object({
    source: z.string().optional(), // 호출 출처(예: next-web, library 등)
    topic: z.string().optional(), // 주제(예: DCF, PF 대출 등)
    model: z.string().optional(), // 프론트에서 선택한 가상 모델명(서버에서 실제 모델로 매핑)
    difficulty: DifficultyEnum.optional(),
    category: CategoryEnum.optional()
  })
  .optional();

// 챗봇 요청의 표준 형태입니다. message는 필수이며,
// conversationId가 없으면 서버가 새 대화를 생성합니다.
export const ChatRequestSchema = z.object({
  conversationId: z.string().min(1).optional(),
  message: z.string().trim().min(1, 'message is required'),
  metadata: ChatMetadataSchema
});

export type ChatRequestBody = z.infer<typeof ChatRequestSchema>;
export type ChatMetadata = NonNullable<ChatRequestBody['metadata']>;
export type ChatRequestPayload = ChatRequestBody;

// 서버/워크플로우가 반환하는 메시지 단위입니다.
export interface ChatMessage {
  id: string; // 서버가 부여하는 고유 ID
  role: ChatRole; // user/assistant
  content: string; // 본문 텍스트
  createdAt: string; // ISO 타임스탬프
}

// 추천 프롬프트. 프론트에서 버튼으로 노출하여 빠르게 학습을 시작하도록 돕습니다.
export interface ChatSuggestion {
  id: string;
  label: string;
  prompt: string;
  category?: Category; // 추천이 속하는 카테고리(선택)
  weight?: number; // 정렬 가중치(큰 값 우선)
}

// 표준 응답 포맷. 대화 ID와 새로 생성된 assistant 메시지를 포함합니다.
export interface ChatResponse {
  conversationId: string;
  messages: ChatMessage[];
  suggestions?: ChatSuggestion[]; // 후속 추천(있을 경우)
}

// 내부 제공자 간 공통 반환 포맷(타입 동일). 용도 구분을 위해 별칭을 유지합니다.
export interface ChatProviderResult {
  conversationId: string;
  messages: ChatMessage[];
  suggestions?: ChatSuggestion[];
}
