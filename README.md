# To-Learn Monorepo

투런(ToLearn)의 To-Learn 프론트엔드(`apps/web`)와 챗봇 백엔드(`apps/api`)를 하나의 npm 워크스페이스로 통합했습니다. 두 앱은 `packages/contracts`에서 내보내는 공용 타입·OpenAPI 스키마를 공유하며, 같은 요청/응답 포맷으로 OpenAI 또는 n8n 파이프라인에 연결됩니다.

## 프로젝트 구조
```
apps/
  web/        # Next.js 14 (App Router) 프론트엔드
  api/        # Express + SQLite 챗봇 API (Render 배포 타깃)
packages/
  contracts/  # Chat request/response 타입과 OpenAPI 문서
package.json  # workspace 스크립트 및 루트 의존성
```

## 빠른 시작
1. **Node 20 사용 권장** (렌더/버셀 런타임과 일치)
   ```bash
   nvm use 20 || nvm install 20
   ```
2. **의존성 설치**
   ```bash
   npm install --ignore-scripts
   npm --prefix packages/contracts run build # 타입 패키지 빌드
   ```
3. **환경변수 작성**
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```
4. **로컬 실행**
   ```bash
   npm run dev                 # 프론트(3000) + 백엔드(4000) 동시 실행
   npm run dev:web             # Next.js 단독 실행
   npm run dev:api             # Express API만 실행
   ```
5. **빌드/배포 확인**
   ```bash
   npm run build               # web → api 순서로 빌드
   npm run build:api           # 서버만 빌드 (tsc)
   npm run start:api           # 빌드 결과 실행
   ```

## 공용 계약 (packages/contracts)
- `chat.ts`: 챗봇 요청 스키마, 난이도/카테고리 enum, `ChatMessage`, `ChatSuggestion`, `ChatResponse` 타입 정의.
- `openapi.ts`: `/docs`와 n8n OpenAPI 연결에 사용하는 문서.
- 다른 워크스페이스에서 `@fin-one/contracts`로 import 하며, 변경 시 `npm --prefix packages/contracts run build`로 다시 컴파일합니다.

## 환경변수 요약
### 프론트엔드 (`apps/web/.env.local`)
```
NEXT_PUBLIC_CHAT_API_URL=http://localhost:4000/api/chat
```
> 값을 비우면 Next가 자체 `/api/chat` 경로(프록시)를 이용합니다.

### 백엔드 (`apps/api/.env`)
```
PORT=4000
SQLITE_PATH=./data/tolearn.db
ALLOWED_ORIGINS=http://localhost:3000,https://tolearn.vercel.app
CHAT_PROVIDER=openai           # openai | n8n
OPENAI_API_KEY=sk-...
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/to-learn-chat
N8N_API_KEY= # 필요 시 Bearer 토큰
```
- `CHAT_PROVIDER=openai` : 기존 OpenAI GPT-4o 파이프라인 사용.
- `CHAT_PROVIDER=n8n` : 동일한 ChatRequest/Response 포맷 그대로 n8n HTTP/Webhook으로 위임. n8n에서 프롬프트 엔지니어링을 조정할 수 있고, 응답이 비면 서버가 502 에러를 반환합니다.
- 두 모드 모두 `/api/chat`과 `/api/chat/stream` 인터페이스는 동일합니다. 스트리밍 경로에서 n8n은 단일 완료 이벤트(`done: true`)로 반환됩니다.

## 배포 가이드
1. **GitHub → Render (API)**
   - 기본 빌드: `npm install && npm run build:api`
   - 시작 명령: `npm run start:api`
   - 디스크: `/var/data`에 1GB 이상, `SQLITE_PATH=/var/data/tolearn.db`
   - `CHAT_PROVIDER`에 맞춰 OpenAI 키 또는 n8n 웹훅을 설정합니다.

2. **GitHub → Vercel (Web)**
   - 루트 레포를 연결 후 `apps/web`를 프로젝트로 선택.
   - 빌드 커맨드 `npm run build:web`, 출력 `.next` (기본 설정 유지 가능).
   - `NEXT_PUBLIC_CHAT_API_URL`을 Render 퍼블릭 URL `/api/chat`로 지정.

3. **OpenAPI & n8n**
   - `https://<api-domain>/docs` : Swagger UI
   - `https://<api-domain>/docs.json` : JSON 문서 (n8n OpenAPI 노드에서 Import 가능)
   - n8n HTTP 노드는 동일한 `ChatRequest` 페이로드를 받아 `ChatResponse`를 반환해야 합니다.
   - n8n 플로우 팁:
     - HTTP Trigger → (필요 시 Function 노드로 프롬프트/컨텍스트 구성) → OpenAI(또는 타 LLM) → 응답을 contracts의 `ChatResponse`에 맞춰 반환.
     - OpenAPI 노드를 사용하는 경우 `docs.json`을 불러오면 스키마와 샘플이 자동으로 채워집니다.

## 유지보수 체크리스트
- `npm --prefix apps/web run lint`로 프론트 정적 분석.
- `npm run test` 자리에 추후 통합 테스트 추가 예정 (현재는 수동 검증).
- 새로운 계약 추가 시 반드시 `packages/contracts`를 통해 공유하고, OpenAPI 문서를 동기화하십시오.

## 설계 노트 (요약)
- Monorepo: apps/web, apps/api, packages/contracts로 구성하여 타입/스키마를 단일 소스에서 관리합니다.
- Provider 패턴: `CHAT_PROVIDER`를 통해 OpenAI 직결 또는 n8n 워크플로우 전환이 가능합니다. 두 경로 모두 동일한 요청/응답 계약을 사용합니다.
- 영속성: SQLite(`better-sqlite3`)로 대화/메시지/추천을 저장하고, WAL 모드로 동시성/안정성을 확보합니다.
- 보안: CORS 허용 도메인 제어, Helmet, 레이트 리미터, 구조화된 에러 응답을 적용했습니다.

행복한 학습 서비스 개발 되세요! ✨
