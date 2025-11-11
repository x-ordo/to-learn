# ToLearn Frontend

Next.js 14(App Router) 기반의 투자/금융 학습 경험 UI입니다. Express API(`../api`)와 동일한 `ChatRequest/Response` 계약을 사용하며, 모노레포 루트에서 함께 개발합니다.

## 기술 스택
- Next.js 14 + React 18
- TypeScript
- CSS Modules

## 실행 방법
```bash
# 루트에서 공통 의존성 설치
npm install --ignore-scripts
npm --prefix packages/contracts run build

# 프론트엔드만 실행
npm run dev:web
```
- 기본 포트: <http://localhost:3000>
- `.env.local`에서 `NEXT_PUBLIC_CHAT_API_URL`을 지정하지 않으면 `/api/chat` 프록시를 사용합니다.

### n8n/OpenAI 동작
- 백엔드가 `CHAT_PROVIDER=openai`일 때는 OpenAI로 직접 호출합니다.
- `CHAT_PROVIDER=n8n`일 때는 서버가 n8n 워크플로우로 위임하고, 프론트는 동일한 응답 포맷을 받습니다.

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
- 기본 엔드포인트: `POST /api/chat`
- 환경 변수 예시 (`apps/web/.env.local`)
  ```env
  NEXT_PUBLIC_CHAT_API_URL=http://localhost:4000/api/chat
  ```
- 응답 구조는 `packages/contracts/src/chat.ts`에 정의되어 있으며, n8n 모드에서도 동일합니다.

## 배포 (Vercel)
1. 루트 레포를 Vercel에 연결하고 프로젝트 디렉터리로 `apps/web`을 선택합니다.
2. Build Command: `npm run build:web`
3. Env Var: `NEXT_PUBLIC_CHAT_API_URL=https://<render-app>.onrender.com/api/chat`
4. Render 백엔드 `ALLOWED_ORIGINS`에 Vercel 실서비스 도메인 `https://to-learn-web.vercel.app`(및 필요 시 프리뷰)를 추가합니다.

## 개발 팁
- `lib/api/chatClient.ts`는 서버 장애 시 모의 응답을 제공하므로 초기 데모에 활용할 수 있습니다.
- 추천 프롬프트는 API가 내려주는 `suggestions` 배열을 그대로 사용하며, 없을 경우 기본 리스트를 노출합니다.
- UI 개선 후에는 `npm --prefix apps/web run lint`으로 정적 분석을 수행하세요.
