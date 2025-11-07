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
| `GET` | `/docs`, `/docs.json` | Swagger UI & OpenAPI JSON |

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
  routes/            # chat, stream, conversations, suggestions, health
  services/
    openai.ts        # GPT-4o 호출 + 모델 매핑
    n8n.ts           # n8n HTTP/Webhook 호출 래퍼 (동기/스트림 모두 처리)
    suggestions.ts   # 추천 Prompt 로테이션
  types.ts           # DB 레코드 타입 + @to-learn/contracts 재노출
  utils/             # Prompt builder, asyncHandler 등
```

## 개발 팁
- `npm run build:api`는 타입 체크 + 컴파일만 수행하므로 CI에 사용하기 좋습니다.
- n8n과의 계약은 `packages/contracts/src/chat.ts`에서 관리하므로 변경 시 프론트/백 모두에 바로 반영됩니다.
- `render.yaml`를 참고하면 동일 설정으로 인프라를 재현할 수 있습니다.
- 로컬에서 `better-sqlite3` 네이티브 모듈을 빌드하지 못하는 경우 서버가 자동으로 메모리 저장소로 폴백합니다. 데이터는 재시작 시 초기화되므로, 영구 저장이 필요하면 Node 20 환경에서 네이티브 모듈을 빌드하세요.
