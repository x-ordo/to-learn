import type { ChatMessage } from '@to-learn/contracts';

type Conversation = {
  id: string;
  createdAt: string;
  userId?: string | null;
  model?: string | null;
  difficulty?: string | null;
  category?: string | null;
  source?: string | null;
  topic?: string | null;
};

type ListResponse = { items: Conversation[] };
type GetResponse = { conversation: Conversation; messages: ChatMessage[] };

const EXPLICIT_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

const deriveBaseFromChat = () => {
  const chat = process.env.NEXT_PUBLIC_CHAT_API_URL;
  if (!chat) return '/api';
  const normalized = chat.replace(/\/chat(?:\/.*)?$/i, '');
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const API_BASE = EXPLICIT_API_BASE && EXPLICIT_API_BASE.length > 0 ? EXPLICIT_API_BASE : deriveBaseFromChat();

const buildUrl = (path: string) => `${API_BASE}${path}`;

export async function listConversations(limit = 20): Promise<Conversation[]> {
  const res = await fetch(buildUrl(`/conversations?limit=${encodeURIComponent(limit)}`), {
    credentials: 'include'
  });
  if (!res.ok) return [];
  const data = (await res.json()) as ListResponse;
  return data.items ?? [];
}

export async function getConversation(id: string): Promise<GetResponse | null> {
  const res = await fetch(buildUrl(`/conversations/${encodeURIComponent(id)}`), {
    credentials: 'include'
  });
  if (!res.ok) return null;
  return (await res.json()) as GetResponse;
}

export type { Conversation };

