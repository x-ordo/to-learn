import {
  ChatMessage,
  ChatRequestPayload,
  ChatResponse,
  ChatSuggestion
} from '@to-learn/contracts';

// 프론트엔드에서 백엔드 챗봇 API를 호출하는 얇은 클라이언트입니다.
// - 기본 경로는 NEXT_PUBLIC_CHAT_API_URL (미설정 시 /api/chat)
// - 서버 미가동/네트워크 오류 시 임시(Mock) 응답을 반환하여 UX를 유지합니다.

// API 기본 주소 — 환경변수가 없으면 Next.js API Route(`/api/chat`)로 프록시
const API_URL =
  process.env.NEXT_PUBLIC_CHAT_API_URL && process.env.NEXT_PUBLIC_CHAT_API_URL.length > 0
    ? process.env.NEXT_PUBLIC_CHAT_API_URL
    : '/api/chat';

const deriveBaseUrl = (chatUrl: string) => {
  const normalized = chatUrl.replace(/\/chat(?:\/.*)?$/i, '');
  if (!normalized || normalized === '') {
    return '/api';
  }
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

export const API_BASE_URL = deriveBaseUrl(API_URL);

const fallbackSuggestions: ChatSuggestion[] = [
  {
    id: 'suggest-risk',
    label: '리스크 관리 연습',
    prompt: 'PF 대출 리스크를 분석할 때 핵심 체크리스트를 알려줘.'
  },
  {
    id: 'suggest-valuation',
    label: '기업 가치평가',
    prompt: 'DCF 모델 핵심 가정과 주의할 점을 요약해줘.'
  },
  {
    id: 'suggest-cert',
    label: '자격증 대비',
    prompt: 'AFPK 실전 대비 문제 하나 내줘.'
  }
];

/**
 * 백엔드 챗봇 API 호출
 * -------------------
 * - 성공 시 서버 응답을 그대로 반환하고
 * - 네트워크/서버 오류 시 안전한 Mock 응답을 생성해 UI를 유지합니다.
 */
export async function sendChatMessage(payload: ChatRequestPayload): Promise<ChatResponse> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Chat API responded with ${response.status}`);
    }

    const data = (await response.json()) as ChatResponse;
    return data;
  } catch (error) {
    return buildMockResponse(payload);
  }
}

// 서버가 준비되지 않았을 때를 대비한 임시 응답 빌더
function buildMockResponse(payload: ChatRequestPayload): ChatResponse {
  const assistantMessage: ChatMessage = {
    id: createId(),
    role: 'assistant',
    createdAt: new Date().toISOString(),
    content: createMockContent(payload.message)
  };

  return {
    conversationId: payload.conversationId ?? 'mock-conversation',
    messages: [assistantMessage],
    suggestions: fallbackSuggestions
  };
}

// 초기 추천 프롬프트(서버 미연결 시 사용)
export function getDefaultSuggestions(): ChatSuggestion[] {
  return fallbackSuggestions;
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

// 사용자의 마지막 메시지에 따라 자연스러운 예시 응답을 만들어줍니다.
function createMockContent(message: string) {
  const lowered = message.toLowerCase();

  if (lowered.includes('리스크') || lowered.includes('risk')) {
    return [
      '리스크 관리를 위해서는 ① 익스포저 파악, ② 스트레스 시나리오 적용, ③ 완충 자본 점검 순으로 접근해보세요.',
      '',
      '- 익스포저: 상품별 한도와 집중도를 확인합니다.',
      '- 스트레스: 금리·환율 각각 200bp 변동을 가정해 손실을 추정합니다.',
      '- 완충 자본: 손실 발생 시 필요한 최소 자본과 대비책을 챗봇에게 다시 물어보세요.'
    ].join('\n');
  }

  if (lowered.includes('가치') || lowered.includes('valuation') || lowered.includes('dcf')) {
    return [
      'DCF 모델을 만들 때는 현금흐름 추정과 할인율 가정이 핵심입니다.',
      '',
      '1) FCF 추정: 매출 성장률과 마진을 보수적으로 가정하고, 운전자본 변동도 함께 고려하세요.',
      '2) 할인율: WACC 계산 시 무위험 이자율과 시장위험 프리미엄을 최신 값으로 업데이트합니다.',
      '3) 검증: 상대가치(멀티플)와 비교해 괴리가 크다면 가정을 다시 점검해보세요.'
    ].join('\n');
  }

  if (lowered.includes('afpk') || lowered.includes('자격증') || lowered.includes('문제')) {
    return [
      'AFPK 기출 유형 문제:',
      '“고객이 거치식 펀드에 1,000만 원을 투자했고 연 4% 수익률을 기록했습니다. 세후 수령액을 계산해보세요.”',
      '',
      '풀이 가이드',
      '- 배당소득세율 15.4%를 적용합니다.',
      '- 수익: 1,000만 원 × 4% = 40만 원',
      '- 세금: 40만 원 × 15.4% = 61,600원',
      '- 세후 수령액: 10,000,000 + 400,000 - 61,600 = 10,338,400원'
    ].join('\n');
  }

  return [
    '질문 감사합니다! 정확한 답변을 위해 Express 챗봇 서버와 연결하면 더 풍부한 자료를 활용할 수 있습니다.',
    '',
    '임시 가이드:',
    '- 학습 목표, 관심 분야, 현재 수준을 알려주시면 맞춤형 문제를 추천할 수 있어요.',
    '- `리스크 관리 연습`이나 `자격증 대비` 같은 추천 버튼을 눌러 빠르게 시작해보세요.',
    '- 챗봇 서버가 준비되면 실시간으로 대화가 이어집니다.'
  ].join('\n');
}
