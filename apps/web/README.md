# ToLearn Frontend

Next.js 14(App Router) 기반의 투자/금융 학습 경험 UI입니다. Express API(`../api`)와 동일한 계약(`@to-learn/contracts`)을 사용하며, 모노레포 루트에서 함께 개발합니다.

## 기술 스택
- Next.js 14 + React 18
- TypeScript
- CSS Modules

## 빠른 시작(다운로더용)
- 요구 Node: 20.x (권장)
- 설치/빌드/실행
  ```bash
  # 루트에서 공통 의존성 설치
  npm install --ignore-scripts

  # 타입 공유 패키지 먼저 빌드(웹/API가 참조)
  npm --prefix packages/contracts run build

  # 웹 앱 개발 서버 실행
  npm run dev:web
  ```
- 기본 포트: http://localhost:3000
- 백엔드 URL을 지정하지 않으면 Next.js API 경로(`/api/...`)로 프록시합니다.

### 로그인(선택)
- 무가입 로그인 페이지: `/login`
- 로그인 강제: `.env.local`에 `NEXT_PUBLIC_REQUIRE_LOGIN=1`
- 쿠키 세션은 API 도메인과 동일 사이트에서 동작하며, 프론트 호출 시 `credentials: 'include'`가 필요합니다.

## 환경 변수(.env.local)
`apps/web/.env.local` 파일을 만들어 다음 값을 필요에 맞게 설정하세요.
```env
# 챗 API 전체 경로(지정하지 않으면 /api/chat 사용). 예: 로컬 Express API
NEXT_PUBLIC_CHAT_API_URL=http://localhost:4000/api/chat

# 비-챗 엔드포인트의 베이스 URL(선택). 지정 시 /summary, /qna, /quiz, /recommend 등에 사용
# 미설정 시 NEXT_PUBLIC_CHAT_API_URL에서 자동 유도
# NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
 
# 로그인 강제 여부(선택)
# NEXT_PUBLIC_REQUIRE_LOGIN=1
```
- 프록시 사용: 두 변수를 생략하면 브라우저는 `/api` 아래 경로로 요청합니다(Next.js 내부 라우트/프록시로 연결하도록 구성하세요).
- Vercel 배포 시, 프로젝트 환경 변수에도 동일 키를 설정해야 합니다.

## 백엔드 옵션 요약
- 권장: `apps/api` 사용(Express + SQLite). 예시 환경은 `apps/api/.env.example` 참고.
- 최소 서버(실험용): `apps/web/server` 사용 가능. 필요한 값:
  - `PORT` 기본 4000
  - `OPENAI_API_KEY` (선택, 없으면 모의 응답)
  - `ALLOWED_ORIGINS` CORS 허용 목록(콤마 구분)
  - `SQLITE_PATH` 로컬 DB 경로(선택)

## TypeScript 설정 안내
- 이 패키지의 `tsconfig.json`은 루트 `tsconfig.base.json`을 확장합니다.
  - 경로 별칭: `@to-learn/contracts` → `packages/contracts/dist`
  - 엄격 모드(`strict: true`) 활성화
  - Next.js 권장 옵션 사용(`jsx: preserve`, `moduleResolution: NodeNext` 등)
- 첫 실행 전 반드시 계약 패키지 빌드 필요: `npm --prefix packages/contracts run build`
- 로컬에서 `tsc` 명령이 보이지 않으면 `npx tsc -p apps/web/tsconfig.json`을 사용하세요.

## 프로젝트 구조
```
app/
  chat/          # 챗봇 화면(UI + 상태)
  page.tsx       # 랜딩 페이지
  layout.tsx
  globals.css
lib/
  api/           # 백엔드 연동 클라이언트(fetch)
public/
  ...
```

## 백엔드 연동
- 기본 챗 엔드포인트: `POST /api/chat`
- 응답/요청 타입은 `packages/contracts/src/*`에 정의되어 있으며, OpenAI/n8n 모드 모두 동일 포맷을 따릅니다.

## 배포(Vercel 예시)
1. 루트를 Vercel에 연결하고 프로젝트 디렉토리로 `apps/web`을 선택합니다.
2. Build Command: `npm run build:web`
3. Env Var: `NEXT_PUBLIC_CHAT_API_URL=https://<render-app>.onrender.com/api/chat` (또는 `NEXT_PUBLIC_API_BASE_URL` 병행)
4. 백엔드 CORS/허용 오리진에 Vercel 도메인(프리뷰 포함)을 추가합니다.

## 개발 팁
- `lib/api/chatClient.ts`는 서버 장애 시 모의 응답으로 폴백하여 초기 데모에 유용합니다.
- 추천 프롬프트는 서버가 내려주는 `suggestions`가 우선이며, 부재 시 기본 리스트를 사용합니다.
- UI 수정 후 `npm --prefix apps/web run lint`로 정적 분석을 수행하세요.

---

