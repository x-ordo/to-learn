import { z } from 'zod';

export const ChatRequestSchema = z.object({
  conversationId: z.string().min(1).optional(),
  message: z.string().min(1, 'message is required'),
  metadata: z
    .object({
      source: z.string().optional(),
      topic: z.string().optional(),
      model: z.string().optional(),
      difficulty: z.enum(['하', '중', '상']).optional(),
      category: z.enum(['금융경제용어', '재무제표']).optional()
    })
    .optional()
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export type StoredMessage = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
};

export type OutgoingMessage = {
  id: string;
  role: 'assistant';
  content: string;
  createdAt: string;
};

export type Suggestion = {
  id: string;
  label: string;
  prompt: string;
  category?: string;
};

export type ChatResponse = {
  conversationId: string;
  messages: OutgoingMessage[];
  suggestions?: Suggestion[];
};

