/**
 * 환경설정 모듈
 * -------------
 * 1) dotenv로 `.env`를 로드하고
 * 2) Zod 스키마로 타입·검증을 동시에 수행한 뒤
 * 3) 애플리케이션 전역에서 사용할 `config` 객체로 노출합니다.
 *
 * 실제 비밀 값은 이 파일 밖으로 노출하지 않고, 객체에만 저장합니다.
 */
import dotenv from 'dotenv';
import { z } from 'zod';

// .env 파일을 읽어 Node 환경변수에 주입합니다.
dotenv.config();

// 백엔드 제공자 모드 — OpenAI 직결 또는 n8n 웹훅 위임
const ChatProviderEnum = z.enum(['openai', 'n8n']);

// 환경변수 스키마 정의. 유효성 체크를 통해 잘못된 설정을 조기에 발견합니다.
const EnvSchema = z
  .object({
    PORT: z.coerce.number().default(4000),
    OPENAI_API_KEY: z
      .string()
      .min(1, 'OPENAI_API_KEY is required for OpenAI provider')
      .optional(),
    ALLOWED_ORIGINS: z.string().optional().default(''),
    SQLITE_PATH: z.string().default('./data/tolearn.db'),
    CHAT_PROVIDER: ChatProviderEnum.default('openai'),
    N8N_WEBHOOK_URL: z.string().url().optional(),
    N8N_API_KEY: z.string().optional(),
    SWAGGER_PORT: z.coerce.number().optional()
  })
  // 제공자에 따른 필수값 조건부 검사
  .superRefine((data, ctx) => {
    if (data.CHAT_PROVIDER === 'openai' && !data.OPENAI_API_KEY) {
      ctx.addIssue({
        path: ['OPENAI_API_KEY'],
        code: z.ZodIssueCode.custom,
        message: 'OPENAI_API_KEY is required when CHAT_PROVIDER=openai'
      });
    }
    if (data.CHAT_PROVIDER === 'n8n' && !data.N8N_WEBHOOK_URL) {
      ctx.addIssue({
        path: ['N8N_WEBHOOK_URL'],
        code: z.ZodIssueCode.custom,
        message: 'N8N_WEBHOOK_URL is required when CHAT_PROVIDER=n8n'
      });
    }
  });

// 실제 환경변수에서 값을 읽어 스키마로 파싱합니다.
const env = EnvSchema.parse({
  PORT: process.env.PORT ?? 4000,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? '',
  SQLITE_PATH: process.env.SQLITE_PATH ?? './data/tolearn.db',
  CHAT_PROVIDER: process.env.CHAT_PROVIDER,
  N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
  N8N_API_KEY: process.env.N8N_API_KEY,
  SWAGGER_PORT: process.env.SWAGGER_PORT
});

// 애플리케이션 전역에서 사용하는 설정 객체
export const config = {
  port: env.PORT,
  openAiApiKey: env.OPENAI_API_KEY,
  sqlitePath: env.SQLITE_PATH,
  chatProvider: env.CHAT_PROVIDER, // 'openai' | 'n8n'
  n8nWebhookUrl: env.N8N_WEBHOOK_URL,
  n8nApiKey: env.N8N_API_KEY,
  swaggerPort: env.SWAGGER_PORT,
  // 쉼표로 구분된 오리진 문자열을 배열로 정규화
  allowedOrigins: env.ALLOWED_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
};
