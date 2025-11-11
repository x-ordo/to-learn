import { Router } from 'express';
import {
  RecommendProvider,
  RecommendProviderEnum,
  RecommendRequestSchema
} from '@to-learn/contracts';
import { asyncHandler } from '../utils/asyncHandler';
import { respondWithZodError } from '../utils/validation';
import { ApiError } from '../middleware/errorHandler';
import { validateLinkReachable } from '../services/linkValidator';
import { searchTavily } from '../services/tavilyClient';
import { searchDart } from '../services/dartClient';
import { searchKifEdu } from '../services/kifEduClient';
import {
  applyVerificationResults,
  buildReasonsWithLLM,
  dedupeRecommendations,
  sortRecommendations,
  type ProviderRecommendation
} from '../services/postprocess';
import { config } from '../env';

const router = Router();

type ProviderHandler = (params: { query: string; limit: number }) => Promise<ProviderRecommendation[]>;

const providerHandlers: Record<RecommendProvider, ProviderHandler> = {
  tavily: ({ query, limit }) => searchTavily({ query, limit }),
  dart: ({ query, limit }) => searchDart({ query, limit }),
  kif_edu: ({ query, limit }) => searchKifEdu({ query, limit })
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = RecommendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return respondWithZodError(res, parsed.error);
    }

    const { topic, keywords, limit = 3, providers } = parsed.data;
    const query = buildQuery(topic, keywords);
    const context = topic ?? keywords?.join(', ') ?? '금융 학습';

    const enabledProviders = resolveProviders(providers);
    if (!enabledProviders.length) {
      throw new ApiError(
        400,
        'RECOMMEND_PROVIDER_MISSING',
        '사용 가능한 자료 소스가 없습니다. 환경변수를 확인해주세요.'
      );
    }

    const rawResults = await collectProviderResults(enabledProviders, {
      query,
      limit: Math.max(limit * 3, 6)
    });

    if (!rawResults.length) {
      throw new ApiError(502, 'RECOMMENDATION_EMPTY', '자료 소스에서 검색 결과를 찾지 못했습니다.');
    }

    const deduped = dedupeRecommendations(rawResults);
    const verificationTargets = deduped.slice(0, limit * 4);
    const verificationEntries = await Promise.all(
      verificationTargets.map(async (item) => [item.link, await validateLinkReachable(item.link)] as const)
    );
    const verificationMap = Object.fromEntries(verificationEntries);
    const verified = applyVerificationResults(deduped, verificationMap);
    const sorted = sortRecommendations(verified);
    const selected = sorted.slice(0, limit);

    if (!selected.length) {
      throw new ApiError(502, 'RECOMMENDATION_EMPTY', '검증을 통과한 자료가 없습니다.');
    }

    const enriched = await buildReasonsWithLLM(selected, context);
    res.json({
      items: enriched.map((item) => ({
        source: item.source,
        title: item.title,
        description: item.description,
        link: item.link,
        reason: item.reason ?? item.description,
        verified: Boolean(item.verified),
        meta: item.meta
      }))
    });
  })
);

const buildQuery = (topic?: string, keywords?: string[]) => {
  const parts: string[] = [];
  if (topic) {
    parts.push(topic);
  }
  if (keywords?.length) {
    parts.push(keywords.join(' '));
  }
  return parts.join(' ').trim();
};

const collectProviderResults = async (
  providers: RecommendProvider[],
  params: { query: string; limit: number }
): Promise<ProviderRecommendation[]> => {
  const settled = await Promise.allSettled(
    providers.map((provider) => providerHandlers[provider](params))
  );

  return settled.flatMap((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    console.warn(`[recommend] Provider ${providers[index]} failed`, result.reason);
    return [];
  });
};

const resolveProviders = (requested?: RecommendProvider[]): RecommendProvider[] => {
  const available: RecommendProvider[] = RecommendProviderEnum.options.filter(isProviderConfigured);
  if (requested?.length) {
    return requested.filter((provider) => isProviderConfigured(provider));
  }
  return available;
};

const isProviderConfigured = (provider: RecommendProvider) => {
  if (provider === 'tavily') {
    return Boolean(config.tavilyApiKey);
  }
  if (provider === 'dart') {
    return Boolean(config.dartApiKey);
  }
  if (provider === 'kif_edu') {
    return Boolean(config.kifEduApiKey);
  }
  return false;
};

export const recommendRouter = router;
