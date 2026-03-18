import { ChatOpenAI } from '@langchain/openai'

export type ChatProvider = 'deepseek' | 'seed' | 'bailian'

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

export interface ProviderModelRequest {
  model: string
  reasoningEffort: ReasoningEffort
}

export interface ProviderModelResult {
  provider: ChatProvider
  model: ChatOpenAI
}
