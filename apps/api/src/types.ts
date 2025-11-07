import type { Category, ChatMetadata, ChatRequestBody, Difficulty } from '@fin-one/contracts';

export {
  CategoryEnum,
  ChatMetadataSchema,
  ChatRequestSchema,
  DifficultyEnum
} from '@fin-one/contracts';
export type { Category, ChatMetadata, ChatRequestBody, Difficulty } from '@fin-one/contracts';

export interface ConversationRecord {
  id: string;
  createdAt: string;
  model?: string | null;
  difficulty?: Difficulty | null;
  category?: Category | null;
  source?: string | null;
  topic?: string | null;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SuggestionRecord {
  id: string;
  label: string;
  prompt: string;
  category?: Category | null;
  weight: number;
}
