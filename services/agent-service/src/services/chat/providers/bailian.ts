import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

function buildBailianModelKwargs(reasoningEffort: ProviderModelRequest['reasoningEffort']) {
  return {
    enable_thinking: reasoningEffort !== 'minimal',
  }
}

export function createBailianModel({
  model,
  reasoningEffort,
}: ProviderModelRequest): ProviderModelResult {
  if (!config.bailianApiKey) {
    throw new Error('BAILIAN_API_KEY is required for bailian models')
  }

  const baseURL = config.bailianBaseUrl || undefined

  return {
    provider: 'bailian',
    model: new ChatOpenAI({
      apiKey: config.bailianApiKey,
      model,
      temperature: 0.7,
      modelKwargs: buildBailianModelKwargs(reasoningEffort),
      __includeRawResponse: true,
      configuration: baseURL ? { baseURL } : undefined,
    }),
  }
}
