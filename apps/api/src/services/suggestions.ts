import { fetchSuggestions } from '../db';
import type { Category, SuggestionRecord } from '../types';

/**
 * 추천 프롬프트 서비스
 * --------------------
 * DB 조회 로직과 폴백 데이터를 한곳에 두어 라우터가 단순히 호출만 하도록 합니다.
 * 카테고리별 추천이 없을 때는 안전한 기본 프롬프트를 반환합니다.
 */

const FALLBACK_SUGGESTIONS: SuggestionRecord[] = [
  {
    id: 'fallback-risk',
    label: '리스크 점검',
    prompt: '최근 포트폴리오에서 리스크가 큰 항목을 짚어줘.',
    category: '금융경제용어',
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
    category: '금융경제용어',
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
