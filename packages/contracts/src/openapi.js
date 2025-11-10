"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiDocument = void 0;
// OpenAPI 문서 — n8n OpenAPI 노드로 임포트하거나 Swagger UI(`/docs`)에 노출됩니다.
// contracts/chat.ts의 스키마와 의미상 동일하게 유지하되,
// 외부 도구 호환성을 위해 OpenAPI 표준 스키마로 표현합니다.
const components = {
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
        },
        SummaryRequest: {
            type: 'object',
            required: ['text'],
            properties: {
                text: {
                    type: 'string',
                    description: 'Plain text extracted from PDF or manual input.'
                },
                maxSentences: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                    default: 5,
                    description: 'Maximum number of summary sentences (default: 5).'
                }
            }
        },
        SummaryResponse: {
            type: 'object',
            required: ['summary'],
            properties: {
                summary: {
                    type: 'array',
                    minItems: 1,
                    maxItems: 5,
                    description: 'Line-by-line summary capped at five rows.',
                    items: { type: 'string' }
                }
            }
        },
        QnaRequest: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    nullable: true,
                    description: 'Raw text input for Q&A generation.'
                },
                summary: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true,
                    description: 'Summary lines returned from /api/summary.'
                },
                count: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    default: 3,
                    description: 'Number of Q&A pairs to generate (default: 3).'
                }
            },
            anyOf: [{ required: ['text'] }, { required: ['summary'] }]
        },
        QnaItem: {
            type: 'object',
            required: ['q', 'a'],
            properties: {
                q: { type: 'string', description: 'Question text' },
                a: { type: 'string', description: 'Answer text' }
            }
        },
        QnaResponse: {
            type: 'object',
            required: ['items'],
            properties: {
                items: {
                    type: 'array',
                    minItems: 1,
                    description: 'Generated Q&A pairs',
                    items: { $ref: '#/components/schemas/QnaItem' }
                }
            }
        },
        QuizRequest: {
            type: 'object',
            required: ['text'],
            properties: {
                text: {
                    type: 'string',
                    description: 'Source text or lecture notes used to build quiz problems.'
                },
                type: {
                    type: 'string',
                    enum: ['objective', 'subjective'],
                    default: 'objective'
                },
                count: {
                    type: 'integer',
                    minimum: 3,
                    maximum: 5,
                    default: 3,
                    description: 'Number of quiz problems to generate.'
                }
            }
        },
        QuizProblem: {
            type: 'object',
            required: ['type', 'question', 'answer', 'explanation'],
            properties: {
                type: { type: 'string', enum: ['objective', 'subjective'] },
                question: { type: 'string' },
                choices: {
                    type: 'array',
                    minItems: 2,
                    maxItems: 5,
                    items: { type: 'string' },
                    description: 'Choice list (objective problems only).'
                },
                answer: { type: 'string' },
                explanation: { type: 'string' }
            }
        },
        QuizResponse: {
            type: 'object',
            required: ['problems'],
            properties: {
                problems: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/components/schemas/QuizProblem' }
                }
            }
        },
        RecommendRequest: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'Primary topic or goal for recommendation.'
                },
                keywords: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of keywords to feed into the search client.'
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 5,
                    default: 3
                },
                providers: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['tavily', 'dart', 'kif_edu']
                    },
                    description: 'Optional provider filter. Defaults to every available provider.'
                }
            },
            anyOf: [{ required: ['topic'] }, { required: ['keywords'] }]
        },
        RecommendItem: {
            type: 'object',
            required: ['source', 'title', 'description', 'link', 'reason', 'verified'],
            properties: {
                source: {
                    type: 'string',
                    enum: ['tavily', 'dart', 'kif_edu'],
                    description: 'Data provider for the recommendation.'
                },
                title: { type: 'string' },
                description: { type: 'string' },
                link: { type: 'string', format: 'uri' },
                reason: {
                    type: 'string',
                    description: 'Model generated rationale explaining why the resource helps.'
                },
                verified: { type: 'boolean', description: 'Whether the link responded with HTTP 200.' },
                meta: {
                    type: 'object',
                    additionalProperties: true,
                    description: 'Provider-specific metadata (e.g., corp name, filing date).'
                }
            }
        },
        RecommendResponse: {
            type: 'object',
            required: ['items'],
            properties: {
                items: {
                    type: 'array',
                    minItems: 1,
                    items: { $ref: '#/components/schemas/RecommendItem' }
                }
            }
        },
        UploadResponse: {
            type: 'object',
            required: ['text'],
            properties: {
                text: { type: 'string', description: 'UTF-8 text extracted from PDF or TXT upload.' },
                meta: {
                    type: 'object',
                    properties: {
                        filename: { type: 'string' },
                        mimeType: { type: 'string' },
                        wordCount: { type: 'integer' }
                    }
                }
            }
        }
    }
};
exports.openApiDocument = {
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
                description: 'Streams incremental tokens via Server-Sent Events. Each event contains `{ "delta": "..." }` and a final `{ "done": true, "message": {...} }` payload.',
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
        },
        '/api/upload': {
            post: {
                summary: 'Upload PDF/TXT file and extract plain text',
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    file: {
                                        type: 'string',
                                        format: 'binary',
                                        description: 'PDF or text file up to 10MB'
                                    }
                                },
                                required: ['file']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Extraction succeeded',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/UploadResponse' }
                            }
                        }
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
        '/api/summary': {
            post: {
                summary: 'Generate five-line summary',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/SummaryRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Summary payload',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/SummaryResponse' }
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
        '/api/qna': {
            post: {
                summary: 'Generate structured Q&A pairs',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/QnaRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Q&A items',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/QnaResponse' }
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
        '/api/quiz': {
            post: {
                summary: 'Generate quiz problems with answers and explanations',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/QuizRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Quiz payload',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/QuizResponse' }
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
        '/api/recommend': {
            post: {
                summary: 'Recommend external learning materials',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/RecommendRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Recommendation list',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/RecommendResponse' }
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
                        description: 'Upstream failure (search or validation)',
                        content: {
                            'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
                        }
                    }
                }
            }
        }
    }
};
