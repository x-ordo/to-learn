# Demo Guide

이 문서는 `/samples` 자료와 `scripts/demo.mjs`를 활용해 API 전체 플로우를 재현하는 방법을 설명합니다.

## 1. 준비물
- Node.js 20 (fetch/FormData 내장 버전)
- API 서버 실행 중 (`http://localhost:4000` 기준)
- OpenAI + 자료 추천 키(Tavily/DART/KIF_EDU) 구성 완료

## 2. 샘플 자료
| 파일 | 용도 |
| --- | --- |
| `samples/lecture-intro.txt` | Summary/Q&A 입력용 강의 노트 |
| `samples/valuation-memo.txt` | Quiz 생성용 밸류에이션 메모 |
| `samples/liquidity-brief.txt` | 추가 실험용 유동성 코칭 메모 |
| `samples/regulation-update.txt` | 규제 업데이트 문서 |
| `samples/fintech-roundup.txt` | 핀테크 위클리 브리프 |
| `samples/pf-risk-notes.pdf` | `/api/upload` 테스트용 PDF |

## 3. 데모 실행
```bash
# API 기본 주소 변경 시 DEMO_API_BASE 로 오버라이드 가능
DEMO_API_BASE=https://to-learn-api.example.com/api \
node scripts/demo.mjs
```
- 결과물은 `results/01-upload.json` ~ `05-recommend.json`으로 저장됩니다.
- `.gitignore`에 등록되어 있으므로 로컬에서 안전하게 덮어쓸 수 있습니다.

## 4. 결과 검증 체크리스트
1. `01-upload.json`에 `text`와 `meta.wordCount`가 채워져 있는지 확인.
2. `02-summary.json.summary` 배열 길이가 5줄 이하인지 검증.
3. `03-qna.json.items` 각 항목에 `q`, `a` 존재.
4. `04-quiz.json.problems` 문제 수가 요청한 `count`와 일치, 객관식은 `choices` 포함.
5. `05-recommend.json.items`의 `verified` 플래그가 최소 한 개 이상 `true`인지 확인.

## 5. 실패 시 디버깅
- HTTP 상태 422: 입력이 비어있거나 계약 위반 → `PROMPT_GUIDE.md` 참고.
- HTTP 상태 502: OpenAI/Serper 에러 → `.env` 키와 네트워크 상태 점검 후 재실행.
- 링크 검증 실패 다수: 외부 데이터 소스 키(Tavily/DART/KIF_EDU)를 확인하고, `recommendLimit`을 줄여 재시도.