## 제품 요구사항 · 로드맵(요청 반영)
1) 기본 로그인(회원가입 없이, 이름+비밀번호)
- 목적: 사용자별 채팅 로그와 관심사, 업로드 문서 연계 로딩
- 인증 흐름: `/login` 화면 → 이름/비밀번호 제출 → 세션 쿠키 발급(`sessionId`) → 이후 API 호출 시 쿠키로 식별

2) Summary/Recommend 자동 실행
- 사용자가 문서 업로드 또는 질문/관심사 입력 시 백그라운드로 요약/추천 자동 호출 → 결과를 사이드패널/상단 카드로 표시

3) 문서 기반 학습 랩과 챗봇 병합
- 업로드/요약/퀴즈/추천 워크플로우를 채팅 화면 안으로 통합(문서 탭/패널 + 메시지 스트림에 결과 카드 삽입)

4) 입력창 상단 자동 액션 노출
- QnA, Quiz, Summary, Recommend 등 빠른 액션 버튼을 Input 상단에 “필” UI로 노출 → 클릭 시 프롬프트/명령 선입력

5) JSON 출력 제거
- 디버그용 JSON 덤프/원시 응답 표시 제거, 사용자 친화적 카드/리스트로 렌더링

6) 매우 간편한 접근성
- 첫 진입 시 튜토리얼 없이도 사용 가능한 기본값/자동 실행, 최소 클릭 설계

7) 번잡한 체크포인트 삭제
- 불필요한 중간 확인/다이얼로그 축소, 에러는 인라인 미세 알림으로 처리

8) 모바일 우선 UI
- 360px 기준 레이아웃 최적화, 하단 고정 입력창, 상단 액션 핀, 카드형 응답

## 구현 설계 개요
- 로그인(무가입)
  - Web(Next.js): `app/login/page.tsx`, `app/(auth)/logout/page.tsx`(선택)
  - API(Express): `POST /auth/login`(성공 시 세션 생성), `POST /auth/logout`
  - 저장소: SQLite(기존 DB)에 `users`, `sessions` 테이블 추가(단방향 해시 저장)
  - 세션: HttpOnly Secure 쿠키 `sessionId` 사용, CORS/쿠키 옵션 조정 필요
  - 관련 엔드포인트: `GET /me`, `GET /conversations`, `GET /documents`

- 자동 Summary/Recommend
  - 트리거: 파일 업로드 완료, 첫 질문 전송, 관심사 입력 시
  - 호출: `lib/api/workflowClient.ts`의 `requestSummary`, `requestRecommendations`
  - UI: 채팅 상단 카드 또는 우측 패널로 비동기 결과 표시(로딩 스켈레톤)

- 문서 학습 랩 + 채팅 병합
  - 업로드 위젯을 채팅 화면 좌측/상단에 고정, 처리 결과(요약/퀴즈/QnA)를 메시지 스트림에 카드로 주입

- 입력창 상단 빠른 액션
  - QnA/Quiz/Summary/Recommend 버튼 → 클릭 시 템플릿 프롬프트를 입력창에 삽입 후 즉시 전송 또는 편집 모드

- JSON 출력 제거
  - 원시 응답을 화면에 그대로 노출하지 않고, 컴포넌트로 맵핑(카드, 리스트, 코드블록 최소화)

- 모바일 퍼스트
  - 하단 고정 입력, 상단 액션 바, 좌우 패딩 축소, 1열 카드, 터치 타겟 ≥ 44px

## 환경 변수 체크리스트(추가/변경)
- Web (`apps/web/.env.local`)
  - `NEXT_PUBLIC_CHAT_API_URL` → 챗 API 전체 경로
  - `NEXT_PUBLIC_API_BASE_URL` → 요약/추천 등 비-챗 엔드포인트 베이스(선택)
  - `NEXT_PUBLIC_REQUIRE_LOGIN=1` → 로그인 강제(도입 시)

- API (`apps/api/.env` 예시)
  - `SESSION_SECRET=change_me` → 세션 서명 키(신규)
  - `SQLITE_PATH=./data/tolearn.db`
  - `ALLOWED_ORIGINS=http://localhost:3000`
  - `OPENAI_API_KEY=...`(선택)

## 개발 순서(권장)
1. DB 스키마: users/sessions/conversations/documents 추가, 마이그레이션
2. 인증 API: `/auth/login|logout`, `GET /me` 구현 및 쿠키 세션 발급
3. Web 가드: `NEXT_PUBLIC_REQUIRE_LOGIN`가 true면 로그인 페이지로 리다이렉트
4. 업로드/요약/추천 자동화: 업로드/입력 이벤트 훅에 비동기 호출 연결
5. 입력창 상단 액션 바 구현(QnA/Quiz/Summary/Recommend)
6. JSON UI 제거 및 카드형 컴포넌트 도입
7. 모바일 레이아웃 최적화 및 접근성 점검

## 참고 소스 위치
- 타입 계약: `packages/contracts/src/*`
- 챗/워크플로 API 클라이언트: `apps/web/lib/api/*`
- 경량 서버(실험): `apps/web/server/*`
