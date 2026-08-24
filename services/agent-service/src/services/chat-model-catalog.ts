import type { ChatProvider } from './chat/providers/types.js'

export interface ChatModelDefinition {
  modelKey: string
  displayName: string
  provider: ChatProvider
  isReasoning: boolean
  sortOrder: number
  supportVision: boolean
  supportReasoningControl: boolean
}

export const DEFAULT_CHAT_MODEL_KEY = 'deepseek-v4-flash'

/**
 * Production chat catalog. Every model ID here must exist in the provider's
 * actual API catalog, not only on its marketing model page.
 */
export const DEFAULT_CHAT_MODELS = [
  {
    modelKey: 'deepseek-v4-flash',
    displayName: 'DeepSeek V4 Flash',
    provider: 'deepseek',
    isReasoning: true,
    sortOrder: 1,
    supportVision: false,
    supportReasoningControl: false,
  },
  {
    modelKey: 'deepseek-v4-pro',
    displayName: 'DeepSeek V4 Pro',
    provider: 'deepseek',
    isReasoning: true,
    sortOrder: 2,
    supportVision: false,
    supportReasoningControl: false,
  },
  {
    modelKey: 'openai/gpt-5.5',
    displayName: 'GPT-5.5',
    provider: 'shortapi',
    isReasoning: true,
    sortOrder: 5,
    supportVision: false,
    supportReasoningControl: false,
  },
  {
    modelKey: 'google/gemini-3.7-flash',
    displayName: 'Gemini 3.7 Flash',
    provider: 'gcloud',
    isReasoning: true,
    sortOrder: 6,
    supportVision: true,
    supportReasoningControl: true,
  },
  {
    modelKey: 'google/gemini-3.5-flash-lite',
    displayName: 'Gemini 3.5 Flash-Lite',
    provider: 'gcloud',
    isReasoning: true,
    sortOrder: 7,
    supportVision: true,
    supportReasoningControl: true,
  },
  {
    modelKey: 'google/gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    provider: 'gcloud',
    isReasoning: true,
    sortOrder: 8,
    supportVision: true,
    supportReasoningControl: true,
  },
  {
    modelKey: 'doubao-seed-2-1-turbo-260628',
    displayName: 'Doubao Seed 2.1 Turbo',
    provider: 'seed',
    isReasoning: true,
    sortOrder: 30,
    supportVision: true,
    supportReasoningControl: true,
  },
  {
    modelKey: 'doubao-seed-evolving',
    displayName: 'Doubao Seed Evolving',
    provider: 'seed',
    isReasoning: true,
    sortOrder: 50,
    supportVision: true,
    supportReasoningControl: true,
  },
  {
    modelKey: 'qwen3.7-plus',
    displayName: 'Qwen 3.7 Plus',
    provider: 'bailian',
    isReasoning: true,
    sortOrder: 70,
    supportVision: true,
    supportReasoningControl: false,
  },
  {
    modelKey: 'qwen3.8-max',
    displayName: 'Qwen 3.8 Max',
    provider: 'bailian',
    isReasoning: true,
    sortOrder: 72,
    supportVision: true,
    supportReasoningControl: false,
  },
] as const satisfies readonly ChatModelDefinition[]

/** Existing Agent rows are migrated before obsolete catalog rows are deleted. */
export const CHAT_MODEL_MIGRATIONS: Readonly<Record<string, string>> = {
  'google/gemini-3.5-flash': 'google/gemini-3.7-flash',
  'google/gemini-3.1-flash-lite': 'google/gemini-3.5-flash-lite',
  'google/gemini-2.5-pro': 'google/gemini-3.1-pro-preview',
  'doubao-seed-2-1-pro-260628': 'doubao-seed-2-1-turbo-260628',
  'doubao-seed-evolving-latest-version': 'doubao-seed-evolving',
  'qwen3.7-max': 'qwen3.8-max',
}

export function normalizeChatModelKey(modelKey: string): string {
  return CHAT_MODEL_MIGRATIONS[modelKey] ?? modelKey
}
