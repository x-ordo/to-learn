# to-learn Chatbot API

Express + SQLite 챗봇 백엔드입니다. Monorepo(`../..`) 루트에서 Next.js 프론트엔드와 함께 개발/배포하며, 동일한 ChatRequest/Response 계약(`@to-learn/contracts`)을 준수합니다.

## 요구 사항
- Node.js 20.x (Render 배포 타깃과 동일)
- npm 10+
- SQLite (better-sqlite3 내장)
- OpenAI API Key **또는** n8n HTTP/Webhook 엔드포인트

## 실행 방법
```bash
# 루트에서 실행
npm install --ignore-scripts
npm --prefix packages/contracts run build

cp apps/api/.env.example apps/api/.env
npm run dev:api
```
- 개발 서버: <http://localhost:4000>
- Swagger UI: <http://localhost:4000/docs>
- OpenAPI JSON: <http://localhost:4000/docs.json> (n8n OpenAPI 노드에서 Import 가능)

### n8n 연동 가이드 (요약)
1) Render나 자체 서버에 n8n을 구축합니다.
2) HTTP Trigger 노드에서 `POST` JSON 바디로 contracts의 `ChatRequest`를 받습니다.
3) Function 노드로 `request`, `conversation`, `history`를 가공해 프롬프트를 생성합니다.
4) OpenAI(또는 다른 LLM) 노드로 답변을 생성합니다.
5) Function 노드로 contracts의 `ChatResponse` 형태로 변환하여 HTTP Response로 반환합니다.
6) 서버 `.env`에서 `CHAT_PROVIDER=n8n`, `N8N_WEBHOOK_URL`을 설정하면 본 서버가 n8n으로 위임합니다.

## 환경 변수
| 변수 | 설명 |
| --- | --- |
| `PORT` | 기본 4000 |
| `SQLITE_PATH` | 로컬 DB 파일 경로 |
| `ALLOWED_ORIGINS` | 쉼표(,) 기준 CORS 허용 목록 |
| `CHAT_PROVIDER` | `openai` _(기본)_ 또는 `n8n` |
| `OPENAI_API_KEY` | `CHAT_PROVIDER=openai`일 때 필수 |
| `N8N_WEBHOOK_URL` | `CHAT_PROVIDER=n8n`일 때 필수. 동일한 ChatRequest JSON을 받는 HTTP 엔드포인트 |
| `N8N_API_KEY` | 선택. 제공 시 `Authorization: Bearer` 헤더로 전달 |
| `SWAGGER_PORT` | 선택. API 포트와 분리된 Swagger UI 전용 포트(예: 8000) |
| `TAVILY_API_KEY` | Tavily 검색 API 키 |
| `DART_API_KEY` | Open DART 공시 API 키 |
| `KIF_EDU_API_KEY` | e-금융교육센터(OpenAPI) 서비스 키 |
| `KIF_EDU_DATASET_ID` | (선택) e-금융교육센터 데이터셋 경로 |
| `SESSION_SECRET` | 세션 쿠키 서명/암호화용 비밀 문자열(최소 8자) |
| `SESSION_TTL_DAYS` | 세션 유효기간(일). 기본 7 |

