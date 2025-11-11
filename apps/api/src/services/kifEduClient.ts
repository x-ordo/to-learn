import { fetch } from 'undici';
import { config } from '../env';
import { ApiError } from '../middleware/errorHandler';
import type { ProviderRecommendation } from './postprocess';

interface KifEduResponse {
  data?: Array<Record<string, unknown>>;
}

const DEFAULT_DATASET = '15001075/v1/uddi:75baabad-0d5f-4484-9979-0ee45e401e33';

export const searchKifEdu = async (params: {
  query: string;
  limit: number;
}): Promise<ProviderRecommendation[]> => {
  if (!config.kifEduApiKey) {
    return [];
  }

  const dataset = config.kifEduDatasetId ?? DEFAULT_DATASET;
  const url = new URL(`https://api.odcloud.kr/api/${dataset}`);
  url.searchParams.set('page', '1');
  url.searchParams.set('perPage', String(Math.max(params.limit, 10)));
  if (params.query.trim().length > 0) {
    url.searchParams.set('cond[TITLE::LIKE]', params.query);
  }
  url.searchParams.set('serviceKey', config.kifEduApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, 'KIF_EDU_HTTP_ERROR', body || 'KIF EDU API error');
  }

  const payload = (await response.json()) as KifEduResponse;
  const rows = payload.data ?? [];
  return rows.slice(0, params.limit).flatMap((row) => {
    const title = pickField(row, ['TITLE', 'CONTENTS_NM', 'LECTURE_NM', 'SUBJECT']);
    const description = pickField(row, ['SUMMARY', 'DESCRIPTION', 'OUTLINE', 'CONTENT']) || '금융교육 자료';
    const link = pickField(row, ['URL', 'LINK', 'HOMEPAGE', 'CONTENT_URL']);

    if (!title || !link) {
      return [];
    }

    return [
      {
        source: 'kif_edu' as const,
        title: sanitize(title),
        description: sanitize(description),
        link: String(link),
        meta: row as Record<string, unknown>,
        score: 0.7
      }
    ];
  });
};

const pickField = (record: Record<string, unknown>, candidates: string[]) => {
  for (const key of candidates) {
    const value = record[key] ?? record[key.toLowerCase()];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

const sanitize = (input: string) => input.replace(/\s+/g, ' ').trim();
