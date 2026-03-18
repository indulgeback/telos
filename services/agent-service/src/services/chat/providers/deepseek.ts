import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

export function createDeepseekModel({
  model,
}: ProviderModelRequest): ProviderModelResult {
  if (!config.deepseekApiKey) {
    throw new Error('DEEPSEEK_API_KEY is required for deepseek models')
  }

  const baseURL = config.deepseekBaseUrl || undefined

  return {
    provider: 'deepseek',
    model: new ChatOpenAI({
      apiKey: config.deepseekApiKey,
      model,
      temperature: 0.7,
      __includeRawResponse: true,
      configuration: baseURL ? { baseURL } : undefined,
    }),
  }
}
