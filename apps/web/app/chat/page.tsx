'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { sendChatMessage, getDefaultSuggestions } from '../../lib/api/chatClient';
import {
  requestSummary,
  requestQna,
  requestQuiz,
  requestRecommendations,
  uploadDocument,
  UploadResponse
} from '../../lib/api/workflowClient';
import {
  ChatMessage,
  ChatSuggestion,
  Category,
  Difficulty,
  QuizType,
  RecommendProvider,
  SummaryResponse,
  QnaResponse,
  QuizResponse,
  RecommendResponse
} from '@to-learn/contracts';
import styles from './chat.module.css';

// 첫 진입 시 사용자에게 가이드를 보여주는 환영 메시지
const initialMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  createdAt: new Date().toISOString(),
  content:
    '안녕하세요! 저는 투런 학습 코치입니다.\n\n학습 목표나 준비 중인 시험, 궁금한 금융 주제를 알려주시면 맞춤형 문제와 피드백을 제공할게요.'
};

// 프론트에서 노출하는 모델 선택지는 서버에서 실제 모델명으로 매핑됩니다.
const modelOptions = [
  {
    label: 'OpenAI GPT-4o mini (기본)',
    value: 'openai-gpt-4o-mini',
    description: '빠른 응답과 저비용으로 데일리 학습에 최적화'
  },
  {
    label: 'OpenAI GPT-4o',
    value: 'openai-gpt-4o',
    description: '고난도 케이스 분석용 풀 사이즈 모델'
  },
  {
    label: 'OpenAI GPT-4.1 mini',
    value: 'openai-gpt-4.1-mini',
    description: '연산 효율을 높인 차세대 경량 모델'
  }
];

// 난이도/카테고리는 contracts의 enum 타입을 그대로 사용합니다.
const difficultyOptions: Array<{ label: string; value: Difficulty; description: string }> = [
  { label: '난이도 하', value: '하', description: '입문자용 기본 개념·용어 위주' },
  { label: '난이도 중', value: '중', description: '실무 시나리오 기반 중급 문제' },
  { label: '난이도 상', value: '상', description: '케이스 스터디·심층 분석 과제' }
];

const categoryOptions: Array<{ label: string; value: Category; description: string }> = [
  { label: '금융 경제 용어', value: '금융경제용어', description: '금융 상품/시장 용어 정리' },
  { label: '재무제표', value: '재무제표', description: '손익·현금흐름·재무상태표 분석' }
];

type MenuType = 'model' | 'difficulty' | 'category';
type WorkflowTab = 'summary' | 'qna' | 'quiz' | 'recommend';

/**
 * ChatPage
 * --------
 * Next.js App Router 클라이언트 컴포넌트.
 * - 대화 상태/추천 프롬프트/모델 설정을 관리하고
 * - `chatClient`를 통해 백엔드 API와 통신합니다.
 * 민감한 API 키는 브라우저에 노출되지 않으며,
 * 공개 가능한 메타데이터(난이도/카테고리)만 전송합니다.
 */
