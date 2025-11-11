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
  const difficulty = metadata?.difficulty ? `난이도는 ${metadata.difficulty} 수준` : '난이도는 미정';
  const category = metadata?.category ? `카테고리는 ${metadata.category}` : '카테고리는 자유 주제';
  const topic = metadata?.topic ? `사용자 토픽: ${metadata.topic}.` : '';

  return `당신은 금융 교육 서비스 to-learn의 전문 튜터입니다. ${difficulty}, ${category}입니다. ${
    topic || '사용자 니즈를 파악해 단계적으로 설명하세요.'
  } 친절하고 간결하게 한국어로 답하고, 필요한 경우 예시와 요약을 제공합니다.`;
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
