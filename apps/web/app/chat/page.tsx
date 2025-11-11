'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { sendChatMessage, getDefaultSuggestions } from '../../lib/api/chatClient';
import { listConversations, getConversation, type Conversation } from '../../lib/api/conversationClient';
import { me } from '../../lib/api/authClient';
import { useRouter } from 'next/navigation';
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
    '안녕하세요! 금융 전문가로 가는 길, 투런 AI 코치가 함께합니다.\n\n학습 목표, 준비 중인 시험, 또는 궁금한 금융 주제를 알려주시면, 맞춤형 학습 콘텐츠를 만들어 드릴게요.'
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
type QuickAction = { id: string; label: string; mode: WorkflowTab };
type RecommendationInsight = {
  title: string;
  link: string;
  reason: string;
  source: string;
  isExample?: boolean;
};

const quizDefaultState = {
  active: null as QuizResponse | null,
  index: 0,
  mode: 'objective' as 'objective' | 'subjective'
};

const providerBadgeLabels: Record<RecommendProvider, string> = {
  tavily: 'Tavily',
  dart: 'DART',
  kif_edu: '금융교육'
};

const summarizeInstructions = (text: string) => {
  const header = [
    '아래 내용을 금융/재무 관점에서만 5줄 bullet 형식으로 요약해주세요.',
    '- 각 줄은 12~18단어 이내로 핵심 금융 인사이트만 남깁니다.',
    '- 수치, 리스크, 시그널, 정책 변화 등 금융 관련 정보에 우선순위를 둡니다.',
    '- 금융과 무관하거나 정보가 부족하면 "금융 관점 정보 없음"이라고 명시합니다.',
    '- 인사말/불필요한 설명은 제외하세요.'
  ].join('\n');
  return `${header}\n\n${text}`;
};

const deriveTopicLabels = (content: string): string[] => {
  const sanitized = content.replace(/\s+/g, ' ').trim();
  if (!sanitized) return [];
  const snippet = sanitized.length > 48 ? `${sanitized.slice(0, 48).trim()}…` : sanitized;
  return [snippet];
};

const buildChatFinancialSummary = (lines: string[]) => {
  if (!lines.length) return '';
  const merged = lines.join(' ').replace(/\s+/g, ' ').trim();
  if (!merged) return '';
  const limit = 100;
  const snippet = merged.length > limit ? `${merged.slice(0, limit).trim()}…` : merged;
  return `[금융 요약] ${snippet}`;
};

const buildQnaMessage = (qna: QnaResponse) => {
  if (!qna.items?.length) return '';
  const rows = qna.items
    .map((item, index) => `Q${index + 1}. ${item.q}\nA${index + 1}. ${item.a}`)
    .join('\n\n');
  return ['[Q&A 결과]', rows].join('\n\n');
};

const buildQuizMessage = (quiz: QuizResponse) => {
  if (!quiz.problems?.length) return '';
  const rows = quiz.problems
    .map((problem, index) => {
      const choices = problem.choices ? `\n보기: ${problem.choices.join(' / ')}` : '';
      return `문제 ${index + 1} (${problem.type})\n${problem.question}${choices}\n정답: ${problem.answer}`;
    })
    .join('\n\n');
  return ['[퀴즈 결과]', rows].join('\n\n');
};

