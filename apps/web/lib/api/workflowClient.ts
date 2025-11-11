import {
  QnaResponse,
  QuizResponse,
  QuizType,
  RecommendProvider,
  RecommendResponse,
  SummaryResponse
} from '@to-learn/contracts';
import { API_BASE_URL } from './chatClient';

interface UploadResponse {
  text: string;
  meta: {
    filename: string;
    mimeType: string;
    wordCount: number;
  };
}

// Allow an explicit base override for non-chat APIs.
// Use when the chat URL is proxied differently or when deploying web and api on separate domains.
const EXPLICIT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const buildUrl = (path: string) => {
  const base = (EXPLICIT_API_BASE && EXPLICIT_API_BASE.length > 0) ? EXPLICIT_API_BASE : (API_BASE_URL || '/api');
  return `${base}${path}`;
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
};

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(buildUrl('/upload'), {
    method: 'POST',
    body: formData
  });

  return handleResponse<UploadResponse>(response);
}

export async function requestSummary(text: string, maxSentences: number): Promise<SummaryResponse> {
  const response = await fetch(buildUrl('/summary'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, maxSentences })
  });
  return handleResponse<SummaryResponse>(response);
}

export async function requestQna(text: string, count: number): Promise<QnaResponse> {
  const response = await fetch(buildUrl('/qna'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, count })
  });
  return handleResponse<QnaResponse>(response);
}

export async function requestQuiz(text: string, type: QuizType, count: number): Promise<QuizResponse> {
  const response = await fetch(buildUrl('/quiz'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, type, count })
  });
  return handleResponse<QuizResponse>(response);
}

export async function requestRecommendations(params: {
  topic?: string;
  keywords?: string[];
  limit: number;
  providers?: RecommendProvider[];
}): Promise<RecommendResponse> {
  const response = await fetch(buildUrl('/recommend'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return handleResponse<RecommendResponse>(response);
}

export type { UploadResponse };
