import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import { isThinkingDisabled } from '../../reasoning.js'
import type { ProviderModelRequest, ProviderModelResult } from './types.js'

// 豆包 Seed 只认 thinking.type 开关（enabled/disabled），不发 OpenAI 风格的
// reasoning_effort，避免上游严格校验枚举时 400。
function buildSeedModelKwargs(reasoningEffort: ProviderModelRequest['reasoningEffort']) {
  return {
    thinking: {
      type: isThinkingDisabled(reasoningEffort) ? 'disabled' : 'enabled',
    },
  }
}

export function createSeedModel({
  model,
  reasoningEffort,
}: ProviderModelRequest): ProviderModelResult {
  if (!config.seedApiKey) {
    throw new Error('SEED_API_KEY is required for seed models')
  }

  const baseURL = config.seedBaseUrl || undefined

  return {
    provider: 'seed',
    model: new ChatOpenAI({
      apiKey: config.seedApiKey,
      model,
      temperature: 0.7,
      modelKwargs: buildSeedModelKwargs(reasoningEffort),
      __includeRawResponse: true,
      configuration: baseURL ? { baseURL } : undefined,
    }),
  }
}
