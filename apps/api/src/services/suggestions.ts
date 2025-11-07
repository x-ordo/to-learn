import { fetchSuggestions } from '../db';
import type { Category, SuggestionRecord } from '../types';

const FALLBACK_SUGGESTIONS: SuggestionRecord[] = [
  {
    id: 'fallback-risk',
    label: '리스크 점검',
    prompt: '최근 포트폴리오에서 리스크가 큰 항목을 짚어줘.',
    category: '재무제표',
    weight: 1
  },
  {
    id: 'fallback-terms',
    label: '핵심 용어 복습',
    prompt: '핵심 금융경제 용어 2개를 예시와 함께 설명해줘.',
    category: '금융경제용어',
    weight: 1
  },
  {
    id: 'fallback-dcf',
    label: '현금흐름 분석',
    prompt: 'DCF 모델 결과를 점검할 때 확인해야 할 체크리스트를 알려줘.',
    category: '재무제표',
    weight: 1
  }
];

export const getSuggestionsForCategory = (category?: Category): SuggestionRecord[] => {
  const rows = fetchSuggestions({ category, limit: 3 });
  if (rows.length > 0) {
    return rows;
  }
  return FALLBACK_SUGGESTIONS;
};
