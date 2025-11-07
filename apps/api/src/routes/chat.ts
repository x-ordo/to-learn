import { Router } from 'express';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import { ensureConversation, listMessages, saveMessage } from '../db';
import { ChatRequestSchema } from '../types';
import { config } from '../env';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../middleware/errorHandler';
import { buildMessagesForOpenAI } from '../utils/prompts';
import { createChatCompletion, createChatCompletionStream, resolveModel } from '../services/openai';
import { getSuggestionsForCategory } from '../services/suggestions';
import { invokeN8nChat } from '../services/n8n';

// 채팅 관련 라우터. 비스트리밍/스트리밍(SSE) 모두 동일한 요청/응답 계약을 따릅니다.
const router = Router();

// OpenAI SDK의 응답 조각에서 텍스트만 안전하게 추출합니다.
const parseAssistantContent = (chunk?: string | Array<{ text?: string }>): string => {
  if (!chunk) {
    return '';
  }
  if (typeof chunk === 'string') {
    return chunk;
  }
  return chunk.map((part) => part.text ?? '').join('');
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    // 요청 바디 유효성 검사(Zod)
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((issue) => issue.message).join(', '),
          details: parsed.error.flatten()
        }
      });
    }

    const { conversationId, message, metadata } = parsed.data;

    // 대화 레코드 생성/업서트(모델/난이도/카테고리 등 메타데이터 반영)
    const conversation = ensureConversation({
      conversationId,
      model: metadata?.model ? resolveModel(metadata.model) : undefined,
      difficulty: metadata?.difficulty,
      category: metadata?.category,
      source: metadata?.source,
      topic: metadata?.topic
    });

    saveMessage({ conversationId: conversation.id, role: 'user', content: message });

    // 최근 30개 메시지를 히스토리로 사용(프롬프트 빌드에 사용)
    const history = listMessages(conversation.id, 30);

    // n8n 모드: 외부 워크플로우로 위임하여 동기 응답 수신
    if (config.chatProvider === 'n8n') {
      const n8nResponse = await invokeN8nChat({
        request: { ...parsed.data, conversationId: conversation.id },
        conversation,
        history
      });

      const assistantMessages = n8nResponse.messages
        .filter((message) => message.role === 'assistant')
        .map((message) =>
          saveMessage({ conversationId: conversation.id, role: 'assistant', content: message.content })
        );

      if (!assistantMessages.length) {
        throw new ApiError(502, 'N8N_EMPTY_RESPONSE', 'n8n 응답에 assistant 메시지가 없습니다.');
      }

      const suggestions =
        n8nResponse.suggestions && n8nResponse.suggestions.length > 0
          ? n8nResponse.suggestions
          : getSuggestionsForCategory(metadata?.category);

      return res.json({
        conversationId: conversation.id,
        messages: assistantMessages,
        suggestions
      });
    }

    // OpenAI 모드: 단발 요청으로 응답 생성
    try {
      const completion = await createChatCompletion({
        model: conversation.model ?? metadata?.model,
        messages: buildMessagesForOpenAI({ history, metadata })
      });

      const content = parseAssistantContent(completion.choices[0]?.message?.content as any);

      if (!content.trim()) {
        throw new ApiError(502, 'OPENAI_UPSTREAM_ERROR', '어시스턴트 응답이 비어 있습니다.');
      }

      const assistantMessage = saveMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content
      });

      const suggestions = getSuggestionsForCategory(metadata?.category);

      return res.json({
        conversationId: conversation.id,
        messages: [assistantMessage],
        suggestions: suggestions.length ? suggestions : undefined
      });
    } catch (error) {
      throw new ApiError(502, 'OPENAI_UPSTREAM_ERROR', (error as Error).message, error);
    }
  })
);

router.post(
  '/stream',
  asyncHandler(async (req, res) => {
    // 요청 바디 유효성 검사
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: parsed.error.issues.map((issue) => issue.message).join(', '),
            details: parsed.error.flatten()
          }
        })
      );
    }

    const { conversationId, message, metadata } = parsed.data;
    const controller = new AbortController(); // 클라이언트 종료 시 업스트림 취소

    req.on('close', () => controller.abort());

    const conversation = ensureConversation({
      conversationId,
      model: metadata?.model ? resolveModel(metadata.model) : undefined,
      difficulty: metadata?.difficulty,
      category: metadata?.category,
      source: metadata?.source,
      topic: metadata?.topic
    });

    saveMessage({ conversationId: conversation.id, role: 'user', content: message });
    const history = listMessages(conversation.id, 30);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });

    const sendEvent = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // n8n 모드에서는 스트리밍을 흉내내되, 완료 한 번만 전송합니다.
    if (config.chatProvider === 'n8n') {
      try {
        const n8nResponse = await invokeN8nChat({
          request: { ...parsed.data, conversationId: conversation.id },
          conversation,
          history
        });

        const assistantMessages = n8nResponse.messages
          .filter((message) => message.role === 'assistant')
          .map((message) =>
            saveMessage({ conversationId: conversation.id, role: 'assistant', content: message.content })
          );

        const finalMessage = assistantMessages[assistantMessages.length - 1];
        if (!finalMessage) {
          throw new ApiError(502, 'N8N_EMPTY_RESPONSE', 'n8n 응답에 assistant 메시지가 없습니다.');
        }

        const suggestions =
          n8nResponse.suggestions && n8nResponse.suggestions.length > 0
            ? n8nResponse.suggestions
            : getSuggestionsForCategory(metadata?.category);

        sendEvent({ done: true, message: finalMessage, suggestions });
        return res.end();
      } catch (error) {
        res.write(`event: error\n`);
        sendEvent({
          error: {
            code: 'N8N_ERROR',
            message: (error as Error).message
          }
        });
        return res.end();
      }
    }

    try {
      const stream = await createChatCompletionStream({
        model: conversation.model ?? metadata?.model,
        messages: buildMessagesForOpenAI({ history, metadata }),
        signal: controller.signal
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const choice = (chunk as ChatCompletionChunk).choices?.[0];
        const delta = parseAssistantContent(choice?.delta?.content as any);
        if (delta) {
          fullContent += delta;
          sendEvent({ delta });
        }
      }

      if (!fullContent.trim()) {
        throw new ApiError(502, 'OPENAI_UPSTREAM_ERROR', '어시스턴트 응답이 비어 있습니다.');
      }

      const assistantMessage = saveMessage({
        conversationId: conversation.id,
        role: 'assistant',
        content: fullContent
      });

      sendEvent({
        done: true,
        message: assistantMessage,
        suggestions: getSuggestionsForCategory(metadata?.category)
      });
      res.end();
    } catch (error) {
      res.write(`event: error\n`);
      sendEvent({
        error: {
          code: 'OPENAI_UPSTREAM_ERROR',
          message: (error as Error).message
        }
      });
      res.end();
    }
  })
);

export const chatRouter = router;
