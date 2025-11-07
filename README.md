# To-Learn Monorepo

투런(ToLearn)의 챗 학습 서비스 전용 모노레포입니다.  
Next.js 웹앱(`apps/web`)과 Express 기반 챗봇 API(`apps/api`)가 같은 타입·OpenAPI 계약(`packages/contracts`)을 공유하며, OpenAI 또는 n8n 파이프라인을 선택적으로 사용합니다.

---

## Tech Highlights
- **Stack**: Next.js 14 (App Router), Express, better-sqlite3, Zod, tRPC 스타일 OpenAPI 계약.
- **Contracts-first**: `packages/contracts`에서 요청/응답 스키마와 OpenAPI 명세를 단일 소스로 관리합니다.
- **Provider toggle**: `CHAT_PROVIDER=openai|n8n`으로 빠르게 파이프라인을 변경하며 동일한 HTTP 인터페이스 유지.
- **Workspace scripts**: 한 번의 명령으로 프론트/백을 동시에 개발·빌드·배포.

---

## Repository Layout
```
apps/
  web/        # Next.js 프론트엔드 (Vercel 배포 타깃)
  api/        # Express + SQLite 백엔드 (Render 배포 타깃)
packages/
  contracts/  # TypeScript 타입, Zod 스키마, OpenAPI 문서
package.json  # npm workspaces + 공용 스크립트
```

---

## Requirements
- Node.js 20 (Render/Vercel 런타임과 동일)  
  `nvm use 20 || nvm install 20`
- npm 10+
- SQLite 3 (내장 바이너리 사용, 추가 설치 불필요)

---

## Getting Started
1. **Install dependencies**
   ```bash
   npm install --ignore-scripts
   npm run build:contracts     # 타입 패키지 최초 빌드
   ```
2. **Create env files**
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```
3. **Run locally**
   ```bash
   npm run dev                 # web:3000 + api:4000 동시에 실행
   ```
4. **Useful scripts**
   | Script | 설명 |
   | --- | --- |
   | `npm run dev:web` | Next.js 단독 실행 |
   | `npm run dev:api` | Express API만 실행 |
   | `npm run build` | contracts → web → api 순 빌드 |
   | `npm run build:api` | API만 빌드 (contracts 포함) |
   | `npm run start:api` | 빌드된 API 서버 실행 |
   | `npm run lint` | 프론트엔드 ESLint |

---

## Configuration
### apps/web/.env.local
| Key | 설명 |
| --- | --- |
| `NEXT_PUBLIC_CHAT_API_URL` | API 기본 주소. 비우면 Next.js `/api/chat` 프록시 사용 |

### apps/api/.env
| Key | 설명 |
| --- | --- |
| `PORT` | 기본 4000 |
| `SQLITE_PATH` | 기본 `./data/tolearn.db`, Render에서는 `/var/data/tolearn.db` 권장 |
| `ALLOWED_ORIGINS` | CORS 허용 목록 (쉼표 구분) |
| `CHAT_PROVIDER` | `openai` 또는 `n8n` |
| `OPENAI_API_KEY` | `CHAT_PROVIDER=openai`일 때 필수 |
| `N8N_WEBHOOK_URL` | n8n HTTP/Webhook URL |
| `N8N_API_KEY` | n8n 플로우 보호용 Bearer 토큰(선택) |

두 모드 모두 `/api/chat` / `/api/chat/stream` 엔드포인트를 동일하게 제공합니다.  
n8n 스트리밍은 단일 완료 이벤트(`{ done: true }`)만 내려보냅니다.

---

## Contracts Package (`packages/contracts`)
- `chat.ts`: `ChatMessage`, `ChatSuggestion`, `ChatResponse` 등 핵심 타입과 난이도/카테고리 enum 정의.
- `openapi.ts`: `/docs` (Swagger UI)와 `/docs.json`에 노출되는 OpenAPI 스키마를 생성.
- 다른 워크스페이스에서 `@to-learn/contracts`로 import하며, 변경 후 `npm run build:contracts`로 재컴파일해야 합니다.

---

## Deployment
### API (Render)
1. Build command: `npm install && npm run build:api`
2. Start command: `npm run start:api`
3. Persistent disk: `/var/data`, `SQLITE_PATH=/var/data/tolearn.db`
4. Environment:
   - `CHAT_PROVIDER=openai` + `OPENAI_API_KEY`
   - 또는 `CHAT_PROVIDER=n8n` + `N8N_WEBHOOK_URL` (+ `N8N_API_KEY` 선택)
5. Health check: `GET /health` (필요 시 Render health check에 등록)

### Web (Vercel)
1. Connect repo → Project directory `apps/web`
2. Build command `npm run build:web`, Output `.next`
3. Env:
   - `NEXT_PUBLIC_CHAT_API_URL=https://<render-api>/api/chat`
   - SSG/ISR 설정은 Next 기본값 사용

### OpenAPI / n8n
- Swagger UI: `https://<api-domain>/docs`
- JSON spec: `https://<api-domain>/docs.json`
- n8n HTTP Trigger → Function (프롬프트 구성) → OpenAI/LLM → Response Mapper → Return `ChatResponse`
- OpenAPI 노드 import 시 `/docs.json`을 붙여주면 매개변수와 예시가 자동으로 채워집니다.

---

## Architecture Notes
- **Monorepo advantage**: 타입/계약/유틸을 공유하며 프론트와 백엔드를 동기화.
- **Data layer**: better-sqlite3 + WAL 모드로 채팅 이력·추천을 저장.
- **Safety**: Helmet, CORS allow-list, rate limiting, 구조화된 에러 응답 적용.
- **Provider abstraction**: 새로운 LLM 또는 워크플로우를 추가할 때 `CHAT_PROVIDER` 분기만 확장하면 됩니다.

---

## Maintenance Checklist
- `npm --prefix apps/web run lint`로 프론트 정적 분석.
- E2E/통합 테스트 슬롯 비어 있음 → 신규 시나리오 추가 시 `npm run test` 스크립트 확장 권장.
- 계약 수정 시 `packages/contracts` → `npm run build:contracts` → API·웹 리빌드 순으로 진행해 동기화.

행복한 학습 서비스 개발 되세요! ✨
