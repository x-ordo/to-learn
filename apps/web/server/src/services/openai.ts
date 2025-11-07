import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

export function getOpenAI() {
  if (!apiKey) return null;
  const client = new OpenAI({ apiKey });
  return client;
}

export function mapModel(input?: string) {
  switch (input) {
    case 'openai-gpt-4o-mini':
      return 'gpt-4o-mini';
    case 'openai-gpt-4o':
      return 'gpt-4o';
    case 'openai-gpt-4.1-mini':
      return 'gpt-4.1-mini';
    default:
      return 'gpt-4o-mini';
  }
}

