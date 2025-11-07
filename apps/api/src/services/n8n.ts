import { fetch } from 'undici';
import type { ChatRequestBody, ChatResponse } from '@fin-one/contracts';
import { config } from '../env';
import { ApiError } from '../middleware/errorHandler';
import type { ConversationRecord, MessageRecord } from '../types';

// n8n 호출에 필요한 컨텍스트 — 요청 본문 외에 서버가 보유한 대화/히스토리도 전달합니다.
interface InvokeN8nParams {
  request: ChatRequestBody;
  conversation: ConversationRecord;
  history: MessageRecord[];
}

// 환경설정 사전검사: 필수 URL 누락 시 조기에 에러 처리
const ensureConfigured = () => {
  if (!config.n8nWebhookUrl) {
    throw new ApiError(500, 'N8N_NOT_CONFIGURED', 'n8n webhook URL is missing');
  }
};

// 권한 헤더(선택)와 JSON 컨텐트 타입 구성
const buildHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (config.n8nApiKey) {
    headers.Authorization = `Bearer ${config.n8nApiKey}`;
  }
  return headers;
};

// n8n HTTP/Webhook 호출. 요청, 대화 스냅샷, 최근 히스토리를 전송하고
// n8n은 동일한 ChatResponse 포맷으로 응답해야 합니다.
export const invokeN8nChat = async (payload: InvokeN8nParams): Promise<ChatResponse> => {
  ensureConfigured();

  const response = await fetch(config.n8nWebhookUrl!, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      request: payload.request,
      conversation: payload.conversation,
      history: payload.history
    })
  });

  // 텍스트로 먼저 받아 디버깅 편의성 확보(로그 등에 그대로 남기기 쉽습니다)
  const bodyText = await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, 'N8N_HTTP_ERROR', bodyText || 'n8n returned an error');
  }

  let data: ChatResponse;
  try {
    data = JSON.parse(bodyText) as ChatResponse;
  } catch (error) {
    throw new ApiError(502, 'N8N_PARSE_ERROR', '응답 JSON을 파싱할 수 없습니다.', error);
  }

  if (!Array.isArray(data.messages) || data.messages.length === 0) {
    throw new ApiError(502, 'N8N_EMPTY_RESPONSE', 'n8n 응답에 메시지가 없습니다.');
  }

  // 대화 ID는 서버가 관리하므로 응답의 conversationId를 강제 일치시킵니다.
  return {
    ...data,
    conversationId: payload.conversation.id
  };
};
