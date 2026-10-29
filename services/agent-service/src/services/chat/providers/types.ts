import { ChatOpenAI } from '@langchain/openai'
import type { ReasoningEffort } from '../../reasoning.js'

export type ChatProvider =
  | 'openai'
  | 'deepseek'
  | 'seed'
  | 'bailian'
  | 'gcloud'
  | 'zhipu'

export type { ReasoningEffort }

export interface ProviderModelRequest {
  model: string
  reasoningEffort: ReasoningEffort
}

export interface ProviderModelResult {
  provider: ChatProvider
  model: ChatOpenAI
}
