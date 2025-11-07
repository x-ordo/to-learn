import type { Suggestion } from './types';

export const fallbackSuggestions: Suggestion[] = [
  {
    id: 'suggest-risk',
    label: '리스크 관리 연습',
    prompt: 'PF 대출 리스크를 분석할 때 핵심 체크리스트를 알려줘.'
  },
  {
    id: 'suggest-valuation',
    label: '기업 가치평가',
    prompt: 'DCF 모델 핵심 가정과 주의할 점을 요약해줘.'
  },
  {
    id: 'suggest-cert',
    label: '자격증 대비',
    prompt: 'AFPK 실전 대비 문제 하나 내줘.'
  }
];

