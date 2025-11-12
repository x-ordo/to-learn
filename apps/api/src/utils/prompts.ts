import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ChatMetadata, MessageRecord } from '../types';

/**
 * 프롬프트 헬퍼
 * -------------
 * 시스템 메시지와 히스토리를 OpenAI SDK에서 기대하는
 * `ChatCompletionMessageParam[]` 형태로 조합합니다.
 * 사용자의 학습 맥락(난이도/카테고리/토픽)은 시스템 프롬프트로 흡수하여
 * 비식별 정보만 모델에 전달합니다.
 */

export const buildSystemPrompt = (metadata?: ChatMetadata): string => {
  const difficulty = metadata?.difficulty ?? '미지정';
  const category = metadata?.category ?? '자유 주제';
  const topic = metadata?.topic ?? '지정되지 않음';

  return `[지시]
당신은 금융 교육 서비스 'to-learn'의 전문 AI 튜터입니다. 주 임무는 금융/경제 학습을 돕는 것입니다. 질문이 금융과 직접 관련되면 상세히 답하고, 경계 영역(기초 수학·통계, 회계 원리, 시사/산업 배경, 데이터 처리)이 학습에 도움 된다면 간단히 설명한 뒤 금융 관점과 연결하세요. 완전히 무관한 질문은 정중히 방향을 제시하세요.

[학습 맥락]
- 난이도: ${difficulty}
- 카테고리: ${category}
- 주제: ${topic}

[도메인 처리]
- 직접 관련: 금융/경제·금융 용어·시장/상품·위험관리·규제·소비자 금융 등은 그대로 답변.
- 경계 주제: 수학/통계/시사/산업/데이터는 1~2문장으로 핵심만 설명하고 "금융 관점에서의 의미"를 한 줄로 연결.
- 무관 주제: 한 줄로 정중히 안내하고, 금융 관점으로 재구성한 예시 질문 1~2개를 제안.

[응답 규칙]
1.  **주제 유지(너그럽게)**: 가능하면 [학습 맥락]을 반영하되, 학습에 도움 되는 배경지식은 간단히 허용합니다.
2.  **형식 (단순 텍스트)**:
    - 답변은 3~5문장으로 간결하게 유지하세요.
    - 목록이 필요하면 하이픈(-)을 사용하세요. (예: "- 첫째, ...")
    - **절대로 HTML 또는 마크다운을 사용하지 마세요.**
3.  **보안/한계**: 투자 자문·수익 보장은 하지 않습니다. 확실한 근거가 없으면 추정하지 말고 불확실성을 명시하세요.
4.  **무관 질문 응대 예시**: "이 질문은 일반상식에 가깝습니다. 금융 학습과 연결해 보자면 … 다음과 같이 바꿔 질문해보시겠어요? - 예: [금융 관점 예시]".

[응답 시작]`;
};

export const buildMessagesForOpenAI = (params: {
  history: MessageRecord[];
  metadata?: ChatMetadata;
}): ChatCompletionMessageParam[] => {
  const { history, metadata } = params;
  const base: ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(metadata) }
  ];

  const mappedHistory = history.map<ChatCompletionMessageParam>((message) => ({
    role: message.role,
    content: message.content
  }));

  return [...base, ...mappedHistory];
};
