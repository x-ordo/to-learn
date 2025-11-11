# To-Learn Monorepo

투런(ToLearn) 챗봇은 학습자에게 개인화된 금융 컨시어지 경험을 제공하기 위한 서비스형 모노레포입니다.  
웹(상담 화면)과 API(추천·대화 엔진)는 동일한 대화 규격을 공유해, 원하는 학습 시나리오(OpenAI·n8n·타 워크플로우)를 쉽게 전환할 수 있습니다.

---

## 서비스 강점
- **한 번의 대화 경험**: Next 기반 상담 UI와 챗봇 엔진이 같은 언어로 소통해, 기획/디자인 변경 시에도 동일한 결과물을 유지합니다.
- **학습 컨시어지**: 추천 프롬프트, 난이도/카테고리 전환, 리포트 저장 기능이 기본 제공되어 팀 단위 학습 관리에 유리합니다.
- **데이터 일관성**: 대화/추천/스키마가 하나의 계약(`packages/contracts`)에서 관리되어, 수정 시 모든 채널에 즉시 반영됩니다.
- **실시간 파이프라인 전환**: OpenAI 또는 n8n 등 원하는 챗봇 흐름을 환경 변수만 바꿔 손쉽게 전환할 수 있습니다.

---

## Repository Layout
```
apps/
  web/        # 상담·학습 UI, Vercel 배포
  api/        # 챗봇/추천 엔진, Render 배포
packages/
  contracts/  # 대화 규격·추천 스키마
package.json  # 공용 스크립트/워크스페이스 설정
```

---

## 필수 준비물
- Node.js 20 (운영 환경과 동일) → `nvm use 20 || nvm install 20`
- npm 10+
- SQLite 3 (내장 바이너리 사용)

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
4. **핵심 스크립트**
   | Script | 설명 |
   | --- | --- |
   | `npm run dev:web` | Next.js 단독 실행 |
   | `npm run dev:api` | Express API만 실행 |
   | `npm run build` | contracts → web → api 순 빌드 |
   | `npm run build:api` | API만 빌드 (contracts 포함) |
   | `npm run start:api` | 빌드된 API 서버 실행 |
   | `npm run lint` | 프론트엔드 ESLint |

---

## Structured Workflows
- **Summary (5 lines)** — `/api/summary`는 업로드/붙여넣기 텍스트를 최대 5줄로 정규화합니다.
- **Q&A JSON** — `/api/qna`는 `{ q, a }[]` 배열을 제공해 UI/Swagger에서 동일한 스키마를 강제합니다.
- **Quiz Generator** — `/api/quiz`는 객관/주관식 선택과 `answer + explanation`을 함께 돌려줍니다.
- **Recommendation** — `/api/recommend`는 Tavily·Open DART·e-금융교육센터 3개 소스를 병렬 조회하고 링크 검증 + LLM reason을 제공합니다. 프론트 Recommend 탭에서는 소스별 토글과 출처 배지/추천 근거 패널을 함께 제공합니다.
- **Document Upload** — `/api/upload` + Next UI의 Summary/Q&A/Quiz/Recommend 탭, JSON/Text 토글, Copy 버튼으로 프롬프트/출력을 분리 프롬프트로 검증할 수 있습니다.

---

## Configuration
### 상담 웹 (`apps/web/.env.local`)
| Key | 설명 |
| --- | --- |
| `NEXT_PUBLIC_CHAT_API_URL` | 챗봇 엔진 주소. 비워두면 로컬 프록시(`/api/chat`) 사용 |
| `NEXT_PUBLIC_API_BASE_URL` | (선택) Summary/Q&A/Quiz/Recommend 등 비채팅 엔드포인트의 베이스 URL. 예: `https://api.example.com/api` |

