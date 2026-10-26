import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import { toOpenAiReasoningEffort } from '../../reasoning.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

export function createShortapiModel({
  model,
  reasoningEffort,
}: ProviderModelRequest): ProviderModelResult {
  if (!config.shortapiApiKey) {
    throw new Error('SHORTAPI_API_KEY is required for shortapi models')
  }

  return {
    provider: 'shortapi',
    model: new ChatOpenAI({
      apiKey: config.shortapiApiKey,
      model,
      temperature: 0.7,
      modelKwargs: { reasoning_effort: toOpenAiReasoningEffort(reasoningEffort) },
      __includeRawResponse: true,
      configuration: {
        baseURL: config.shortapiBaseUrl || 'https://api.shortapi.ai/v1',
      },
    }),
  }
}
