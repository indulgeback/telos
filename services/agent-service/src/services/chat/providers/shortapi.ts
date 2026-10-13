import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

export function createShortapiModel({
  model,
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
      __includeRawResponse: true,
      configuration: {
        baseURL: config.shortapiBaseUrl || 'https://api.shortapi.ai/v1',
      },
    }),
  }
}
