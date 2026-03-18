import { ChatOpenAI } from '@langchain/openai'
import { config } from '../../../config/index.js'
import type {
  ProviderModelRequest,
  ProviderModelResult,
  ReasoningEffort,
} from './types.js'

function buildSeedModelKwargs(reasoningEffort: ReasoningEffort) {
  return {
    reasoning_effort: reasoningEffort,
    ...(reasoningEffort === 'minimal' ? { thinking: { type: 'disabled' } } : {}),
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
