import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

export function createZhipuModel({
  model,
}: ProviderModelRequest): ProviderModelResult {
  if (!config.zhipuApiKey) {
    throw new Error('ZHIPU_API_KEY is required for zhipu models')
  }

  const baseURL = config.zhipuBaseUrl || undefined

  return {
    provider: 'zhipu',
    model: new ChatOpenAI({
      apiKey: config.zhipuApiKey,
      model,
      temperature: 0.7,
      __includeRawResponse: true,
      configuration: baseURL ? { baseURL } : undefined,
    }),
  }
}
