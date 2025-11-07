import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { config } from '../env';

// OpenAI SDK 래퍼. n8n 모드에서는 초기화되지 않도록 지연 생성(lazy init)합니다.
let openai: OpenAI | null = null;

const getClient = () => {
  if (!config.openAiApiKey) {
    // n8n 모드에서는 API 키가 없을 수 있으므로 여기에서 명확한 에러를 던집니다.
    throw new Error('OPENAI_API_KEY is not configured');
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openAiApiKey });
  }
  return openai;
};

// 프론트에서 전달된 가상 모델명을 실제 OpenAI 모델명으로 매핑합니다.
const MODEL_MAP: Record<string, string> = {
  'openai-gpt-4o-mini': 'gpt-4o-mini',
  'openai-gpt-4o': 'gpt-4o',
  'openai-gpt-4.1-mini': 'gpt-4.1-mini'
};

const DEFAULT_MODEL = 'gpt-4o-mini';

export const resolveModel = (requested?: string): string => {
  if (!requested) {
    return DEFAULT_MODEL;
  }
  return MODEL_MAP[requested] ?? requested;
};

// 비스트리밍 응답 생성
export const createChatCompletion = async (params: {
  model?: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  signal?: AbortSignal;
}) => {
  return getClient().chat.completions.create(
    {
      model: resolveModel(params.model),
      temperature: params.temperature ?? 0.3,
      messages: params.messages
    },
    params.signal ? { signal: params.signal } : undefined
  );
};

// 스트리밍(SSE) 응답 생성
export const createChatCompletionStream = async (params: {
  model?: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  signal?: AbortSignal;
}) => {
  return getClient().chat.completions.create(
    {
      model: resolveModel(params.model),
      temperature: params.temperature ?? 0.3,
      stream: true,
      messages: params.messages
    },
    params.signal ? { signal: params.signal } : undefined
  );
};
