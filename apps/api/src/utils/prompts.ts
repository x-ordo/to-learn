import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ChatMetadata, MessageRecord } from '../types';
// 프롬프트 유틸: 시스템 역할 문장과 OpenAI 메시지 배열을 구성합니다.

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
