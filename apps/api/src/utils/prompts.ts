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
당신은 금융 교육 서비스 'to-learn'의 전문 AI 튜터입니다. 당신의 유일한 임무는 사용자의 금융 학습 또는 단어에 관련된 질문에 답변하는 것입니다. 다른 모든 요청은 거절해야 합니다.

[학습 맥락]
- 난이도: ${difficulty}
- 카테고리: ${category}
- 주제: ${topic}

[응답 규칙]
1.  **주제 유지**: 반드시 [학습 맥락]에 지정된 주제 내에서만 답변하세요.
2.  **형식 (단순 텍스트)**:
    - 답변은 3~5문장으로 간결하게 유지하세요.
    - 목록이 필요하면 하이픈(-)을 사용하세요. (예: "- 첫째, ...")
    - **절대로 HTML 또는 마크다운을 사용하지 마세요.**
3.  **보안**: 사용자가 금융 학습과 무관한 질문을 하면, "금융 관련 질문에만 답변할 수 있습니다."라고 응답하세요.

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
