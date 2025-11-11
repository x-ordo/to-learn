import {
  QnaRequest,
  QnaResponse,
  QnaResponseSchema,
  QuizRequest,
  QuizResponse,
  QuizResponseSchema,
  SummaryRequest,
  SummaryResponse,
  SummaryResponseSchema
} from '@to-learn/contracts';
import { z } from 'zod';
import { config } from '../env';
import { ApiError } from '../middleware/errorHandler';
import { createChatCompletion } from './openai';

type JsonSchema<T> = z.ZodType<T>;

const MAX_INPUT_CHARS = 8000;

export const generateSummary = async (payload: SummaryRequest): Promise<SummaryResponse> => {
  const maxLines = Math.min(payload.maxSentences ?? 5, 5);
  const systemPrompt = [
    '당신은 금융/교육 문서를 요약하는 비서를 연기합니다.',
    '반드시 아래 JSON 형식으로만 응답하세요: {"summary":["요약1","요약2",...]}',
    '각 요약 문장은 30자 내외 한국어 문장으로 작성하고, 중복 정보를 피하세요.',
    `요약 문장은 최대 ${maxLines}개를 넘지 마세요.`,
    'JSON 이외의 텍스트, 마크다운, 불릿을 출력하지 마세요.'
  ].join(' ');

  const userPrompt = [
    `MAX_LINES: ${maxLines}`,
    'TEXT:',
    truncateText(payload.text)
  ].join('\n');

  return callStructuredLlm({
    schema: SummaryResponseSchema,
    systemPrompt,
    userPrompt,
    errorCode: 'SUMMARY_PARSE_ERROR'
  });
};

export const generateQna = async (payload: QnaRequest): Promise<QnaResponse> => {
  const count = payload.count ?? 3;
  const systemPrompt = [
    '당신은 강의 내용을 학습자가 확인할 수 있도록 질의응답을 작성합니다.',
    '반드시 {"items":[{"q":"","a":""},...]} 형태의 JSON으로만 답하세요.',
    `${count}개의 항목을 생성하고, 질문과 답변 모두 한국어로 작성합니다.`,
    '질문은 하나의 사실 또는 개념만 다루고, 답변은 2~3문장으로 명확히 설명하세요.',
    'JSON 외의 텍스트를 출력하지 마세요.'
  ].join(' ');

  const source = payload.summary?.length ? payload.summary.join('\n') : truncateText(payload.text ?? '');

  const userPrompt = [
    `COUNT: ${count}`,
    'SOURCE:',
    source
  ].join('\n');

  return callStructuredLlm({
    schema: QnaResponseSchema,
    systemPrompt,
    userPrompt,
    errorCode: 'QNA_PARSE_ERROR'
  });
};

export const generateQuiz = async (payload: QuizRequest): Promise<QuizResponse> => {
  const count = payload.count;
  const typeLabel = payload.type === 'objective' ? '객관식 (4지선다 최소 3지선다 가능)' : '주관식 단답형';

  const systemPrompt = [
    '당신은 금융 학습 코치를 돕는 문제 생성기입니다.',
    '반드시 {"problems":[{"type":"","question":"","choices":[],"answer":"","explanation":""},...]} JSON으로만 답하세요.',
    `${count}개의 문제를 생성하고 type 필드는 요청된 문제 형식을 그대로 사용하세요.`,
    '모든 텍스트는 한국어이며, explanation 필드에는 정답 근거를 1~2문장으로 제공합니다.',
    '객관식일 경우 choices 배열에 3~5개의 보기를 넣고, 정답과 해설이 일치하도록 작성하세요.',
    'JSON 외의 텍스트를 출력하지 마세요.'
  ].join(' ');

  const userPrompt = [
    `QUESTION_TYPE: ${typeLabel}`,
    `COUNT: ${count}`,
    'SOURCE:',
    truncateText(payload.text)
  ].join('\n');

  return callStructuredLlm({
    schema: QuizResponseSchema,
    systemPrompt,
    userPrompt,
    errorCode: 'QUIZ_PARSE_ERROR'
  });
};

interface StructuredLlmParams<T> {
  schema: JsonSchema<T>;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  errorCode: string;
}

const callStructuredLlm = async <T>({
  schema,
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  errorCode
}: StructuredLlmParams<T>): Promise<T> => {
  ensureOpenAiProvider();

  try {
    const completion = await createChatCompletion({
      model: 'gpt-4o-mini',
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    const rawContent = extractContent(completion.choices[0]?.message?.content);

    if (!rawContent) {
      throw new ApiError(502, errorCode, 'LLM 응답이 비어 있습니다.');
    }

    const jsonPayload = parseJsonBlock(rawContent);
    return schema.parse(jsonPayload);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(502, errorCode, 'LLM 응답을 파싱하는 중 오류가 발생했습니다.', error);
  }
};

const ensureOpenAiProvider = () => {
  if (config.chatProvider !== 'openai') {
    throw new ApiError(
      400,
      'PROVIDER_NOT_SUPPORTED',
      '요약/Q&A/퀴즈 엔드포인트는 OpenAI 모드에서만 지원됩니다.'
    );
  }
};

const extractContent = (
  content: string | null | Array<{ type?: string; text?: string }> | undefined
): string => {
  if (!content) {
    return '';
  }

  if (typeof content === 'string') {
    return content.trim();
  }

  return content
    .map((part) => part?.text ?? '')
    .join('')
    .trim();
};

const parseJsonBlock = (raw: string) => {
  const fenced = raw.match(/```json([\s\S]*?)```/i);
  const target = fenced ? fenced[1] : raw;
  const firstBrace = target.indexOf('{');
  const lastBrace = target.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error('JSON block not found.');
  }

  const jsonString = target.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonString);
};

const truncateText = (text?: string): string => {
  if (!text) {
    return '';
  }
  if (text.length <= MAX_INPUT_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_INPUT_CHARS)}\n...[truncated]`;
};