const truncateText = (value: string, limit = 90) => {
  if (!value) return '';
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 3).trim()}...`;
};

const normalizeAnswer = (value?: string) => value?.trim().toLowerCase() ?? '';

const extractKeywords = (text: string, limit = 4) =>
  text
    .split(/[^a-zA-Z가-힣0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .slice(0, limit);

const aggregateRecommendations = async (params: { topic: string; keywords?: string[]; limit: number }) => {
  const { topic, keywords, limit } = params;

  const responses: RecommendResponse[] = [];

  try {
    const main = await requestRecommendations({
      topic,
      keywords,
      limit: Math.max(1, limit),
      providers: ['tavily']
    });
    responses.push(main);
  } catch (error) {
    console.warn('tavily recommendation failed', error);
  }

  try {
    const dart = await requestRecommendations({
      topic,
      keywords,
      limit: 1,
      providers: ['dart']
    });
    responses.push(dart);
  } catch (error) {
    console.warn('dart recommendation failed', error);
  }

  return {
    items: responses.flatMap((response) => response?.items ?? [])
  } as RecommendResponse;
};

const prepareRecommendation = (rec: RecommendResponse): {
  message: string;
  insights: RecommendationInsight[];
} => {
  const learning = (rec.items ?? []).filter((item) => item.source !== 'dart');
  const dartExamples = (rec.items ?? []).filter((item) => item.source === 'dart');

  const normalize = (items: typeof learning, isExample = false): RecommendationInsight[] =>
    items.map((item) => ({
      title: item.title,
      link: item.link ?? (item as { url?: string }).url ?? '',
      reason: truncateText(item.reason ?? '', 85),
      source: providerBadgeLabels[item.source as RecommendProvider] ?? item.source ?? '기타',
      isExample
    }));

  const selectedLearning = normalize(learning, false).slice(0, 3);
  const example = dartExamples.length ? normalize([dartExamples[0]], true) : [];
  const combined = [...selectedLearning, ...example];

  if (!combined.length) {
    return {
      message: '[]\n추천 항목을 불러오지 못했습니다.',
      insights: []
    };
  }

  const rows = combined.map((item, index) => {
    const prefix = `${index + 1}. ${item.isExample ? '(예시) ' : ''}${item.title}`;
    const linkLine = item.link ? `- 링크: ${item.link}` : undefined;
    return [prefix, `- 출처: ${item.source}`, `- 요약: ${item.reason}`, linkLine].filter(Boolean).join('\n');
  });

  return {
    message: ['[]', ...rows].join('\n'),
    insights: combined
  };
};

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
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>(getDefaultSuggestions());
  const [topicButtons, setTopicButtons] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState(modelOptions[0]?.value ?? 'openai-gpt-4o-mini');
  const [difficulty, setDifficulty] = useState<Difficulty>('중');
  const [category, setCategory] = useState<Category>('금융경제용어');
  const [openMenu, setOpenMenu] = useState<MenuType | null>(null);
  const [documentText, setDocumentText] = useState('');
  const [uploadMeta, setUploadMeta] = useState<UploadResponse['meta'] | null>(null);
  const [summaryLines, setSummaryLines] = useState(5);
  const [qnaCount, setQnaCount] = useState(3);
  const [quizMode, setQuizMode] = useState<QuizType>('objective');
  const [quizCount, setQuizCount] = useState(3);
  const [recommendLimit, setRecommendLimit] = useState(3);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summaryInsights, setSummaryInsights] = useState<string[] | null>(null);
  const [recommendInsights, setRecommendInsights] = useState<RecommendationInsight[] | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<QuizResponse | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState(0);
  const [quizAnswerMode, setQuizAnswerMode] = useState<'objective' | 'subjective'>('objective');
  const [quizSubjectiveAnswer, setQuizSubjectiveAnswer] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const appendAssistantMessage = (content: string) => {
    if (!content) return;
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: 'assistant',
        createdAt: new Date().toISOString(),
        content
      }
    ]);
  };

  const appendUserMessage = (content: string) => {
    if (!content) return;
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role: 'user',
        createdAt: new Date().toISOString(),
        content
      }
    ]);
  };

  const updateTopicButtons = (content: string) => {
    const labels = deriveTopicLabels(content);
    if (labels.length === 0) {
      return;
    }

    setTopicButtons((prev) => {
      const merged = [...prev];
      labels.forEach((label) => {
        if (!merged.includes(label)) {
          merged.push(label);
        }
      });
      return merged.slice(-6);
    });
  };

  const buildConversationTopic = () => {
    const recentUserMessages = messages
      .filter((message) => message.role === 'user' && message.content.trim().length > 0)
      .slice(-5)
      .map((message) => message.content.trim());
    return recentUserMessages.join('\n');
  };

  const currentQuizProblem = activeQuiz?.problems?.[activeQuizIndex];

  const cancelQuizSession = (silent = false) => {
    if (!activeQuiz) {
      setActiveQuiz(null);
      setActiveQuizIndex(0);
      setQuizAnswerMode('objective');
      setQuizSubjectiveAnswer('');
      return;
    }
    setActiveQuiz(null);
    setActiveQuizIndex(0);
    setQuizAnswerMode('objective');
    setQuizSubjectiveAnswer('');
    if (!silent) {
      appendAssistantMessage('퀴즈가 종료되었어요. 다른 주제로 학습을 이어가 볼까요?');
    }
  };

  const advanceQuiz = () => {
    if (!activeQuiz) return;
    if (activeQuizIndex + 1 < activeQuiz.problems.length) {
      const nextIndex = activeQuizIndex + 1;
      setActiveQuizIndex(nextIndex);
      const nextProblem = activeQuiz.problems[nextIndex];
      setQuizAnswerMode(nextProblem?.choices && nextProblem.choices.length > 0 ? 'objective' : 'subjective');
      setQuizSubjectiveAnswer('');
    } else {
      cancelQuizSession(true);
      appendAssistantMessage('[퀴즈 완료] 모든 문제를 푸셨네요! 정말 대단해요. 다음 학습 주제를 알려주세요.');
    }
  };

  const handleQuizChoiceAnswer = (choice: string) => {
    if (!currentQuizProblem) return;
    const questionNumber = activeQuizIndex + 1;
    const normalizedChoice = normalizeAnswer(choice);
    const normalizedAnswer = normalizeAnswer(currentQuizProblem.answer);
    const isCorrect = normalizedChoice === normalizedAnswer;

    appendUserMessage(`퀴즈 Q${questionNumber} 객관식 답변: ${choice}`);

    const feedbackLines = [
      `퀴즈 Q${questionNumber} 결과 ${isCorrect ? '✅ 정답입니다.' : '❌ 오답입니다.'}`,
      `- 선택한 답: ${choice}`,
      currentQuizProblem.answer ? `- 정답: ${currentQuizProblem.answer}` : undefined,
      currentQuizProblem.explanation ? `- 설명: ${currentQuizProblem.explanation}` : undefined
    ].filter(Boolean) as string[];
    appendAssistantMessage(feedbackLines.join('\n'));

    setQuizAnswerMode('objective');
    advanceQuiz();
  };

  const handleQuizSubjectiveSubmit = () => {
    if (!currentQuizProblem) return;
    const trimmed = quizSubjectiveAnswer.trim();
    if (!trimmed) {
      setWorkflowError('답변을 입력하고 제출 버튼을 눌러주세요.');
      return;
    }
    const questionNumber = activeQuizIndex + 1;
    appendUserMessage(`퀴즈 Q${questionNumber} 주관식 답변: ${trimmed}`);

    const feedbackLines = [
      `퀴즈 Q${questionNumber} 주관식 답변을 접수했습니다.`,
      `- 입력한 답: ${trimmed}`,
      currentQuizProblem.answer ? `- 정답 안내: ${currentQuizProblem.answer}` : undefined,
      currentQuizProblem.explanation ? `- 설명: ${currentQuizProblem.explanation}` : undefined
    ].filter(Boolean) as string[];
    appendAssistantMessage(feedbackLines.join('\n'));

    setQuizSubjectiveAnswer('');
    setQuizAnswerMode('subjective');
    advanceQuiz();
  };

  const handleQuizCancelClick = () => cancelQuizSession(false);


  const pickQuickActionText = () => {
    const trimmedDoc = documentText.trim();
    if (trimmedDoc.length > 0) {
      return trimmedDoc;
    }
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user' && message.content.trim().length > 0);
    if (lastUserMessage) {
      return lastUserMessage.content.trim();
    }
    if (inputValue.trim().length > 0) {
      return inputValue.trim();
    }
    return '';
  };

  const shouldSummarize = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return lines.length >= 10;
  };
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_REQUIRE_LOGIN === '1') {
      me().then((resp) => {
        if (!resp) router.replace('/login');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 내 대화 목록 로딩(로그인 상태에서만 결과 반환; 미인증이면 빈 배열)
  useEffect(() => {
    void (async () => {
      try {
        const items = await listConversations(20);
        setConversations(items);
      } catch {
        setConversations([]);
      }
    })();
  }, []);
  const quickActions: QuickAction[] = [
    { id: 'quick-qna', label: 'Q&A', mode: 'qna' },
    { id: 'quick-quiz', label: 'Quiz', mode: 'quiz' }
  ];
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
  const dispatchUserMessage = async (content: string, displayContent?: string) => {
    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: displayContent ?? content,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    updateTopicButtons(content);
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
    // 자동 추천 실행(사용자 입력을 주제로)
    void runAutoRecommendFromMessage(content);
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
    setInputValue('');
    void dispatchUserMessage(suggestion.prompt);
  };

  const handleQuickAction = async (action: QuickAction) => {
    if (isWorkflowRunning || isUploading || isLoading) {
      return;
    }

    const baseText = pickQuickActionText();
    if (baseText.length === 0) {
      setWorkflowError('자동 기능을 사용하려면 분석할 문서나 질문 내용이 필요해요.');
      return;
    }

    setWorkflowError(null);
    setIsWorkflowRunning(true);

    try {
      if (action.mode === 'qna') {
        const count = Math.max(1, Math.min(qnaCount, 10));
        setQnaCount(count);
        const result = await requestQna(baseText, count);
        appendAssistantMessage(buildQnaMessage(result));
      } else {
        const count = Math.max(3, Math.min(quizCount, 5));
        setQuizCount(count);
        const result = await requestQuiz(baseText, quizMode, count);
        if (result.problems?.length) {
          setActiveQuiz(result);
          setActiveQuizIndex(0);
          setQuizAnswerMode(result.problems[0]?.choices?.length ? 'objective' : 'subjective');
          setQuizSubjectiveAnswer('');
          appendAssistantMessage(
            `[퀴즈 시작] ${result.problems.length}개의 문제가 준비되었어요. 첫 번째 문제부터 시작해볼까요?`
          );
        } else {
          appendAssistantMessage('[퀴즈 결과] 생성된 문제가 없습니다. 다른 질문으로 다시 시도해보세요.');
        }
      }
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : '자동 워크플로우 실행에 실패했습니다.');
    } finally {
      setIsWorkflowRunning(false);
    }
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
      // 채팅 스트림에도 안내 메시지 삽입
      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          createdAt: new Date().toISOString(),
          content: '문서가 안전하게 업로드되었어요. 잠시 후 분석 결과를 보여드릴게요.'
        }
      ]);
      setIsWorkflowRunning(true);
      if (shouldSummarize(uploaded.text)) {
        const maxLines = Math.max(1, Math.min(summaryLines, 5));
        setSummaryLines(maxLines);
        const summary = await requestSummary(summarizeInstructions(uploaded.text), maxLines);
        const lines = (summary.summary ?? []).slice(0, 5);
        setSummaryInsights(lines.length ? lines : null);
        const chatSummary = buildChatFinancialSummary(lines);
        if (chatSummary) {
          appendAssistantMessage(chatSummary);
        }
      } else {
        setSummaryInsights(null);
      }
      // 간단 추천 자동 실행(파일명 기반 주제)
      const topic = (uploaded.meta?.filename || '').replace(/\.[a-zA-Z0-9]+$/, '');
      if (topic) {
        const rec = await aggregateRecommendations({ topic: topic.slice(0, 120), keywords: extractKeywords(uploaded.text), limit: Math.max(1, Math.min(recommendLimit, 5)) });
        const prepared = prepareRecommendation(rec);
        setRecommendInsights(prepared.insights.length ? prepared.insights : null);
      }
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : '파일 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
      setIsWorkflowRunning(false);
      event.target.value = '';
    }
  };

  const openConversation = async (id: string) => {
    try {
      const data = await getConversation(id);
      if (!data) return;
      cancelQuizSession(true);
      setConversationId(data.conversation.id);
      setMessages([initialMessage, ...data.messages]);
    } catch (e) {
      console.warn('failed to open conversation', e);
    }
  };

  // 채팅 전송 후 자동 추천 실행(사용자 입력을 주제로 사용)
  const runAutoRecommendFromMessage = async (text: string) => {
    if (isWorkflowRunning) return;
    try {
      const limit = Math.max(1, Math.min(recommendLimit, 5));
      const keywords = extractKeywords(text);
      const rec = await aggregateRecommendations({ topic: text.slice(0, 120), keywords, limit });
      const prepared = prepareRecommendation(rec);
      setRecommendInsights(prepared.insights.length ? prepared.insights : null);
    } catch (error) {
      // 조용히 실패
      console.warn('auto recommend failed', error);
    }
  };

  const handleConversationRecommendation = async () => {
    if (isWorkflowRunning) return;
    const topic = buildConversationTopic();
    if (!topic || topic.length < 4) {
      setWorkflowError('대화 내용이 충분하지 않아요. 몇 가지 질문을 더 한 뒤 추천을 요청해주세요.');
      return;
    }

    setWorkflowError(null);
    setIsWorkflowRunning(true);
    try {
      const limit = Math.max(1, Math.min(recommendLimit, 5));
      const keywords = extractKeywords(topic);
      const rec = await aggregateRecommendations({
        topic: topic.slice(0, 120),
        keywords: keywords.length ? keywords : undefined,
        limit
      });
      const prepared = prepareRecommendation(rec);
      setRecommendInsights(prepared.insights.length ? prepared.insights : null);
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : '추천 자료 생성을 실패했습니다.');
    } finally {
      setIsWorkflowRunning(false);
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
              원하는 학습 목표를 선택하거나, 자유롭게 질문을 입력해보세요. 학습 설정(모델,
              난이도, 카테고리)은 아래 도구 막대에서 언제든 변경할 수 있어요.
            </p>
          </div>
          {conversations.length > 0 && (
            <div className={styles.conversationSection}>
              <h3 className={styles.sidebarSubheading}>내 대화</h3>
              <div className={styles.conversationList}>
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.conversationItem}
                    onClick={() => openConversation(c.id)}
                    title={c.id}
                  >
                    <p className={styles.conversationTitle}>{c.topic?.trim() || `대화 ${c.id.slice(0, 6)}`}</p>
                    <p className={styles.conversationMeta}>{new Date(c.createdAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          {summaryInsights && (
            <div className={styles.insightCard}>
              <h3 className={styles.sidebarSubheading}>요약 하이라이트</h3>
              <ul className={styles.insightList}>
                {summaryInsights.map((line, index) => (
                  <li key={`summary-insight-${index}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <div className={styles.insightCard}>
            <div className={styles.recommendHeaderRow}>
              <h3 className={styles.sidebarSubheading}>추천 자료</h3>
              <button
                type="button"
                className={styles.refreshInsightsButton}
                onClick={handleConversationRecommendation}
                disabled={isWorkflowRunning}
              >
                대화 기반 추천 받기
              </button>
            </div>
            {recommendInsights ? (
              <ul className={styles.recommendInsightList}>
                {recommendInsights.map((item, index) => (
                  <li key={`recommend-insight-${index}`}>
                    {item.link ? (
                      <a href={item.link} target="_blank" rel="noreferrer">
                        {item.isExample ? '(예시) ' : ''}
                        {item.title}
                      </a>
                    ) : (
                      <strong>
                        {item.isExample ? '(예시) ' : ''}
                        {item.title}
                      </strong>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.workflowPlaceholder}>대화 기반 추천 자료가 여기에 표시됩니다.</p>
            )}
          </div>
          {topicButtons.length > 0 && (
            <div className={styles.topicButtons}>
              {topicButtons.map((topic) => (
                <button
                  key={`topic-${topic}`}
                  type="button"
                  className={styles.topicButton}
                  onClick={() => setInputValue(topic)}
                >
                  {topic}
                </button>
              ))}
            </div>
          )}
          <div className={styles.suggestions}>
            {suggestions.slice(0, 1).map((suggestion) => (
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
              {isLoading ? '답변을 준비하고 있어요...' : '무엇이든 물어보세요!'}
            </span>
          </header>

          <div className={styles.messages}>
            {messages.length === 0 && !isLoading ? (
              <div className={styles.emptyState}>
                <h2>첫 질문으로 학습을 시작해보세요!</h2>
                <p>학습 목표에 맞춰 AI가 생성하는 맞춤형 문제와 풀이 전략으로 실력을 키워보세요.</p>
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
              <p className={styles.typingText}>AI가 답변을 열심히 준비하고 있어요...</p>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 상단 빠른 액션 */}
          <div className={styles.quickActions}>
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={styles.quickActionButton}
                disabled={isLoading || isWorkflowRunning || isUploading}
                onClick={() => handleQuickAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
          {currentQuizProblem && (
            <div className={styles.quizActivePanel}>
              <div className={styles.quizActiveHeader}>
                <div>
                  <span className={styles.quizActiveLabel}>진행 중 퀴즈</span>
                  <p className={styles.quizActiveProgress}>
                    문제 {activeQuizIndex + 1} / {activeQuiz?.problems?.length ?? 0}
                  </p>
                  <span className={styles.quizModeBadge}>{quizAnswerMode === 'objective' ? '객관식' : '주관식'}</span>
                </div>
                <button type="button" className={styles.quizCancelButton} onClick={handleQuizCancelClick}>
                  종료
                </button>
              </div>
              <p className={styles.quizQuestion}>{currentQuizProblem.question}</p>
              {currentQuizProblem.choices && currentQuizProblem.choices.length > 0 && (
                <div className={styles.quizChoiceList}>
                  {currentQuizProblem.choices.map((choice) => (
                    <button
                      key={`${currentQuizProblem.question}-${choice}`}
                      type="button"
                      className={styles.quizChoiceButton}
                      onClick={() => handleQuizChoiceAnswer(choice)}
                      disabled={isWorkflowRunning}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.quizSubjectiveBlock}>
                <textarea
                  className={styles.quizSubjectiveInput}
                  placeholder="주관식 답변을 간단히 입력하고 제출 버튼을 눌러주세요."
                  rows={2}
                  value={quizSubjectiveAnswer}
                  onChange={(event) => {
                    setQuizSubjectiveAnswer(event.target.value);
                    setQuizAnswerMode('subjective');
                  }}
                />
                <button
                  type="button"
                  className={styles.quizSubjectiveButton}
                  onClick={handleQuizSubjectiveSubmit}
                  disabled={isWorkflowRunning || quizSubjectiveAnswer.trim().length === 0}
                >
                  주관식 답변 제출
                </button>
              </div>
            </div>
          )}
          {workflowError && <p className={styles.workflowError}>{workflowError}</p>}

          <form className={styles.inputBar} onSubmit={handleSubmit}>
            <label className={styles.uploadChip}>
              📎 문서 업로드
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={handleDocumentUpload}
                disabled={isUploading || isWorkflowRunning || isLoading}
              />
            </label>
            <div className={styles.textareaWrapper}>
              <textarea
                className={styles.textarea}
                placeholder="궁금한 금융 지식, 지금 바로 질문해보세요!"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isLoading || inputValue.trim().length === 0}
            >
              전송
            </button>
          </form>
          {uploadMeta && (
            <p className={styles.uploadMetaInline}>
              {uploadMeta.filename} · {uploadMeta.wordCount.toLocaleString()} words
            </p>
          )}

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