export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>(getDefaultSuggestions());
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(modelOptions[0]?.value ?? 'openai-gpt-4o-mini');
  const [difficulty, setDifficulty] = useState<Difficulty>('중');
  const [category, setCategory] = useState<Category>('금융경제용어');
  const [openMenu, setOpenMenu] = useState<MenuType | null>(null);
  const [workflowTab, setWorkflowTab] = useState<WorkflowTab>('summary');
  const [documentText, setDocumentText] = useState('');
  const [uploadMeta, setUploadMeta] = useState<UploadResponse['meta'] | null>(null);
  const [summaryLines, setSummaryLines] = useState(5);
  const [qnaCount, setQnaCount] = useState(3);
  const [quizMode, setQuizMode] = useState<QuizType>('objective');
  const [quizCount, setQuizCount] = useState(3);
  const [recommendTopic, setRecommendTopic] = useState('');
  const [recommendKeywords, setRecommendKeywords] = useState('');
  const [recommendLimit, setRecommendLimit] = useState(3);
  const [recommendProviders, setRecommendProviders] = useState<RecommendProvider[]>(['tavily', 'dart', 'kif_edu']);
  const [workflowResult, setWorkflowResult] = useState<
    SummaryResponse | QnaResponse | QuizResponse | RecommendResponse | null
  >(null);
  const [workflowResultType, setWorkflowResultType] = useState<'summary' | 'qna' | 'quiz' | 'recommend' | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowViewMode, setWorkflowViewMode] = useState<'text' | 'json'>('text');
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copyHint, setCopyHint] = useState<'idle' | 'copied'>('idle');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const workflowTabs: Array<{ id: WorkflowTab; label: string; description: string }> = [
    { id: 'summary', label: 'Summary', description: '문서를 최대 5줄로 요약' },
    { id: 'qna', label: 'Q&A', description: '요약 기반 질문·답변 생성' },
    { id: 'quiz', label: 'Quiz', description: '객관·주관식 문제 자동 생성' },
    { id: 'recommend', label: 'Recommend', description: '외부 참고 자료 추천' }
  ];
  const recommendProviderOptions: Array<{ id: RecommendProvider; label: string; description: string }> = [
    { id: 'tavily', label: 'Tavily 웹검색', description: '실시간 웹/블로그/논문' },
    { id: 'dart', label: 'Open DART', description: '공시/재무 보고서' },
    { id: 'kif_edu', label: 'e-금융교육센터', description: '금융교육 강의/콘텐츠' }
  ];
  const providerBadgeLabels: Record<RecommendProvider, string> = {
    tavily: 'Tavily',
    dart: 'DART',
    kif_edu: '금융교육'
  };

  // 새 메시지가 추가되면 스크롤을 하단으로 이동
  useEffect(() => {
    // 신규 메시지가 등장하면 스크롤을 자연스럽게 하단으로 이동
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!toolbarRef.current) return;
      if (!toolbarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Enter(Shift+Enter는 줄바꿈) 또는 전송 버튼으로 메시지 전송
  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) {
      return;
    }

    await dispatchUserMessage(trimmed);
  };

  // 사용자 입력을 메시지로 추가하고 서버 응답을 반영합니다.
  const dispatchUserMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const response = await sendChatMessage({
      conversationId,
      message: content,
      metadata: {
        source: 'next-web',
        topic: 'finance-education',
        model,
        difficulty,
        category
      }
    });

    setConversationId(response.conversationId);

    if (response.messages?.length) {
      setMessages((prev) => [...prev, ...response.messages]);
    }

    if (response.suggestions?.length) {
      setSuggestions(response.suggestions);
    }

    setIsLoading(false);
  };

  const toggleMenu = (menu: MenuType) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const handleMenuSelect = (menu: MenuType, value: string) => {
    if (menu === 'model') {
      setModel(value);
    } else if (menu === 'difficulty') {
      setDifficulty(value as Difficulty);
    } else if (menu === 'category') {
      setCategory(value as Category);
    }
    setOpenMenu(null);
  };

  // 추천 프롬프트 클릭 시 즉시 전송
  const handleSuggestion = (suggestion: ChatSuggestion) => {
    if (isLoading) return;
    setInputValue(suggestion.prompt);
    void dispatchUserMessage(suggestion.prompt);
  };

  const handleWorkflowTabChange = (tab: WorkflowTab) => {
    setWorkflowTab(tab);
    setWorkflowError(null);
    setWorkflowViewMode('text');
    setCopyHint('idle');
  };

  const handleProviderToggle = (provider: RecommendProvider) => {
    setWorkflowError(null);
    setRecommendProviders((prev) => {
      if (prev.includes(provider)) {
        if (prev.length === 1) {
          setWorkflowError('자료 추천 소스는 최소 1개 이상 선택해야 합니다.');
          return prev;
        }
        return prev.filter((item) => item !== provider);
      }
      return [...prev, provider];
    });
  };

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setWorkflowError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadDocument(file);
      setDocumentText(uploaded.text);
      setUploadMeta(uploaded.meta);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const runWorkflow = async () => {
    setWorkflowError(null);
    setCopyHint('idle');
    const trimmedText = documentText.trim();

    if (workflowTab !== 'recommend' && trimmedText.length === 0) {
      setWorkflowError('분석할 텍스트를 입력하거나 문서를 업로드해주세요.');
      return;
    }

    if (workflowTab === 'recommend') {
      if (!recommendTopic.trim() && !recommendKeywords.trim()) {
        setWorkflowError('주제 또는 키워드를 최소 한 개 이상 입력해주세요.');
        return;
      }
      if (recommendProviders.length === 0) {
        setWorkflowError('자료 추천 소스를 한 개 이상 선택해주세요.');
        return;
      }
    }

    setIsWorkflowRunning(true);
    let result: SummaryResponse | QnaResponse | QuizResponse | RecommendResponse;

    try {
      if (workflowTab === 'summary') {
        const maxLines = Math.max(1, Math.min(summaryLines, 5));
        setSummaryLines(maxLines);
        result = await requestSummary(trimmedText, maxLines);
      } else if (workflowTab === 'qna') {
        const count = Math.max(1, Math.min(qnaCount, 10));
        setQnaCount(count);
        result = await requestQna(trimmedText, count);
      } else if (workflowTab === 'quiz') {
        const count = Math.max(3, Math.min(quizCount, 5));
        setQuizCount(count);
        result = await requestQuiz(trimmedText, quizMode, count);
      } else {
        const limit = Math.max(1, Math.min(recommendLimit, 5));
        setRecommendLimit(limit);
        const keywords = recommendKeywords
          .split(',')
          .map((keyword) => keyword.trim())
          .filter(Boolean);
        result = await requestRecommendations({
          topic: recommendTopic.trim() || undefined,
          keywords: keywords.length ? keywords : undefined,
          limit,
          providers: recommendProviders
        });
      }

      setWorkflowResult(result);
      setWorkflowResultType(workflowTab);
      setWorkflowViewMode('text');
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : '워크플로우 실행 중 오류가 발생했습니다.');
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  const buildResultText = (): string => {
    if (!workflowResult || !workflowResultType) {
      return '';
    }

    if (workflowResultType === 'summary') {
      const summary = workflowResult as SummaryResponse;
      return summary.summary.join('\n');
    }

    if (workflowResultType === 'qna') {
      const qna = workflowResult as QnaResponse;
      return qna.items
        .map((item, index) => `Q${index + 1}. ${item.q}\nA${index + 1}. ${item.a}`)
        .join('\n\n');
    }

    if (workflowResultType === 'quiz') {
      const quiz = workflowResult as QuizResponse;
      return quiz.problems
        .map((problem, index) => {
          const choices = problem.choices ? `\n보기: ${problem.choices.join(' / ')}` : '';
          return `문제 ${index + 1} (${problem.type})\n${problem.question}${choices}\n정답: ${problem.answer}\n해설: ${problem.explanation}`;
        })
        .join('\n\n');
    }

    const recommendation = workflowResult as RecommendResponse;
    return recommendation.items
      .map((item, index) => {
        const metaSummary = buildMetaSummary(item.meta);
        const rows = [
          `추천 ${index + 1}: ${item.title}`,
          `출처: ${providerBadgeLabels[item.source]}`,
          `링크: ${item.link}`,
          `설명: ${item.description}`,
          `이유: ${item.reason}`,
          `검증: ${item.verified ? '성공' : '실패'}`
        ];
        if (metaSummary) {
          rows.push(`메타: ${metaSummary}`);
        }
        return rows.join('\n');
      })
      .join('\n\n');
  };

  const renderWorkflowTextResult = () => {
    if (!workflowResult || !workflowResultType) {
      return <p className={styles.workflowPlaceholder}>워크플로우 실행 결과가 여기에 표시됩니다.</p>;
    }

    if (workflowResultType === 'summary') {
      const summary = workflowResult as SummaryResponse;
      return (
        <ol className={styles.summaryList}>
          {summary.summary.map((line, index) => (
            <li key={`summary-${index}`}>{line}</li>
          ))}
        </ol>
      );
    }

    if (workflowResultType === 'qna') {
      const qna = workflowResult as QnaResponse;
      return (
        <div className={styles.qnaList}>
          {qna.items.map((item, index) => (
            <article key={`qna-${index}`} className={styles.qnaCard}>
              <strong>Q{index + 1}. {item.q}</strong>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      );
    }

    if (workflowResultType === 'quiz') {
      const quiz = workflowResult as QuizResponse;
      return (
        <div className={styles.quizList}>
          {quiz.problems.map((problem, index) => (
            <article key={`quiz-${index}`} className={styles.quizCard}>
              <div className={styles.quizHeader}>
                <span className={styles.quizTypeBadge}>{problem.type === 'objective' ? '객관식' : '주관식'}</span>
                <strong>문제 {index + 1}</strong>
              </div>
              <p className={styles.quizQuestion}>{problem.question}</p>
              {problem.choices && (
                <ul className={styles.choiceList}>
                  {problem.choices.map((choice, choiceIndex) => (
                    <li key={`choice-${index}-${choiceIndex}`}>{choice}</li>
                  ))}
                </ul>
              )}
              <p className={styles.quizAnswer}>정답: {problem.answer}</p>
              <p className={styles.quizExplanation}>{problem.explanation}</p>
            </article>
          ))}
        </div>
      );
    }

    const recommendations = workflowResult as RecommendResponse;
    return (
      <div className={styles.recommendList}>
        {recommendations.items.map((item, index) => (
          <article key={`recommend-${index}`} className={styles.recommendCard}>
            <div className={styles.recommendHeader}>
              <div className={styles.recommendTitleGroup}>
                <span className={`${styles.sourceBadge} ${styles[`source-${item.source}`]}`}>
                  {providerBadgeLabels[item.source]}
                </span>
                <a href={item.link} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              </div>
              <span className={item.verified ? styles.verifiedBadge : styles.unverifiedBadge}>
                {item.verified ? '검증 완료' : '검증 필요'}
              </span>
            </div>
            <p className={styles.recommendDescription}>{item.description}</p>
            <details className={styles.reasonPanel}>
              <summary>추천 근거</summary>
              <p>{item.reason}</p>
            </details>
            {item.meta && Object.keys(item.meta).length > 0 && (
              <details className={styles.metaPanel}>
                <summary>메타데이터</summary>
                <ul>
                  {Object.entries(item.meta)
                    .slice(0, 4)
                    .map(([key, value]) => (
                      <li key={`${item.link}-${key}`}>
                        <strong>{key}</strong>: {formatMetaValue(value)}
                      </li>
                    ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
    );
  };

  const handleCopyResult = async () => {
    if (!workflowResult) {
      return;
    }

    const payload =
      workflowViewMode === 'json'
        ? JSON.stringify(workflowResult, null, 2)
        : buildResultText();

    if (!payload) {
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setWorkflowError('클립보드를 사용할 수 없습니다. 다른 브라우저를 이용해주세요.');
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
      setCopyHint('copied');
      setTimeout(() => setCopyHint('idle'), 2000);
    } catch {
      setWorkflowError('클립보드 복사에 실패했습니다. 브라우저 권한을 확인해주세요.');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brandGroup}>
            <Link href="/" className={styles.backButton}>
              ← 이전으로
            </Link>
            <Link href="/" className={styles.brand}>
              투런
            </Link>
          </div>
          <nav className={styles.navLinks}>
            <Link href="/#features" className={styles.navLink}>
              핵심 기능
            </Link>
            <Link href="/#workflow" className={styles.navLink}>
              서비스 흐름
            </Link>
            <Link href="/#stories" className={styles.navLink}>
              사용자 이야기
            </Link>
            <Link href="/chat" className={styles.navLink}>
              챗봇
            </Link>
          </nav>
        </div>
      </header>
      <div className={styles.page}>
        <div className={styles.layout}>
          <aside className={`${styles.panel} ${styles.sidebar} ${styles.panelSticky}`}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>학습 플레이라인</h2>
            <p className={styles.sidebarSubtitle}>
              목표에 맞는 프롬프트를 선택하거나 직접 질문을 입력해보세요. 아래 도구막대에서
              학습 모델·난이도·카테고리를 즉시 바꿀 수 있습니다.
            </p>
          </div>
          <div className={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className={styles.suggestionButton}
                onClick={() => handleSuggestion(suggestion)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
          <div className={styles.sidebarFooter}>
            챗봇이 누적 학습 이력을 스스로 분석해 추천을 조정하고, 팀과 공유할 리포트도 자동으로 생성해요.
          </div>
        </aside>

          <section className={`${styles.panel} ${styles.chatPanel} ${styles.panelSticky}`}>
          <header className={styles.chatHeader}>
            <div>
              <h1>투런 챗봇</h1>
              <p style={{ margin: 0, color: 'rgba(15, 23, 42, 0.6)' }}>
                금융 실무 문제와 자격증 대비를 위한 맞춤형 AI 코치
              </p>
              {/* <div className={styles.chatMeta}>
                <span className={styles.metaBadge}>
                  모델: {modelOptions.find((item) => item.value === model)?.label ?? model}
                </span>
                <span className={styles.metaBadge}>난이도: {difficulty}</span>
                <span className={styles.metaBadge}>
                  카테고리: {categoryOptions.find((item) => item.value === category)?.label ?? category}
                </span>
              </div> */}
            </div>
            <span className={styles.statusPill}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '999px',
                  background: isLoading ? '#f97316' : '#22c55e'
                }}
              />
              {isLoading ? '응답 생성 중...' : '대화 준비 완료'}
            </span>
          </header>

          <div className={styles.messages}>
            {messages.length === 0 && !isLoading ? (
              <div className={styles.emptyState}>
                <h2>첫 질문을 남겨보세요</h2>
                <p>챗봇이 학습 목표를 바탕으로 문제를 생성하고, 풀이 전략을 함께 제안해드립니다.</p>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`${styles.bubble} ${
                    message.role === 'user' ? styles.userBubble : styles.assistantBubble
                  }`}
                >
                  {message.content}
                </article>
              ))
            )}
            {isLoading && (
              <div
                className={`${styles.bubble} ${styles.assistantBubble}`}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <span className={styles.typingIndicator}>
                  <span>●</span>
                  <span>●</span>
                  <span>●</span>
                </span>
              </div>
            )}
            {isLoading && (
              <p className={styles.typingText}>투런이 선택한 모델로 답변을 준비하고 있어요…</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.inputBar} onSubmit={handleSubmit}>
            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                placeholder="챗봇에게 금융 실무 또는 자격증 관련 질문을 해보세요."
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isLoading || inputValue.trim().length === 0}
            >
              보내기
            </button>
          </form>

          <div className={styles.controlToolbar} ref={toolbarRef}>
            <div className={styles.controlButtonWrapper}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleMenu('model');
                }}
              >
                ⚙ 모델 · {modelOptions.find((option) => option.value === model)?.label}
              </button>
              {openMenu === 'model' && (
                <div className={styles.controlMenu}>
                  {modelOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={styles.menuOption}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMenuSelect('model', option.value);
                      }}
                    >
                      <span className={styles.menuPrimary}>{option.label}</span>
                      <span className={styles.menuSecondary}>{option.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.controlButtonWrapper}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleMenu('difficulty');
                }}
              >
                🎯 난이도 · {difficulty}
              </button>
              {openMenu === 'difficulty' && (
                <div className={`${styles.controlMenu} ${styles.controlMenuRight}`}>
                  {difficultyOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={styles.menuOption}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMenuSelect('difficulty', option.value);
                      }}
                    >
                      <span className={styles.menuPrimary}>{option.label}</span>
                      <span className={styles.menuSecondary}>{option.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.controlButtonWrapper}>
              <button
                type="button"
                className={styles.controlButton}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleMenu('category');
                }}
              >
                📂 카테고리 ·{' '}
                {categoryOptions.find((option) => option.value === category)?.label}
              </button>
              {openMenu === 'category' && (
                <div className={`${styles.controlMenu} ${styles.controlMenuRight}`}>
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={styles.menuOption}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMenuSelect('category', option.value);
                      }}
                    >
                      <span className={styles.menuPrimary}>{option.label}</span>
                      <span className={styles.menuSecondary}>{option.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          </section>
        </div>
        <section className={`${styles.panel} ${styles.workflowLab}`}>
          <div className={styles.workflowIntro}>
            <div>
              <h2>문서 기반 학습 랩</h2>
              <p>
                PDF/텍스트 자료를 업로드하면 요약 · Q&A · Quiz · 추천을 같은 패널에서 실행하고 JSON 스키마를 즉시 검증할 수 있습니다.
              </p>
            </div>
            <span className={styles.workflowBadge}>JSON 모드 + Text 모드</span>
          </div>
          <div className={styles.workflowTabs}>
            {workflowTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.workflowTab} ${workflowTab === tab.id ? styles.workflowTabActive : ''}`}
                onClick={() => handleWorkflowTabChange(tab.id)}
              >
                <strong>{tab.label}</strong>
                <span>{tab.description}</span>
              </button>
            ))}
          </div>
          <div className={styles.workflowGrid}>
            <div className={styles.workflowInputs}>
              <div className={styles.uploadRow}>
                <label className={styles.uploadButton}>
                  {isUploading ? '업로드 중...' : '문서 업로드 (PDF/TXT)'}
                  <input
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    onChange={handleDocumentUpload}
                    disabled={isUploading || isWorkflowRunning}
                  />
                </label>
                {uploadMeta && (
                  <span className={styles.uploadMeta}>
                    {uploadMeta.filename} · {uploadMeta.wordCount.toLocaleString()} words
                  </span>
                )}
              </div>
              <p className={styles.workflowHint}>
                {workflowTab === 'recommend'
                  ? '추천 탭은 주제/키워드 기반 검색이 필수입니다. 텍스트 영역은 다른 탭에서 재사용할 수 있어요.'
                  : '요약/Q&A/Quiz는 아래 텍스트를 그대로 사용합니다. 최대 8,000자까지 권장해요.'}
              </p>
              <textarea
                className={styles.workflowTextarea}
                rows={workflowTab === 'recommend' ? 8 : 12}
                placeholder="강의 노트, PDF에서 추출한 텍스트, 혹은 기사 전문을 붙여넣어 주세요."
                value={documentText}
                onChange={(event) => setDocumentText(event.target.value)}
              />
              <div className={styles.workflowControls}>
                {workflowTab === 'summary' && (
                  <label className={styles.controlField}>
                    <span>요약 라인 수 (1~5)</span>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={summaryLines}
                      onChange={(event) => setSummaryLines(Number(event.target.value))}
                    />
                  </label>
                )}
                {workflowTab === 'qna' && (
                  <label className={styles.controlField}>
                    <span>Q&A 개수 (1~10)</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={qnaCount}
                      onChange={(event) => setQnaCount(Number(event.target.value))}
                    />
                  </label>
                )}
                {workflowTab === 'quiz' && (
                  <div className={styles.quizControls}>
                    <label className={styles.controlField}>
                      <span>문제 유형</span>
                      <select value={quizMode} onChange={(event) => setQuizMode(event.target.value as QuizType)}>
                        <option value="objective">객관식</option>
                        <option value="subjective">주관식</option>
                      </select>
                    </label>
                    <label className={styles.controlField}>
                      <span>문항 수 (3~5)</span>
                      <input
                        type="number"
                        min={3}
                        max={5}
                        value={quizCount}
                        onChange={(event) => setQuizCount(Number(event.target.value))}
                      />
                    </label>
                  </div>
                )}
                {workflowTab === 'recommend' && (
                  <div className={styles.recommendControls}>
                    <label className={styles.controlField}>
                      <span>주제</span>
                      <input
                        type="text"
                        placeholder="예) PF 대출 리스크 관리"
                        value={recommendTopic}
                        onChange={(event) => setRecommendTopic(event.target.value)}
                      />
                    </label>
                    <label className={styles.controlField}>
                      <span>키워드 (쉼표 구분)</span>
                      <input
                        type="text"
                        placeholder="예) PF, 리스크, 밸류체인"
                        value={recommendKeywords}
                        onChange={(event) => setRecommendKeywords(event.target.value)}
                      />
                    </label>
                    <label className={styles.controlField}>
                      <span>추천 개수 (1~5)</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={recommendLimit}
                        onChange={(event) => setRecommendLimit(Number(event.target.value))}
                      />
                    </label>
                    <div className={styles.controlField}>
                      <span>검색 범위</span>
                      <div className={styles.providerToggleGroup}>
                        {recommendProviderOptions.map((option) => {
                          const isActive = recommendProviders.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              type="button"
                              className={`${styles.providerToggle} ${isActive ? styles.providerToggleActive : ''}`}
                              onClick={() => handleProviderToggle(option.id)}
                            >
                              <span className={styles.providerLabel}>{option.label}</span>
                              <span className={styles.providerDescription}>{option.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.workflowRunButton}
                onClick={runWorkflow}
                disabled={isWorkflowRunning || isUploading}
              >
                {isWorkflowRunning ? '워크플로우 실행 중...' : '워크플로우 실행'}
              </button>
            </div>
            <div className={styles.workflowResults}>
              <div className={styles.resultToolbar}>
                <div className={styles.toggleGroup}>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${
                      workflowViewMode === 'text' ? styles.toggleButtonActive : ''
                    }`}
                    onClick={() => setWorkflowViewMode('text')}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={`${styles.toggleButton} ${
                      workflowViewMode === 'json' ? styles.toggleButtonActive : ''
                    }`}
                    onClick={() => setWorkflowViewMode('json')}
                  >
                    JSON
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.copyButton}
                  onClick={handleCopyResult}
                  disabled={!workflowResult}
                >
                  {copyHint === 'copied' ? '복사 완료' : 'Copy'}
                </button>
              </div>
              {workflowError && <p className={styles.workflowError}>{workflowError}</p>}
              <div className={styles.workflowResultBody}>
                {workflowViewMode === 'json' ? (
                  <pre className={styles.jsonView}>
                    {workflowResult ? JSON.stringify(workflowResult, null, 2) : '결과가 여기에 표시됩니다.'}
                  </pre>
                ) : (
                  renderWorkflowTextResult()
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function formatMetaValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatMetaValue(item))
      .filter((v): v is string => Boolean(v))
      .join(', ');
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildMetaSummary(meta?: Record<string, unknown>): string {
  if (!meta) {
    return '';
  }
  return Object.entries(meta)
    .slice(0, 3)
    .map(([key, value]) => `${key}=${formatMetaValue(value)}`)
    .join(', ');
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}
