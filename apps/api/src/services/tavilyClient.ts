import { fetch } from 'undici';
import type { ProviderRecommendation } from './postprocess';
import { config } from '../env';
import { ApiError } from '../middleware/errorHandler';

interface TavilySearchResponse {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
    published_date?: string;
  }>;
}

export const searchTavily = async (params: {
  query: string;
  limit: number;
}): Promise<ProviderRecommendation[]> => {
  if (!config.tavilyApiKey) {
    return [];
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query: params.query,
      max_results: Math.max(params.limit, 5),
      search_depth: 'advanced',
      include_images: false,
      include_answer: false
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, 'TAVILY_HTTP_ERROR', body || 'Tavily API error');
  }

  const payload = (await response.json()) as TavilySearchResponse;
  const results = payload.results ?? [];
  return results.slice(0, params.limit).flatMap((item) => {
    if (!item.title || !item.url || !item.content) {
      return [];
    }
    return [
      {
        source: 'tavily' as const,
        title: item.title,
        description: item.content,
        link: item.url,
        score: item.score,
        publishedAt: item.published_date,
        meta: {
          publishedAt: item.published_date
        }
      }
    ];
  });
};
