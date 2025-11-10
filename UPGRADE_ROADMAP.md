# Upgrade Roadmap

이 문서는 RFP 요구사항을 충족하기 위한 현재 진척도와 후속 보완 과제를 단계별로 정리합니다. ✅는 이번 배치에서 완료된 항목, ⏳는 우선순위가 높은 TODO입니다.

## Phase 0 — Contract & API Hardening (✅ 완료)
- ✅ Summary/Q&A/Quiz/Recommend 계약(Zod + OpenAPI) 추가 및 Swagger 통합.
- ✅ `/api/upload`, `/api/summary`, `/api/qna`, `/api/quiz`, `/api/recommend` 라우트 구현.
- ✅ Serper.dev 기반 검색 + 링크 검증 파이프라인(`searchClient`, `linkValidator`).
- ✅ PDF/TXT 업로드 추출기(`pdf-parse`)와 구조화 LLM 호출(`workflows.ts`).

## Phase 1 — Data/Prompt Quality (진행 예정)
- ⏳ 업로드 텍스트 캐싱 및 중복 체크 (SHA-256 해시 기반) → 동일 문서를 여러 탭에서 재사용.
- ⏳ Summary/Q&A/Quiz Prompt 버전 관리: `PROMPT_GUIDE.md` 기반으로 A/B 테스트 전환.
- ⏳ 추천 엔드포인트 멀티 프로바이더 지원 (Serper → Bing/Brave 토글 및 실패 폴백).
- ⏳ Structured 결과에 대한 서버측 JSON Schema validation 로그 남기기 (app.log → Loki 연결).

## Phase 2 — Evaluation & Samples
- ⏳ `/samples` 문서를 자동으로 순회하며 `/scripts/demo.mjs` 호출 → CI 아티팩트 업로드.
- ⏳ 품질 리포트: summary 길이, quiz 정답률, recommend 검증율을 Grafana에 노출.
- ⏳ Knowledge drift 테스트: 규제/회계 업데이트 문서를 월별로 추가하고 회귀 테스트.

## Phase 3 — Deployment & Observability
- ⏳ Render + Vercel 환경 변수 검증 파이프라인 (TAVILY/DART/KIF_EDU, OPENAI_API_KEY, CORS 등) 자동 점검.
- ⏳ n8n 프로바이더용 summary/qna/quiz webhook 정의 (현재는 OpenAI 모드 한정 지원).
- ⏳ SLA 모니터링: `/docs.json`과 `/results/*.json` 스냅샷을 S3에 보관하여 회귀 분석 근거 확보.

## Phase 4 — Nice-to-have
- ⏳ Frontend JSON schema auto-highlighting (Monaco/Prism) + Copy status 토스트.
- ⏳ Recommendation 근거 생성 시 Citation 표기(모델 출력 + 검색 결과 URL 하이라이트).
- ⏳ Upload 단계에서 다국어 OCR 연결(Google Vision 또는 Azure Form Recognizer) 옵션화.

> 로드맵에 변경이 생기면 이 문서를 우선 수정하여 전체 팀이 동일한 북극성 지표를 공유할 수 있게 유지합니다.
