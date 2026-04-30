import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your-key-here') {
      throw new Error('请先配置 OPENAI_API_KEY（编辑 server/.env）');
    }
    client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    });
  }
  return client;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o';
}