### 챗봇 엔진 (`apps/api/.env`)
| Key | 설명 |
| --- | --- |
| `PORT` | API 포트 (기본 4000) |
| `SQLITE_PATH` | 학습 기록 파일 위치 (로컬: `./data/tolearn.db`, 운영: `/var/data/tolearn.db`) |
| `ALLOWED_ORIGINS` | 상담 웹이 접근 가능한 도메인 목록 |
| `CHAT_PROVIDER` | `openai` 또는 `n8n` |
| `OPENAI_API_KEY` | OpenAI 모드일 때 사용 |
| `N8N_WEBHOOK_URL` | n8n 모드일 때 연결할 웹훅 |
| `N8N_API_KEY` | n8n 호출 시 사용할 토큰(선택) |
| `TAVILY_API_KEY` | Tavily 실시간 검색 API 키 |
| `DART_API_KEY` | Open DART 공시 API 키 |
| `KIF_EDU_API_KEY` | e-금융교육센터(OpenAPI) 서비스 키 |
| `KIF_EDU_DATASET_ID` | (선택) 오픈데이터셋 경로. 기본값 제공 |

> 운영 배포 시 `ALLOWED_ORIGINS`에 `https://to-learn-web.vercel.app`를 꼭 포함해 상담 웹에서 안전하게 호출하도록 합니다.

---

## 대화 계약 (`packages/contracts`)
- 챗봇 메시지, 추천 프롬프트, 카테고리/난이도 정의 등 상담에 필요한 모든 규격을 단일 소스로 관리합니다.
- `/docs`, `/docs.json`에서 동일한 스키마를 참조해 n8n·외부 파트너와도 일관된 통합을 지원합니다.
- 규격 변경 시 `npm run build:contracts`로 재배포하면 웹/엔진이 동시에 최신 스키마를 공유합니다.

---

## Samples & Demo
- `samples/` 디렉터리에 5개 이상의 TXT/PDF 자료가 포함되어 있어 업로드·요약·문제 생성 테스트를 재현할 수 있습니다.
- `scripts/demo.mjs`는 `upload → summary → qna → quiz → recommend`를 순차 호출하고 결과를 `results/*.json`에 저장합니다. 자세한 사용법은 [`DEMO_GUIDE.md`](DEMO_GUIDE.md)를 참고하세요.
- 실행 예시:
  ```bash
  DEMO_API_BASE=http://localhost:4000/api node scripts/demo.mjs
  ```

## Reference Docs
- [`PROMPT_GUIDE.md`](PROMPT_GUIDE.md) — Summary/Q&A/Quiz/Recommend 프롬프트 규칙.
- [`UPGRADE_ROADMAP.md`](UPGRADE_ROADMAP.md) — RFP 기준 대비 단계별 개선 계획.
- [`DEMO_GUIDE.md`](DEMO_GUIDE.md) — 데모 스크립트 및 샘플 데이터 검증 절차.

---

## Deployment
### Local vs Production 운영 요약
| 구분 | 웹 (Next.js) | API (Express) | 공통 체크 |
| --- | --- | --- | --- |
| **로컬 개발** | `npm run dev:web` (기본 `http://localhost:3000`) | `npm run dev:api` (기본 `http://localhost:4000`) | `.env.local`/`.env` 복사, `npm install --ignore-scripts`, `npm run build:contracts` |
| **동시 실행** | `npm run dev` (concurrently) | 동일 | logger/Swagger: `http://localhost:4000/docs` 확인 |
| **배포** | Vercel 프로젝트 디렉터리 `apps/web`, Build `npm run build:web` | Render Build `npm install --ignore-scripts && npm run build:api`, Start `npm run start:api` | Env: `NEXT_PUBLIC_CHAT_API_URL=https://<render-api>/api/chat`, `ALLOWED_ORIGINS=http://localhost:3000,https://to-learn-web.vercel.app`, `CHAT_PROVIDER`, `OPENAI_API_KEY` 혹은 `N8N_*` |
| **운영 점검** | Vercel logs + Next.js Analytics | Render health check `GET /_health`, optional Swagger 전용 포트 | 변경된 contracts → `npm run build:contracts` 후 웹/백 모두 재배포 |

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
4. 프런트엔드 실 서비스 URL: `https://to-learn-web.vercel.app`  
   Render 백엔드 `ALLOWED_ORIGINS`에 해당 도메인을 포함시키면 CORS 오류를 예방할 수 있습니다.

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
