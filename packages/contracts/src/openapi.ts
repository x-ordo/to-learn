import { OpenAPIV3 } from 'openapi-types';

// OpenAPI 문서 — n8n OpenAPI 노드로 임포트하거나 Swagger UI(`/docs`)에 노출됩니다.
// contracts/chat.ts의 스키마와 의미상 동일하게 유지하되,
// 외부 도구 호환성을 위해 OpenAPI 표준 스키마로 표현합니다.

const components: OpenAPIV3.ComponentsObject = {
  schemas: {
    Metadata: {
      type: 'object',
      properties: {
        source: { type: 'string', example: 'library' },
        topic: { type: 'string', example: 'DCF' },
        model: { type: 'string', example: 'openai-gpt-4o-mini' },
        difficulty: { type: 'string', enum: ['하', '중', '상'] },
        category: { type: 'string', enum: ['금융경제용어', '재무제표'] }
      }
    },
    ChatRequest: {
      type: 'object',
      required: ['message'],
      properties: {
        conversationId: { type: 'string', format: 'uuid', nullable: true },
        message: { type: 'string', minLength: 1, example: 'DCF 핵심 가정 알려줘' },
        metadata: { $ref: '#/components/schemas/Metadata' }
      }
    },
    Message: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'msg_123' },
        role: { type: 'string', enum: ['assistant'], example: 'assistant' },
        content: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    },
    Suggestion: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        prompt: { type: 'string' },
        category: { type: 'string' },
        weight: { type: 'integer' }
      }
    },
    ChatResponse: {
      type: 'object',
      properties: {
        conversationId: { type: 'string' },
        messages: {
          type: 'array',
          items: { $ref: '#/components/schemas/Message' }
        },
        suggestions: {
          type: 'array',
          items: { $ref: '#/components/schemas/Suggestion' }
        }
      }
    },
    ErrorResponse: {
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string' },
            details: {}
          }
        }
      }
    }
  }
};

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'To-Learn Chatbot API',
    version: '1.0.0',
    description: 'Express + SQLite chatbot backend powering the To-Learn Next.js frontend.'
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local dev' },
    {
      url: 'https://{renderSubdomain}.onrender.com',
      description: 'Render deployment',
      variables: {
        renderSubdomain: { default: 'to-learn-server' }
      }
    }
  ],
  components,
  paths: {
    '/_health': {
      get: {
        summary: 'Health probe',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/chat': {
      post: {
        summary: 'Create a non-streaming assistant response',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Assistant response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatResponse' }
              }
            }
          },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
            }
          },
          '502': {
            description: 'Upstream model failure',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
            }
          }
        }
      }
    },
    '/api/chat/stream': {
      post: {
        summary: 'Create a streaming assistant response (SSE)',
        description:
          'Streams incremental tokens via Server-Sent Events. Each event contains `{ "delta": "..." }` and a final `{ "done": true, "message": {...} }` payload.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'text/event-stream payload'
          },
          '422': {
            description: 'Validation error',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
            }
          }
        }
      }
    },
    '/api/conversations/{id}': {
      get: {
        summary: 'Fetch a conversation with messages',
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'Conversation snapshot',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    conversation: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        model: { type: 'string' },
                        difficulty: { type: 'string' },
                        category: { type: 'string' },
                        source: { type: 'string' },
                        topic: { type: 'string' }
                      }
                    },
                    messages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          role: { type: 'string' },
                          content: { type: 'string' },
                          createdAt: { type: 'string', format: 'date-time' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          '404': {
            description: 'Unknown conversation',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
            }
          }
        }
      }
    },
    '/api/suggestions': {
      get: {
        summary: 'List recommended prompts',
        parameters: [
          {
            in: 'query',
            name: 'category',
            schema: { type: 'string', enum: ['금융경제용어', '재무제표'] },
            description: 'Optional category filter'
          }
        ],
        responses: {
          '200': {
            description: 'Suggestion list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    suggestions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Suggestion' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
