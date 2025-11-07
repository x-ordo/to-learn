import OpenAI from 'openai';

/**
 * OpenAI 클라이언트 헬퍼
 * ----------------------
 * 데모 서버에서도 동일한 모델 매핑/초기화 로직을 재사용합니다.
 * 환경변수에 API 키가 없으면 null을 반환해 mock 응답으로 폴백합니다.
 */
const apiKey = process.env.OPENAI_API_KEY;

export function getOpenAI() {
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export function mapModel(input?: string) {
  switch (input) {
    case 'openai-gpt-4o-mini':
      return 'gpt-4o-mini';
    case 'openai-gpt-4o':
      return 'gpt-4o';
    case 'openai-gpt-4.1-mini':
      return 'gpt-4.1-mini';
    default:
      return 'gpt-4o-mini';
  }
}
