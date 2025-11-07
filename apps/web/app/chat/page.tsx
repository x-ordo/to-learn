'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { sendChatMessage, getDefaultSuggestions } from '../../lib/api/chatClient';
import { ChatMessage, ChatSuggestion, Category, Difficulty } from '@to-learn/contracts';
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

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
            SQLite에 저장된 학습 이력으로 맞춤형 추천이 업데이트됩니다. 백엔드를 연결하면 팀
            학습 리포트도 자동으로 생성돼요.
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
      </div>
    </>
  );
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}
