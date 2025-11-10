import { fetch } from 'undici';
import { config } from '../env';
import { ApiError } from '../middleware/errorHandler';
import type { ProviderRecommendation } from './postprocess';

interface DartListResponse {
  status: string;
  message?: string;
  list?: Array<{
    corp_name?: string;
    report_nm?: string;
    rcept_no?: string;
    rcept_dt?: string;
  }>;
}

const DART_BASE_URL = 'https://opendart.fss.or.kr/api/list.json';

export const searchDart = async (params: {
  query: string;
  limit: number;
}): Promise<ProviderRecommendation[]> => {
  if (!config.dartApiKey) {
    return [];
  }

  const corpName = extractCorpName(params.query);
  if (!corpName) {
    return [];
  }

  const url = new URL(DART_BASE_URL);
  url.searchParams.set('crtfc_key', config.dartApiKey);
  url.searchParams.set('corp_name', corpName);
  url.searchParams.set('page_no', '1');
  url.searchParams.set('page_count', String(Math.max(params.limit, 10)));

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(response.status, 'DART_HTTP_ERROR', body || 'Open DART API error');
  }

  const payload = (await response.json()) as DartListResponse;
  if (payload.status !== '000') {
    throw new ApiError(502, 'DART_API_ERROR', payload.message || 'Open DART returned an error.');
  }

  const items = payload.list ?? [];
  return items.slice(0, params.limit).flatMap((item) => {
    if (!item.report_nm || !item.rcept_no) {
      return [];
    }
    const link = `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`;
    const description = `${item.corp_name ?? corpName} - ${item.report_nm}`;
    return [
      {
        source: 'dart' as const,
        title: item.report_nm,
        description,
        link,
        publishedAt: item.rcept_dt,
        meta: {
          corp: item.corp_name ?? corpName,
          rcept_dt: item.rcept_dt,
          rcept_no: item.rcept_no
        },
        score: 0.9
      }
    ];
  });
};

const extractCorpName = (query: string): string | undefined => {
  const tokens = query
    .split(/[,/]|(\s+)/)
    .map((token) => token?.trim())
    .filter(Boolean);
  return tokens[0];
};