> 운영 환경 예시:  
> `ALLOWED_ORIGINS=http://localhost:3000,https://to-learn-web.vercel.app`  
> (프런트 실서비스 URL: https://to-learn-web.vercel.app)

### Provider 동작
- **OpenAI 모드**: 기존 GPT-4o 호출 + 내부 Prompt Builder (`src/utils/prompts.ts`).
- **n8n 모드**: `request`, `conversation`, `history`를 그대로 전송하고, n8n에서 반환한 `ChatResponse`를 저장/전달합니다. SSE(`/api/chat/stream`)는 단일 `done: true` 이벤트로 마무리됩니다.

## 주요 엔드포인트
| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/_health` | 헬스체크 |
| `POST` | `/api/chat` | Sync 응답 (프론트 기본 경로) |
| `POST` | `/api/chat/stream` | SSE 토큰 스트리밍 또는 n8n 단일 완료 이벤트 |
| `GET` | `/api/conversations/:id` | 저장된 대화 + 메시지 조회 |
| `GET` | `/api/suggestions` | 추천 프롬프트 조회 |
| `POST` | `/api/upload` | PDF/TXT 업로드 → 텍스트 추출 |
| `POST` | `/api/summary` | 문서를 5줄 요약(JSON) |
| `POST` | `/api/qna` | Q&A `{ q, a }[]` 생성 |
| `POST` | `/api/quiz` | 객관/주관식 문제 + 정답/해설 |
| `POST` | `/api/recommend` | Tavily/DART/금융교육 3원 검색 + 링크 검증 + LLM Reason |
| `GET` | `/docs`, `/docs.json` | Swagger UI & OpenAPI JSON |
| `POST` | `/api/auth/login` | 이름+비밀번호로 로그인(최초 로그인 시 사용자 생성) |
| `POST` | `/api/auth/logout` | 로그아웃(쿠키 삭제) |
| `GET` | `/api/auth/me` | 현재 사용자 조회(미인증 시 401) |

## 배포 (Render)
1. GitHub 저장소를 Render Web Service로 연결.
2. Build Command: `npm install --ignore-scripts && npm run build:api`
3. Start Command: `npm run start:api`
4. Persistent Disk를 `/var/data`에 마운트하고 `SQLITE_PATH=/var/data/tolearn.db` 설정.
5. 환경변수: `CHAT_PROVIDER`, `OPENAI_API_KEY` 또는 `N8N_*`, `ALLOWED_ORIGINS`, `PORT` 등.

## 폴더 구조
```
src/
  db.ts              # SQLite 초기화 + CRUD
  env.ts             # Zod 기반 환경설정
  middleware/        # requestId, error handler
  routes/            # chat, stream, conversations, suggestions, health, upload, summary, qna, quiz, recommend
  services/
    openai.ts        # GPT-4o 호출 + 모델 매핑
    workflows.ts     # Summary/Q&A/Quiz 구조화 LLM 호출
    pdfParser.ts     # PDF 텍스트 추출
    searchClient.ts  # Serper.dev 검색 래퍼
    linkValidator.ts # 링크 정규화 + HEAD 검증
    n8n.ts           # n8n HTTP/Webhook 호출 래퍼 (동기/스트림 모두 처리)
    suggestions.ts   # 추천 Prompt 로테이션
  types.ts           # DB 레코드 타입 + @to-learn/contracts 재노출
  utils/             # Prompt builder, asyncHandler 등

## Demo Script
루트의 `scripts/demo.mjs`를 실행하면 `/samples` 데이터를 기반으로 upload→summary→qna→quiz→recommend 흐름을 자동 호출하고 결과를 `results/*.json`에 저장합니다. API를 배포한 뒤 스모크 테스트 용도로 활용하세요.
```

## 개발 팁
- `npm run build:api`는 타입 체크 + 컴파일만 수행하므로 CI에 사용하기 좋습니다.
- n8n과의 계약은 `packages/contracts/src/chat.ts`에서 관리하므로 변경 시 프론트/백 모두에 바로 반영됩니다.
- `render.yaml`를 참고하면 동일 설정으로 인프라를 재현할 수 있습니다.
- 로컬에서 `better-sqlite3` 네이티브 모듈을 빌드하지 못하는 경우 서버가 자동으로 메모리 저장소로 폴백합니다. 데이터는 재시작 시 초기화되므로, 영구 저장이 필요하면 Node 20 환경에서 네이티브 모듈을 빌드하세요.
 - 프론트에서 쿠키 세션을 사용하려면 `fetch(..., { credentials: 'include' })`로 호출하고, CORS `ALLOWED_ORIGINS`를 올바르게 설정하세요.
