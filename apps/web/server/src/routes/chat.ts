import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import type { ChatRequest, ChatResponse, OutgoingMessage } from '../types';
import { ChatRequestSchema } from '../types';
import { insertConversation, insertMessage, fetchSuggestions } from '../db';
import { getOpenAI, mapModel } from '../services/openai';
import { fallbackSuggestions } from '../suggestions';

/**
 * 데모용 Chat Router
 * -----------------
 * Next.js 서버 액션 대신 별도 Express 서버를 돌릴 때 사용합니다.
 * OpenAI API 키가 없으면 mock 응답을 생성해 UI를 유지합니다.
 */
export const chatRouter = Router();

chatRouter.post('/chat', async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: parsed.error.flatten().formErrors.join(', ') }
    });
  }

  try {
    const result = await processChat(parsed.data);
    const suggestions = pickSuggestions();
    const response: ChatResponse = {
      conversationId: result.conversationId,
      messages: [result.message],
      suggestions
    };
    return res.json(response);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      error: {
        code: 'OPENAI_UPSTREAM_ERROR',
        message: error?.message ?? 'unknown error'
      }
    });
  }
});

chatRouter.post('/chat/stream', async (req, res) => {
  const parsed = ChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.writeHead(422, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(`data: ${JSON.stringify({ error: 'VALIDATION_ERROR' })}\n\n`);
    return res.end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  (res as any).flushHeaders?.();

  try {
    const result = await processChat(parsed.data);
    const suggestions = pickSuggestions();
    const chunks = chunkText(result.message.content);
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      await sleep(50);
    }
    res.write(
      `data: ${JSON.stringify({ done: true, conversationId: result.conversationId, message: result.message, suggestions })}\n\n`
    );
    res.end();
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error?.message ?? 'unknown error' })}\n\n`);
    res.end();
  }
});

function buildSystemPrompt(difficulty?: string, category?: string, topic?: string) {
  const diff = difficulty ?? '중';
  const cat = category ?? '금융경제용어';
  const lines = [
    '당신은 금융 에듀테크 튜터입니다.',
    `난이도: ${diff} | 카테고리: ${cat}${topic ? ` | 토픽: ${topic}` : ''}.`,
    '문제는 단계별 풀이와 핵심 요약을 포함하세요. 필요한 경우 간단한 숫자 예시를 추가하세요.'
  ];
  return lines.join('\n');
}

function buildMockContent(message: string) {
  const q = message.toLowerCase();
  if (q.includes('dcf') || q.includes('가치')) {
    return '모의 응답: DCF는 현금흐름 추정과 할인율이 핵심입니다. 1) FCF 추정 2) WACC 계산 3) 멀티플과 교차검증.';
  }
  if (q.includes('리스크') || q.includes('risk')) {
    return '모의 응답: 리스크 관리는 익스포저 파악 → 스트레스 시나리오 → 완충자본 점검 순으로 진행하세요.';
  }
  return '모의 응답: 질문을 잘 받았습니다. 모델 연결 시 더 정교한 예시와 함께 해설을 제공합니다.';
}

async function processChat(body: ChatRequest): Promise<{ conversationId: string; message: OutgoingMessage }> {
  const now = new Date().toISOString();
  const conversationId = body.conversationId ?? uuid();
  if (!body.conversationId) {
    insertConversation({
      id: conversationId,
      created_at: now,
      model: body.metadata?.model,
      difficulty: body.metadata?.difficulty,
      category: body.metadata?.category,
      source: body.metadata?.source,
      topic: body.metadata?.topic
    });
  }

  const userMessageId = uuid();
  insertMessage({
    id: userMessageId,
    conversation_id: conversationId,
    role: 'user',
    content: body.message,
    created_at: now
  });

  const client = getOpenAI();
  const model = mapModel(body.metadata?.model);

  let assistantText: string;
  if (client) {
    const prompt = buildSystemPrompt(body.metadata?.difficulty, body.metadata?.category, body.metadata?.topic);
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: body.message }
      ],
      temperature: 0.7
    });
    assistantText = completion.choices?.[0]?.message?.content ?? '죄송합니다. 응답을 생성하지 못했습니다.';
  } else {
    assistantText = buildMockContent(body.message);
  }

  const assistantId = uuid();
  const createdAt = new Date().toISOString();
  insertMessage({
    id: assistantId,
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantText,
    created_at: createdAt
  });

  return {
    conversationId,
    message: { id: assistantId, role: 'assistant', content: assistantText, createdAt }
  };
}

function pickSuggestions() {
  const dbSuggestions = fetchSuggestions(3);
  return (dbSuggestions.length ? dbSuggestions : fallbackSuggestions).map((suggestion) => ({
    id: suggestion.id,
    label: suggestion.label,
    prompt: suggestion.prompt
  }));
}

function chunkText(text: string) {
  const size = 60;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks.length ? chunks : [''];
}

// Streaming 데모를 위해 응답을 일정 간격으로 나누어 전송합니다.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
