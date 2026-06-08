import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

export function createOpenAIModel({
  model,
}: ProviderModelRequest): ProviderModelResult {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY is required for openai models')
  }

  return {
    provider: 'openai',
    model: new ChatOpenAI({
      apiKey: config.openaiApiKey,
      model,
      temperature: 0.7,
      __includeRawResponse: true,
      configuration: config.openaiBaseUrl
        ? { baseURL: config.openaiBaseUrl }
        : undefined,
    }),
  }
}
