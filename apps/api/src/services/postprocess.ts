import type { RecommendProvider } from '@to-learn/contracts';
import { ApiError } from '../middleware/errorHandler';
import { config } from '../env';
import { createChatCompletion } from './openai';

export interface ProviderRecommendation {
  source: RecommendProvider;
  title: string;
  description: string;
  link: string;
  score?: number;
  publishedAt?: string;
  meta?: Record<string, unknown>;
  verified?: boolean;
  reason?: string;
}

/**
 * 중복 제거 — 제목 + 링크 조합으로 고유 키를 생성합니다.
 */
export const dedupeRecommendations = (items: ProviderRecommendation[]): ProviderRecommendation[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}:${item.link}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/**
 * 최신순/점수 기반 정렬. 우선순위: 검증 통과 → 점수(desc) → 게시일(desc).
 */
export const sortRecommendations = (items: ProviderRecommendation[]): ProviderRecommendation[] => {
  return [...items].sort((a, b) => {
    const verifiedWeight = Number(b.verified ?? false) - Number(a.verified ?? false);
    if (verifiedWeight !== 0) {
      return verifiedWeight;
    }
    const scoreWeight = (b.score ?? 0) - (a.score ?? 0);
    if (scoreWeight !== 0) {
      return scoreWeight;
    }
    const dateA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const dateB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return dateB - dateA;
  });
};

/**
 * 링크 접근성 검사 결과를 반영합니다.
 */
export const applyVerificationResults = (
  items: ProviderRecommendation[],
  verifications: Record<string, boolean>
): ProviderRecommendation[] => {
  return items.map((item) => ({
    ...item,
    verified: verifications[item.link] ?? item.verified ?? false
  }));
};

/**
 * OpenAI를 통해 추천 근거를 자동 생성합니다.
 * OpenAI 모드가 아닐 경우 기존 설명을 기반으로 간단한 reason을 반환합니다.
 */
export const buildReasonsWithLLM = async (
  items: ProviderRecommendation[],
  context: string
): Promise<ProviderRecommendation[]> => {
  if (!items.length) {
    return items;
  }

  if (config.chatProvider !== 'openai') {
    return items.map((item) => ({
      ...item,
      reason: item.reason ?? fallbackReason(item, context)
    }));
  }

  try {
    const payload = items.map((item) => ({
      link: item.link,
      source: item.source,
      title: item.title,
      description: item.description
    }));

    const completion = await createChatCompletion({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            '당신은 금융 학습 추천 엔진입니다. 각 자료가 왜 학습자에게 도움이 되는지 한국어로 2문장 이하 rationale을 제공합니다. JSON만 출력하세요.'
        },
        {
          role: 'user',
          content: `CONTEXT: ${context || '금융 학습'}\nITEMS: ${JSON.stringify(payload)}\n\nRespond with {"items":[{"link":"","reason":""},...]}.`
        }
      ]
    });

    const content = extractJson(completion.choices[0]?.message?.content);
    const parsed = (content as { items?: Array<{ link: string; reason: string }> })?.items ?? [];
    const reasonMap = new Map(parsed.map((item) => [item.link, item.reason.trim()]));

    return items.map((item) => ({
      ...item,
      reason: reasonMap.get(item.link) || item.reason || fallbackReason(item, context)
    }));
  } catch (error) {
    console.warn('[recommend] Failed to build LLM reasons', error);
    return items.map((item) => ({
      ...item,
      reason: item.reason ?? fallbackReason(item, context)
    }));
  }
};

const fallbackReason = (item: ProviderRecommendation, context: string) => {
  if (context) {
    return `${context}와 직접적으로 연관된 최신 자료입니다: ${item.description}`;
  }
  return `학습에 참고할 만한 자료입니다: ${item.description}`;
};

const extractJson = (content: string | Array<{ text?: string }> | null | undefined) => {
  const raw =
    typeof content === 'string'
      ? content
      : (content ?? []).map((part) => part?.text ?? '').join('');

  const match = raw.match(/```json([\s\S]*?)```/i);
  const target = match ? match[1] : raw;
  const start = target.indexOf('{');
  const end = target.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new ApiError(502, 'RECOMMEND_REASON_PARSE_ERROR', 'LLM 응답에서 JSON을 찾을 수 없습니다.');
  }
  return JSON.parse(target.slice(start, end + 1));
};
