# Prompt Guide

To-Learn의 모든 구조화 워크플로우는 공통 원칙(한국어, JSON only, 최대 길이)을 적용합니다. 아래 가이드는 n8n·LLM 오케스트레이션 시 동일한 포맷을 재현할 수 있도록 설계되었습니다.

## 1. Summary (요약)
- **시스템 지침**
  - 역할: "금융 학습 코치".
  - 출력: `{"summary":["line1", ...]}` (최대 5줄, 각 30자 내외).
  - 금지어: JSON 밖의 마크다운/불릿/설명.
- **사용자 입력**
  ```json
  {
    "MAX_LINES": 5,
    "TEXT": "<강의노트 본문>"
  }
  ```
- **LLM 팁**: 텍스트가 길면 중요 단락만 발췌 후 요약. 결론/Action item을 마지막 줄에 배치.

## 2. Q&A
- **시스템 지침**
  - 출력 형태: `{"items":[{"q":"","a":""}, ...]}`.
  - 각 질문은 단일 개념만 다룸, 답변은 2~3문장.
- **입력**
  ```json
  {
    "COUNT": 3,
    "SOURCE": "요약 텍스트 혹은 원문"
  }
  ```
- **체크리스트**
  - 질문/답변 모두 한국어.
  - 사용자의 원문에 존재하지 않는 Fact 생성 금지.
  - 필요 시 "왜 중요한가"를 답변 마지막에 덧붙임.

## 3. Quiz
- **시스템 지침**
  - 출력: `{"problems":[{"type":"objective|subjective","question":"","choices":[],"answer":"","explanation":""}]}`.
  - 객관식: 보기 3~5개, 정답/해설 일치.
  - 주관식: `choices` 생략 허용.
- **입력 템플릿**
  ```json
  {
    "QUESTION_TYPE": "객관식" 또는 "주관식",
    "COUNT": 3,
    "SOURCE": "분석 텍스트"
  }
  ```
- **품질 규칙**
  - `question`은 상황 설명 + 요구사항 형태.
  - `explanation`은 근거 데이터/공식/판단 이유를 분리해서 작성.

## 4. Recommendation
- **검색 전처리**
  1. Serper.dev에 `topic + keywords` 조합 쿼리.
  2. `normalizeUrl()`로 중복 제거.
  3. `validateLinkReachable()`로 200 응답 확인 → `verified` 설정.
- **LLM Reasoning (옵션)**
  - 추천 근거를 LLM으로 보강하려면 다음 JSON을 전달합니다.
    ```json
    {
      "context": "PF 위험 관리",
      "items": [
        {"title": "", "description": "검색 스니펫", "link": "", "verified": true}
      ]
    }
    ```
  - 출력: `{"items":[{"title":"","description":"요약","link":"","reason":"근거","verified":true}]}`
  - Reason 작성 규칙: 과장 금지, 출처 링크 포함 금지(이미 `link` 제공).

## 공유 규칙
- 모든 워크플로우는 `PROMPT_VERSION` 메타데이터를 헤더나 시스템 메시지에 기록하여 회귀 시 추적합니다.
- JSON Parse 실패 시 2차 시도로 `"Respond only with compact JSON"` 메시지를 추가해 재호출합니다.
