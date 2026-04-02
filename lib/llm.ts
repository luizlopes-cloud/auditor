import { createOpenAI } from '@ai-sdk/openai'

export const llm = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
})

export const LLM_MODEL = process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-001'
